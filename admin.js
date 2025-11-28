document.addEventListener('DOMContentLoaded', () => {
    const adminDashboard = document.getElementById('admin-dashboard'); // Main container
    const loginContainer = document.getElementById('login-container');
    const logoutBtn = document.getElementById('logout-btn');
    const adminName = document.getElementById('admin-name');
    const sections = document.querySelectorAll('.section-content');
    const sidebarIcons = document.querySelectorAll('.admin-sidebar-icon');
    const ordersTableBody = document.getElementById('orders-table-body');
    const ORDER_STATUS_FLOW = ['Received', 'Preparing', 'Ready', 'Delivery', 'Delivered', 'Cancelled'];
    const ORDER_STATUS_ALIAS = {
        received: 'Received',
        pending: 'Received',
        placed: 'Received',
        preparing: 'Preparing',
        cooking: 'Preparing',
        ready: 'Ready',
        pickup: 'Ready',
        delivery: 'Delivery',
        delivering: 'Delivery',
        driverassigned: 'Delivery',
        outfordelivery: 'Delivery',
        shipped: 'Delivery',
        shipping: 'Delivery',
        delivered: 'Delivered',
        complete: 'Delivered',
        completed: 'Delivered',
        cancelled: 'Cancelled',
        canceled: 'Cancelled'
    };
    const DEFAULT_ORDER_STATUS = ORDER_STATUS_FLOW[0];

    // --- Global State ---
    const dataStore = {
        orders: [],
        reservations: [],
        reviews: [],
        contacts: [],
        recentActivity: []
    };
    const activeFilters = { orders: 'all', reservations: 'all', reviews: 'all', contacts: 'all' };
    const subscriptions = {};
    const loadedSections = new Set();
    let activityChart = null;
    let previousNotifCount = 0; // To track changes in notification count

    const normalizeOrderStatus = (value = '') => value.toString().trim().toLowerCase().replace(/[^a-z]/g, '');
    const resolveOrderStatus = (value) => {
        const normalized = normalizeOrderStatus(value ?? '');
        return ORDER_STATUS_ALIAS[normalized] || ORDER_STATUS_FLOW.find(status => normalizeOrderStatus(status) === normalized) || null;
    };
    const getOrderStatusLabel = (value) => resolveOrderStatus(value) || DEFAULT_ORDER_STATUS;

    // Modal elements
    const detailsModal = document.getElementById('order-details-modal');
    const closeDetailsModalBtn = document.getElementById('close-details-modal');
    const confirmationModal = document.getElementById('confirmation-modal');
    const confirmActionBtn = document.getElementById('confirm-action-btn');
    const cancelConfirmationBtn = document.getElementById('cancel-confirmation-btn');
    const confirmationTitle = document.getElementById('confirmation-title');
    const confirmationMessage = document.getElementById('confirmation-message');
    let currentAction = null;

    // --- Authentication ---
    function handleAuth(user) {
        if (user && user.app_metadata.roles && user.app_metadata.roles.includes('admin')) {
            // Admin is logged in
            adminDashboard.classList.remove('hidden');
            loginContainer.classList.add('hidden');
            if (adminName) adminName.textContent = user.user_metadata.full_name || user.email;
            
            // Load initial dashboard data
            loadDashboardData();
            loadedSections.add('dashboard');
            initializeRealtime(); // Setup realtime listeners after login
        } else {
            // Not an admin or not logged in
            adminDashboard.classList.add('hidden');
            loginContainer.classList.remove('hidden');
            // If the user is logged in but not an admin, show a message.
            if (user) {
                netlifyIdentity.logout();
                alert("Access denied. You must be an administrator.");
            } else {
                Object.values(subscriptions).forEach(sub => sub.unsubscribe()); // Clean up subscriptions on logout
                netlifyIdentity.open(); // Show login modal
            }
        }
    }

    netlifyIdentity.on('init', user => handleAuth(user));
    netlifyIdentity.on('login', user => handleAuth(user));

    netlifyIdentity.on('logout', () => {
        adminDashboard.classList.add('hidden');
        loginContainer.classList.remove('hidden');
        Object.values(subscriptions).forEach(sub => sub.unsubscribe());
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            netlifyIdentity.logout();
        });
    }

    // --- Navigation ---
    sidebarIcons.forEach(icon => {
        icon.addEventListener('click', async () => {
            const section = icon.getAttribute('data-section');
            if (!section) return;

            // Update active icon
            sidebarIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');

            // Load data for the section if it hasn't been loaded yet
            if (!loadedSections.has(section)) {
                if (['orders', 'reservations', 'reviews', 'contacts'].includes(section)) {
                    await applyFilter(section, 'all');
                    // Mark items as seen when viewing the table
                    const unseenIds = dataStore[section].filter(item => !item.seen).map(item => item.id);
                    if (unseenIds.length > 0) markAsSeen(section, unseenIds);
                }
                loadedSections.add(section);
            }

            // Show active section
            sections.forEach(s => {
                if (s.id === `section-${section}`) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });

            // Special case for dashboard to refresh chart if needed
            if (section === 'dashboard' && activityChart) activityChart.resize();
        });
    });

    // --- Realtime & Notifications ---
    function initializeRealtime() {
        console.log("Initializing real-time subscriptions...");
        const tables = ['orders', 'reservations', 'reviews', 'contacts'];
        tables.forEach(tableName => {
            // Unsubscribe from any previous channel to prevent duplicates
            if (subscriptions[tableName]) {
                subscriptions[tableName].unsubscribe();
            }

            subscriptions[tableName] = window.supabase
                .channel(`realtime-${tableName}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: tableName },
                    (payload) => handleRealtimeUpdate(tableName, payload)
                )
                .subscribe((status, err) => {
                    if (status === 'SUBSCRIBED') {
                        console.log(`✓ Subscribed to ${tableName}`);
                    }
                    if (status === 'CHANNEL_ERROR') {
                        console.error(`✗ Failed to subscribe to ${tableName}:`, err);
                    }
                });
        });
        refreshNotificationCounts();
    }

    window.handleRealtimeUpdate = (tableName, payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        let recordId = (newRecord?.id || oldRecord?.id);

        switch (eventType) {
            case 'INSERT':
                dataStore[tableName].unshift(newRecord);
                appendRecentActivity(tableName, newRecord);
                break;
            case 'UPDATE':
                const indexToUpdate = dataStore[tableName].findIndex(item => item.id === recordId);
                if (indexToUpdate !== -1) {
                    dataStore[tableName][indexToUpdate] = { ...dataStore[tableName][indexToUpdate], ...newRecord };
                }
                break;
            case 'DELETE':
                dataStore[tableName] = dataStore[tableName].filter(item => item.id !== recordId);
                break;
        }

        // Re-render the table with the current filter
        const currentFilter = activeFilters[tableName];
        const filteredData = filterData(tableName, currentFilter);
        renderTable(tableName, filteredData);

        // Refresh notifications
        refreshNotificationCounts();
    };

    async function refreshNotificationCounts() {
        const tables = ['orders', 'reservations', 'reviews', 'contacts'];
        const counts = await Promise.all(tables.map(async (table) => {
            const { count, error } = await window.supabase
                .from(table)
                .select('id', { count: 'exact', head: true })
                .eq('seen', false);
            if (error) {
                console.error(`Error fetching count for ${table}:`, error);
                return 0;
            }
            return count;
        }));

        const total = counts.reduce((sum, count) => sum + (count || 0), 0);
        const notifCountEl = document.getElementById('notif-count');
        if (total > 0) {
            notifCountEl.textContent = total > 9 ? '9+' : total;
            notifCountEl.classList.remove('hidden');
        } else {
            notifCountEl.classList.add('hidden');
        }

        // Play sound if the notification count has increased
        if (total > previousNotifCount) {
            const audio = new Audio('/sounds/Alert-message-tone.mp3'); // IMPORTANT: Update this path
            audio.play().catch(error => console.warn("Audio playback failed. User interaction may be required.", error));
        }
        previousNotifCount = total; // Update the previous count
    }

    async function markAsSeen(type, ids) {
        if (!ids || ids.length === 0) return;
        const { error } = await window.supabase
            .from(type)
            .update({ seen: true })
            .in('id', ids);

        if (error) {
            console.error(`Failed to mark ${type} as seen:`, error);
        } else {
            ids.forEach(id => { const item = dataStore[type].find(i => i.id === id); if (item) item.seen = true; });
            // This will recount and update the UI, but not play a sound since the count decreases.
            refreshNotificationCounts();
        }
    }

    // --- Data Fetching and Rendering ---
    const formatCedis = (n) => '₵' + (Number(n) || 0).toFixed(2);
    const formatDate = (iso) => {
        try {
            return new Date(iso).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
        } catch (_) {
            return 'Invalid Date';
        }
    };

    async function loadDashboardData() {
        // Fetch all data in parallel for the main dashboard view
        const [ordersRes, reservationsRes, reviewsRes, recentOrdersRes, recentReservationsRes, recentReviewsRes] = await Promise.all([
            // Queries for KPIs and Chart
            window.supabase.from('orders').select('id, total, created_at'),
            window.supabase.from('reservations').select('id'),
            window.supabase.from('reviews').select('id, rating'),
            // Queries for Recent Activity
            window.supabase.from('orders').select('name, created_at, total, order_number').order('created_at', { ascending: false }).limit(5),
            window.supabase.from('reservations').select('name, created_at, guests').order('created_at', { ascending: false }).limit(5),
            window.supabase.from('reviews').select('name, created_at, rating').order('created_at', { ascending: false }).limit(5)
        ]);

        if (ordersRes.error || reservationsRes.error || reviewsRes.error || recentOrdersRes.error || recentReservationsRes.error || recentReviewsRes.error) {
            showAdminNotification('Failed to load dashboard stats.', 'error');
        }

        // Combine and sort recent activities
        const recentOrders = (recentOrdersRes.data || []).map(o => ({ ...o, type: 'order' }));
        const recentReservations = (recentReservationsRes.data || []).map(r => ({ ...r, type: 'reservation' }));
        const recentReviews = (recentReviewsRes.data || []).map(r => ({ ...r, type: 'review' }));

        const allActivities = [...recentOrders, ...recentReservations, ...recentReviews]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        dataStore.recentActivity = allActivities.slice(0, 5);
        renderRecentActivity(dataStore.recentActivity); // Show the 5 most recent activities overall
        updateKpisAndChart(ordersRes.data || [], reservationsRes.data || [], reviewsRes.data || []);
    }
    
    // --- Universal Filter & Render ---

    window.applyFilter = async (type, filterValue, element) => {
        activeFilters[type] = filterValue;

        // Update active button class
        if (element) {
            const group = element.dataset.filterGroup;
            document.querySelectorAll(`.filter-btn[data-filter-group="${group}"]`).forEach(btn => btn.classList.remove('active'));
            element.classList.add('active');
        }

        const tbody = document.getElementById(`${type}-table-body`);
        if (tbody) tbody.style.opacity = '0.5'; // Indicate loading

        try {
            let query = window.supabase.from(type).select('*').order('created_at', { ascending: false });
            const filterColumn = type === 'reviews' ? 'rating' : 'status';

            if (filterValue !== 'all') {
                query = query.eq(filterColumn, filterValue);
            }

            const { data, error } = await query;
            if (error) throw error;

            dataStore[type] = data;
            renderTable(type, data);
        } catch (error) {
            console.error(`Error fetching ${type}:`, error);
            if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center text-red-400 py-4">Failed to load ${type}.</td></tr>`;
        } finally {
            if (tbody) tbody.style.opacity = '1';
        }
    };

    function filterData(type, filterValue) {
        if (filterValue === 'all') return dataStore[type];
        const filterColumn = type === 'reviews' ? 'rating' : 'status';
        return dataStore[type].filter(item => String(item[filterColumn]) === String(filterValue));
    }

    function renderTable(type, data) {
        const tbody = document.getElementById(`${type}-table-body`);
        if (!tbody) return;
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-gray-400 py-4">No ${type} found.</td></tr>`;
            return;
        }
        data.forEach(item => tbody.appendChild(createRow(type, item)));
    }

    function createOrderRow(order) {
            const itemsSummary = order.items.map(item => `${item.quantity}x ${item.name}`).join(', ');
            const statusLabel = getOrderStatusLabel(order.status);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.order_number}</td>
                <td>${order.name}</td>
                <td>${order.phone}</td>
                <td class="text-sm text-gray-400 max-w-xs truncate" title="${itemsSummary}">${itemsSummary}</td>
                <td>${formatCedis(order.total)}</td>
                <td>${createStatusDropdown(order.id, statusLabel)}</td>
                <td class="text-sm text-gray-400">${formatDate(order.created_at)}</td>
                <td>
                    <button class="details-btn text-blue-400 hover:text-blue-300 text-sm" data-order-id="${order.id}">Details</button>
                    <button class="text-red-400 hover:text-red-300 text-sm delete-btn" data-type="orders" data-id="${order.id}">Delete</button>
                </td>
            `;
            return row;
    }

    function createReservationRow(res) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${res.id}</td>
            <td>${res.name}</td>
            <td>${res.phone}</td>
            <td>${formatDate(`${res.date}T${res.time}`)}</td>
            <td>${res.guests}</td>
            <td>${createReservationStatusDropdown(res.id, res.status || 'pending')}</td>
            <td><button class="text-red-400 hover:text-red-300 text-sm delete-btn" data-type="reservations" data-id="${res.id}">Delete</button></td>
        `;
        return row;
    }

    function createReviewRow(rev) {
        const stars = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${rev.id}</td>
            <td>${rev.name}</td>
            <td class="text-yellow-400">${stars}</td>
            <td class="text-sm text-gray-400 max-w-xs truncate" title="${rev.review}">${rev.review}</td>
            <td class="text-sm text-gray-400">${formatDate(rev.created_at)}</td>
            <td><button class="text-red-400 hover:text-red-300 text-sm delete-btn" data-type="reviews" data-id="${rev.id}">Delete</button></td>
        `;
        return row;
    }

    function createContactRow(contact) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${contact.id}</td>
            <td>${contact.name}</td>
            <td>${contact.email}</td>
            <td>${contact.subject}</td>
            <td class="text-sm text-gray-400 max-w-xs truncate" title="${contact.message}">${contact.message}</td>
            <td class="text-sm text-gray-400">${formatDate(contact.created_at)}</td>
            <td>${createContactStatusDropdown(contact.id, contact.status || 'new')}</td>
            <td><button class="text-red-400 hover:text-red-300 text-sm delete-btn" data-type="contacts" data-id="${contact.id}">Delete</button></td>
        `;
        return row;
    }

    function createRow(type, item) {
        const row = (() => {
            switch (type) {
                case 'orders': return createOrderRow(item);
                case 'reservations': return createReservationRow(item);
                case 'reviews': return createReviewRow(item);
                case 'contacts': return createContactRow(item);
                default: return document.createElement('tr');
            }
        })();
        // Attach data attributes for filtering and identification
        row.dataset.id = item.id;
        if (type === 'reviews') {
            row.dataset.rating = item.rating;
        } else {
            row.dataset.status = type === 'orders' ? getOrderStatusLabel(item.status) : item.status;
        }
        return row;
    }

    function createStatusDropdown(orderId, currentStatus) {
        const resolvedCurrent = getOrderStatusLabel(currentStatus);
        const optionsHtml = ORDER_STATUS_FLOW.map(status => {
            const selected = status === resolvedCurrent ? 'selected' : '';
            return `<option value="${status}" ${selected}>${status}</option>`;
        }).join('');

        return `
            <select data-order-id="${orderId}" data-current-status="${resolvedCurrent}" class="status-select bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                ${optionsHtml}
            </select>
        `;
    }

    async function handleStatusChange(event) {
        const selectElement = event.target;
        const orderId = selectElement.getAttribute('data-order-id');
        const requestedStatus = selectElement.value;
        const resolvedStatus = resolveOrderStatus(requestedStatus);
        const previousStatus = selectElement.dataset.currentStatus || getOrderStatusLabel(requestedStatus);

        if (!resolvedStatus) {
            console.warn(`Attempted to set unsupported status "${requestedStatus}" for order ${orderId}.`);
            selectElement.value = previousStatus;
            return;
        }

        selectElement.value = resolvedStatus;
        selectElement.disabled = true; // Prevent multiple changes

        try {
            const { error } = await window.supabase
                .from('orders')
                .update({ status: resolvedStatus })
                .eq('id', orderId);

            if (error) throw error;

            showAdminNotification(`Order status updated to ${resolvedStatus}`, 'success');
            selectElement.dataset.currentStatus = resolvedStatus;
            const targetOrder = dataStore.orders.find(order => String(order.id) === String(orderId));
            if (targetOrder) {
                targetOrder.status = resolvedStatus;
            }

        } catch (error) {
            console.error("Error updating status:", error);
            showAdminNotification('Failed to update status.', 'error');
            selectElement.value = previousStatus;
        } finally {
            selectElement.disabled = false; // Re-enable dropdown
        }
    }

    // --- Event Delegation for Tables ---
    document.getElementById('admin-dashboard').addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('details-btn')) {
            handleTableClick(event);
        }
        if (target.classList.contains('delete-btn')) {
            const type = target.dataset.type;
            const id = target.dataset.id;
            const row = target.closest('tr');
            showConfirmationModal(`Delete ${type.slice(0, -1)}`, `Are you sure you want to permanently delete this item?`, () => {
                deleteItem(type, id, row);
            });
        }
    });

    function handleTableClick(event) {
        const target = event.target;
        if (target.classList.contains('details-btn')) {
            const orderId = target.getAttribute('data-order-id');
            const order = dataStore.orders.find(o => o.id == orderId);
            if (order) {
                showOrderDetailsModal(order);
            }
        }
    }

    function showOrderDetailsModal(order) {
        if (!detailsModal) return;
        document.getElementById('modal-details-order-number').textContent = order.order_number;
        document.getElementById('modal-details-date').textContent = formatDate(order.created_at);
        document.getElementById('modal-details-name').textContent = order.name;
        document.getElementById('modal-details-contact').textContent = `${order.phone} | ${order.email}`;
        document.getElementById('modal-details-address').textContent = order.address;
        document.getElementById('modal-details-total').textContent = formatCedis(order.total);
        document.getElementById('modal-details-payment-ref').textContent = order.payment_reference || 'N/A'; // Display payment reference
        document.getElementById('modal-details-status').textContent = getOrderStatusLabel(order.status);

        // Populate items
        const itemsContainer = document.getElementById('modal-details-items');
        itemsContainer.innerHTML = '';
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'flex justify-between items-center text-sm';
                itemEl.innerHTML = `
                    <span>${item.quantity}x ${item.name}</span>
                    <span class="text-gray-300">${formatCedis(item.price * item.quantity)}</span>
                `;
                itemsContainer.appendChild(itemEl);
            });
        } else {
            itemsContainer.innerHTML = '<p class="text-gray-400">No items found in this order.</p>';
        }

        detailsModal.classList.remove('hidden');
    }

    function createReservationStatusDropdown(reservationId, currentStatus) {
        const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        const optionsHtml = statuses.map(status => {
            const selected = status === currentStatus ? 'selected' : '';
            return `<option value="${status}" ${selected}>${status.charAt(0).toUpperCase() + status.slice(1)}</option>`;
        }).join('');
        return `
            <select data-reservation-id="${reservationId}" class="reservation-status-select bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                ${optionsHtml}
            </select>
        `;
    }

    function createContactStatusDropdown(contactId, currentStatus) {
        const statuses = ['new', 'responded', 'archived'];
        const optionsHtml = statuses.map(status => {
            const selected = status === currentStatus ? 'selected' : '';
            return `<option value="${status}" ${selected}>${status.charAt(0).toUpperCase() + status.slice(1)}</option>`;
        }).join('');
        return `
            <select data-contact-id="${contactId}" class="contact-status-select bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
                ${optionsHtml}
            </select>
        `;
    }

    // --- Delegated Status Change Handlers ---
    document.getElementById('admin-dashboard').addEventListener('change', (event) => {
        const target = event.target;
        if (target.classList.contains('status-select')) handleStatusChange(event);
        if (target.classList.contains('reservation-status-select')) handleReservationStatusChange(event);
        if (target.classList.contains('contact-status-select')) handleContactStatusChange(event);
    });


    // --- Status Update Logic ---

    async function handleReservationStatusChange(event) {
        const selectElement = event.target;
        const reservationId = selectElement.getAttribute('data-reservation-id');
        const newStatus = selectElement.value;
        await updateStatus('reservations', reservationId, newStatus, selectElement);
    }

    async function handleContactStatusChange(event) {
        const selectElement = event.target;
        const contactId = selectElement.getAttribute('data-contact-id');
        const newStatus = selectElement.value;
        await updateStatus('contacts', contactId, newStatus, selectElement);
    }

    async function updateStatus(table, id, newStatus, element) {
        element.disabled = true;
        try {
            const { error } = await window.supabase.from(table).update({ status: newStatus }).eq('id', id);
            if (error) throw error;
            showAdminNotification(`${table.slice(0, -1)} status updated to ${newStatus}`, 'success');
            element.dataset.currentStatus = newStatus; // Update the data attribute for consistency
        } catch (error) {
            console.error(`Error updating ${table} status:`, error);
            showAdminNotification('Failed to update status.', 'error');
        } finally {
            element.disabled = false;
        }
    }

    // --- Confirmation Modal & Deletion Logic ---
    function showConfirmationModal(title, message, onConfirm) {
        confirmationTitle.textContent = title;
        confirmationMessage.textContent = message;
        currentAction = onConfirm;
        confirmationModal.classList.remove('hidden');
    }

    function closeConfirmationModal() {
        confirmationModal.classList.add('hidden');
        currentAction = null;
    }

    cancelConfirmationBtn.addEventListener('click', closeConfirmationModal);
    confirmActionBtn.addEventListener('click', () => {
        if (typeof currentAction === 'function') {
            currentAction();
        }
        closeConfirmationModal();
    });

    async function deleteItem(table, id, rowElement) {
        try {
            const { error } = await window.supabase.from(table).delete().eq('id', id);
            if (error) throw error;
            
            rowElement.style.transition = 'opacity 0.5s';
            rowElement.style.opacity = '0';
            setTimeout(() => rowElement.remove(), 500);

            showAdminNotification(`${table.slice(0, -1)} deleted successfully.`, 'success');
        } catch (error) {
            console.error(`Error deleting from ${table}:`, error);
            showAdminNotification('Failed to delete item.', 'error');
        }
    }

    // --- Dashboard KPIs and Chart ---
    function updateKpisAndChart(orders, reservations, reviews) {
        // Update KPI Cards
        document.getElementById('kpi-total-orders').textContent = orders.length;
        document.getElementById('kpi-total-reservations').textContent = reservations.length;
        document.getElementById('kpi-total-reviews').textContent = reviews.length;
        
        const totalRating = reviews.reduce((sum, rev) => sum + rev.rating, 0);
        const avgRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : '0.0';
        document.getElementById('kpi-avg-rating').textContent = avgRating;

        // Process data for chart
        const ordersByDay = {};
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        orders.forEach(order => {
            const orderDate = new Date(order.created_at);
            if (orderDate >= thirtyDaysAgo) {
                const day = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
                ordersByDay[day] = (ordersByDay[day] || 0) + 1;
            }
        });

        const chartLabels = [];
        const chartData = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dayString = date.toISOString().split('T')[0];
            chartLabels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            chartData.push(ordersByDay[dayString] || 0);
        }

        renderActivityChart(chartLabels, chartData);
    }

    function renderRecentActivity(activities) {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        container.innerHTML = '';

        if (activities.length === 0) {
            container.innerHTML = '<p class="text-gray-400 text-center py-4">No recent activity.</p>';
            return;
        }

        activities.forEach(activity => {
            const activityEl = document.createElement('div');
            activityEl.className = 'flex items-center space-x-4';
            let iconHtml, title, subtitle;

            switch (activity.type) {
                case 'order':
                    iconHtml = '<i class="fas fa-shopping-cart text-green-400"></i>';
                    title = `New Order <span class="text-green-400 font-mono text-sm">${activity.order_number}</span>`;
                    subtitle = `By ${activity.name} for ${formatCedis(activity.total)}`;
                    break;
                case 'reservation':
                    iconHtml = '<i class="fas fa-calendar-alt text-blue-400"></i>';
                    title = `New Reservation`;
                    subtitle = `By ${activity.name} for ${activity.guests} guest(s)`;
                    break;
                case 'review':
                    iconHtml = '<i class="fas fa-star text-yellow-400"></i>';
                    title = `New Review`;
                    subtitle = `By ${activity.name} - ${'★'.repeat(activity.rating)}${'☆'.repeat(5 - activity.rating)}`;
                    break;
            }

            activityEl.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center">${iconHtml}</div>
                <div class="flex-1"><p class="font-semibold text-sm">${title}</p><p class="text-xs text-gray-400">${subtitle}</p></div>
                <p class="text-xs text-gray-500">${new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>`;
            container.appendChild(activityEl);
        });
    }

    function appendRecentActivity(tableName, record) {
        const activity = createActivityFromRecord(tableName, record);
        if (!activity) return;
        const current = dataStore.recentActivity || [];
        const merged = [activity, ...current]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);
        dataStore.recentActivity = merged;
        renderRecentActivity(merged);
    }

    function createActivityFromRecord(tableName, record = {}) {
        switch (tableName) {
            case 'orders':
                return {
                    type: 'order',
                    name: record.name,
                    total: record.total,
                    order_number: record.order_number,
                    payment_reference: record.payment_reference, // Include payment reference for activity if needed
                    created_at: record.created_at || new Date().toISOString()
                };
            case 'reservations': {
                const reservationTimestamp = record.created_at ||
                    (record.date && record.time ? `${record.date}T${record.time}` : new Date().toISOString());
                return {
                    type: 'reservation',
                    name: record.name,
                    guests: record.guests,
                    created_at: reservationTimestamp
                };
            }
            case 'reviews':
                return {
                    type: 'review',
                    name: record.name,
                    rating: record.rating,
                    created_at: record.created_at || new Date().toISOString()
                };
            default:
                return null;
        }
    }

    function renderActivityChart(labels, data) {
        const ctx = document.getElementById('activity-chart');
        if (!ctx) return;

        if (activityChart) {
            activityChart.destroy();
        }

        activityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Orders',
                    data: data,
                    borderColor: '#ffd700',
                    backgroundColor: 'rgba(255, 215, 0, 0.2)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#9ca3af',
                            stepSize: 1
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    }
                }
            }
        });
    }

    // Initial load of dashboard data and setup of realtime subscriptions
    // This is handled by netlifyIdentity.on('login') -> handleAuth -> loadDashboardData and initializeRealtime
    // No explicit call needed here if Netlify Identity is the primary entry point.

    function closeDetailsModal() {
        if (detailsModal) {
            detailsModal.classList.add('hidden');
        }
    }

    if (closeDetailsModalBtn) {
        closeDetailsModalBtn.addEventListener('click', closeDetailsModal);
    }
    if (detailsModal) {
        detailsModal.addEventListener('click', (e) => { if (e.target === detailsModal) closeDetailsModal(); });
    }

    // A simple notification for the admin panel
    function showAdminNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-5 right-5 z-[1100] px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform translate-y-full ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 
            'bg-blue-500'
        } text-white`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-y-full');
        }, 10);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('translate-y-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
});