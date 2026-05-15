/* ============================================================
   utils.js — Shared helpers, toast, formatters, DOM utilities
   ============================================================ */

// ── Toast ─────────────────────────────────────────────────
const toast = {
  _container: null,

  _getContainer() {
    if (!this._container) {
      this._container = document.getElementById('toast-container');
      if (!this._container) {
        this._container = document.createElement('div');
        this._container.id = 'toast-container';
        document.body.appendChild(this._container);
      }
    }
    return this._container;
  },

  show(message, type = 'info', duration = 3500) {
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span style="font-size:1rem;font-weight:700">${icons[type] || icons.info}</span><span>${message}</span>`;
    this._getContainer().appendChild(el);

    setTimeout(() => {
      el.classList.add('hiding');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, duration);
  },
};

// ── Price formatting ───────────────────────────────────────
const fmt = {
  price(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  },

  discountedPrice(basePrice, discountPercent) {
    if (!discountPercent) return basePrice;
    return Math.round(basePrice * (1 - discountPercent / 100));
  },

  discount(base, pct) {
    return Math.round(base - this.discountedPrice(base, pct));
  },

  date(isoStr) {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  },

  relativeDate(isoStr) {
    if (!isoStr) return '';
    const diff = Date.now() - new Date(isoStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30)  return `${days} days ago`;
    return fmt.date(isoStr);
  },
};

// ── Stars renderer ─────────────────────────────────────────
function renderStars(rating, total) {
  const filled = Math.round(rating);
  const stars = Array.from({ length: 5 }, (_, i) =>
    `<span class="${i < filled ? 'filled' : ''}">★</span>`).join('');
  const label = total !== undefined
    ? `<span style="color:var(--color-ink-muted);font-size:var(--text-xs)">(${total})</span>`
    : '';
  return `<span class="stars">${stars}</span>${label}`;
}

// ── Price block HTML ───────────────────────────────────────
function renderPriceBlock(base, discountPct, size = '') {
  const current = fmt.discountedPrice(base, discountPct);
  const sizeStyle = size === 'lg' ? 'font-size:var(--text-2xl)' : '';

  if (!discountPct) {
    return `<div class="price-block">
      <span class="price-current" style="${sizeStyle}">${fmt.price(current)}</span>
    </div>`;
  }
  return `<div class="price-block">
    <span class="price-current" style="${sizeStyle}">${fmt.price(current)}</span>
    <span class="price-original">${fmt.price(base)}</span>
    <span class="price-discount">${discountPct}% OFF</span>
  </div>`;
}

// ── Badge HTML ─────────────────────────────────────────────
function renderBadge(tag) {
  const map = {
    trending:   ['badge-gold', 'Trending'],
    new:        ['badge-ink',  'New'],
    bestseller: ['badge-success', 'Bestseller'],
    sale:       ['badge-error', 'Sale'],
  };
  const [cls, label] = map[tag] || ['badge-ink', tag];
  return `<span class="badge ${cls} uppercase">${label}</span>`;
}

// ── Order status styling ────────────────────────────────────
function orderStatusBadge(status) {
  const map = {
    pending:          'badge-warning',
    confirmed:        'badge-info',
    processing:       'badge-info',
    shipped:          'badge-gold',
    out_for_delivery: 'badge-gold',
    delivered:        'badge-success',
    cancelled:        'badge-error',
    return_requested: 'badge-warning',
    returned:         'badge-ink',
    refunded:         'badge-success',
  };
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return `<span class="badge ${map[status] || 'badge-ink'}">${label}</span>`;
}

// ── Debounce ───────────────────────────────────────────────
function debounce(fn, delay = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ── Query param helpers ────────────────────────────────────
const params = {
  get(key) { return new URLSearchParams(window.location.search).get(key); },
  getAll() { return Object.fromEntries(new URLSearchParams(window.location.search)); },
  set(obj) {
    const sp = new URLSearchParams(window.location.search);
    Object.entries(obj).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') sp.delete(k);
      else sp.set(k, v);
    });
    const q = sp.toString();
    history.replaceState(null, '', window.location.pathname + (q ? '?' + q : ''));
  },
};

// ── Pagination renderer ────────────────────────────────────
function renderPagination(container, { page, totalPages, onPageChange }) {
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  const pages = [];

  if (page > 2) pages.push(1, '…');
  else if (page === 2) pages.push(1);

  for (let p = Math.max(1, page - 1); p <= Math.min(totalPages, page + 1); p++) {
    pages.push(p);
  }

  if (page < totalPages - 1) pages.push('…', totalPages);
  else if (page === totalPages - 1) pages.push(totalPages);

  container.innerHTML = `
    <div class="pagination">
      <button class="pagination__btn" ${page <= 1 ? 'disabled' : ''}
        onclick="(${onPageChange})(${page - 1})">‹</button>
      ${pages.map(p => p === '…'
        ? `<span style="padding:0 var(--space-2);color:var(--color-ink-muted)">…</span>`
        : `<button class="pagination__btn ${p === page ? 'active' : ''}"
            onclick="(${onPageChange})(${p})">${p}</button>`
      ).join('')}
      <button class="pagination__btn" ${page >= totalPages ? 'disabled' : ''}
        onclick="(${onPageChange})(${page + 1})">›</button>
    </div>`;
}

// ── Product card HTML ──────────────────────────────────────
function renderProductCard(product) {
  const images = product.images || product.product_images || [];
  const primary = images.find(i => i.is_primary) || images[0];
  const secondary = images[1];
  const tags = product.tags || [];
  const isWishlisted = wishlist.has(product.id);

  return `
    <div class="product-card" onclick="window.location='pages/product-detail.html?slug=${product.slug}'">
      <div class="product-card__image-wrap">
        <img class="product-card__image"
             src="${primary?.url || 'https://placehold.co/300x400/f2f0eb/9a9690?text=FFY'}"
             alt="${product.name}" loading="lazy">
        ${secondary ? `<img class="product-card__image-alt" src="${secondary.url}" alt="${product.name}" loading="lazy">` : ''}

        ${tags.length ? `<div class="product-card__badges">${tags.slice(0,2).map(renderBadge).join('')}</div>` : ''}

        <button class="product-card__wishlist ${isWishlisted ? 'active' : ''}"
                onclick="event.stopPropagation(); wishlist.toggle('${product.id}', this)"
                aria-label="Wishlist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${isWishlisted ? 'currentColor' : 'none'}"
               stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <div class="product-card__quick-add"
             onclick="event.stopPropagation(); quickAdd('${product.slug}')">
          Quick Add
        </div>
      </div>
      <div class="product-card__body">
        ${product.brand ? `<span class="product-card__brand">${product.brand}</span>` : ''}
        <h3 class="product-card__name">${product.name}</h3>
        ${product.average_rating > 0
          ? `<div class="product-card__rating">${renderStars(product.average_rating)} <span>${product.average_rating.toFixed(1)}</span></div>`
          : ''}
        <div class="product-card__price">
          ${renderPriceBlock(product.base_price, product.discount_percent)}
        </div>
      </div>
    </div>`;
}

// ── Wishlist helper (lightweight, state lives in wishlist.js) ─
const wishlist = {
  _ids: new Set(),
  init() {
    try {
      const raw = localStorage.getItem('ffy_wishlist');
      if (raw) this._ids = new Set(JSON.parse(raw));
    } catch {}
  },
  has(id) { return this._ids.has(id); },
  async toggle(productId, btn) {
    if (!auth.isLoggedIn()) {
      toast.show('Please sign in to save to wishlist', 'info');
      return;
    }
    if (this._ids.has(productId)) {
      this._ids.delete(productId);
      btn?.classList.remove('active');
      btn && (btn.querySelector('path').setAttribute('fill', 'none'));
      localStorage.setItem('ffy_wishlist', JSON.stringify([...this._ids]));
      try { await api.user.removeWishlist(productId); } catch {}
      toast.show('Removed from wishlist', 'info');
    } else {
      this._ids.add(productId);
      btn?.classList.add('active');
      btn && (btn.querySelector('path').setAttribute('fill', 'currentColor'));
      localStorage.setItem('ffy_wishlist', JSON.stringify([...this._ids]));
      try { await api.user.addWishlist(productId); } catch {}
      toast.show('Saved to wishlist', 'success');
    }
  },
};

// ── Quick-add modal (single variant or navigate to detail) ──
async function quickAdd(slug) {
  try {
    const product = await api.products.detail(slug);
    const variants = product.variants || [];

    if (variants.length === 1) {
      const v = variants[0];
      if (v.stock_quantity < 1) { toast.show('Out of stock', 'error'); return; }
      await cart.add({
        variantId: v.id,
        productId: product.id,
        slug:      product.slug,
        name:      product.name,
        brand:     product.brand,
        image:     product.images?.find(i => i.is_primary)?.url,
        size:      v.size,
        color:     v.color,
        price:     fmt.discountedPrice(product.base_price + (v.price_adjustment || 0), product.discount_percent),
      });
    } else {
      window.location.href = `pages/product-detail.html?slug=${slug}`;
    }
  } catch {
    window.location.href = `pages/product-detail.html?slug=${slug}`;
  }
}

// ── Skeleton card ──────────────────────────────────────────
function skeletonCard() {
  return `<div class="product-card" style="pointer-events:none">
    <div class="skeleton" style="aspect-ratio:3/4"></div>
    <div style="padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-2)">
      <div class="skeleton" style="height:10px;width:40%"></div>
      <div class="skeleton" style="height:14px;width:80%"></div>
      <div class="skeleton" style="height:14px;width:60%"></div>
      <div class="skeleton" style="height:18px;width:45%;margin-top:var(--space-2)"></div>
    </div>
  </div>`;
}

// ── Breadcrumb builder ─────────────────────────────────────
function buildBreadcrumb(container, crumbs) {
  // crumbs = [{ label, href? }, ...]
  container.innerHTML = `<nav class="breadcrumb">
    ${crumbs.map((c, i) => `
      <div class="breadcrumb__item">
        ${i > 0 ? '<span class="breadcrumb__separator">/</span>' : ''}
        ${c.href && i < crumbs.length - 1
          ? `<a class="breadcrumb__link" href="${c.href}">${c.label}</a>`
          : `<span class="breadcrumb__current">${c.label}</span>`}
      </div>`).join('')}
  </nav>`;
}

// ── Navbar scroll effect ───────────────────────────────────
function initNavbarScroll() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

// ── Mobile hamburger ───────────────────────────────────────
function initMobileMenu() {
  const btn  = document.querySelector('.navbar__hamburger');
  const menu = document.querySelector('.navbar__mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    const open = btn.classList.toggle('active');
    menu.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
}

// ── Live search ────────────────────────────────────────────
function initSearch() {
  const input   = document.querySelector('.navbar__search-input');
  const results = document.querySelector('.navbar__search-results');
  if (!input || !results) return;

  const doSearch = debounce(async (q) => {
    if (q.length < 2) { results.classList.remove('show'); return; }
    try {
      const data = await api.products.list({ search: q, limit: 5 });
      if (!data?.products?.length) { results.classList.remove('show'); return; }
      results.innerHTML = data.products.map(p => {
        const img = p.images?.find(i => i.is_primary)?.url || p.images?.[0]?.url;
        return `<div class="search-result-item"
                     onclick="window.location='pages/product-detail.html?slug=${p.slug}'">
          <img class="search-result-img"
               src="${img || 'https://placehold.co/48x48/f2f0eb/9a9690?text=F'}"
               alt="${p.name}" loading="lazy">
          <div>
            <div class="search-result-name">${p.name}</div>
            <div class="search-result-price">${renderPriceBlock(p.base_price, p.discount_percent)}</div>
          </div>
        </div>`;
      }).join('');
      results.classList.add('show');
    } catch {}
  }, 350);

  input.addEventListener('input', e => doSearch(e.target.value.trim()));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      window.location.href = `pages/products.html?search=${encodeURIComponent(input.value.trim())}`;
    }
  });
  document.addEventListener('click', e => {
    if (!input.contains(e.target)) results.classList.remove('show');
  });
}

// ── Page init (called on every page) ──────────────────────
function initPage() {
  initNavbarScroll();
  initMobileMenu();
  initSearch();
  wishlist.init();
  if (typeof cart !== 'undefined') {
    cart.init();
  }
}

document.addEventListener('DOMContentLoaded', initPage);