# FashionFitsYou

Full-stack fashion e-commerce platform for men, women and kids.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | HTML · CSS · Vanilla JS |
| Backend | Node.js · Express |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (JWT) |
| Storage | Supabase Storage |
| Payments | Razorpay |

---

## Complete File Map

```
FashionFitsYou/
│
├── index.html                        ← Public landing page (root)
│
├── frontend/
│   ├── pages/
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── home.html                 ← Post-login home feed
│   │   ├── products.html             ← Listing with filters + sort
│   │   ├── product-detail.html       ← Gallery, variants, reviews
│   │   ├── cart.html                 ← Cart page with coupon
│   │   ├── payment.html              ← Checkout (address + Razorpay)
│   │   ├── orders.html               ← List + detail (via ?id=)
│   │   ├── order-confirmation.html   ← Post-purchase success
│   │   └── profile.html              ← Profile, addresses, wishlist
│   │
│   ├── css/
│   │   ├── global.css                ← Design tokens, reset, utilities
│   │   ├── components.css            ← Navbar, product card, cart drawer, footer
│   │   └── pages.css                 ← All page-specific styles
│   │
│   └── js/
│       ├── navbar.js                 ← Injects shared navbar + cart drawer HTML
│       ├── api.js                    ← Fetch wrapper for all backend endpoints
│       ├── auth.js                   ← Login, register, session management
│       ├── utils.js                  ← Toast, formatters, renderProductCard, wishlist
│       ├── cart.js                   ← Cart state, localStorage sync, drawer UI
│       ├── products.js               ← Products page: filters, sort, pagination
│       ├── product-detail.js         ← Gallery, variant picker, reviews
│       ├── orders.js                 ← Orders list + detail
│       └── payment.js                ← Checkout flow + Razorpay integration
│
├── backend/
│   ├── server.js                     ← Express entry point
│   ├── .env.example                  ← Copy to .env and fill in
│   ├── package.json
│   │
│   ├── config/
│   │   └── supabase.js               ← Supabase admin + anon clients
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js         ← JWT verification via Supabase
│   │   └── errorHandler.js           ← Global error handler
│   │
│   └── routes/
│       ├── authRoutes.js             ← /api/auth/*
│       ├── productRoutes.js          ← /api/products/*
│       ├── categoriesRoutes.js       ← /api/categories/*
│       ├── cartRoutes.js             ← /api/cart/*
│       ├── ordersRoutes.js           ← /api/orders/*
│       ├── paymentRoutes.js          ← /api/payment/*
│       └── userRoutes.js             ← /api/user/*
│
└── database/
    ├── schema.sql                    ← Full schema with RLS + triggers
    └── seed.sql                      ← Category tree + coupons + banners
```

---

## Category Tree

```
Men
├── Clothing → Shirts, T-Shirts, Jeans, Shorts, Joggers, Jackets, Sweatshirts, Trousers, Kurtas, Ethnic Sets
├── Shoes    → Sneakers, Formal, Loafers, Boots, Sandals, Sports, Flip Flops
├── Bags     → Backpacks, Gym Bags, Wallets, Fanny Packs, Laptop Bags, Messenger Bags, Duffel Bags
├── Watches  → Analog, Digital, Smartwatch, Luxury, Sports
└── Accessories → Belts, Sunglasses, Caps, Ties, Cufflinks, Socks, Keychains, Perfumes

Women
├── Clothing → Dresses, Tops, Jeans, Sarees, Kurtis, Skirts, Shorts, Leggings, Jackets, Ethnic Sets, Sweatshirts, Blazers
├── Shoes    → Heels, Flats, Sneakers, Boots, Sandals, Wedges, Kolhapuris
├── Bags     → Handbags, Tote Bags, Clutches, Backpacks, Sling Bags, Pouches, Saddle Bags
├── Watches  → Analog, Digital, Smartwatch, Luxury, Bracelet Watches
└── Accessories → Bracelets, Necklaces, Earrings, Rings, Bangles, Hair Accessories, Scarves, Sunglasses, Anklets, Perfumes

Kids
├── Clothing → T-Shirts, Pants, Dresses, School Uniforms
├── Shoes    → Sneakers, Sandals, School Shoes
└── Accessories → School Bags, Caps, Socks
```

---

## Setup Guide

### 1. Clone & install backend dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Open .env and fill in your Supabase and Razorpay keys
```

### 3. Set up the database

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open **SQL Editor**
3. Run `database/schema.sql` — creates all tables, RLS policies, triggers
4. Run `database/seed.sql` — inserts the full category tree + coupons + banners

### 4. Start the backend

```bash
cd backend
npm run dev        # uses nodemon, restarts on changes
# or
npm start          # production
```

Backend runs at `http://localhost:3000`

