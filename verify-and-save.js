const express = require('express');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
let supabase;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
} else {
  console.error("Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_KEY) are not set.");
  console.error("Ensure you have a .env file and are loading it with dotenv in your main server file.");
}
router.post('/', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ ok: false, error: 'Database connection is not configured on the server.' });
  }
  const { reference, order } = req.body || {};

  if (!reference || typeof reference !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing/invalid reference.' });
  }
  if (!order || typeof order !== 'object') {
    return res.status(400).json({ ok: false, error: 'Missing/invalid order payload.' });
  }
  if (!PAYSTACK_SECRET_KEY) {
    return res.status(500).json({ ok: false, error: 'Server missing Paystack secret key.' });
  }

  console.log(`🔎 Verifying Paystack payment ref=${reference}`);

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const paystackData = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Paystack verification failed:', paystackData?.message);
      return res.status(response.status).json({
        ok: false,
        error: paystackData?.message || 'Paystack verification failed.'
      });
    }

    const payment = paystackData?.data;
    if (!payment || payment.status !== 'success') {
      return res.status(400).json({ ok: false, error: 'Payment not successful.' });
    }

    if (order.total && payment.amount !== Math.round(order.total * 100)) {
      return res.status(400).json({ ok: false, error: 'Amount mismatch detected.' });
    }
    if (order.currency && payment.currency && order.currency !== payment.currency) {
      return res.status(400).json({ ok: false, error: 'Currency mismatch detected.' });
    }

    const { data: existing, error: existingErr } = await supabase
      .from('orders')
      .select('id')
      .eq('payment_reference', reference)
      .limit(1);

    if (existingErr) throw existingErr;
    if (existing && existing.length) {
      console.log(`ℹ️  Order already recorded for ref=${reference}`);
      return res.json({
        ok: true,
        saved: true,
        reference,
        orderId: existing[0].id,
        payment
      });
    }

    const orderRecord = {
      items: order.items || [],
      phone: order.phone || '',
      address: order.address || '',
      total: order.total || 0,
      email: order.email || '',
      order_number: order.order_number || '',
      payment_reference: reference,
      payment_status: 'paid',
      created_at: order.created_at || new Date().toISOString()
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('orders')
      .insert([orderRecord])
      .select('id')
      .single();

    if (insertError) throw insertError;

    console.log(`✅ Order saved for ref=${reference}`);
    return res.json({
      ok: true,
      saved: true,
      reference,
      orderId: insertResult?.id || null,
      payment
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ ok: false, error: 'Verification failed. Try again.' });
  }
});

module.exports = router;