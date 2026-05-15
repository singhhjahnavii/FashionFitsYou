/* ============================================================
   orders.js — Orders list + Order detail page logic
   ============================================================ */

const ordersPage = (() => {
  let state = { page: 1, status: null };

  async function init() {
    if (!auth.requireAuth()) return;
    const orderId = params.get('id');
    if (orderId) {
      await loadOrderDetail(orderId);
    } else {
      await loadOrdersList();
      bindStatusTabs();
    }
  }

  // ── Orders List ───────────────────────────────────────────
  async function loadOrdersList() {
    const container = document.getElementById('orders-list');
    if (!container) return;

    container.innerHTML = `<div style="display:flex;flex-direction:column;gap:var(--space-4)">
      ${Array(3).fill(0).map(() => `
        <div class="skeleton" style="height:160px;border-radius:var(--radius-md)"></div>`).join('')}
    </div>`;

    try {
      const queryParams = { page: state.page, limit: 10 };
      if (state.status) queryParams.status = state.status;
      const data = await api.orders.list(queryParams);

      if (!data.orders?.length) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state__icon">📦</div>
            <p class="empty-state__title">No orders yet</p>
            <p class="empty-state__text">Once you place an order, it will appear here.</p>
            <a href="/pages/products.html" class="btn btn-primary btn-sm mt-4">Start Shopping</a>
          </div>`;
        return;
      }

      container.innerHTML = data.orders.map(renderOrderCard).join('');

      // Pagination
      const paginEl = document.getElementById('orders-pagination');
      if (paginEl) {
        renderPagination(paginEl, {
          page: state.page,
          totalPages: data.pagination?.totalPages || 1,
          onPageChange: `function(p){ordersPage.goTo(p)}`,
        });
      }
    } catch (e) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <p class="empty-state__title">Failed to load orders</p>
        <p class="empty-state__text">${e.message}</p>
        <button class="btn btn-outline btn-sm mt-4" onclick="ordersPage.reload()">Retry</button>
      </div>`;
    }
  }

  function renderOrderCard(order) {
    const date        = fmt.date(order.created_at);
    const itemCount   = order.items?.length || 0;
    const firstItem   = order.items?.[0];
    const extraItems  = itemCount - 1;

    return `
      <div class="order-card" onclick="window.location='/pages/orders.html?id=${order.id}'">
        <div class="order-card__header">
          <div>
            <span class="order-card__number">${order.order_number}</span>
            <span class="order-card__date">${date}</span>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-3)">
            ${orderStatusBadge(order.status)}
            <span class="order-card__total">${fmt.price(order.total_amount)}</span>
          </div>
        </div>

        ${firstItem ? `
          <div class="order-card__items">
            <div class="order-card__item">
              <img src="${firstItem.product_image || 'https://placehold.co/64x80/f2f0eb/9a9690?text=F'}"
                   alt="${firstItem.product_name}" class="order-card__item-img" loading="lazy">
              <div class="order-card__item-info">
                <span class="order-card__item-name">${firstItem.product_name}</span>
                <span class="order-card__item-meta">
                  ${firstItem.size ? `Size: ${firstItem.size}` : ''}
                  ${firstItem.size && firstItem.color ? ' · ' : ''}
                  ${firstItem.color ? `Color: ${firstItem.color}` : ''}
                  · Qty: ${firstItem.quantity}
                </span>
              </div>
            </div>
            ${extraItems > 0 ? `<span class="order-card__extra">+${extraItems} more item${extraItems > 1 ? 's' : ''}</span>` : ''}
          </div>` : ''}

        <div class="order-card__footer">
          <span style="font-size:var(--text-xs);color:var(--color-ink-muted)">
            ${order.estimated_delivery && order.status !== 'delivered'
              ? `Estimated delivery: ${fmt.date(order.estimated_delivery)}`
              : order.status === 'delivered' ? '✓ Delivered' : ''}
          </span>
          <span class="order-card__view-link">View Details →</span>
        </div>
      </div>`;
  }

  // ── Order Detail ──────────────────────────────────────────
  async function loadOrderDetail(orderId) {
    const container = document.getElementById('order-detail');
    if (!container) return;

    container.innerHTML = `<div class="skeleton" style="height:600px;border-radius:var(--radius-md)"></div>`;

    try {
      const order = await api.orders.detail(orderId);
      const addr  = order.shipping_address;

      const statusOrder = ['pending','confirmed','processing','shipped','out_for_delivery','delivered'];
      const currentStep = statusOrder.indexOf(order.status);

      container.innerHTML = `
        <!-- Header -->
        <div class="od-header">
          <div>
            <h2 class="od-number">${order.order_number}</h2>
            <span style="color:var(--color-ink-muted);font-size:var(--text-sm)">Placed on ${fmt.date(order.created_at)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-4)">
            ${orderStatusBadge(order.status)}
            ${['pending','confirmed','processing'].includes(order.status) ? `
              <button class="btn btn-outline btn-sm"
                      onclick="ordersPage.cancelOrder('${order.id}')">Cancel Order</button>` : ''}
          </div>
        </div>

        <!-- Tracker -->
        ${!['cancelled','return_requested','returned','refunded'].includes(order.status) ? `
          <div class="od-tracker">
            ${statusOrder.map((s, i) => `
              <div class="od-tracker__step ${i <= currentStep ? 'done' : ''} ${i === currentStep ? 'current' : ''}">
                <div class="od-tracker__dot">
                  ${i < currentStep ? '✓' : i + 1}
                </div>
                <span class="od-tracker__label">${s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</span>
              </div>
              ${i < statusOrder.length - 1 ? `<div class="od-tracker__line ${i < currentStep ? 'done' : ''}"></div>` : ''}
            `).join('')}
          </div>` : ''}

        <div class="od-grid">
          <!-- Items -->
          <div class="od-items">
            <h3 class="od-section-title">Items Ordered</h3>
            ${order.items?.map(item => `
              <div class="od-item">
                <img src="${item.product_image || 'https://placehold.co/80x100/f2f0eb/9a9690?text=F'}"
                     alt="${item.product_name}" class="od-item__img" loading="lazy">
                <div class="od-item__info">
                  <span class="od-item__name">${item.product_name}</span>
                  <span class="od-item__meta">
                    ${item.size ? `Size: ${item.size}` : ''}
                    ${item.size && item.color ? ' · ' : ''}
                    ${item.color ? `Color: ${item.color}` : ''}
                  </span>
                  <span class="od-item__qty">Qty: ${item.quantity} × ${fmt.price(item.unit_price)}</span>
                </div>
                <span class="od-item__total">${fmt.price(item.total_price)}</span>
              </div>`).join('')}
          </div>

          <!-- Right column: summary + address -->
          <div>
            <!-- Price summary -->
            <div class="od-summary">
              <h3 class="od-section-title">Order Summary</h3>
              <div class="od-summary__row"><span>Subtotal</span><span>${fmt.price(order.subtotal)}</span></div>
              ${order.discount_amount > 0
                ? `<div class="od-summary__row" style="color:var(--color-success)"><span>Discount</span><span>−${fmt.price(order.discount_amount)}</span></div>` : ''}
              <div class="od-summary__row"><span>Shipping</span><span>${order.shipping_amount > 0 ? fmt.price(order.shipping_amount) : 'FREE'}</span></div>
              <div class="od-summary__row od-summary__row--total">
                <span>Total</span><span>${fmt.price(order.total_amount)}</span>
              </div>
              <div class="od-summary__row" style="font-size:var(--text-xs);color:var(--color-ink-muted)">
                <span>Payment</span>
                <span>${(order.payment_method || '').replace(/_/g,' ').toUpperCase()}
                  · ${order.payment_status === 'paid' ? '✓ Paid' : order.payment_status}</span>
              </div>
            </div>

            <!-- Shipping address -->
            <div class="od-address">
              <h3 class="od-section-title">Delivery Address</h3>
              <p class="od-address__name">${addr?.full_name}</p>
              <p class="od-address__line">${addr?.line1}${addr?.line2 ? ', ' + addr.line2 : ''}</p>
              <p class="od-address__line">${addr?.city}, ${addr?.state} — ${addr?.pincode}</p>
              <p class="od-address__phone">📞 ${addr?.phone}</p>
            </div>

            <!-- Status history -->
            ${order.status_history?.length ? `
              <div class="od-history">
                <h3 class="od-section-title">Status History</h3>
                ${order.status_history.map(h => `
                  <div class="od-history__item">
                    <div class="od-history__dot"></div>
                    <div>
                      <span class="od-history__status">${h.status.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</span>
                      ${h.message ? `<span class="od-history__msg"> — ${h.message}</span>` : ''}
                      <div class="od-history__time">${fmt.date(h.updated_at)}</div>
                    </div>
                  </div>`).join('')}
              </div>` : ''}
          </div>
        </div>`;
    } catch (e) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <p class="empty-state__title">Could not load order</p>
        <p class="empty-state__text">${e.message}</p>
        <a href="/pages/orders.html" class="btn btn-outline btn-sm mt-4">Back to Orders</a>
      </div>`;
    }
  }

  // ── Status filter tabs ────────────────────────────────────
  function bindStatusTabs() {
    document.querySelectorAll('[data-status]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('[data-status]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.status = tab.dataset.status || null;
        state.page   = 1;
        loadOrdersList();
      });
    });
  }

  async function cancelOrder(orderId) {
    const reason = prompt('Reason for cancellation (optional):');
    if (reason === null) return; // user pressed Cancel
    try {
      await api.orders.cancel(orderId, reason);
      toast.show('Order cancelled successfully', 'success');
      setTimeout(() => loadOrderDetail(orderId), 800);
    } catch (e) {
      toast.show(e.message, 'error');
    }
  }

  function goTo(page) {
    state.page = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadOrdersList();
  }

  function reload() { loadOrdersList(); }

  return { init, cancelOrder, goTo, reload };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('orders-list') || document.getElementById('order-detail')) {
    ordersPage.init();
  }
});