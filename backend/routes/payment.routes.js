const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

// POST /api/payment/create-order
// Creates a Razorpay order before payment
router.post('/create-order', async (req, res, next) => {
  try {
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const { amount } = req.body; // in rupees
    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    const options = {
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: { user_id: req.user.id },
    };

    const order = await razorpay.orders.create(options);
    res.json({
      razorpay_order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) { next(err); }
});

// POST /api/payment/verify
// Verify payment signature after Razorpay callback
router.post('/verify', async (req, res, next) => {
  try {
    const crypto = require('crypto');
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    res.json({
      verified: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
    });
  } catch (err) { next(err); }
});

module.exports = router;