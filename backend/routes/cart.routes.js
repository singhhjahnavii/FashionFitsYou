const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth.middleware');

// All cart routes require authentication
router.use(authMiddleware);

// GET /api/cart
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .select(`
        id, quantity, added_at,
        variant:product_variants(
          id, size, color, color_hex, stock_quantity, price_adjustment,
          product:products(
            id, name, slug, base_price, discount_percent, brand,
            images:product_images(url, is_primary)
          )
        )
      `)
      .eq('user_id', req.user.id)
      .order('added_at', { ascending: false });

    if (error) throw error;

    // Calculate totals
    let subtotal = 0;
    const items = (data || []).map(item => {
      const product = item.variant?.product;
      const price = (product?.base_price || 0) + (item.variant?.price_adjustment || 0);
      const discounted = price * (1 - (product?.discount_percent || 0) / 100);
      const itemTotal = discounted * item.quantity;
      subtotal += itemTotal;
      return { ...item, unit_price: discounted, item_total: itemTotal };
    });

    res.json({
      items,
      summary: {
        subtotal: Math.round(subtotal * 100) / 100,
        shipping: subtotal > 999 ? 0 : 99,
        total: Math.round((subtotal + (subtotal > 999 ? 0 : 99)) * 100) / 100,
        item_count: items.reduce((acc, i) => acc + i.quantity, 0),
      }
    });
  } catch (err) { next(err); }
});

// POST /api/cart — add item
router.post('/', async (req, res, next) => {
  try {
    const { variant_id, quantity = 1 } = req.body;
    if (!variant_id) return res.status(400).json({ error: 'variant_id is required' });

    // Check stock
    const { data: variant } = await supabaseAdmin
      .from('product_variants')
      .select('stock_quantity')
      .eq('id', variant_id)
      .single();

    if (!variant || variant.stock_quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Upsert cart item
    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .upsert({
        user_id: req.user.id,
        variant_id,
        quantity,
      }, {
        onConflict: 'user_id,variant_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

// PATCH /api/cart/:itemId — update quantity
router.patch('/:itemId', async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .update({ quantity })
      .eq('id', req.params.itemId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Cart item not found' });

    res.json(data);
  } catch (err) { next(err); }
});

// DELETE /api/cart/:itemId
router.delete('/:itemId', async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('id', req.params.itemId)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Item removed from cart' });
  } catch (err) { next(err); }
});

// DELETE /api/cart — clear cart
router.delete('/', async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('cart_items')
      .delete()
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Cart cleared' });
  } catch (err) { next(err); }
});

// POST /api/cart/validate-coupon
router.post('/validate-coupon', async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ error: 'Coupon code required' });

    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !coupon) return res.status(404).json({ error: 'Invalid coupon code' });

    const now = new Date();
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return res.status(400).json({ error: 'Coupon is not yet active' });
    }
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }
    if (subtotal < coupon.min_order_amount) {
      return res.status(400).json({
        error: `Minimum order amount of ₹${coupon.min_order_amount} required`
      });
    }

    let discount = coupon.type === 'percent'
      ? (subtotal * coupon.value / 100)
      : coupon.value;

    if (coupon.max_discount) {
      discount = Math.min(discount, coupon.max_discount);
    }

    res.json({
      coupon_id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      discount_amount: Math.round(discount * 100) / 100,
      message: `Coupon applied! You save ₹${discount.toFixed(2)}`
    });
  } catch (err) { next(err); }
});

module.exports = router;