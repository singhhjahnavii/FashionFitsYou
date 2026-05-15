/* ============================================================
   payment.js — Checkout & Payment page
   Address selection, coupon, Razorpay, order placement
   ============================================================ */

const paymentPage = (() => {
  let state = {
    addresses:      [],
    selectedAddress:null,
    coupon:         null,
    paymentMethod: 'razorpay',
  };

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    if (!auth.requireAuth()) return;
    if (!cart.items.length) { window.location.href = '/pages/cart.html'; return; }

    renderOrderSummary();
    await loadAddresses();
    bindEvents();
  }

  // ── Order Summary ─────────────────────────────────────────
  function renderOrderSummary() {
    const el = document.getElementById('checkout-items');
    if (!el) return;
    el.innerHTML = cart.items.map(item => `
      <div class="checkout-item">
        <img src="${item.image || 'https://placehold.co/64x80/f2f0eb/9a9690?text=F'}"
             alt="${item.name}" class="checkout-item__img">
        <div class="checkout-item__info">
          <span class="checkout-item__name">${item.name}</span>
          <span class="checkout-item__meta">
            ${item.size ? `Size: ${item.size}` : ''}
            ${item.size && item.color ? ' · ' : ''}
            ${item.color ? item.color : ''}
            · Qty ${item.quantity}
          </span>
        </div>
        <span class="checkout-item__price">${fmt.price(item.price * item.quantity)}</span>
      </div>`).join('');

    updateTotals();
  }

  function updateTotals() {
    const discount   = state.coupon?.discount_amount || 0;
    const subtotal   = cart.subtotal;
    const shipping   = cart.shipping;
    const total      = Math.max(0, subtotal - discount + shipping);

    setText('co-subtotal', fmt.price(subtotal));
    setText('co-shipping', shipping === 0 ? 'FREE' : fmt.price(shipping));
    setText('co-total',    fmt.price(total));

    const discountRow = document.getElementById('co-discount-row');
    if (discountRow) {
      discountRow.style.display = discount > 0 ? 'flex' : 'none';
      setText('co-discount', `−${fmt.price(discount)}`);
    }
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ── Addresses ─────────────────────────────────────────────
  async function loadAddresses() {
    const container = document.getElementById('address-list');
    if (!container) return;

    try {
      state.addresses = await api.user.getAddresses() || [];
      renderAddresses();
    } catch { toast.show('Failed to load addresses', 'error'); }
  }

  function renderAddresses() {
    const container = document.getElementById('address-list');
    if (!container) return;

    if (!state.addresses.length) {
      container.innerHTML = `
        <div style="padding:var(--space-6);text-align:center;color:var(--color-ink-muted)">
          <p>No saved addresses. Add one to continue.</p>
        </div>`;
      state.selectedAddress = null;
    } else {
      container.innerHTML = state.addresses.map(addr => `
        <label class="address-option ${state.selectedAddress?.id === addr.id ? 'selected' : ''}">
          <input type="radio" name="address" value="${addr.id}"
                 ${state.selectedAddress?.id === addr.id || addr.is_default ? 'checked' : ''}
                 onchange="paymentPage.selectAddress('${addr.id}')">
          <div class="address-option__body">
            <div class="address-option__name">
              ${addr.full_name}
              <span class="badge badge-ink" style="font-size:0.6rem">${addr.label || 'Home'}</span>
              ${addr.is_default ? '<span class="badge badge-gold" style="font-size:0.6rem">Default</span>' : ''}
            </div>
            <div class="address-option__detail">${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}</div>
            <div class="address-option__detail">${addr.city}, ${addr.state} — ${addr.pincode}</div>
            <div class="address-option__phone">📞 ${addr.phone}</div>
          </div>
        </label>`).join('');

      // Auto-select default or first
      const defaultAddr = state.addresses.find(a => a.is_default) || state.addresses[0];
      if (!state.selectedAddress) selectAddress(defaultAddr.id);
    }
  }

  function selectAddress(id) {
    state.selectedAddress = state.addresses.find(a => a.id === id);
    document.querySelectorAll('.address-option').forEach(el => {
      el.classList.toggle('selected', el.querySelector('input').value === id);
    });
  }

  // ── Add Address form ──────────────────────────────────────
  function showAddAddressForm() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.id = 'add-address-modal';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal__header">
          <h3 class="modal__title">Add New Address</h3>
          <button class="modal__close" onclick="document.getElementById('add-address-modal').remove()">✕</button>
        </div>
        <div class="modal__body">
          <form id="add-address-form" onsubmit="paymentPage.submitAddress(event)"
                style="display:flex;flex-direction:column;gap:var(--space-4)">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
              <div class="form-group">
                <label class="form-label">Full Name *</label>
                <input class="form-input" name="full_name" required placeholder="Name on delivery">
              </div>
              <div class="form-group">
                <label class="form-label">Phone *</label>
                <input class="form-input" name="phone" required type="tel" placeholder="10-digit mobile">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Address Line 1 *</label>
              <input class="form-input" name="line1" required placeholder="House/Flat no., Street, Area">
            </div>
            <div class="form-group">
              <label class="form-label">Address Line 2</label>
              <input class="form-input" name="line2" placeholder="Landmark (optional)">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3)">
              <div class="form-group">
                <label class="form-label">City *</label>
                <input class="form-input" name="city" required>
              </div>
              <div class="form-group">
                <label class="form-label">State *</label>
                <input class="form-input" name="state" required>
              </div>
              <div class="form-group">
                <label class="form-label">Pincode *</label>
                <input class="form-input" name="pincode" required maxlength="6" pattern="[0-9]{6}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Label</label>
              <select class="form-select" name="label">
                <option value="Home">Home</option>
                <option value="Work">Work</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <label style="display:flex;align-items:center;gap:var(--space-3);font-size:var(--text-sm)">
              <input type="checkbox" name="is_default" style="accent-color:var(--color-gold)">
              Set as default address
            </label>
            <div class="modal__footer" style="padding:0;border:none">
              <button type="button" class="btn btn-ghost"
                      onclick="document.getElementById('add-address-modal').remove()">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Address</button>
            </div>
          </form>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }

  async function submitAddress(e) {
    e.preventDefault();
    const form = e.target;
    const btn  = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const body = Object.fromEntries(new FormData(form));
    body.is_default = !!form.querySelector('[name=is_default]').checked;

    try {
      const newAddr = await api.user.addAddress(body);
      state.addresses.push(newAddr);
      state.selectedAddress = newAddr;
      renderAddresses();
      document.getElementById('add-address-modal')?.remove();
      toast.show('Address saved', 'success');
    } catch (err) {
      toast.show(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Save Address';
    }
  }

  // ── Coupon ────────────────────────────────────────────────
  async function applyCoupon() {
    const input = document.getElementById('coupon-input');
    const code  = input?.value?.trim();
    if (!code) { toast.show('Enter a coupon code', 'error'); return; }

    const btn = document.getElementById('coupon-btn');
    btn.disabled = true;
    btn.textContent = 'Applying…';

    try {
      const res = await api.cart.validateCoupon(code, cart.subtotal);
      state.coupon = res;
      updateTotals();

      const msgEl = document.getElementById('coupon-msg');
      if (msgEl) {
        msgEl.textContent = res.message;
        msgEl.style.color = 'var(--color-success)';
      }
      input.disabled = true;
      btn.textContent = 'Applied ✓';
      btn.style.background = 'var(--color-success)';
    } catch (err) {
      const msgEl = document.getElementById('coupon-msg');
      if (msgEl) { msgEl.textContent = err.message; msgEl.style.color = 'var(--color-error)'; }
      btn.disabled = false;
      btn.textContent = 'Apply';
    }
  }

  function removeCoupon() {
    state.coupon = null;
    const input = document.getElementById('coupon-input');
    const btn   = document.getElementById('coupon-btn');
    if (input) { input.value = ''; input.disabled = false; }
    if (btn)   { btn.textContent = 'Apply'; btn.disabled = false; btn.style.background = ''; }
    const msgEl = document.getElementById('coupon-msg');
    if (msgEl) msgEl.textContent = '';
    updateTotals();
  }

  // ── Payment method ────────────────────────────────────────
  function selectPaymentMethod(method) {
    state.paymentMethod = method;
    document.querySelectorAll('.payment-method-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.method === method);
    });
  }

  // ── Place order ───────────────────────────────────────────
  async function placeOrder() {
    if (!state.selectedAddress) {
      toast.show('Please select a delivery address', 'error');
      document.getElementById('address-list')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const btn = document.getElementById('place-order-btn');
    btn.disabled = true;
    btn.textContent = 'Processing…';

    try {
      if (state.paymentMethod === 'cod') {
        await createOrder({ payment_method: 'cod' });
      } else {
        await initiateRazorpay();
      }
    } catch (e) {
      toast.show(e.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Place Order';
    }
  }

  async function initiateRazorpay() {
    const discount = state.coupon?.discount_amount || 0;
    const total    = Math.max(1, cart.subtotal - discount + cart.shipping);

    const rzpOrder = await api.payment.createOrder(total);

    const options = {
      key:         rzpOrder.key_id,
      amount:      rzpOrder.amount,
      currency:    rzpOrder.currency,
      name:        'FashionFitsYou',
      description: `Order (${cart.count} item${cart.count > 1 ? 's' : ''})`,
      order_id:    rzpOrder.razorpay_order_id,
      prefill: {
        name:    auth.getUser()?.full_name || '',
        email:   auth.getUser()?.email     || '',
        contact: state.selectedAddress?.phone || '',
      },
      theme: { color: '#C9A84C' },

      handler: async (response) => {
        try {
          await api.payment.verify({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
          });
          await createOrder({
            payment_method:    'razorpay',
            payment_id:        response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
          });
        } catch (e) {
          toast.show('Payment verification failed. Contact support.', 'error');
          document.getElementById('place-order-btn').disabled = false;
          document.getElementById('place-order-btn').textContent = 'Place Order';
        }
      },

      modal: {
        ondismiss() {
          toast.show('Payment cancelled', 'info');
          document.getElementById('place-order-btn').disabled = false;
          document.getElementById('place-order-btn').textContent = 'Place Order';
        },
      },
    };

    const rzp = new Razorpay(options);
    rzp.open();
  }

  async function createOrder({ payment_method, payment_id, razorpay_order_id }) {
    const result = await api.orders.create({
      address_id:        state.selectedAddress.id,
      coupon_id:         state.coupon?.coupon_id || null,
      payment_method,
      payment_id:        payment_id || null,
      razorpay_order_id: razorpay_order_id || null,
    });

    // Go to confirmation
    window.location.href = `/pages/order-conf.html?id=${result.order_id}&number=${result.order_number}`;
  }

  // ── Bind events ───────────────────────────────────────────
  function bindEvents() {
    document.getElementById('coupon-btn')
      ?.addEventListener('click', applyCoupon);
    document.getElementById('coupon-input')
      ?.addEventListener('keydown', e => { if (e.key === 'Enter') applyCoupon(); });
    document.getElementById('place-order-btn')
      ?.addEventListener('click', placeOrder);
    document.getElementById('add-address-btn')
      ?.addEventListener('click', showAddAddressForm);

    document.querySelectorAll('.payment-method-option').forEach(el => {
      el.addEventListener('click', () => selectPaymentMethod(el.dataset.method));
    });
  }

  return { init, selectAddress, showAddAddressForm, submitAddress, applyCoupon, removeCoupon, selectPaymentMethod, placeOrder };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('place-order-btn')) paymentPage.init();
});