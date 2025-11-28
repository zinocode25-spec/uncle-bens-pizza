// Mobile Toggler for Humburger
(function() {
    const mobileMenuBtn = document.querySelector('button.md\\:hidden');
    if (!mobileMenuBtn) return;

    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'fixed top-20 left-0 w-full glass z-40 transform -translate-y-full transition-transform duration-300';
    mobileMenu.innerHTML = `
        <div class="container mx-auto px-8 py-4 nav-container">
            <div class="flex flex-col space-y-4">
                <a href="shop.html" class="hover:text-blue-400 transition-colors py-2">Menu</a>
                <a href="#booking" class="hover:text-blue-400 transition-colors py-2">Booking</a>
                <a href="#locations" class="hover:text-blue-400 transition-colors py-2">Locations</a>
                <a href="#contact" class="hover:text-blue-400 transition-colors py-2">Contact</a>
                <a href="shop.html" class="glass px-4 py-2 rounded-lg text-left hover-lift">Shop</a>
                <a href="tracking.html" class="glass px-4 py-2 rounded-lg text-left hover-lift">Track Order</a>
            </div>
        </div>
    `;
    document.body.appendChild(mobileMenu);

    let mobileMenuOpen = false;
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenuOpen = !mobileMenuOpen;
            if (mobileMenuOpen) {
                mobileMenu.classList.remove('-translate-y-full');
            } else {
                mobileMenu.classList.add('-translate-y-full');
            }
        });

    // Close menu when clicking any link inside
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function() {
            mobileMenuOpen = false;
            mobileMenu.classList.add('-translate-y-full');
        });
    });

    // Close on Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileMenuOpen) {
            mobileMenuOpen = false;
            mobileMenu.classList.add('-translate-y-full');
        }
    });
})();

