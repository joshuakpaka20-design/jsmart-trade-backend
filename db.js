// ============================================================
// db.js — SQLite database connection, schema, and seed data
// Uses better-sqlite3: a real embedded SQL database, stored as
// a single file at data/jsmart.sqlite — no separate DB server
// to install or run.
// ============================================================
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const { dataDirectory, databasePath } = require('./storage-paths');

require('node:fs').mkdirSync(dataDirectory, { recursive: true });
const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------- Schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS buyers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  image_path TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  buyer_id INTEGER REFERENCES buyers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  location TEXT NOT NULL,
  delivery_speed TEXT,
  payment_method TEXT,
  subtotal REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  receipt_sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  price REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS trade_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'supplier',
  name TEXT NOT NULL,
  company TEXT,
  category TEXT,
  country TEXT,
  email TEXT,
  phone TEXT,
  messaging TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS web_sessions (
  sid TEXT PRIMARY KEY,
  session_json TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS web_sessions_expires_at ON web_sessions(expires_at);
`);

// ---------- Seed default admin (username: admin / password: admin123) ----------
const adminCount = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
if (process.env.NODE_ENV === 'production' && adminCount > 0) {
  const admins = db.prepare('SELECT password_hash FROM admins').all();
  if (admins.some(admin => bcrypt.compareSync('admin123', admin.password_hash))) {
    throw new Error('Replace the seeded development admin password before production startup');
  }
}
if (adminCount === 0) {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.NODE_ENV === 'production' ? process.env.ADMIN_INITIAL_PASSWORD : 'admin123';
  if (!password || (process.env.NODE_ENV === 'production' && password.length < 16)) {
    throw new Error('Set ADMIN_INITIAL_PASSWORD to at least 16 characters before first production startup');
  }
  const hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
  if (process.env.NODE_ENV !== 'production') {
    console.log('Seeded development admin login -> username: admin | password: admin123');
  }
}

// ---------- Seed starter products ----------
const productCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
if (productCount === 0) {
  const seed = db.prepare(`
    INSERT INTO products (name, category, description, price, image_path)
    VALUES (@name, @category, @description, @price, @image_path)
  `);
  const starterProducts = [
    {name:'Fast-Charge Power Bank 20,000mAh', category:'Phone Accessories', description:'Dual USB output, includes cable.', price:18, image_path:'https://images.unsplash.com/photo-1604160687800-f7799a525a33?auto=format&fit=crop&w=600&q=80'},
    {name:'Wireless Earbuds, Bluetooth 5.3', category:'Phone Accessories', description:'With charging case, 20hr battery.', price:14, image_path:'https://images.unsplash.com/photo-1525825691042-e14d9042fc70?auto=format&fit=crop&w=600&q=80'},
    {name:'Tempered Glass Screen Protector (5pk)', category:'Phone Accessories', description:'Universal fit, multiple phone models.', price:6, image_path:'https://images.unsplash.com/photo-1727132527836-a392cf3f07aa?auto=format&fit=crop&w=600&q=80'},
    {name:"Men's Casual Sneakers (bulk 10 pairs)", category:'Clothing & Shoes', description:'Mixed sizes 40–44, canvas upper.', price:120, image_path:'https://images.unsplash.com/photo-1615743472612-93b21e520fad?auto=format&fit=crop&w=600&q=80'},
    {name:"Women's Ankara Print Dress (bulk 10)", category:'Clothing & Shoes', description:'Assorted prints and sizes.', price:95, image_path:'https://images.unsplash.com/photo-1722385495951-caedf5cf492a?auto=format&fit=crop&w=600&q=80'},
    {name:"Kids' T-Shirt Pack (24 units)", category:'Clothing & Shoes', description:'Cotton blend, mixed colors.', price:60, image_path:'https://images.unsplash.com/photo-1716951980904-fbe5c5aa2279?auto=format&fit=crop&w=600&q=80'},
    {name:'Skincare Starter Set (12 units)', category:'Cosmetics', description:'Cleanser, toner, moisturizer trio.', price:48, image_path:'https://images.unsplash.com/photo-1611253468096-06da23d5e0da?auto=format&fit=crop&w=600&q=80'},
    {name:'Braiding Hair Extensions (bulk 20 packs)', category:'Cosmetics', description:'Assorted colors, synthetic.', price:70, image_path:'https://images.unsplash.com/photo-1472747624745-ce92d32d3c24?auto=format&fit=crop&w=600&q=80'},
    {name:'Stainless Cookware Set', category:'Household', description:'5-piece pot and pan set.', price:42, image_path:'https://images.unsplash.com/flagged/photo-1571902241554-82ec31087fe3?auto=format&fit=crop&w=600&q=80'},
    {name:'LED Rechargeable Lantern (6 units)', category:'Household', description:'Solar-assist, 3 brightness modes.', price:54, image_path:'https://images.unsplash.com/photo-1601043057176-b67dea731473?auto=format&fit=crop&w=600&q=80'},
    {name:'Bluetooth Speaker, Portable', category:'Electronics', description:'Water-resistant, 10hr playtime.', price:22, image_path:'https://images.unsplash.com/photo-1549400854-b4300f444934?auto=format&fit=crop&w=600&q=80'},
    {name:'Mini Desk Fan (bulk 6 units)', category:'Electronics', description:'USB-powered, 3-speed.', price:36, image_path:'https://images.unsplash.com/photo-1665298455913-dd43714f5ad1?auto=format&fit=crop&w=600&q=80'},
  ];
  const insertMany = db.transaction((rows) => { for (const r of rows) seed.run(r); });
  insertMany(starterProducts);
  console.log(`Seeded ${starterProducts.length} starter products`);
}

module.exports = db;
