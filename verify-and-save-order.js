/**
 * Netlify Function: verify-and-save-order
 *
 * This function securely verifies a Paystack payment and saves the order to Supabase.
 * It runs on-demand when the endpoint /.netlify/functions/verify-and-save-order is called.
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Load environment variables
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  PAYSTACK_SECRET_KEY,
} = process.env;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { reference, order } = JSON.parse(event.body);

    // 1. Robust Input Validation
    if (!reference || !order || !order.payment_reference || !order.total) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid order data.' }) };
    }
    if (reference !== order.payment_reference) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Payment reference mismatch.' }) };
    }

    // 2. Securely Verify Payment with Paystack
    const paystackVerifyUrl = `https://api.paystack.co/transaction/verify/${reference}`;
    const paystackResponse = await fetch(paystackVerifyUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const paystackData = await paystackResponse.json();

    if (!paystackData.status || paystackData.data.status !== 'success') {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Payment could not be verified.' }) };
    }

    // 3. CRITICAL: Cross-check the amount
    const paidAmountKobo = paystackData.data.amount;
    const expectedAmountKobo = Math.round(order.total * 100);

    if (paidAmountKobo < expectedAmountKobo) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Payment amount mismatch. Contact support.' }) };
    }

    // 4. Save the order to Supabase
    const { data: savedOrder, error: dbError } = await supabase
      .from('orders')
      .insert({ ...order, status: 'received', seen: false })
      .select()
      .single();

    if (dbError) {
      console.error(`[CRITICAL] DB insert failed for verified payment ref: ${reference}`, dbError);
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: 'Payment successful, but failed to save order. Contact support.' }),
      };
    }

    // 5. Success Response
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message: 'Your order has been placed successfully!', order: savedOrder }),
    };

  } catch (err) {
    console.error('[CRITICAL] Unhandled function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: 'Internal server error.' }),
    };
  }
};