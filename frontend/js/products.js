/* ============================================================
   products.js — Product listing page logic
   Handles: filters, sort, pagination, URL sync, grid render
   ============================================================ */

const productsPage = (() => {
  let state = {
    page: 1, limit: 20,
    gender: null, category: null, brand: null,
    minPrice: null, maxPrice: null,
    sort: 'newest', search: null, tags: null,
    totalPages: 1, total: 0,
  };

  const grid        = () => document.getElementById('products-grid');
  const countEl     = () => document.getElementById('result-count');
  const paginEl     = () => document.getElementById('pagination');
  const sortSelect  = () => document.getElementById('sort-select');
  const filterForm  = () => document.getElementById('filter-form');
  const activeFiltersBar = () => document.getElementById('active-filters');

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    readFromURL();
    await loadCategories();
    await fetchProducts();
    bindFilterEvents();
    bindSortEvent();
    renderActiveFilters();
    updatePageTitle();
  }

  function readFromURL() {
    const p = params.getAll();
    state.gender   = p.gender   || null;
    state.category = p.category || null;
    state.brand    = p.brand    || null;
    state.minPrice = p.minPrice || null;
    state.maxPrice = p.maxPrice || null;
    state.sort     = p.sort     || 'newest';
    state.search   = p.search   || null;
    state.tags     = p.tags     || null;
    state.page     = parseInt(p.page) || 1;
  }

  function updatePageTitle() {
    const titleEl = document.getElementById('page-title');
    if (!titleEl) return;
    if (state.search)   { titleEl.textContent = `Results for "${state.search}"`; return; }
    if (state.tags)     { titleEl.textContent = state.tags.charAt(0).toUpperCase() + state.tags.slice(1); return; }
    if (state.category) { titleEl.textContent = state.category.split('-').pop().replace(/\b\w/g, c => c.toUpperCase()); return; }
    if (state.gender)   { titleEl.textContent = state.gender.charAt(0).toUpperCase() + state.gender.slice(1); return; }
    titleEl.textContent = 'All Products';
  }

  // ── Fetch ─────────────────────────────────────────────────
  async function fetchProducts(showSkeleton = true) {
    if (showSkeleton) {
      grid().innerHTML = Array(12).fill(0).map(() => skeletonCard()).join('');
    }

    try {
      const queryParams = {};
      if (state.gender)   queryParams.gender   = state.gender;
      if (state.category) queryParams.category = state.category;
      if (state.brand)    queryParams.brand     = state.brand;
      if (state.minPrice) queryParams.minPrice  = state.minPrice;
      if (state.maxPrice) queryParams.maxPrice  = state.maxPrice;
      if (state.sort)     queryParams.sort      = state.sort;
      if (state.search)   queryParams.search    = state.search;
      if (state.tags)     queryParams.tags      = state.tags;
      queryParams.page  = state.page;
      queryParams.limit = state.limit;

      const data = await api.products.list(queryParams);
      state.totalPages = data.pagination?.totalPages || 1;
      state.total      = data.pagination?.total || 0;

      renderGrid(data.products || []);
      renderPaginationBar();
      updateCount();
    } catch (e) {
      grid().innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state__icon">⚠️</div>
        <p class="empty-state__title">Could not load products</p>
        <p class="empty-state__text">${e.message}</p>
        <button class="btn btn-outline btn-sm mt-4" onclick="productsPage.reload()">Try Again</button>
      </div>`;
    }
  }

  // ── Render grid ───────────────────────────────────────────
  function renderGrid(products) {
    if (!products.length) {
      grid().innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state__icon">🔍</div>
        <p class="empty-state__title">No products found</p>
        <p class="empty-state__text">Try adjusting your filters or search query</p>
        <button class="btn btn-outline btn-sm mt-4" onclick="productsPage.clearFilters()">Clear Filters</button>
      </div>`;
      return;
    }
    grid().innerHTML = products.map(renderProductCard).join('');
  }

  function updateCount() {
    const el = countEl();
    if (el) el.textContent = `${state.total.toLocaleString('en-IN')} product${state.total !== 1 ? 's' : ''}`;
  }

  function renderPaginationBar() {
    const el = paginEl();
    if (!el) return;
    renderPagination(el, {
      page: state.page,
      totalPages: state.totalPages,
      onPageChange: `function(p){productsPage.goTo(p)}`,
    });
  }

  // ── Categories for sidebar ────────────────────────────────
  async function loadCategories() {
    const sidebarCats = document.getElementById('sidebar-categories');
    if (!sidebarCats) return;
    try {
      const cats = await api.categories.flat(state.gender);
      // Show only level-2 (type groups) and level-3 relevant to current gender
      const level2 = cats.filter(c => c.parent_id && cats.some(p => !p.parent_id && p.id === c.parent_id));
      const level3 = cats.filter(c => c.parent_id && level2.some(p => p.id === c.parent_id));

      // Group level3 under their level2 parent
      const grouped = level2.map(l2 => ({
        ...l2,
        children: level3.filter(l3 => l3.parent_id === l2.id),
      }));

      sidebarCats.innerHTML = grouped.map(group => `
        <div class="filter-group">
          <div class="filter-group__header" onclick="this.parentElement.classList.toggle('collapsed')">
            <span class="filter-group__title">${group.name}</span>
            <span class="filter-group__toggle">›</span>
          </div>
          <div class="filter-group__body">
            ${group.children.map(cat => `
              <label class="filter-option">
                <input type="radio" name="category" value="${cat.slug}"
                  ${state.category === cat.slug ? 'checked' : ''}>
                <span>${cat.name}</span>
              </label>`).join('')}
          </div>
        </div>`).join('');
    } catch (e) { console.warn('Failed to load categories:', e.message); }
  }

  // ── Filter events ─────────────────────────────────────────
  function bindFilterEvents() {
    const form = filterForm();
    if (!form) return;

    // Gender tabs
    document.querySelectorAll('[data-gender]').forEach(btn => {
      if (state.gender === btn.dataset.gender) btn.classList.add('active');
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-gender]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyFilter({ gender: btn.dataset.gender || null, category: null, page: 1 });
      });
    });

    // Category radios (sidebar)
    form.addEventListener('change', e => {
      if (e.target.name === 'category') {
        applyFilter({ category: e.target.value, page: 1 });
      }
      if (e.target.name === 'tags') {
        applyFilter({ tags: e.target.value || null, page: 1 });
      }
    });

    // Price range
    const minInput = form.querySelector('[name=minPrice]');
    const maxInput = form.querySelector('[name=maxPrice]');
    const applyPrice = debounce(() => {
      applyFilter({
        minPrice: minInput?.value || null,
        maxPrice: maxInput?.value || null,
        page: 1,
      });
    }, 600);
    minInput?.addEventListener('input', applyPrice);
    maxInput?.addEventListener('input', applyPrice);

    // Clear all
    document.getElementById('clear-filters-btn')?.addEventListener('click', clearFilters);

    // Mobile filter open/close
    document.getElementById('open-filters-btn')?.addEventListener('click', () => {
      document.querySelector('.filter-sidebar')?.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
    document.getElementById('close-filters-btn')?.addEventListener('click', () => {
      document.querySelector('.filter-sidebar')?.classList.remove('open');
      document.body.style.overflow = '';
    });
  }

  function bindSortEvent() {
    const sel = sortSelect();
    if (!sel) return;
    sel.value = state.sort;
    sel.addEventListener('change', () => {
      applyFilter({ sort: sel.value, page: 1 });
    });
  }

  // ── Apply a filter change ─────────────────────────────────
  function applyFilter(changes) {
    Object.assign(state, changes);
    params.set({
      gender: state.gender, category: state.category,
      brand:  state.brand,  minPrice: state.minPrice,
      maxPrice: state.maxPrice, sort: state.sort,
      search: state.search, tags: state.tags,
      page: state.page > 1 ? state.page : null,
    });
    updatePageTitle();
    renderActiveFilters();
    fetchProducts();
  }

  // ── Active filter pills ───────────────────────────────────
  function renderActiveFilters() {
    const bar = activeFiltersBar();
    if (!bar) return;
    const active = [];
    if (state.gender)   active.push({ label: state.gender, key: 'gender' });
    if (state.category) active.push({ label: state.category.split('-').pop(), key: 'category' });
    if (state.tags)     active.push({ label: state.tags, key: 'tags' });
    if (state.brand)    active.push({ label: state.brand, key: 'brand' });
    if (state.minPrice || state.maxPrice) {
      active.push({ label: `₹${state.minPrice || 0}–₹${state.maxPrice || '∞'}`, key: 'price' });
    }

    if (!active.length) { bar.innerHTML = ''; return; }
    bar.innerHTML = `
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:var(--space-2)">
        <span style="font-size:var(--text-xs);color:var(--color-ink-muted)">Active:</span>
        ${active.map(f => `
          <button class="badge badge-ink" style="gap:6px;cursor:pointer"
                  onclick="productsPage.removeFilter('${f.key}')">
            ${f.label} ×
          </button>`).join('')}
        <button class="btn btn-ghost btn-sm" onclick="productsPage.clearFilters()">Clear all</button>
      </div>`;
  }

  function clearFilters() {
    Object.assign(state, {
      gender: null, category: null, brand: null,
      minPrice: null, maxPrice: null, tags: null,
      search: null, page: 1,
    });
    filterForm()?.reset();
    document.querySelectorAll('[data-gender]').forEach(b => b.classList.remove('active'));
    params.set({ gender: null, category: null, brand: null, minPrice: null, maxPrice: null, tags: null, search: null, page: null });
    renderActiveFilters();
    updatePageTitle();
    fetchProducts();
  }

  function removeFilter(key) {
    if (key === 'price') { state.minPrice = null; state.maxPrice = null; }
    else state[key] = null;
    applyFilter({});
  }

  function goTo(page) {
    state.page = page;
    params.set({ page: page > 1 ? page : null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchProducts();
  }

  function reload() { fetchProducts(); }

  return { init, goTo, removeFilter, clearFilters, reload };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('products-grid')) productsPage.init();
});