# JSmart Trade — Full-Stack Storefront

A real backend, not just a static site: Node.js + Express + a real SQL database (SQLite), password-protected admin tools, guest checkout, local image uploads, and automatic email receipts.

The website is static wherever it should be: `public/` contains the HTML, CSS, browser JavaScript, product images, recommendations, and product detail modal. The Node server is needed for live product data, admin login, guest checkout, orders, uploads, and email receipts. If the product API is temporarily unavailable, the storefront uses the bundled static catalog so buyers can still browse products and recommendations.

## What changed from the static version

| Feature | Before (static site) | Now (this project) |
|---|---|---|
| Products/orders | Browser `localStorage` | Real SQL database (SQLite) |
| Product photos | Hotlinked stock photo URLs | Upload straight from your computer |
| Admin access | Anyone with the link | Real login, password-protected |
| Buyer checkout | Login-free ordering | No buyer account or Firebase sign-in required |
| Order receipts | Manual "click to email" link | Sent automatically by the server |

## Project structure

```
jsmart-trade-backend/
├── server.js              # Express app entry point
├── db.js                  # SQLite schema + seed data
├── mailer.js              # Sends receipt emails (SMTP)
├── upload.js               # Handles local image uploads
├── routes/
│   ├── auth.js             # Admin login
│   ├── products.js         # Product listing + admin CRUD
│   ├── orders.js           # Placing orders, admin order management
│   └── contacts.js         # Admin supplier/customer/agent contact list
├── middleware/
│   └── auth.js             # Admin session and CSRF protection
├── public/                 # Frontend (served as static files)
│   ├── index.html          # Storefront
│   ├── admin.html          # Admin dashboard
│   ├── login.html          # Redirects buyers to guest checkout
│   ├── admin-login.html    # Admin login
│   ├── css/
│   └── js/
├── uploads/products/       # Uploaded product photos land here
├── data/                   # jsmart.sqlite (the database file) lives here
├── .env.example            # Copy to .env and fill in real values
└── package.json
```

## Running it

