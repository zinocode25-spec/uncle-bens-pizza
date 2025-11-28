document.addEventListener('DOMContentLoaded', () => {
    const recentOrdersContainer = document.getElementById('recent-orders');
    const trackingForm = document.getElementById('tracking-form');
    const orderStatusModal = document.getElementById('order-status-modal');
    const closeOrderModalBtn = document.getElementById('close-order-modal');

    // --- Supabase Client Check ---
    if (!window.supabase) {
        console.error("Supabase client is not initialized. Tracking will not work.");
        showNotification("Could not connect to tracking service.", "error");
        return;
    }

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
    const STATUS_BADGE_CLASSES = {
        Received: 'bg-sky-500/50 text-sky-200',
        Preparing: 'bg-orange-500/50 text-orange-200',
        Ready: 'bg-amber-500/50 text-amber-200',
        Delivery: 'bg-purple-500/50 text-purple-200',
        Delivered: 'bg-emerald-500/50 text-emerald-200',
        Cancelled: 'bg-rose-500/50 text-rose-200'
    };
    const DEFAULT_BADGE_CLASS = 'bg-gray-500/50 text-gray-300';
    const timelineStepCache = {};

    function normalizeStatusValue(statusValue = '') {
        return statusValue
            .toString()
            .trim()
            .toLowerCase()
            .replace(/[^a-z]/g, '');
    }

    function resolveOrderStatus(statusValue) {
        if (!statusValue && statusValue !== 0) return null;
        const normalized = normalizeStatusValue(statusValue);
        return ORDER_STATUS_ALIAS[normalized] || ORDER_STATUS_FLOW.find(
            (status) => normalizeStatusValue(status) === normalized
        ) || null;
    }

    function cacheTimelineSteps() {
        ORDER_STATUS_FLOW.forEach((status) => {
            const step = document.getElementById(status);
            if (step) {
                timelineStepCache[status] = step;
            }
        });
    }

    cacheTimelineSteps();

    function loadRecentOrders() {
        if (!recentOrdersContainer) return;

        const orders = JSON.parse(localStorage.getItem('uncleBensOrders')) || [];

        recentOrdersContainer.innerHTML = ''; // Clear existing content

        if (orders.length === 0) {
            recentOrdersContainer.innerHTML = `
                <div class="col-span-1 md:col-span-2 lg:col-span-3 text-center text-gray-400 py-8">
                    <i class="fas fa-history text-4xl mb-4"></i>
                    <p>No recent orders found on this device.</p>
                    <p class="text-sm mt-2">Complete an order to see it here.</p>
                </div>
            `;
            return;
        }

        orders.forEach(order => {
            const resolvedStatus = resolveOrderStatus(order.status);
            const statusLabel = resolvedStatus || ORDER_STATUS_FLOW[0];
            const orderCard = document.createElement('div');
            orderCard.className = 'glass rounded-2xl p-6 flex flex-col hover-lift fade-in visible';

            const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            });

            const statusClass = STATUS_BADGE_CLASSES[statusLabel] || DEFAULT_BADGE_CLASS;

            orderCard.innerHTML = `
                <div class="flex-grow">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <p class="text-sm text-gray-400">Order #${order.order_number}</p>
                            <p class="text-xs text-gray-500">${orderDate}</p>
                        </div>
                        <span class="text-xs font-semibold px-2 py-1 rounded-full ${statusClass}">
                            ${statusLabel}
                        </span>
                    </div>
                    <p class="text-lg font-bold text-green-400 mb-4">₵${Number(order.total).toFixed(2)}</p>
                    <div class="text-sm space-y-1 text-gray-300">
                        ${order.items.slice(0, 2).map(item => `
                            <div class="flex justify-between">
                                <span>${item.quantity}x ${item.name}</span>
                            </div>
                        `).join('')}
                        ${order.items.length > 2 ? `<p class="text-xs text-gray-500">+ ${order.items.length - 2} more items</p>` : ''}
                    </div>
                </div>
                <div class="mt-6">
                    <button class="w-full bg-gradient-to-r from-blue-500 to-purple-600 py-2 rounded-lg font-semibold text-sm track-recent-btn">
                        <i class="fas fa-search mr-2"></i>View & Track
                    </button>
                </div>
            `;

            orderCard.querySelector('.track-recent-btn').addEventListener('click', () => {
                document.getElementById('order-number').value = order.order_number;
                document.getElementById('phone-number').value = order.phone;
                document.getElementById('tracking-form').dispatchEvent(new Event('submit'));
            });

            recentOrdersContainer.appendChild(orderCard);
        });
    }

    // Initial load
    loadRecentOrders();

    // --- Main Tracking Logic ---
    trackingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const orderNumberInput = document.getElementById('order-number');
        const phoneNumberInput = document.getElementById('phone-number');
        const orderNumber = orderNumberInput.value.trim().toUpperCase();
        const phone = phoneNumberInput.value.trim();

        if (!orderNumber || !phone) {
            showNotification('Please enter both order number and phone number.', 'error');
            return;
        }

        const submitBtn = trackingForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Searching...';

        try {
            const { data, error } = await window.supabase
                .from('orders')
                .select('*')
                .eq('order_number', orderNumber)
                .eq('phone', phone)
                .single(); // We expect only one order

            if (error || !data) {
                if (error && error.code !== 'PGRST116') { // PGRST116 is "exact one row not found"
                    throw error;
                }
                showNotification('Order not found. Please check your details and try again.', 'error');
                return;
            }

            // Order found, display it
            displayOrderStatus(data);

        } catch (err) {
            console.error("Error fetching order from Supabase:", err);
            showNotification('Could not track order. Please try again later.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-search mr-2"></i>Track Order';
        }
    });

    function displayOrderStatus(order) {
        // Populate modal fields safely in case any elements are missing
        const orderNumberEl = document.getElementById('modal-order-number');
        if (orderNumberEl) orderNumberEl.textContent = order.order_number || '-';

        const orderDate = order?.created_at ? new Date(order.created_at) : null;
        const orderTimeEl = document.getElementById('modal-order-time');
        if (orderTimeEl && orderDate) {
            orderTimeEl.textContent = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }

        const estimatedDeliveryDate = orderDate ? new Date(orderDate.getTime() + 30 * 60000) : null;
        const estimatedDeliveryEl = document.getElementById('modal-estimated-delivery');
        if (estimatedDeliveryEl && estimatedDeliveryDate) {
            estimatedDeliveryEl.textContent = estimatedDeliveryDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }

        const totalEl = document.getElementById('modal-order-total');
        if (totalEl) totalEl.textContent = `₵${Number(order.total).toFixed(2)}`;

        const itemsContainer = document.getElementById('modal-order-items');
        if (itemsContainer) {
            itemsContainer.innerHTML = '';
            (order.items || []).forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'flex justify-between items-center text-sm';
                itemEl.innerHTML = `
                    <span>${item.quantity}x ${item.name}</span>
                    <span class="text-gray-300">₵${(item.price * item.quantity).toFixed(2)}</span>
                `;
                itemsContainer.appendChild(itemEl);
            });
        }

        updateTimeline(order.status);

        if (orderStatusModal) {
            orderStatusModal.classList.remove('hidden');
        }
    }

    // updateTimeline gracefully handles missing DOM nodes / unknown statuses
    function updateTimeline(currentStatus) {
        const cachedSteps = Object.values(timelineStepCache);

        if (!cachedSteps.length) {
            console.warn('Order timeline not found. Ensure timeline step elements are rendered.');
            return;
        }

        cachedSteps.forEach(step => step?.classList?.remove('active'));

        const resolvedStatus = resolveOrderStatus(currentStatus);

        if (!resolvedStatus) {
            console.warn(`Order status "${currentStatus ?? 'unknown'}" does not match any timeline step.`);
            return;
        }

        const activeStep = timelineStepCache[resolvedStatus] || document.getElementById(resolvedStatus);

        if (!activeStep || !activeStep.classList) {
            console.warn(`Timeline element for status "${resolvedStatus}" not found. Expected id="${resolvedStatus}".`);
            return;
        }

        // Cache newly found step to avoid repeated lookups
        timelineStepCache[resolvedStatus] = activeStep;
        activeStep.classList.add('active');
    }

    // --- Modal Controls ---
    if (closeOrderModalBtn) closeOrderModalBtn.addEventListener('click', () => orderStatusModal.classList.add('hidden'));
    if (orderStatusModal) orderStatusModal.addEventListener('click', (e) => { if (e.target === orderStatusModal) orderStatusModal.classList.add('hidden'); });

    // --- Auto-track from URL ---
    const urlHash = window.location.hash;
    if (urlHash && urlHash.startsWith('#order=')) {
        const orderNumberFromUrl = urlHash.substring(7);
        document.getElementById('order-number').value = orderNumberFromUrl;
        showNotification('Enter your phone number to track the order.', 'info');
        // Optionally, automatically submit the form if phone number is also present in URL or pre-filled
    }
});