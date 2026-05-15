/* ============================================================
   product-detail.js — Product detail page
   Image gallery, variant selection, add to cart, reviews
   ============================================================ */

const productDetail = (() => {
  let product = null;
  let selectedVariant = null;
  let currentImageIdx = 0;

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    const slug = params.get('slug');
    if (!slug) { window.location.href = '/pages/products.html'; return; }

    showSkeleton();
    try {
      product = await api.products.detail(slug);
      render();
    } catch (e) {
      document.getElementById('product-main').innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <p class="empty-state__title">Product not found</p>
          <p class="empty-state__text">${e.message}</p>
          <a href="/pages/products.html" class="btn btn-outline btn-sm mt-4">Back to Products</a>
        </div>`;
    }
  }

  // ── Skeleton ──────────────────────────────────────────────
  function showSkeleton() {
    document.getElementById('product-main').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-12)">
        <div class="skeleton" style="aspect-ratio:3/4;border-radius:var(--radius-md)"></div>
        <div style="display:flex;flex-direction:column;gap:var(--space-5)">
          <div class="skeleton" style="height:14px;width:30%"></div>
          <div class="skeleton" style="height:32px;width:85%"></div>
          <div class="skeleton" style="height:32px;width:55%"></div>
          <div class="skeleton" style="height:24px;width:45%"></div>
          <div class="skeleton" style="height:60px"></div>
          <div class="skeleton" style="height:52px;border-radius:4px"></div>
          <div class="skeleton" style="height:52px;border-radius:4px"></div>
        </div>
      </div>`;
  }

  // ── Main render ───────────────────────────────────────────
  function render() {
    document.title = `${product.name} — FashionFitsYou`;

    // Breadcrumb
    const bc = document.getElementById('breadcrumb');
    if (bc) {
      const crumbs = [
        { label: 'Home',     href: '/pages/home.html' },
        { label: 'Products', href: '/pages/products.html' },
      ];
      if (product.category?.parent) {
        crumbs.push({ label: product.category.parent.name, href: `/pages/products.html?category=${product.category.parent.slug}` });
      }
      if (product.category) {
        crumbs.push({ label: product.category.name, href: `/pages/products.html?category=${product.category.slug}` });
      }
      crumbs.push({ label: product.name });
      buildBreadcrumb(bc, crumbs);
    }

    const images   = product.images || [];
    const variants = product.variants || [];
    const sizes    = [...new Set(variants.filter(v => v.size).map(v => v.size))];
    const colors   = [...new Map(variants.filter(v => v.color).map(v => [v.color, v])).values()];
    const tags     = product.tags || [];

    document.getElementById('product-main').innerHTML = `
      <div class="pd-layout">
        <!-- Gallery -->
        <div class="pd-gallery">
          <div class="pd-gallery__thumbs" id="gallery-thumbs">
            ${images.map((img, i) => `
              <button class="pd-gallery__thumb ${i === 0 ? 'active' : ''}"
                      onclick="productDetail.setImage(${i})" aria-label="View image ${i+1}">
                <img src="${img.url}" alt="${img.alt_text || product.name}" loading="lazy">
              </button>`).join('')}
          </div>
          <div class="pd-gallery__main">
            <img id="gallery-main-img"
                 src="${images[0]?.url || 'https://placehold.co/600x800/f2f0eb/9a9690?text=FFY'}"
                 alt="${product.name}">
            ${images.length > 1 ? `
              <button class="pd-gallery__nav pd-gallery__nav--prev" onclick="productDetail.prevImage()">‹</button>
              <button class="pd-gallery__nav pd-gallery__nav--next" onclick="productDetail.nextImage()">›</button>` : ''}
            ${tags.includes('sale') || tags.includes('new') || tags.includes('trending') ? `
              <div class="pd-gallery__badges">
                ${tags.slice(0,2).map(renderBadge).join('')}
              </div>` : ''}

            <button class="pd-gallery__wishlist ${wishlist.has(product.id) ? 'active' : ''}"
                    id="detail-wishlist-btn"
                    onclick="wishlist.toggle('${product.id}', this)"
                    aria-label="Add to wishlist">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="${wishlist.has(product.id) ? 'currentColor' : 'none'}"
                   stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Info panel -->
        <div class="pd-info">
          ${product.brand ? `<span class="pd-brand">${product.brand}</span>` : ''}
          <h1 class="pd-title">${product.name}</h1>

          ${product.average_rating > 0 ? `
            <div class="pd-rating">
              ${renderStars(product.average_rating, product.total_reviews)}
              <a href="#reviews" class="pd-rating__link">${product.total_reviews} review${product.total_reviews !== 1 ? 's' : ''}</a>
            </div>` : ''}

          <div class="pd-price">
            ${renderPriceBlock(product.base_price, product.discount_percent, 'lg')}
            ${product.discount_percent ? `
              <span class="pd-saving">You save ${fmt.price(fmt.discount(product.base_price, product.discount_percent))}</span>` : ''}
          </div>

          ${colors.length > 0 ? `
            <div class="pd-variant-group">
              <span class="pd-variant-label">Color: <strong id="selected-color">${colors[0].color}</strong></span>
              <div class="pd-colors">
                ${colors.map(v => `
                  <button class="color-swatch ${v === colors[0] ? 'active' : ''}"
                          style="background:${v.color_hex || '#ccc'}"
                          title="${v.color}"
                          data-color="${v.color}"
                          onclick="productDetail.selectColor('${v.color}', this)"></button>`).join('')}
              </div>
            </div>` : ''}

          ${sizes.length > 0 ? `
            <div class="pd-variant-group">
              <span class="pd-variant-label">Size:
                <strong id="selected-size">Select Size</strong>
              </span>
              <div class="pd-sizes" id="size-grid">
                ${sizes.map(size => `
                  <button class="pd-size-btn"
                          data-size="${size}"
                          onclick="productDetail.selectSize('${size}', this)">${size}</button>`).join('')}
              </div>
              <a href="#" class="pd-size-guide" onclick="productDetail.showSizeGuide(event)">Size Guide</a>
            </div>` : ''}

          <!-- Stock indicator -->
          <div id="stock-indicator" class="pd-stock"></div>

          <!-- Actions -->
          <div class="pd-actions">
            <button id="add-to-cart-btn" class="btn btn-primary btn-full btn-lg"
                    onclick="productDetail.addToCart()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              Add to Cart
            </button>
            <button class="btn btn-outline btn-full btn-lg"
                    onclick="productDetail.buyNow()">
              Buy Now
            </button>
          </div>

          <!-- Trust badges -->
          <div class="pd-trust">
            <div class="pd-trust-item">
              <span>🚚</span>
              <span>Free delivery on orders above ₹999</span>
            </div>
            <div class="pd-trust-item">
              <span>↩️</span>
              <span>Easy 30-day returns</span>
            </div>
            <div class="pd-trust-item">
              <span>✅</span>
              <span>Authentic & quality guaranteed</span>
            </div>
          </div>

          <!-- Description -->
          ${product.description ? `
            <div class="pd-description">
              <h3>About this product</h3>
              <p>${product.description}</p>
            </div>` : ''}
        </div>
      </div>

      <!-- Reviews section -->
      <div id="reviews" class="pd-reviews">
        ${renderReviewsSection(product.reviews || [])}
      </div>`;

    // Auto-select first variant if no sizes
    if (sizes.length === 0 && variants.length > 0) {
      selectedVariant = variants[0];
      updateStock();
    }
  }

  // ── Image gallery ─────────────────────────────────────────
  function setImage(idx) {
    const images = product?.images || [];
    if (idx < 0 || idx >= images.length) return;
    currentImageIdx = idx;
    document.getElementById('gallery-main-img').src = images[idx].url;
    document.querySelectorAll('.pd-gallery__thumb').forEach((t, i) => {
      t.classList.toggle('active', i === idx);
    });
  }

  function prevImage() { setImage(currentImageIdx - 1); }
  function nextImage() { setImage(currentImageIdx + 1); }

  // ── Variant selection ─────────────────────────────────────
  let selectedColor = null;
  let selectedSize  = null;

  function selectColor(color, btn) {
    selectedColor = color;
    document.getElementById('selected-color').textContent = color;
    document.querySelectorAll('[data-color]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    resolveVariant();
  }

  function selectSize(size, btn) {
    selectedSize = size;
    document.getElementById('selected-size').textContent = size;
    document.querySelectorAll('.pd-size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    resolveVariant();
  }

  function resolveVariant() {
    const variants = product?.variants || [];
    selectedVariant = variants.find(v => {
      const colorMatch = !selectedColor || v.color === selectedColor;
      const sizeMatch  = !selectedSize  || v.size  === selectedSize;
      return colorMatch && sizeMatch;
    }) || null;
    updateStock();
  }

  function updateStock() {
    const el = document.getElementById('stock-indicator');
    if (!el) return;
    if (!selectedVariant) { el.innerHTML = ''; return; }
    const qty = selectedVariant.stock_quantity;
    if (qty === 0) {
      el.innerHTML = `<span style="color:var(--color-error);font-weight:500">✕ Out of Stock</span>`;
      document.getElementById('add-to-cart-btn').disabled = true;
    } else if (qty <= 5) {
      el.innerHTML = `<span style="color:var(--color-warning);font-weight:500">⚠ Only ${qty} left</span>`;
      document.getElementById('add-to-cart-btn').disabled = false;
    } else {
      el.innerHTML = `<span style="color:var(--color-success);font-weight:500">✓ In Stock</span>`;
      document.getElementById('add-to-cart-btn').disabled = false;
    }
  }

  // ── Add to cart ───────────────────────────────────────────
  async function addToCart() {
    const variants = product?.variants || [];
    const sizes    = [...new Set(variants.filter(v => v.size).map(v => v.size))];

    if (sizes.length > 0 && !selectedSize) {
      toast.show('Please select a size', 'error');
      document.getElementById('size-grid')?.classList.add('shake');
      setTimeout(() => document.getElementById('size-grid')?.classList.remove('shake'), 600);
      return;
    }

    if (!selectedVariant) {
      if (variants.length === 1) selectedVariant = variants[0];
      else { toast.show('Please select a variant', 'error'); return; }
    }

    if (selectedVariant.stock_quantity < 1) {
      toast.show('This variant is out of stock', 'error');
      return;
    }

    const effectivePrice = fmt.discountedPrice(
      product.base_price + (selectedVariant.price_adjustment || 0),
      product.discount_percent
    );

    await cart.add({
      variantId: selectedVariant.id,
      productId: product.id,
      slug:      product.slug,
      name:      product.name,
      brand:     product.brand,
      image:     product.images?.find(i => i.is_primary)?.url,
      size:      selectedVariant.size,
      color:     selectedVariant.color,
      price:     effectivePrice,
    });
  }

  async function buyNow() {
    await addToCart();
    if (cart.items.length > 0) {
      window.location.href = '/pages/cart.html';
    }
  }

  // ── Size guide modal ──────────────────────────────────────
  function showSizeGuide(e) {
    e.preventDefault();
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal__header">
          <h3 class="modal__title">Size Guide</h3>
          <button class="modal__close" onclick="this.closest('.modal-backdrop').remove()">✕</button>
        </div>
        <div class="modal__body">
          <table style="width:100%;border-collapse:collapse;font-size:var(--text-sm)">
            <thead>
              <tr style="background:var(--color-bg-alt)">
                <th style="padding:var(--space-3);text-align:left;border-bottom:1px solid var(--color-border)">Size</th>
                <th style="padding:var(--space-3);text-align:left;border-bottom:1px solid var(--color-border)">Chest (in)</th>
                <th style="padding:var(--space-3);text-align:left;border-bottom:1px solid var(--color-border)">Waist (in)</th>
              </tr>
            </thead>
            <tbody>
              ${[['XS','32-34','26-28'],['S','34-36','28-30'],['M','36-38','30-32'],['L','38-40','32-34'],['XL','40-42','34-36'],['XXL','42-44','36-38']]
                .map(([s,c,w]) => `<tr><td style="padding:var(--space-3);border-bottom:1px solid var(--color-border-light)">${s}</td>
                  <td style="padding:var(--space-3);border-bottom:1px solid var(--color-border-light)">${c}</td>
                  <td style="padding:var(--space-3);border-bottom:1px solid var(--color-border-light)">${w}</td></tr>`).join('')}
            </tbody>
          </table>
          <p style="font-size:var(--text-xs);color:var(--color-ink-muted);margin-top:var(--space-4)">
            Measurements are approximate. When between sizes, size up.
          </p>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }

  // ── Reviews ───────────────────────────────────────────────
  function renderReviewsSection(reviews) {
    const avgRating = product.average_rating || 0;
    const total     = product.total_reviews   || 0;

    const distribution = [5,4,3,2,1].map(star => ({
      star,
      count: reviews.filter(r => r.rating === star).length,
      pct:   total ? Math.round(reviews.filter(r => r.rating === star).length / total * 100) : 0,
    }));

    return `
      <h2 class="pd-reviews__title">Customer Reviews</h2>
      ${total > 0 ? `
        <div class="pd-reviews__summary">
          <div class="pd-reviews__avg">
            <span class="pd-reviews__avg-num">${avgRating.toFixed(1)}</span>
            ${renderStars(avgRating)}
            <span style="color:var(--color-ink-muted);font-size:var(--text-sm)">${total} reviews</span>
          </div>
          <div class="pd-reviews__dist">
            ${distribution.map(d => `
              <div class="pd-reviews__dist-row">
                <span style="font-size:var(--text-xs);min-width:40px">${d.star} star</span>
                <div class="pd-reviews__bar"><div class="pd-reviews__bar-fill" style="width:${d.pct}%"></div></div>
                <span style="font-size:var(--text-xs);min-width:30px;color:var(--color-ink-muted)">${d.count}</span>
              </div>`).join('')}
          </div>
        </div>

        <div class="pd-reviews__list">
          ${reviews.slice(0, 5).map(r => `
            <div class="pd-review">
              <div class="pd-review__header">
                <div class="pd-review__avatar">${(r.user?.full_name || 'U').charAt(0)}</div>
                <div>
                  <div class="pd-review__name">${r.user?.full_name || 'Anonymous'}</div>
                  <div style="display:flex;align-items:center;gap:var(--space-3)">
                    ${renderStars(r.rating)}
                    <span style="font-size:var(--text-xs);color:var(--color-ink-muted)">${fmt.relativeDate(r.created_at)}</span>
                    ${r.verified_purchase ? '<span class="badge badge-success" style="font-size:0.6rem">Verified</span>' : ''}
                  </div>
                </div>
              </div>
              ${r.title ? `<h4 class="pd-review__title">${r.title}</h4>` : ''}
              ${r.body ? `<p class="pd-review__body">${r.body}</p>` : ''}
            </div>`).join('')}
        </div>` : '<p style="color:var(--color-ink-muted)">No reviews yet. Be the first to review this product!</p>'}

      ${auth.isLoggedIn() ? renderReviewForm() : `
        <p style="margin-top:var(--space-8);font-size:var(--text-sm);color:var(--color-ink-secondary)">
          <a href="/pages/login.html" style="color:var(--color-gold);text-decoration:underline">Sign in</a> to write a review.
        </p>`}`;
  }

  function renderReviewForm() {
    return `
      <div class="pd-review-form">
        <h3>Write a Review</h3>
        <form id="review-form" onsubmit="productDetail.submitReview(event)">
          <div class="pd-star-picker" id="star-picker">
            ${[1,2,3,4,5].map(n => `
              <button type="button" class="pd-star-btn" data-val="${n}"
                      onclick="productDetail.setStarRating(${n})">★</button>`).join('')}
          </div>
          <input type="hidden" name="rating" id="review-rating" value="0">
          <div class="form-group">
            <input class="form-input" name="title" placeholder="Review title (optional)" maxlength="100">
          </div>
          <div class="form-group">
            <textarea class="form-textarea" name="body" placeholder="Share your thoughts…" rows="4" required></textarea>
          </div>
          <button type="submit" class="btn btn-primary">Submit Review</button>
        </form>
      </div>`;
  }

  function setStarRating(n) {
    document.getElementById('review-rating').value = n;
    document.querySelectorAll('.pd-star-btn').forEach((btn, i) => {
      btn.style.color = i < n ? 'var(--color-gold)' : 'var(--color-border)';
    });
  }

  async function submitReview(e) {
    e.preventDefault();
    const form = e.target;
    const rating = parseInt(form.querySelector('#review-rating').value);
    if (!rating) { toast.show('Please select a rating', 'error'); return; }

    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    try {
      await api.products.addReview(product.id, {
        rating,
        title: form.querySelector('[name=title]').value,
        body:  form.querySelector('[name=body]').value,
      });
      toast.show('Review submitted!', 'success');
      // Reload product to show new review
      product = await api.products.detail(product.slug);
      document.getElementById('reviews').innerHTML = renderReviewsSection(product.reviews || []);
    } catch (e) {
      toast.show(e.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Submit Review';
    }
  }

  return { init, setImage, prevImage, nextImage, selectColor, selectSize, addToCart, buyNow, showSizeGuide, setStarRating, submitReview };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('product-main')) productDetail.init();
});