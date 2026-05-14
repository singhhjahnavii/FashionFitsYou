const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');

// GET /api/categories — full tree
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;

    // Build tree structure
    const map = {};
    const roots = [];
    data.forEach(cat => { map[cat.id] = { ...cat, children: [] }; });
    data.forEach(cat => {
      if (cat.parent_id && map[cat.parent_id]) {
        map[cat.parent_id].children.push(map[cat.id]);
      } else if (!cat.parent_id) {
        roots.push(map[cat.id]);
      }
    });

    res.json(roots);
  } catch (err) { next(err); }
});

// GET /api/categories/flat — for dropdowns/filters
router.get('/flat', async (req, res, next) => {
  try {
    const { gender } = req.query;
    let query = supabaseAdmin
      .from('categories')
      .select('id, name, slug, parent_id, gender, display_order')
      .eq('is_active', true)
      .order('display_order');

    if (gender) query = query.or(`gender.eq.${gender},gender.eq.all,gender.eq.unisex`);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;