You need [Node.js](https://nodejs.org) installed (v22 or newer). `better-sqlite3` requires Node.js 22 or newer.

```bash
npm install
npm run install:backend
npm start
```

Run these commands from the workspace root. `npm run install:backend` installs the app dependencies in `jsmart-backend/`; the root scripts forward `start`, `dev`, `test`, and `admin:password` to that app.

### Deploying with GitHub and Render

The root `render.yaml` configures a Node web service using `jsmart-backend/` and a persistent `/var/data` disk for the SQLite database and uploaded product images. Connect the GitHub repository containing this workspace to Render and deploy the Blueprint. The persistent disk requires a paid Render web-service plan. Before the first deploy, set `ADMIN_INITIAL_PASSWORD` to a new random password of at least 16 characters, and enter the SMTP credentials in Render's environment settings. After the first deploy, set `APP_ORIGINS` to the exact HTTPS URL Render assigned to the service, then redeploy. Never commit `.env` files, service-account keys, or database files.

Then open **http://localhost:3000** in your browser. That's it — the database is created and seeded automatically on first run (12 starter products + one admin login). Buyers can place orders without creating an account.

### Development login
- **Admin:** username `admin`, password `admin123` for local development only — go to `/admin-login.html`. Production requires a random initial password and refuses the seeded development password.
- **Buyers:** browse and place orders directly on the storefront; no login is needed.

**Change the admin password before putting this online for real** — see "Changing the admin password" below.

## The database

This uses **SQLite** via `better-sqlite3` — a real, fully-featured SQL database that lives in a single file (`data/jsmart.sqlite`), so there's nothing separate to install or run (no MySQL/Postgres server needed). It's genuinely production-capable for a business at this scale, and if you ever outgrow it, the SQL is standard enough to migrate to Postgres or MySQL later with minimal changes.

Tables: `admins`, `buyers`, `products`, `orders`, `order_items` — you can open `data/jsmart.sqlite` with any SQLite viewer (e.g. [DB Browser for SQLite](https://sqlitebrowser.org)) to inspect or edit data directly.

## Email receipts (real, automatic sending)

Unlike the old static version's "click to email yourself" link, this sends **real emails automatically** from the server:
- The moment a buyer places an order
- Again with a distinct payment-confirmation email when you (admin) mark the order's payment status as **"paid"**. Both emails include the order receipt.

### Setting it up (takes about 5 minutes)
1. Copy `.env.example` to a new file named `.env`
2. If using Gmail: turn on 2-Step Verification on the Google account you'll send from, then create an **App Password** at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Fill in `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-character-app-password
   FROM_EMAIL=your-email@gmail.com
   ```
4. Restart the server (`npm start`)

Any SMTP provider works the same way (Outlook, Zoho, SendGrid, Mailgun, your web host's email, etc.) — just change `SMTP_HOST`/`SMTP_PORT` accordingly.

SMTP must be configured with valid sender credentials for receipts to be delivered. Without `.env` configured, the app logs `SMTP not configured`, and the buyer is told that the receipt could not be sent; configure SMTP before taking orders if every buyer must receive a receipt.

After adding or changing SMTP settings, restart the backend so it loads the new values. If an order is saved but the receipt cannot be sent, the buyer sees a message to contact the seller and the backend logs the SMTP error.

### Guest checkout

Buyers do not create accounts or sign in. Checkout collects a name, required email address, phone/WhatsApp number, and delivery location; the backend validates these details and looks up product prices itself before saving the order. The email is used for the automatic receipt, so buyers must provide a valid address and SMTP must be configured. Orders remain visible to the admin in the dashboard. Firebase Authentication is not used by this application. Existing buyer records in an older SQLite database are left untouched.

Production setup still requires a strong `SESSION_SECRET`, a secure initial admin password for a new database, exact `APP_ORIGINS`, HTTPS, and persistent storage for the SQLite database and uploads.

### Database backups

Run `npm run backup` from the workspace root (or `npm run backup` inside `jsmart-backend/`) to create a consistent SQLite snapshot under `jsmart-backend/data/backups/` and verify its integrity.

To archive a snapshot in Firebase Storage, set `FIREBASE_STORAGE_BUCKET` to the bucket name and authenticate the command with Google Application Default Credentials (`GOOGLE_APPLICATION_CREDENTIALS` locally, or an attached service account with Storage Object Creator access on the server). Then run `npm run backup:firebase`. The backup is uploaded privately under `sqlite-backups/`; it contains customer contact details and order data, so do not make the bucket or files public. This archives the SQLite database as a file in Firebase Storage; it does not migrate the app's live database to Firebase or expose individual order rows in Firestore/SQL Connect. Schedule this command for regular backups and periodically test restoring a downloaded copy. Ephemeral hosting filesystems still require persistent storage for the live database.

### Tests

Run the local tests with `npm test`. They cover order validation and admin protections. Before deployment, configure SMTP, place a guest order with a valid email address, confirm it appears in the admin dashboard, and verify that the receipt arrives.

## Admin features

Log in at `/admin-login.html`, then:
- **Dashboard** — revenue, order count, pending orders, average order value, a chart, payment-method breakdown
- **Orders** — every order, with editable **order status** (pending/confirmed/shipped/delivered) *and* **payment status** (unpaid/paid). Marking an order "paid" triggers the payment-confirmation email automatically.
- **Products** — add new products (with a **real photo upload from your computer**, or an image URL if you prefer), edit prices, or delete products
- **Business recommendations** — data-based prompts for pending orders, confirmed unpaid orders, and repeated product demand. Recommendations use your recorded data and are not a substitute for checking supplier quotes, shipping costs, customs fees, or payment receipt.
- **Trade contacts** — save and edit suppliers, customers, and shipping/sourcing agents, including location, contact channels, product categories, and quote/sample/lead-time notes.

### Changing the admin password
For an existing database, run `npm run admin:password` from the workspace root in an interactive terminal. It changes only the admin password hash and preserves customer accounts, products, and orders. Do not delete the SQLite database to rotate an admin password.

## Image uploads

In the admin "Add product" form, click **Choose File** to pick a photo from your computer (JPG, PNG, WEBP, GIF — up to 5MB). It's saved to `uploads/products/` on the server and served at `/uploads/products/filename.jpg`. Deleting a product also deletes its uploaded file.

You can still paste an image URL instead if you'd rather not upload a file — leave the file picker empty and fill in the URL field.

## Deploying this for real

This is a real Node.js server now, not a static site — so free static hosts like GitHub Pages or Netlify's basic tier **won't run it**. You'll need a host that runs Node.js processes, such as:
- **Railway**, **Render**, or **Fly.io** — all have free/cheap tiers, straightforward Node.js deployment, and support persistent disk storage (needed for `data/jsmart.sqlite` and `uploads/`)
- A basic VPS (DigitalOcean, Linode, etc.) running Node.js directly

Whichever you choose, make sure to:
1. Set real environment variables (`SESSION_SECRET`, SMTP credentials) — don't commit `.env` to git
2. Use a persistent volume/disk for `data/` and `uploads/` so your database and photos survive redeploys
3. Change the default admin password

## Remaining production work

- **Product edit form with photo replacement** (currently price-only inline editing; full edit-with-new-photo would reuse the same upload logic as "Add product")
- **Payment gateway integration** if you want customers to pay online instead of arranging payment directly
- **Production guest-checkout testing** using the deployment hostname, real customer details, and configured email delivery

Happy to help build any of these out when you're ready.
