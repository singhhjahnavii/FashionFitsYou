const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

// GET /api/orders
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;

    let query = supabaseAdmin
      .from('orders')
      .select(`
        id, order_number, status, payment_status, total_amount,
        created_at, estimated_delivery,
        items:order_items(
          id, product_name, product_image, size, color, quantity, unit_price, total_price
        )
      `, { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      orders: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
      }
    });
  } catch (err) { next(err); }
});

// GET /api/orders/:orderId
router.get('/:orderId', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        status_history:order_status_history(status, message, updated_at)
      `)
      .eq('id', req.params.orderId)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Order not found' });

    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/orders — place order (called after successful payment)
router.post('/', async (req, res, next) => {
  try {
    const {
      address_id, coupon_id, payment_method,
      payment_id, razorpay_order_id
    } = req.body;

    // Fetch cart
    const { data: cartItems, error: cartError } = await supabaseAdmin
      .from('cart_items')
      .select(`
        quantity,
        variant:product_variants(
          id, size, color, price_adjustment, stock_quantity,
          product:products(id, name, base_price, discount_percent,
            images:product_images(url, is_primary)
          )
        )
      `)
      .eq('user_id', req.user.id);

    if (cartError) throw cartError;
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Fetch address
    const { data: address, error: addrError } = await supabaseAdmin
      .from('addresses')
      .select('*')
      .eq('id', address_id)
      .eq('user_id', req.user.id)
      .single();

    if (addrError || !address) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = cartItems.map(item => {
      const product = item.variant?.product;
      const price = (product?.base_price || 0) + (item.variant?.price_adjustment || 0);
      const discounted = price * (1 - (product?.discount_percent || 0) / 100);
      const total = Math.round(discounted * item.quantity * 100) / 100;
      subtotal += total;

      return {
        variant_id: item.variant.id,
        product_name: product.name,
        product_image: product.images?.find(i => i.is_primary)?.url,
        size: item.variant.size,
        color: item.variant.color,
        quantity: item.quantity,
        unit_price: Math.round(discounted * 100) / 100,
        total_price: total,
      };
    });

    // Apply coupon
    let discountAmount = 0;
    if (coupon_id) {
      const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('id', coupon_id)
        .single();

      if (coupon) {
        discountAmount = coupon.type === 'percent'
          ? Math.min(subtotal * coupon.value / 100, coupon.max_discount || Infinity)
          : coupon.value;

        // Increment usage
        await supabaseAdmin
          .from('coupons')
          .update({ usage_count: coupon.usage_count + 1 })
          .eq('id', coupon_id);
      }
    }

    const shipping = subtotal > 999 ? 0 : 99;
    const total = Math.round((subtotal - discountAmount + shipping) * 100) / 100;
    const estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: req.user.id,
        shipping_address: address,
        subtotal,
        discount_amount: discountAmount,
        shipping_amount: shipping,
        total_amount: total,
        coupon_id,
        status: payment_method === 'cod' ? 'confirmed' : 'pending',
        payment_status: payment_method === 'cod' ? 'pending' : 'paid',
        payment_method,
        payment_id,
        razorpay_order_id,
        estimated_delivery: estimatedDelivery.toISOString().split('T')[0],
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const itemsWithOrderId = orderItems.map(item => ({ ...item, order_id: order.id }));
    await supabaseAdmin.from('order_items').insert(itemsWithOrderId);

    // Add initial status history
    await supabaseAdmin.from('order_status_history').insert({
      order_id: order.id,
      status: order.status,
      message: 'Order placed successfully',
    });

    // Decrement stock
    for (const item of cartItems) {
      await supabaseAdmin
        .from('product_variants')
        .update({
          stock_quantity: item.variant.stock_quantity - item.quantity
        })
        .eq('id', item.variant.id);
    }

    // Clear cart
    await supabaseAdmin.from('cart_items').delete().eq('user_id', req.user.id);

    res.status(201).json({
      order_id: order.id,
      order_number: order.order_number,
      total_amount: order.total_amount,
      status: order.status,
    });
  } catch (err) { next(err); }
});

// POST /api/orders/:orderId/cancel
router.post('/:orderId/cancel', async (req, res, next) => {
  try {
    const { reason } = req.body;

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, user_id')
      .eq('id', req.params.orderId)
      .eq('user_id', req.user.id)
      .single();

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const cancellable = ['pending', 'confirmed', 'processing'];
    if (!cancellable.includes(order.status)) {
      return res.status(400).json({
        error: `Order cannot be cancelled in ${order.status} status`
      });
    }

    await supabaseAdmin
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', order.id);

    await supabaseAdmin.from('order_status_history').insert({
      order_id: order.id,
      status: 'cancelled',
      message: reason || 'Cancelled by customer',
    });

    res.json({ message: 'Order cancelled successfully' });
  } catch (err) { next(err); }
});

module.exports = router;