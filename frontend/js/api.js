/* ============================================================
   api.js — Fetch wrapper for all FashionFitsYou backend calls
   ============================================================ */

const API_BASE = 'https://fashionfitsyou.onrender.com/api';
const api = {

  // ── Core ──────────────────────────────────────────────────
  getToken() {
    return localStorage.getItem('ffy_token');
  },

  headers(extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    const token = this.getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  },

  async request(method, path, body = null, options = {}) {
    const url    = `${API_BASE}${path}`;
    const config = { method, headers: this.headers(options.headers || {}) };
    if (body) config.body = JSON.stringify(body);

    try {
      const res  = await fetch(url, config);

      // Token expired — try refresh once
      if (res.status === 401 && !options._retried) {
        const refreshed = await this._tryRefresh();
        if (refreshed) return this.request(method, path, body, { ...options, _retried: true });
        else { this._forceLogout(); return; }
      }

      const data = await res.json();
      if (!res.ok) throw new ApiError(data.error || 'Request failed', res.status);
      return data;

    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('Network error — is the backend running on port 3000?', 0);
    }
  },

  async _tryRefresh() {
    const refresh_token = localStorage.getItem('ffy_refresh_token');
    if (!refresh_token) return false;
    try {
      const data = await this.request('POST', '/auth/refresh', { refresh_token }, { _retried: true });
      if (data?.token) {
        localStorage.setItem('ffy_token', data.token);
        localStorage.setItem('ffy_refresh_token', data.refresh_token);
        return true;
      }
      return false;
    } catch { return false; }
  },

  _forceLogout() {
    ['ffy_token', 'ffy_refresh_token', 'ffy_user', 'ffy_cart'].forEach(k =>
      localStorage.removeItem(k)
    );
    const pub = ['/pages/login.html', '/pages/register.html', '/pages/index.html'];
    const onPublic = pub.some(p => window.location.pathname.includes(p));
    if (!onPublic) window.location.href = '/pages/login.html';
  },

  get:    (path, opts)       => api.request('GET',    path, null, opts || {}),
  post:   (path, body, opts) => api.request('POST',   path, body, opts || {}),
  patch:  (path, body, opts) => api.request('PATCH',  path, body, opts || {}),
  delete: (path, opts)       => api.request('DELETE', path, null, opts || {}),

  // ── Auth ──────────────────────────────────────────────────
  auth: {
    register:       (body)  => api.post('/auth/register', body),
    login:          (body)  => api.post('/auth/login', body),
    logout:         ()      => api.post('/auth/logout'),
    refresh:        (body)  => api.post('/auth/refresh', body),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    me:             ()      => api.get('/auth/me'),
  },

  // ── Products ──────────────────────────────────────────────
  products: {
    list: (params = {}) => {
      const q = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== ''))
      ).toString();
      return api.get(`/products${q ? '?' + q : ''}`);
    },
    detail:    (slug)        => api.get(`/products/${slug}`),
    addReview: (id, payload) => api.post(`/products/${id}/reviews`, payload),
  },

  // ── Categories ────────────────────────────────────────────
  categories: {
    tree: ()       => api.get('/categories'),
    flat: (gender) => api.get(`/categories/flat${gender ? '?gender=' + gender : ''}`),
  },

  // ── Cart ──────────────────────────────────────────────────
  cart: {
    get:            ()                 => api.get('/cart'),
    add:            (variant_id, qty)  => api.post('/cart', { variant_id, quantity: qty }),
    update:         (itemId, quantity) => api.patch(`/cart/${itemId}`, { quantity }),
    remove:         (itemId)           => api.delete(`/cart/${itemId}`),
    clear:          ()                 => api.delete('/cart'),
    validateCoupon: (code, subtotal)   => api.post('/cart/validate-coupon', { code, subtotal }),
  },

  // ── Orders ────────────────────────────────────────────────
  orders: {
    list: (params = {}) => {
      const q = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== ''))
      ).toString();
      return api.get(`/orders${q ? '?' + q : ''}`);
    },
    detail: (id)           => api.get(`/orders/${id}`),
    create: (body)         => api.post('/orders', body),
    cancel: (id, reason)   => api.post(`/orders/${id}/cancel`, { reason }),
  },

  // ── Payment ───────────────────────────────────────────────
  payment: {
    createOrder: (amount)  => api.post('/payment/create-order', { amount }),
    verify:      (payload) => api.post('/payment/verify', payload),
  },

  // ── User ──────────────────────────────────────────────────
  user: {
    getProfile:     ()          => api.get('/user/profile'),
    updateProfile:  (body)      => api.patch('/user/profile', body),
    getAddresses:   ()          => api.get('/user/addresses'),
    addAddress:     (body)      => api.post('/user/addresses', body),
    updateAddress:  (id, body)  => api.patch(`/user/addresses/${id}`, body),
    deleteAddress:  (id)        => api.delete(`/user/addresses/${id}`),
    getWishlist:    ()          => api.get('/user/wishlist'),
    addWishlist:    (product_id)=> api.post('/user/wishlist', { product_id }),
    removeWishlist: (product_id)=> api.delete(`/user/wishlist/${product_id}`),
  },
};

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name   = 'ApiError';
  }
}