### 5. Serve the frontend

Use VS Code **Live Server** extension on the project root,  
or any static server:

```bash
npx serve .        # serves from project root
```

Frontend at `http://localhost:5500`

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Sign in, returns JWT |
| POST | `/api/auth/logout` | ✓ | Invalidate session |
| POST | `/api/auth/refresh` | — | Refresh JWT |
| POST | `/api/auth/forgot-password` | — | Send reset email |
| GET | `/api/auth/me` | ✓ | Current user + profile |
| GET | `/api/products` | — | List with filters + pagination |
| GET | `/api/products/:slug` | — | Single product + variants + reviews |
| POST | `/api/products/:id/reviews` | ✓ | Submit a review |
| GET | `/api/categories` | — | Full category tree |
| GET | `/api/categories/flat` | — | Flat list for filters |
| GET | `/api/cart` | ✓ | Get cart with totals |
| POST | `/api/cart` | ✓ | Add item |
| PATCH | `/api/cart/:id` | ✓ | Update quantity |
| DELETE | `/api/cart/:id` | ✓ | Remove item |
| DELETE | `/api/cart` | ✓ | Clear cart |
| POST | `/api/cart/validate-coupon` | ✓ | Validate + calculate discount |
| GET | `/api/orders` | ✓ | Orders list with pagination |
| GET | `/api/orders/:id` | ✓ | Order detail + history |
| POST | `/api/orders` | ✓ | Place order (post-payment) |
| POST | `/api/orders/:id/cancel` | ✓ | Cancel an order |
| POST | `/api/payment/create-order` | ✓ | Create Razorpay order |
| POST | `/api/payment/verify` | ✓ | Verify payment signature |
| GET | `/api/user/profile` | ✓ | Get profile |
| PATCH | `/api/user/profile` | ✓ | Update profile |
| GET | `/api/user/addresses` | ✓ | List addresses |
| POST | `/api/user/addresses` | ✓ | Add address |
| PATCH | `/api/user/addresses/:id` | ✓ | Update address |
| DELETE | `/api/user/addresses/:id` | ✓ | Delete address |
| GET | `/api/user/wishlist` | ✓ | Get wishlist |
| POST | `/api/user/wishlist` | ✓ | Add to wishlist |
| DELETE | `/api/user/wishlist/:productId` | ✓ | Remove from wishlist |

---

## Script load order (every page)

Every HTML page in `/frontend/pages/` loads scripts in this order:

```html
<script src="../js/navbar.js"></script>      <!-- 1. Injects navbar + cart drawer HTML -->
<script src="../js/api.js"></script>         <!-- 2. API fetch wrapper -->
<script src="../js/auth.js"></script>        <!-- 3. Session, login/logout -->
<script src="../js/utils.js"></script>       <!-- 4. Toast, formatters, wishlist, initPage() -->
<script src="../js/cart.js"></script>        <!-- 5. Cart state + drawer -->
<script src="../js/[page].js"></script>      <!-- 6. Page-specific logic -->
```

`utils.js` calls `initPage()` on `DOMContentLoaded` which wires up:
navbar scroll, mobile hamburger, live search, wishlist state, cart init.

---

## Coupons (seeded)

| Code | Type | Value | Min Order |
|---|---|---|---|
| `WELCOME10` | % | 10% off | ₹500 |
| `FLAT200` | flat | ₹200 off | ₹1500 |
| `SUMMER25` | % | 25% off | ₹1000 |
| `FIRST50` | flat | ₹50 off | ₹0 |

---

## Adding products (via Supabase)

Products must be inserted with:
- A valid `category_id` from the categories table
- At least one row in `product_images` with `is_primary = true`
- At least one row in `product_variants` with `stock_quantity > 0`

Slug must be unique and URL-safe (e.g. `navy-slim-fit-shirt-levis`).

---

## Deployment checklist

- [ ] Set `NODE_ENV=production` in backend `.env`
- [ ] Update `FRONTEND_URL` to your production domain
- [ ] Add production Razorpay keys (`rzp_live_...`)
- [ ] Enable Supabase email confirmation in Auth settings
- [ ] Set up Supabase Storage bucket named `products` (public)
- [ ] Configure CORS in `server.js` to allow production frontend URL
- [ ] Add your domain to Supabase → Auth → URL Configuration