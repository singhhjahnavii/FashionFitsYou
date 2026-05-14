const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth.middleware');

router.use(authMiddleware);

// GET /api/user/profile
router.get('/profile', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// PATCH /api/user/profile
router.patch('/profile', async (req, res, next) => {
  try {
    const { full_name, phone, gender, date_of_birth, avatar_url } = req.body;
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ full_name, phone, gender, date_of_birth, avatar_url })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/user/addresses
router.get('/addresses', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('addresses')
      .select('*')
      .eq('user_id', req.user.id)
      .order('is_default', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/user/addresses
router.post('/addresses', async (req, res, next) => {
  try {
    const { full_name, phone, line1, line2, city, state, pincode, label, is_default } = req.body;

    if (is_default) {
      // Unset existing defaults
      await supabaseAdmin
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', req.user.id);
    }

    const { data, error } = await supabaseAdmin
      .from('addresses')
      .insert({
        user_id: req.user.id,
        full_name, phone, line1, line2, city, state, pincode, label,
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

// PATCH /api/user/addresses/:id
router.patch('/addresses/:id', async (req, res, next) => {
  try {
    const updates = req.body;
    if (updates.is_default) {
      await supabaseAdmin
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', req.user.id);
    }

    const { data, error } = await supabaseAdmin
      .from('addresses')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// DELETE /api/user/addresses/:id
router.delete('/addresses/:id', async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('addresses')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Address deleted' });
  } catch (err) { next(err); }
});

// GET /api/user/wishlist
router.get('/wishlist', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('wishlist_items')
      .select(`
        id, added_at,
        product:products(
          id, name, slug, base_price, discount_percent, brand, average_rating,
          images:product_images(url, is_primary)
        )
      `)
      .eq('user_id', req.user.id)
      .order('added_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/user/wishlist
router.post('/wishlist', async (req, res, next) => {
  try {
    const { product_id } = req.body;
    const { data, error } = await supabaseAdmin
      .from('wishlist_items')
      .upsert({ user_id: req.user.id, product_id }, { onConflict: 'user_id,product_id' })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

// DELETE /api/user/wishlist/:productId
router.delete('/wishlist/:productId', async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('wishlist_items')
      .delete()
      .eq('user_id', req.user.id)
      .eq('product_id', req.params.productId);

    if (error) throw error;
    res.json({ message: 'Removed from wishlist' });
  } catch (err) { next(err); }
});

module.exports = router;