/* ============================================================
   cart.js — Cart state, localStorage sync, drawer UI
   ============================================================ */

const cart = {
  _items: [],   // { variantId, productId, name, brand, image, size, color, price, quantity }
  _open: false,

  // ── Init ────────────────────────────────────────────────
  init() {
    this._loadLocal();
    this._renderDrawer();
    this._updateBadge();
    this._bindDrawerEvents();

    // If logged in, pull server cart and merge
    if (auth.isLoggedIn()) this.syncFromServer();
  },

  _loadLocal() {
    try {
      const raw = localStorage.getItem('ffy_cart');
      this._items = raw ? JSON.parse(raw) : [];
    } catch { this._items = []; }
  },

  _saveLocal() {
    localStorage.setItem('ffy_cart', JSON.stringify(this._items));
  },

  // ── Sync from server (on login) ─────────────────────────
  async syncFromServer() {
    try {
      const data = await api.cart.get();
      if (!data?.items) return;

      // Merge: server is source of truth for logged-in users
      this._items = data.items.map(i => {
        const p = i.variant?.product;
        const price = ((p?.base_price || 0) + (i.variant?.price_adjustment || 0))
          * (1 - (p?.discount_percent || 0) / 100);
        return {
          cartItemId: i.id,
          variantId:  i.variant?.id,
          productId:  p?.id,
          slug:       p?.slug,
          name:       p?.name,
          brand:      p?.brand,
          image:      p?.images?.find(x => x.is_primary)?.url || p?.images?.[0]?.url,
          size:       i.variant?.size,
          color:      i.variant?.color,
          price:      Math.round(price * 100) / 100,
          quantity:   i.quantity,
        };
      });

      this._saveLocal();
      this._renderDrawer();
      this._updateBadge();
    } catch (e) { console.warn('Cart sync failed:', e.message); }
  },

  // ── Add item ────────────────────────────────────────────
  async add({ variantId, productId, slug, name, brand, image, size, color, price, quantity = 1 }) {
    const existing = this._items.find(i => i.variantId === variantId);

    if (existing) {
      existing.quantity += quantity;
    } else {
      this._items.push({ variantId, productId, slug, name, brand, image, size, color, price, quantity });
    }

    this._saveLocal();
    this._renderDrawer();
    this._updateBadge();
    this.open();
    toast.show(`${name} added to cart`, 'success');

    // Persist to server if logged in
    if (auth.isLoggedIn()) {
      try {
        const res = await api.cart.add(variantId, quantity);
        if (existing) existing.cartItemId = res?.id;
        else this._items[this._items.length - 1].cartItemId = res?.id;
        this._saveLocal();
      } catch (e) { console.warn('Cart server sync failed:', e.message); }
    }
  },

  // ── Update quantity ─────────────────────────────────────
  async updateQty(variantId, qty) {
    const item = this._items.find(i => i.variantId === variantId);
    if (!item) return;
    if (qty < 1) return this.remove(variantId);
    item.quantity = qty;
    this._saveLocal();
    this._renderDrawer();
    this._updateBadge();

    if (auth.isLoggedIn() && item.cartItemId) {
      try { await api.cart.update(item.cartItemId, qty); } catch {}
    }
  },

  // ── Remove ──────────────────────────────────────────────
  async remove(variantId) {
    const item = this._items.find(i => i.variantId === variantId);
    this._items = this._items.filter(i => i.variantId !== variantId);
    this._saveLocal();
    this._renderDrawer();
    this._updateBadge();

    if (auth.isLoggedIn() && item?.cartItemId) {
      try { await api.cart.remove(item.cartItemId); } catch {}
    }
  },

  // ── Clear ───────────────────────────────────────────────
  clear(alsoServer = true) {
    this._items = [];
    this._saveLocal();
    this._renderDrawer();
    this._updateBadge();
    if (alsoServer && auth.isLoggedIn()) {
      api.cart.clear().catch(() => {});
    }
  },

  // ── Computed ────────────────────────────────────────────
  get count()    { return this._items.reduce((s, i) => s + i.quantity, 0); },
  get subtotal() { return Math.round(this._items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100; },
  get shipping() { return this.subtotal > 999 ? 0 : (this._items.length ? 99 : 0); },
  get total()    { return Math.round((this.subtotal + this.shipping) * 100) / 100; },
  get items()    { return this._items; },

  // ── Drawer toggle ───────────────────────────────────────
  open()  { this._open = true;  this._applyDrawerState(); },
  close() { this._open = false; this._applyDrawerState(); },
  toggle(){ this._open ? this.close() : this.open(); },

  _applyDrawerState() {
    document.getElementById('cart-drawer')?.classList.toggle('open', this._open);
    document.getElementById('cart-overlay')?.classList.toggle('show', this._open);
    document.body.style.overflow = this._open ? 'hidden' : '';
  },

  // ── Badge ───────────────────────────────────────────────
  _updateBadge() {
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = this.count;
      el.style.display = this.count > 0 ? 'flex' : 'none';
    });
  },

  // ── Render drawer HTML ──────────────────────────────────
  _renderDrawer() {
    const itemsEl = document.getElementById('cart-items');
    const subtotalEl = document.getElementById('cart-subtotal');
    const shippingEl = document.getElementById('cart-shipping');
    const totalEl   = document.getElementById('cart-total');
    const countEl   = document.getElementById('cart-drawer-count');
    if (!itemsEl) return;

    countEl && (countEl.textContent = `${this.count} item${this.count !== 1 ? 's' : ''}`);

    if (this._items.length === 0) {
      itemsEl.innerHTML = `
        <div class="empty-state" style="padding:var(--space-16) var(--space-8)">
          <div class="empty-state__icon">🛍️</div>
          <p class="empty-state__title" style="font-size:var(--text-xl)">Your cart is empty</p>
          <p class="empty-state__text">Add items to get started</p>
          <button class="btn btn-primary btn-sm mt-4" onclick="cart.close()">Continue Shopping</button>
        </div>`;
    } else {
      itemsEl.innerHTML = this._items.map(item => `
        <div class="cart-item" data-variant="${item.variantId}">
          <img class="cart-item__image"
               src="${item.image || 'https://placehold.co/80x100/f2f0eb/9a9690?text=FFY'}"
               alt="${item.name}" loading="lazy">
          <div class="cart-item__info">
            <span class="cart-item__brand">${item.brand || ''}</span>
            <a href="<a href="/pages/product-detail.html?slug=${item.slug}"pages/product-detail.html?slug=${item.slug}" class="cart-item__name">${item.name}</a>
            <span class="cart-item__meta">
              ${item.size ? `Size: ${item.size}` : ''}
              ${item.size && item.color ? ' · ' : ''}
              ${item.color ? `Color: ${item.color}` : ''}
            </span>
            <div class="cart-item__actions">
              <div class="qty-control">
                <button onclick="cart.updateQty('${item.variantId}', ${item.quantity - 1})" aria-label="Decrease">−</button>
                <span>${item.quantity}</span>
                <button onclick="cart.updateQty('${item.variantId}', ${item.quantity + 1})" aria-label="Increase">+</button>
              </div>
              <span style="font-weight:500;font-size:var(--text-sm)">₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
              <button class="cart-item__remove" onclick="cart.remove('${item.variantId}')" aria-label="Remove">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              </button>
            </div>
          </div>
        </div>`).join('');
    }

    if (subtotalEl) subtotalEl.textContent = `₹${this.subtotal.toLocaleString('en-IN')}`;
    if (shippingEl) shippingEl.textContent = this.shipping === 0 ? 'FREE' : `₹${this.shipping}`;
    if (totalEl)    totalEl.textContent    = `₹${this.total.toLocaleString('en-IN')}`;
  },

  // ── Bind static drawer events ────────────────────────────
  _bindDrawerEvents() {
    document.getElementById('cart-close-btn')?.addEventListener('click', () => this.close());
    document.getElementById('cart-overlay')?.addEventListener('click', () => this.close());
    document.querySelectorAll('[data-cart-toggle]').forEach(el =>
      el.addEventListener('click', () => this.toggle()));
  },
};