// Ensure fade-in elements are visible even without observer
document.addEventListener('DOMContentLoaded', function() {
    // Frontend-only mode: disable any backend calls
    const BACKEND_ENABLED = true;
    const fadeEls = document.querySelectorAll('.fade-in');
    fadeEls.forEach(function(el) {
        el.classList.add('visible');
    });
    
    // Minimal cart for index page
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartToggle = document.getElementById('cart-toggle');
    const closeCart = document.getElementById('close-cart');
    const cartItems = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartTotalElement = document.getElementById('cart-total');
    const clearCartBtn = document.getElementById('clear-cart');

    let cart = loadCart(); // The single source of truth for our cart.
    
    // --- New, Robust Cart State Management ---

    function loadCart() {
        try {
            const cartJson = localStorage.getItem('uncleBensCart');
            // If cart exists in localStorage, parse it. Otherwise, return an empty array.
            return cartJson ? JSON.parse(cartJson) : [];
        } catch (e) {
            console.error("Failed to parse cart from localStorage", e);
            // If parsing fails, return an empty array to prevent site crash.
            return [];
        }
    }

    function saveCart() {
        localStorage.setItem('uncleBensCart', JSON.stringify(cart));
    }
    function updateCartDisplay() {
        if (!cartItems || !cartCount || !cartTotalElement) return;
        const totalItems = cart.reduce((s,i) => s + i.quantity, 0);
        if (cartCount) {
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
        // Also update floating cart count
        updateFloatingCart();
        const total = cart.reduce((s,i) => s + i.price * i.quantity, 0).toFixed(2);
        cartTotalElement.textContent = `₵${total}`;
        
        // Update mobile cart modal
        const mobileCartItems = document.getElementById('mobile-cart-items');
        if (mobileCartItems) {
            mobileCartItems.innerHTML = '';
            if (cart.length === 0) {
                mobileCartItems.innerHTML = '<div class="text-center text-gray-400 py-8"><i class="fas fa-shopping-cart text-4xl mb-4"></i><p>Your cart is empty</p></div>';
            } else {
                cart.forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'glass rounded-lg p-4 mb-4';
                    row.innerHTML = `
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <h4 class="font-semibold mb-1">${item.name}</h4>
                                <p class="text-sm text-gray-300">₵${item.price} each</p>
                            </div>
                            <button class="text-red-400 hover:text-red-300 transition-colors ml-2" data-remove="${item.id}"><i class="fas fa-times"></i></button>
                        </div>
                        <div class="flex justify-between items-center mt-3">
                            <div class="flex items-center space-x-2">
                                <button class="bg-gray-600 w-6 h-6 rounded-full flex items-center justify-center text-xs hover:bg-gray-500 transition-colors" data-change="-1" data-id="${item.id}">-</button>
                                <span class="w-8 text-center">${item.quantity}</span>
                                <button class="bg-gray-600 w-6 h-6 rounded-full flex items-center justify-center text-xs hover:bg-gray-500 transition-colors" data-change="1" data-id="${item.id}">+</button>
                            </div>
                            <span class="font-semibold text-green-400">₵${(item.price * item.quantity).toFixed(2)}</span>
                        </div>`;
                    mobileCartItems.appendChild(row);
                });
            }
        }
        
        // Update desktop cart
        cartItems.innerHTML = '';
        if (cart.length === 0) {
            cartItems.innerHTML = '<div class="text-center text-gray-400 py-8"><i class="fas fa-shopping-cart text-4xl mb-4"></i><p>Your cart is empty</p></div>';
            return;
        }
        cart.forEach(item => {
            const row = document.createElement('div');
            row.className = 'glass rounded-lg p-4 mb-4';
            row.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h4 class="font-semibold mb-1">${item.name}</h4>
                        <p class="text-sm text-gray-300">₵${item.price} each</p>
                    </div>
                    <button class="text-red-400 hover:text-red-300 transition-colors ml-2" data-remove="${item.id}"><i class="fas fa-times"></i></button>
                </div>
                <div class="flex justify-between items-center mt-3">
                    <div class="flex items-center space-x-2">
                        <button class="bg-gray-600 w-6 h-6 rounded-full flex items-center justify-center text-xs hover:bg-gray-500 transition-colors" data-change="-1" data-id="${item.id}">-</button>
                        <span class="w-8 text-center">${item.quantity}</span>
                        <button class="bg-gray-600 w-6 h-6 rounded-full flex items-center justify-center text-xs hover:bg-gray-500 transition-colors" data-change="1" data-id="${item.id}">+</button>
                    </div>
                    <span class="font-semibold text-green-400">₵${(item.price * item.quantity).toFixed(2)}</span>
                </div>`;
            cartItems.appendChild(row);
        });
    }
    
    function addToCartFromIndex(id, name, price, quantity = 1, showNotif = true) {
        const existing = cart.find(i => i.id === id);
        if (existing) {
            existing.quantity += quantity;
        } else {
            cart.push({ id, name, price, quantity });
        }

        saveCart();
        updateCartDisplay();

        // Auto open cart sidebar
        if (cartSidebar) {
            cartSidebar.classList.remove('translate-x-full');
        }

        if (showNotif && typeof showNotification === 'function') {
            showNotification(`${name} added to cart!`, 'success');
        }
    }

    // This function is now primarily for opening the checkout modal. The direct API call is a fallback if the modal isn't found.
    function checkoutCart() { // This function is now just for opening the modal
        // The cart variable is already in scope from the top
        const currentCart = loadCart(); // Re-load just in case, e.g., from another tab
        if (!currentCart || currentCart.length === 0) {
            showNotification('Your cart is empty', 'error');
            return;
        }
        const checkoutModal = document.getElementById('checkout-modal');
        if (checkoutModal) {
            const checkoutTotal = document.getElementById('checkout-total');
            if(checkoutTotal) {
                const total = currentCart.reduce((s, i) => s + i.price * i.quantity, 0);
                checkoutTotal.textContent = `₵${total.toFixed(2)}`;
            }
            // Open the checkout modal
            checkoutModal.classList.remove('hidden');
        } else {
            // Fallback to old prompt method if modal not found
            const phone = prompt('Enter phone number for order:');
            if (!phone) { showNotification('Phone is required', 'error'); return; }
            const address = prompt('Enter delivery address:');
            if (!address) { showNotification('Address is required', 'error'); return; }
            const total = currentCart.reduce((s,i)=> s + i.price * i.quantity, 0);
            const isLocal = ['localhost','127.0.0.1'].includes(location.hostname);
            if (!BACKEND_ENABLED) { showNotification('Checkout is disabled in demo (frontend-only).', 'error'); return; }
            const apiBase = '';
            fetch(`${apiBase}/api/orders`, {
                method:'POST',
                headers:{ 'Content-Type':'application/json' },
                body: JSON.stringify({ items: currentCart, phone, address, total })
            }).then(r=>r.json().then(d=>({ ok:r.ok, d })).catch(()=>({ ok:r.ok, d:{} })))
              .then(({ ok, d })=>{
                  if (!ok) { showNotification(d?.message||'Failed to place order','error'); return; }
                  showNotification('Order placed successfully!', 'success');
                  localStorage.setItem('uncleBensCart', '[]');
                  updateCartDisplay();
              })
              .catch(()=> showNotification('Network error while placing order','error'));
        }
    }

    // Add checkout buttons if not present
    function ensureCheckoutButtons(){
        const container = document.querySelector('#cart-sidebar .space-y-3');
        if (container && !container.querySelector('#checkout-button')){
            const btn = document.createElement('button');
            btn.id = 'checkout-button';
            btn.className = 'w-full bg-gradient-to-r from-purple-500 to-pink-500 py-3 rounded-lg font-semibold hover-lift';
            btn.innerHTML = '<i class="fas fa-credit-card mr-2"></i>Checkout';
            btn.addEventListener('click', checkoutCart);
            container.appendChild(btn);
        }
    }
    
    function removeFromCart(id) {
        cart = cart.filter(i => i.id !== id);
        saveCart();
        updateCartDisplay();
    }

    function updateCartQuantity(id, delta) {
        const item = cart.find(i => i.id === id);
        if (!item) return;
        item.quantity = Math.max(0, item.quantity + delta);
        if (item.quantity === 0) cart = cart.filter(i => i.id !== id);
        
        saveCart();
        updateCartDisplay();
    }

    // Centralized click handler for cart actions AND closing the cart sidebar
    document.addEventListener('click', function(e) {
        // 1. Handle quantity change buttons (+/-)
        const changeBtn = e.target.closest('[data-change]');
        if (changeBtn) {
            const id = changeBtn.getAttribute('data-id');
            const change = parseInt(changeBtn.getAttribute('data-change'), 10);
            updateCartQuantity(id, change);
            return; // Action handled, stop further processing.
        }

        // 2. Handle item removal buttons (X)
        const removeBtn = e.target.closest('[data-remove]');
        if (removeBtn) {
            removeFromCart(removeBtn.getAttribute('data-remove'));
            return; // Action handled, stop further processing.
        }

        // 3. Handle closing the cart when clicking outside of it
        if (cartSidebar && cartToggle && !cartSidebar.classList.contains('translate-x-full')) {
            if (!cartSidebar.contains(e.target) && !cartToggle.contains(e.target)) {
                cartSidebar.classList.add('translate-x-full');
            }
        }
    });

    // Cart open/close and clear
    if (cartToggle) cartToggle.addEventListener('click', function(){ if (cartSidebar) cartSidebar.classList.toggle('translate-x-full'); });
    if (closeCart) closeCart.addEventListener('click', function(){ if (cartSidebar) cartSidebar.classList.add('translate-x-full'); });
    if (clearCartBtn) clearCartBtn.addEventListener('click', function(){ 
        cart = [];
        saveCart();
        updateCartDisplay();
        // Also clear shop page quantities
        if (document.getElementById('shopHero')) { localStorage.removeItem('uncleBensQuantities'); syncQuantityDisplays(); }
    });

    // Deprecated: buyNow kept for backward compatibility; route to addToCartFromIndex
    function buyNow(id, name, price) { addToCartFromIndex(id, name, price, 1, true); }

    // Expose for inline onclicks
    window.addToCartFromIndex = addToCartFromIndex;
    window.updateCartQuantity = updateCartQuantity;
    window.removeFromCart = removeFromCart;
    window.buyNow = buyNow;

    // Tracking modal wiring
    const trackingModal = document.getElementById('tracking-modal');
    const trackingForm = document.getElementById('tracking-form');
    const closeTracking = document.getElementById('close-tracking');
    function openTrackingModal(){
        if (trackingModal && trackingForm){
            trackingModal.classList.remove('hidden');
            trackingForm.reset();
        }
    }
    function closeTrackingModal(){
        if (trackingModal){ trackingModal.classList.add('hidden'); }
    }
    if (closeTracking) closeTracking.addEventListener('click', closeTrackingModal);
    if (trackingForm){
        trackingForm.addEventListener('submit', function(e){
        e.preventDefault();
            const orderInput = document.getElementById('order-number');
            const orderNumber = orderInput ? (orderInput.value || '').trim().toUpperCase() : '';
                closeTrackingModal();
            // Navigate to dedicated tracking page with order number
            const url = orderNumber ? `tracking.html#order=${orderNumber}` : 'tracking.html';
            window.location.href = url;
        });
    }
    function trackOrderFromIndex(orderNumber){
        if (trackingForm){
            const orderInput = document.getElementById('order-number');
            const phoneInput = document.getElementById('phone-number');
            if (orderInput) orderInput.value = orderNumber;
            if (phoneInput) phoneInput.value = '0240597979';
            const evt = new Event('submit', { bubbles: true, cancelable: true });
            trackingForm.dispatchEvent(evt);
        } else {
            // Fallback: navigate directly
            window.location.href = `tracking.html#order=${orderNumber}`;
        }
    }
    window.openTrackingModal = openTrackingModal;
    window.trackOrderFromIndex = trackOrderFromIndex;
    
    // Checkout Modal Logic
    const PAYSTACK_PUBLIC_KEY = 'pk_test_0d63cbd654fab61f8cf4612ca665e9ab4e6f4797';
    // Set the backend API URL. Use a production URL unless running on localhost.
    const PAYMENT_API_BASE = window.__PAYMENT_API_BASE ||
        (['127.0.0.1', 'localhost'].includes(window.location.hostname)
            ? 'http://127.0.0.1:9999' // For local testing with Netlify Dev
            : ''); // On production, use a relative path

    let pendingOrderPayload = null;

    function buildTempEmailFromPhone(phone = '') {
        const digitsOnly = phone.toString().replace(/\D/g, '') || 'guest';
        return `${digitsOnly}@unclebens.com`;
    }

    window.payWithPaystack = function(orderPayload) {
        if (typeof PaystackPop === 'undefined') {
            showNotification('Payment service is not available. Please refresh.', 'error');
            return false;
        }

        if (!orderPayload || !orderPayload.total || orderPayload.total <= 0) {
            console.error('Invalid order payload supplied to Paystack:', orderPayload);
            showNotification('Invalid order data. Please try again.', 'error');
            return false;
        }

        const transactionRef = `UBPAY-${Date.now()}`;
        // Attach the payment reference directly to the order payload.
        const finalOrderPayload = {
            ...orderPayload,
            payment_reference: transactionRef
        };
        pendingOrderPayload = finalOrderPayload; // Store for the callback

        try {
            const handler = PaystackPop.setup({
                key: PAYSTACK_PUBLIC_KEY,
                email: orderPayload.email,
                amount: Math.round(orderPayload.total * 100),
                currency: 'GHS',
                ref: transactionRef,
                metadata: {
                    phone: orderPayload.phone,
                    address: orderPayload.address,
                    items: orderPayload.items,
                    custom_fields: [
                        {
                            display_name: 'Phone Number',
                            variable_name: 'customer_phone',
                            value: orderPayload.phone
                        },
                        {
                            display_name: 'Delivery Address',
                            variable_name: 'delivery_address',
                            value: orderPayload.address
                        }
                    ]
                },
                callback: function(response) {
                    handlePaystackCallback(response, finalOrderPayload);
                },
                onClose: function() {
                    showNotification('Payment window closed. No charge made.', 'info');
                    clearPendingOrder();
                }
            });

            handler.openIframe();
            return true;
        } catch (error) {
            console.error('Error launching Paystack:', error);
            showNotification('Unable to start payment. Please try again.', 'error');
            clearPendingOrder();
            return false;
        }
    }

    async function handlePaystackCallback(response, orderData) {        
        // Secure Flow: On Paystack success, send the reference and order data to our backend for verification.
        if (!response?.reference || !orderData) {
            showNotification('Payment session expired or data is missing. Please try again.', 'error');
            return;
        }

        try {
            // Call the new, secure verification endpoint
            const verifyResp = await fetch(`${PAYMENT_API_BASE}/.netlify/functions/verify-and-save-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reference: response.reference, // The reference from Paystack's callback
                    order: orderData             // The full order payload we created
                })
            });

            const verifyJson = await verifyResp.json();

            if (!verifyResp.ok || !verifyJson.ok) {
                throw new Error(verifyJson.error || 'Payment verification failed on the server.');
            }

            cart = [];
            saveCart();
            updateCartDisplay();
            localStorage.setItem('uncleBensCart', '[]');

            const localOrders = JSON.parse(localStorage.getItem('uncleBensOrders')) || [];
            localOrders.unshift(orderData);
            localStorage.setItem('uncleBensOrders', JSON.stringify(localOrders.slice(0, 10)));

            showNotification('Payment verified & Order placed successfully 🎉', 'success');
            pendingOrderPayload = null; // Clear the pending order
            // Redirect to success page with reference and order number
            window.location.href = `success.html?ref=${response.reference}&order_number=${orderData.order_number || ''}`;
        } catch (error) {
            console.error('Order Verification/Saving Error:', error);
            showNotification(`Error: ${error.message}. Please contact support with payment reference: ${response.reference}`, 'error');
        }
    }
    const checkoutModal = document.getElementById('checkout-modal');
    const checkoutForm = document.getElementById('checkout-form');
    const closeCheckout = document.getElementById('close-checkout');
    const paystackBtn = document.getElementById('paystack-btn');
    if (closeCheckout) {
        closeCheckout.addEventListener('click', () => {
            if (checkoutModal) checkoutModal.classList.add('hidden');
        });
    }

    if (checkoutModal) {
        // Close mobile cart modal when checkout modal opens (mobile only)
        const observer = new MutationObserver((mutations) => {
        });
        observer.observe(checkoutModal, { attributes: true, attributeFilter: ['class'] });

        checkoutModal.addEventListener('click', (e) => {
            if (e.target === checkoutModal) {
                checkoutModal.classList.add('hidden');
            }
        });
    }
    if (checkoutForm) {
        let isSubmitting = false;
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isSubmitting) return;
            isSubmitting = true;

            const formData = new FormData(checkoutForm);
            const submitBtn = checkoutForm.querySelector('button[type="submit"]');
            const name = (formData.get('name') || '').toString().trim();
            const phone = (formData.get('phone') || '').toString().trim();
            const address = (formData.get('address') || '').toString().trim();
            const orderType = (formData.get('orderType') || 'Delivery').toString();
            const cartSnapshot = cart.map(item => ({ ...item })); // Simple clone
            const total = cartSnapshot.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const email = buildTempEmailFromPhone(phone);

            if (submitBtn) submitBtn.disabled = true;

            if (!cartSnapshot.length) {
                showNotification('Your cart is empty. Please add items before checkout.', 'error');
                isSubmitting = false;
                if (submitBtn) submitBtn.disabled = false;
                return;
            }

            // Add client-side validation for name
            if (!name) {
                showNotification('Your name is required to place an order.', 'error');
                isSubmitting = false;
                if (submitBtn) submitBtn.disabled = false;
                return;
            }
            if (!phone || !address) {
                showNotification('Phone and address are required to place an order.', 'error');
                isSubmitting = false;
                if (submitBtn) submitBtn.disabled = false;
                return;
            }

            if (total <= 0) {
                showNotification('Invalid order total. Please check your cart.', 'error');
                isSubmitting = false;
                if (submitBtn) submitBtn.disabled = false;
                return;
            }

            const orderNumber = 'UB' + Date.now().toString().slice(-6);
            const orderPayload = {
                name,
                phone,
                address,
                order_type: orderType,
                created_at: new Date().toISOString(),
                items: cartSnapshot,
                total,
                email,
                order_number: orderNumber,
                status: 'received'
            };

            const started = window.payWithPaystack(orderPayload);

            if (!started) {
                isSubmitting = false;
                if (submitBtn) submitBtn.disabled = false;
                return;
            }

            setTimeout(() => {
                isSubmitting = false;
                if (submitBtn) submitBtn.disabled = false;
            }, 1500);

        });
        
    }
    

    // Review modal functionality
    const reviewModal = document.getElementById('review-modal');
    const reviewForm = document.getElementById('review-form');
    const closeReview = document.getElementById('close-review');
    const ratingStars = document.getElementById('rating-stars');
    
    let selectedRating = 0;
    
    function showReviewForm() {
        if (reviewModal) {
            reviewModal.classList.remove('hidden');
            reviewForm.reset();
            selectedRating = 0;
            updateStarDisplay();
        }
    }
    
    function closeReviewModal() {
        if (reviewModal) {
            reviewModal.classList.add('hidden');
        }
    }
    
    function updateStarDisplay() {
        if (!ratingStars) return;
        const stars = ratingStars.querySelectorAll('i');
        stars.forEach((star, index) => {
            if (index < selectedRating) {
                star.className = 'fas fa-star text-2xl text-yellow-400 cursor-pointer hover:text-yellow-300';
            } else {
                star.className = 'far fa-star text-2xl text-yellow-400 cursor-pointer hover:text-yellow-300';
            }
        });
    }
    
    // Star rating functionality
    if (ratingStars) {
        ratingStars.addEventListener('click', function(e) {
            if (e.target.classList.contains('fa-star')) {
                selectedRating = parseInt(e.target.getAttribute('data-rating'));
                updateStarDisplay();
            }
        });
        
        // Hover effects
        ratingStars.addEventListener('mouseover', function(e) {
            if (e.target.classList.contains('fa-star')) {
                const hoverRating = parseInt(e.target.getAttribute('data-rating'));
                const stars = ratingStars.querySelectorAll('i');
                stars.forEach((star, index) => {
                    if (index < hoverRating) {
                        star.className = 'fas fa-star text-2xl text-yellow-300 cursor-pointer';
                    } else {
                        star.className = 'far fa-star text-2xl text-yellow-400 cursor-pointer';
                    }
                });
            }
        });
        
        ratingStars.addEventListener('mouseout', function() {
            updateStarDisplay();
        });
    }
    
    // Contact form submission
    const contactForm = document.querySelector('#contact form');
    if (contactForm) {
        let isSubmitting = false;
        contactForm.addEventListener('submit', async function(e){
            e.preventDefault();
            if (isSubmitting) return;
            isSubmitting = true;
            const formData = new FormData(contactForm);
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;
            const name = (formData.get('name') || '').toString();
            const email = (formData.get('email') || '').toString();
            const subject = (formData.get('subject') || '').toString();
            const body = (formData.get('message') || formData.get('body') || '').toString();
            if (!BACKEND_ENABLED) { showNotification('Message sending is disabled (frontend-only).', 'error'); return; }
            if (!name || !email || !subject || !body) { showNotification('Please fill in all fields', 'error'); isSubmitting = false; if (submitBtn) submitBtn.disabled = false; return; }

            // --- Supabase Submission ---
            if (window.supabase) {
                try {
                    const contactData = { name, email, subject, message: body };
                    const { error } = await window.supabase.from('contacts').insert([contactData]);
                    if (error) throw error;
                    showNotification('Message sent! We will get back to you soon.', 'success');
                    contactForm.reset();
                } catch (error) {
                    console.error("Error saving contact message to Supabase:", error);
                    showNotification('Network error. Please try again.', 'error');
                } finally {
                    isSubmitting = false; if (submitBtn) submitBtn.disabled = false;
                }
                return; // Stop here if Supabase was used
            }

            const apiBase = '';
            try{
                const resp = await fetch(`${apiBase}/api/messages`, {
                    method:'POST',
                    headers:{ 'Content-Type':'application/json' },
                    body: JSON.stringify({ name, email, subject, body })
                });
                const data = await resp.json().catch(()=>({}));
                if(!resp.ok){ showNotification(data?.message||'Failed to send message','error'); return; }
                showNotification('Message sent! We will get back to you soon.','success');
                contactForm.reset();
            }catch(err){ 
                showNotification('Network error. Please try again.','error'); 
            } finally {
                isSubmitting = false; if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // Review form submission
    if (reviewForm) {
        let isSubmitting = false;
        reviewForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (isSubmitting) return;
            isSubmitting = true;
            if (selectedRating === 0) { showNotification('Please select a rating', 'error'); return; }
            const formData = new FormData(reviewForm);
            const submitBtn = reviewForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;
            const name = (formData.get('name') || 'Anonymous').toString();
            const text = (formData.get('review') || '').toString();
            if (!BACKEND_ENABLED) { showNotification('Review submission is disabled (frontend-only).', 'error'); return; }

            // --- Supabase Submission ---
            if (window.supabase) {
                try {
                    const { error } = await window.supabase.from('reviews').insert([{ name, rating: selectedRating, review: text }]);
                    if (error) throw error;
                    showNotification('Thank you for your review!', 'success');
                    closeReviewModal();
                } catch (error) {
                    console.error("Error saving review to Supabase:", error);
                    showNotification('Failed to submit review. Please try again.', 'error');
                } finally {
                    isSubmitting = false; if (submitBtn) submitBtn.disabled = false;
                }
                return; // Stop here if Supabase was used
            }

            const apiBase = '';
            try{
                const resp = await fetch(`${apiBase}/api/reviews`,{
                    method:'POST',
                    headers:{ 'Content-Type':'application/json' },
                    body: JSON.stringify({ name, rating: selectedRating, text })
                });
                const data = await resp.json().catch(()=>({}));
                if(!resp.ok){ showNotification(data?.message || 'Failed to submit review', 'error'); return; }
                showNotification('Thank you for your review!', 'success');
                closeReviewModal();
            }catch(err){ 
                showNotification('Network error. Please try again.', 'error'); 
            } finally {
                isSubmitting = false; if (submitBtn) submitBtn.disabled = false;
            }
        });
    }
    
    // Close review modal
    if (closeReview) {
        closeReview.addEventListener('click', closeReviewModal);
    }
    
    // Close modal when clicking outside
    if (reviewModal) {
        reviewModal.addEventListener('click', function(e) {
            if (e.target === reviewModal) {
                closeReviewModal();
            }
        });
    }
    
    // Expose showReviewForm globally
    window.showReviewForm = showReviewForm;
    
    // Notification system
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 
            'bg-blue-500'
        } text-white`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 10);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Expose notification function globally
    window.showNotification = showNotification;

    // Reservation form submission to secure backend (frontend-only demo mode)
    (function setupReservationSubmission() {
        // Submits reservation details to Firebase or a configured backend.
        const form = document.getElementById('reservation-form');
        if (!form) return;
        const msgEl = document.getElementById('reservation-message');
        const apiBase = '';
        function setMessage(text, type = 'info'){
            if (!msgEl) return;
            msgEl.className = `mt-2 text-sm ${type === 'error' ? 'text-red-400' : 'text-green-400'}`;
            msgEl.textContent = text;
        }
        let isSubmitting = false;
        form.addEventListener('submit', async function(e){
            e.preventDefault();
            if (isSubmitting) return;
            isSubmitting = true;
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;
            const name = (document.getElementById('res-name')?.value || '').trim();
            const phone = (document.getElementById('res-phone')?.value || '').trim();
            const date = (document.getElementById('res-date')?.value || '').trim();
            const time = (document.getElementById('res-time')?.value || '').trim();
            const guestsRaw = (document.getElementById('res-guests')?.value || '1').trim();
            const guests = parseInt(guestsRaw, 10) || 1;

            // Basic client-side validation; backend still validates strictly
            if (!name || !phone || !date || !time || guests < 1) {
                isSubmitting = false;
                if (submitBtn) submitBtn.disabled = false;
                setMessage('Please fill in all reservation fields correctly.', 'error');
                return;
            }

            // --- Past Date/Time Validation ---
            const now = new Date();
            const selectedDateTime = new Date(`${date}T${time}`);
            
            // Set hours, minutes, seconds, and ms to 0 for today to compare dates only
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDateTime < today || selectedDateTime < now) {
                isSubmitting = false;
                if (submitBtn) submitBtn.disabled = false;
                setMessage('You cannot book a reservation in the past. Please select a future date or time.', 'error');
                return;
            }

            if (!BACKEND_ENABLED) {
                setMessage('Reservations are in demo mode (backend disabled).', 'success');
                showNotification('Reservation noted in demo mode.', 'success');
                isSubmitting = false;
                if (submitBtn) submitBtn.disabled = false;
                form.reset();
                return;
            }

            // --- Supabase Submission ---
            if (window.supabase) {
                try {
                    const reservationData = { name, phone, date, time, guests };

                    const { error } = await window.supabase
                        .from('reservations')
                        .insert([reservationData]);

                    if (error) throw error;

                    setMessage('Reservation submitted successfully!', 'success');
                    showNotification('Reservation submitted successfully.', 'success');
                    form.reset();
                } catch (error) {
                    console.error("Error saving reservation to Supabase:", error);
                    setMessage('Something went wrong. Please try again. Check the console for details.', 'error');
                    showNotification('Failed to submit reservation.', 'error');
                } finally {
                    isSubmitting = false;
                    if (submitBtn) submitBtn.disabled = false;
                }
                return; // Stop here if Firebase was used
            }

            // --- Fallback to original backend logic if Firebase is not available ---
            try {
                const resp = await fetch(`${apiBase}/api/reservations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, phone, date, time, guests })
                });
                const data = await resp.json().catch(()=>({ message: 'Unexpected response' }));
                if (!resp.ok) {
                    const msg = data?.message || 'Reservation failed.';
                    setMessage(msg, 'error');
                    showNotification(msg, 'error');
                    return;
                }
                setMessage('Reservation received! We just sent it to our team.', 'success');
                showNotification('Reservation submitted successfully.', 'success');
                form.reset();
            } catch(err){
                setMessage('Network error. Please try again.', 'error');
                showNotification('Network error while booking. Try again.', 'error');
            } finally {
                isSubmitting = false;
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    })();

    // Initial render
    updateCartDisplay();
    ensureCheckoutButtons();
    window.addEventListener('resize', function(){
    });

    // Floating cart button event listener - open cart sidebar when clicked
    const floatingCartBtn = document.getElementById('floating-cart-btn');
    if (floatingCartBtn) {
        floatingCartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (cartSidebar) {
                cartSidebar.classList.remove('translate-x-full');
            }
        });
    }

    // Update floating cart count on page load
    updateFloatingCart();

    // Map Modal Logic
    const mapModal = document.getElementById('map-modal');
    const closeMapModalBtn = document.getElementById('close-map-modal');
    const mapIframe = document.getElementById('map-iframe');
    const asamankeseBtn = document.getElementById('asamankese-directions-btn');
    const accraBtn = document.getElementById('accra-directions-btn');
    const kumasiBtn = document.getElementById('kumasi-directions-btn');
    const akimOdaBtn = document.getElementById('akim-oda-directions-btn');

    // URLs for each location. Replace placeholders with your actual Google Maps embed URLs.
    const asamankeseMapUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3968.918999516629!2d-0.6680169250133405!3d5.842799995751978!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfdf5f74a588b339%3A0x442d805219354c0!2sUncle%20Ben's%20Pizza!5e0!3m2!1sen!2sgh!4v1719586989410!5m2!1sen!2sgh";
    const accraMapUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3970.718959292569!2d-0.1882186852338959!3d5.55932389593693!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfdf9a7a5e8b8e3b%3A0x4e4c3e3e3e3e3e3e!2sOsu%2C%20Oxford%20Street!5e0!3m2!1sen!2sgh!4v1617812345678!5m2!1sen!2sgh"; // Replace with actual URL
    const kumasiMapUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3962.5779999999995!2d-1.6244224!3d6.6990299!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfdb9742a5e8b8e3b%3A0x4e4c3e3e3e3e3e3e!2sKejetia%20Market!5e0!3m2!1sen!2sgh!4v1617812345679!5m2!1sen!2sgh"; // Replace with actual URL
    const akimOdaMapUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3967.0000000000005!2d-0.9833333!3d6.0833333!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfdf5f74a5e8b8e3b%3A0x4e4c3e3e3e3e3e3e!2sAkim%20Oda%20Central%20Business%20District!5e0!3m2!1sen!2sgh!4v1617812345680!5m2!1sen!2sgh"; // Replace with actual URL

    function openMapModal(url) {
        if (mapModal && mapIframe) {
            mapIframe.src = url;
            mapModal.classList.remove('hidden');
        }
    }

    function closeMapModal() {
        if (mapModal && mapIframe) {
            mapModal.classList.add('hidden');
            mapIframe.src = ''; // Stop video/map from playing in background
        }
    }

    if (asamankeseBtn) {
        asamankeseBtn.addEventListener('click', () => openMapModal(asamankeseMapUrl));
    }
    if (accraBtn) accraBtn.addEventListener('click', () => openMapModal(accraMapUrl));
    if (kumasiBtn) kumasiBtn.addEventListener('click', () => openMapModal(kumasiMapUrl));
    if (akimOdaBtn) akimOdaBtn.addEventListener('click', () => openMapModal(akimOdaMapUrl));
    if (closeMapModalBtn) closeMapModalBtn.addEventListener('click', closeMapModal);
    if (mapModal) mapModal.addEventListener('click', (e) => { if (e.target === mapModal) closeMapModal(); });
});

/* ================================
   FLOATING CART SYSTEM
   ================================ */

// Update floating cart UI count
function updateFloatingCart() {
    const bubble = document.getElementById('floating-cart-count');
    if (bubble) {
        const cart = JSON.parse(localStorage.getItem('uncleBensCart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        bubble.textContent = totalItems;
        // Hide bubble if cart is empty
        bubble.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}
