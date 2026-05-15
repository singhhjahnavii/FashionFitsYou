/* ============================================================
   navbar.js — Injects shared navbar + cart drawer into every page
   Include this BEFORE auth.js, cart.js, utils.js
   ============================================================ */

(function injectShell() {
  const isRoot = window.location.pathname.endsWith('index.html')
              || window.location.pathname === '/'
              || window.location.pathname.endsWith('/');
  const base = '/pages/';
  const navbarHTML = `
  <nav class="navbar" id="main-navbar">
    <div class="container container--wide navbar__inner">

      <!-- Logo -->
      <a href="/pages/home.html" class="navbar__logo">
        <span class="navbar__logo-name">FashionFitsYou</span>
        <span class="navbar__logo-tagline">Style. Fit. You.</span>
      </a>

      <!-- Desktop Nav -->
      <nav class="navbar__nav">
        <div class="navbar__nav-item">
          <a class="navbar__nav-link" href="/pages/products.html?gender=men">
            Men
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </a>
          <div class="navbar__dropdown">
            <div class="navbar__dropdown-col">
              <h4>Clothing</h4>
              <ul>
                <li><a href="/pages/products.html?gender=men&category=men-clothing-shirts">Shirts</a></li>
                <li><a href="/pages/products.html?gender=men&category=men-clothing-tshirts">T-Shirts</a></li>
                <li><a href="/pages/products.html?gender=men&category=men-clothing-jeans">Jeans</a></li>
                <li><a href="/pages/products.html?gender=men&category=men-clothing-jackets">Jackets</a></li>
                <li><a href="/pages/products.html?gender=men&category=men-clothing-kurtas">Kurtas</a></li>
                <li><a href="/pages/products.html?gender=men&category=men-clothing-shorts">Shorts</a></li>
              </ul>
            </div>
            <div class="navbar__dropdown-col">
              <h4>Shoes & Bags</h4>
              <ul>
                <li><a href="/pages/products.html?gender=men&category=men-shoes-sneakers">Sneakers</a></li>
                <li><a href="/pages/products.html?gender=men&category=men-shoes-formal">Formal Shoes</a></li>
                <li><a href="/pages/products.html?gender=men&category=men-shoes-boots">Boots</a></li>
                <li><a href="/pages/products.html?gender=men&category=men-bags-backpacks">Backpacks</a></li>
                <li><a href="/pages/products.html?gender=men&category=men-bags-wallets">Wallets</a></li>
                <li><a href="/pages/products.html?gender=men&category=men-bags-gym">Gym Bags</a></li>
              </ul>
            </div>
            <div class="navbar__dropdown-col">
              <h4>Watches & Accessories</h4>
              <ul>
                <li><a href="/pages/products.html?gender=men&category=men-watches-analog">Analog Watches</a></li>
                <li><a href="/pages/products.html?gender=men&category=men-watches-smart">Smartwatches</a></li>
                <li><a href="/pages/products.html?gender=men&category=men-accessories-belts">Belts</a></li>
                <li><a href="/pages/products.html?gender=men&category=men-accessories-sunglasses">Sunglasses</a></li>
                <li><a href="/pages/products.html?gender=men&category=men-accessories-caps">Caps & Hats</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div class="navbar__nav-item">
          <a class="navbar__nav-link" href="/pages/products.html?gender=women">
            Women
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </a>
          <div class="navbar__dropdown">
            <div class="navbar__dropdown-col">
              <h4>Clothing</h4>
              <ul>
                <li><a href="/pages/products.html?gender=women&category=women-clothing-dresses">Dresses</a></li>
                <li><a href="/pages/products.html?gender=women&category=women-clothing-tops">Tops</a></li>
                <li><a href="/pages/products.html?gender=women&category=women-clothing-kurtis">Kurtis</a></li>
                <li><a href="/pages/products.html?gender=women&category=women-clothing-sarees">Sarees</a></li>
                <li><a href="/pages/products.html?gender=women&category=women-clothing-jeans">Jeans</a></li>
                <li><a href="/pages/products.html?gender=women&category=women-clothing-blazers">Blazers</a></li>
              </ul>
            </div>
            <div class="navbar__dropdown-col">
              <h4>Shoes & Bags</h4>
              <ul>
                <li><a href="/pages/products.html?gender=women&category=women-shoes-heels">Heels</a></li>
                <li><a href="/pages/products.html?gender=women&category=women-shoes-flats">Flats</a></li>
                <li><a href="/pages/products.html?gender=women&category=women-shoes-sneakers">Sneakers</a></li>
                <li><a href="/pages/products.html?gender=women&category=women-bags-handbags">Handbags</a></li>
                <li><a href="/pages/products.html?gender=women&category=women-bags-clutches">Clutches</a></li>
                <li><a href="/pages/products.html?gender=women&category=women-bags-tote">Tote Bags</a></li>
              </ul>
            </div>
            <div class="navbar__dropdown-col">
              <h4>Watches & Accessories</h4>
              <ul>
                <li><a href="/pages/products.html?gender=women&category=women-watches-analog">Analog Watches</a></li>
                <li><a href="/pages/products.html?gender=women&category=women-accessories-earrings">Earrings</a></li>
                <li><a href="/pages/products.html?gender=women&category=women-accessories-necklaces">Necklaces</a></li>
                <li><a href="/pages/products.html?gender=women&category=women-accessories-bracelets">Bracelets</a></li>
                <li><a href="/pages/products.html?gender=women&category=women-accessories-rings">Rings</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div class="navbar__nav-item">
          <a class="navbar__nav-link" href="/pages/products.html?gender=kids">Kids</a>
        </div>
        <div class="navbar__nav-item">
          <a class="navbar__nav-link" href="/pages/products.html?tags=sale" style="color:var(--color-error)">Sale</a>
        </div>
      </nav>

      <!-- Search -->
      <div class="navbar__search">
        <svg class="navbar__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input class="navbar__search-input" type="search" placeholder="Search products, brands…"
               aria-label="Search">
        <div class="navbar__search-results" id="search-results"></div>
      </div>

      <!-- Actions -->
      <div class="navbar__actions">
        <a href="/pages/home.html" class="navbar__action-btn" title="Home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </a>

        <!-- Wishlist -->
        <a href="/pages/profile.html#wishlist" class="navbar__action-btn" title="Wishlist">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </a>

        <!-- Cart -->
        <button class="navbar__action-btn" data-cart-toggle title="Cart" aria-label="Open cart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          <span class="navbar__cart-count" data-cart-count style="display:none">0</span>
        </button>

        <!-- Account -->
        <div class="navbar__nav-item">
          <button class="navbar__action-btn" title="Account">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
          <div class="navbar__dropdown" style="min-width:200px;grid-template-columns:1fr;right:0;left:auto">
            <div class="navbar__dropdown-col">
              <h4 data-auth-name>Account</h4>
              <ul>
                <li><a href="/pages/profile.html">My Profile</a></li>
                <li><a href="/pages/orders.html">My Orders</a></li>
                <li><a href="/pages/profile.html#wishlist">Wishlist</a></li>
                <li data-auth-account><a href="#" data-auth-logout>Sign Out</a></li>
                <li data-auth-login><a href="/pages/login.html">Sign In / Register</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Hamburger -->
      <button class="navbar__hamburger" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>

  <!-- Mobile menu -->
  <div class="navbar__mobile-menu">
    <div style="display:flex;flex-direction:column;gap:var(--space-2)">
      <a href="/pages/products.html?gender=men" class="btn btn-ghost" style="justify-content:flex-start">Men</a>
      <a href="/pages/products.html?gender=women" class="btn btn-ghost" style="justify-content:flex-start">Women</a>
      <a href="/pages/products.html?gender=kids" class="btn btn-ghost" style="justify-content:flex-start">Kids</a>
      <a href="/pages/products.html?tags=sale" class="btn btn-ghost" style="justify-content:flex-start;color:var(--color-error)">Sale</a>
      <hr class="divider">
      <a href="/pages/orders.html" class="btn btn-ghost" style="justify-content:flex-start">My Orders</a>
      <a href="/pages/profile.html" class="btn btn-ghost" style="justify-content:flex-start">Profile</a>
      <button data-auth-logout class="btn btn-ghost" style="justify-content:flex-start">Sign Out</button>
      <a href="/pages/login.html" data-auth-login class="btn btn-primary btn-sm">Sign In</a>
    </div>
  </div>

  <!-- Cart Drawer -->
  <div class="cart-drawer__overlay" id="cart-overlay"></div>
  <aside class="cart-drawer" id="cart-drawer" aria-label="Shopping cart">
    <div class="cart-drawer__header">
      <div>
        <h2 class="cart-drawer__title">Your Cart</h2>
        <span class="cart-drawer__count" id="cart-drawer-count">0 items</span>
      </div>
      <button class="modal__close" id="cart-close-btn" aria-label="Close cart">✕</button>
    </div>
    <div class="cart-drawer__items" id="cart-items"></div>
    <div class="cart-drawer__footer" id="cart-footer">
      <div class="cart-summary-row"><span>Subtotal</span><span id="cart-subtotal">₹0</span></div>
      <div class="cart-summary-row"><span>Shipping</span><span id="cart-shipping">—</span></div>
      <div class="cart-summary-row total"><span>Total</span><span id="cart-total">₹0</span></div>
      <a href="/pages/cart.html" class="btn btn-outline btn-full">View Cart</a>
      <a href="/pages/payment.html" class="btn btn-gold btn-full">Checkout</a>
    </div>
  </aside>

  <!-- Toast container -->
  <div id="toast-container"></div>`;

  // Inject before first child of body
  document.body.insertAdjacentHTML('afterbegin', navbarHTML);
})();