const express  = require('express');
const router   = express.Router();
const { supabaseAdmin }                = require('../config/supabase');
const { authMiddleware, optionalAuth } = require('../middleware/auth.middleware');

// GET /api/products
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      gender, category, brand, minPrice, maxPrice,
      sort = 'newest', page = 1, limit = 20,
      search, tags, featured,
    } = req.query;

    // Step 1: resolve category IDs
    let categoryIds = null;

    if (category) {
      // Specific leaf slug e.g. 'men-clothing-shirts' — ignore gender
      const { data: cats, error: catErr } = await supabaseAdmin
        .from('categories').select('id').eq('slug', category).limit(1);
      if (catErr) throw catErr;
      if (!cats || cats.length === 0) {
        return res.json({ products: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 } });
      }
      categoryIds = cats.map(c => c.id);

    } else if (gender) {
      // Get all categories for this gender, then keep only leaf nodes
      // Leaf = slug has 2+ hyphens: 'men-clothing-shirts' not 'men' or 'men-clothing'
      const { data: allCats, error: catErr } = await supabaseAdmin
        .from('categories').select('id, slug').eq('gender', gender).eq('is_active', true);
      if (catErr) throw catErr;
      if (!allCats || allCats.length === 0) {
        return res.json({ products: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 } });
      }
      const leafCats = allCats.filter(c => (c.slug.match(/-/g) || []).length >= 2);
      categoryIds = (leafCats.length > 0 ? leafCats : allCats).map(c => c.id);
    }

    // Step 2: build products query
    let query = supabaseAdmin
      .from('products')
      .select(`
        id, name, slug, base_price, discount_percent, brand, tags,
        average_rating, total_reviews, is_featured, created_at,
        category:categories!products_category_id_fkey(id, name, slug, gender, parent_id),
        images:product_images(url, is_primary),
        variants:product_variants(id, size, color, color_hex, stock_quantity, price_adjustment)
      `, { count: 'exact' })
      .eq('is_active', true);

    if (categoryIds && categoryIds.length > 0) query = query.in('category_id', categoryIds);
    if (brand)               query = query.ilike('brand', `%${brand}%`);
    if (minPrice)            query = query.gte('base_price', parseFloat(minPrice));
    if (maxPrice)            query = query.lte('base_price', parseFloat(maxPrice));
    if (search)              query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%`);
    if (tags)                query = query.contains('tags', [tags]);
    if (featured === 'true') query = query.eq('is_featured', true);

    switch (sort) {
      case 'price_asc':  query = query.order('base_price',     { ascending: true  }); break;
      case 'price_desc': query = query.order('base_price',     { ascending: false }); break;
      case 'rating':     query = query.order('average_rating', { ascending: false }); break;
      default:           query = query.order('created_at',     { ascending: false }); break;
    }

    const from = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(from, from + parseInt(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      products: data || [],
      pagination: {
        page: parseInt(page), limit: parseInt(limit),
        total: count || 0, totalPages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  } catch (err) { next(err); }
});

// GET /api/products/:slug
router.get('/:slug', optionalAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        category:categories!products_category_id_fkey(id, name, slug, gender, parent_id),
        images:product_images(id, url, alt_text, display_order, is_primary),
        variants:product_variants(id, size, color, color_hex, sku, stock_quantity, price_adjustment),
        reviews(id, rating, title, body, verified_purchase, helpful_count, created_at,
          user:profiles(full_name, avatar_url),
          images:review_images(url)
        )
      `)
      .eq('slug', req.params.slug)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Product not found' });
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/products/:productId/reviews
router.post('/:productId/reviews', authMiddleware, async (req, res, next) => {
  try {
    const { rating, title, body } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .insert({ product_id: req.params.productId, user_id: req.user.id, rating, title, body })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

module.exports = router;