/**
 * Uncle Ben's Pizza - Production Backend Server
 *
 * To Run in Production:
 * 1. Create a `.env` file with your production secrets.
 * 2. Install dependencies: `npm install express cors helmet dotenv @supabase/supabase-js node-fetch@2`
 * 3. Start with PM2: `pm2 start server.js --name "uncle-bens-backend"`
 */

require('dotenv').config(); // Load environment variables from a .env file
const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); // For security headers
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch'); // Use node-fetch v2 for CommonJS compatibility

// --- Configuration (Loaded from .env file) ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Use the secure SERVICE KEY
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'; // Your production frontend URL
const port = process.env.PORT || 5000;

// --- Initialization ---
const app = express();
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Middleware ---
app.use(helmet()); // Apply security headers
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests from your frontend URL and disallow others
        if (origin === frontendUrl || !origin) { // !origin allows for same-origin requests
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
app.use(express.json()); // Enable parsing of JSON request bodies

/**
 * @route   POST /api/verify-and-save-order
 * @desc    Securely verifies a Paystack payment and saves the order to Supabase.
 * @access  Public
 */
app.post('/api/verify-and-save-order', async (req, res) => {
    const { reference, order } = req.body;

    // 1. Robust Input Validation
    if (!reference || !order || !order.payment_reference || !order.total || !order.items || order.items.length === 0) {
        return res.status(400).json({ ok: false, error: 'Invalid order data. Please try again.' });
    }

    // Security check: ensure reference from Paystack callback matches the one in our order payload
    if (reference !== order.payment_reference) {
        return res.status(400).json({ ok: false, error: 'Payment reference mismatch.' });
    }

    try {
        // 2. Securely Verify Payment with Paystack from the Backend
        const paystackVerifyUrl = `https://api.paystack.co/transaction/verify/${reference}`;
        const paystackResponse = await fetch(paystackVerifyUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${paystackSecretKey}`,
            },
        });

        const paystackData = await paystackResponse.json();

        if (!paystackData.status || paystackData.data.status !== 'success') {
            return res.status(400).json({ ok: false, error: 'Payment could not be verified with Paystack.' });
        }

        // 3. CRITICAL: Cross-check the amount paid vs. the order total
        const paidAmountKobo = paystackData.data.amount; // Amount from Paystack is in kobo
        const expectedAmountKobo = Math.round(order.total * 100); // Convert order total to kobo

        if (paidAmountKobo < expectedAmountKobo) {
            // This is a critical security check to prevent payment fraud.
            return res.status(400).json({ ok: false, error: 'Payment amount mismatch. Contact support.' });
        }

        // 4. If verification and amount check pass, save the order to Supabase
        const { data: savedOrder, error: dbError } = await supabase
            .from('orders')
            .insert({
                ...order, // Spread the validated order object
                status: 'received', // Set initial status
                seen: false,
            })
            .select()
            .single();

        if (dbError) {
            // IMPORTANT: If this fails, you have a successful payment but no order record.
            // A robust logging/alerting system should be in place here for manual intervention.
            console.error(`[CRITICAL] DB insert failed for verified payment ref: ${reference}`, dbError);
            return res.status(500).json({ ok: false, error: 'Your payment was successful, but we failed to save your order. Please contact support immediately.' });
        }

        // 5. Success Response
        res.status(200).json({ ok: true, message: 'Your order has been placed successfully!', order: savedOrder });

    } catch (err) {
        console.error('[CRITICAL] Unhandled server error in /verify-and-save-order:', err);
        res.status(500).json({ ok: false, error: 'Internal server error.' });
    }
});

// --- Server Start ---
app.listen(port, () => {
    // This log is safe for production as it only runs on server start.
    console.log(`Production server listening on http://localhost:${port}`);
});