// ============================================================
// server.js — JSmart Trade backend
// Node.js + Express + SQLite (better-sqlite3)
// ============================================================
require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const db = require('./db');
const SQLiteSessionStore = require('./session-store');
const { uploadsDirectory } = require('./storage-paths');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const contactRoutes = require('./routes/contacts');

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = new Set((process.env.APP_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean));

if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error('SESSION_SECRET must be set to at least 32 characters in production');
}
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) return res.status(400).json({ error: 'HTTPS is required' });
    next();
  });
}

// Allow the static Live Server frontend to use the API on port 3000.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isLocalOrigin = process.env.NODE_ENV !== 'production'
    && origin
    && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  if (origin && (allowedOrigins.has(origin) || isLocalOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  }
  if (req.method === 'OPTIONS') return origin && !allowedOrigins.has(origin) && !isLocalOrigin
    ? res.sendStatus(403)
    : res.sendStatus(204);
  next();
});

app.use(session({
  store: new SQLiteSessionStore(db),
  secret: process.env.SESSION_SECRET || 'jsmart-trade-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  name: 'jsmart.sid',
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}));

// Static files: the public storefront can be cached and served independently
// from the dynamic account, order, and admin APIs below.
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  etag: true,
  setHeaders(res, filePath) {
    if (/\.(html|css|js)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
  },
}));
app.use('/uploads', express.static(uploadsDirectory, { maxAge: '1h', etag: true }));

// API routes
app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', orderRoutes);
app.use('/api', contactRoutes);

// Multer / general error handler (keeps JSON error shape consistent)
app.use((err, req, res, next) => {
  if (err) {
    console.error(err);
    return res.status(400).json({ error: err.message || 'Something went wrong' });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`JSmart Trade server running at http://localhost:${PORT}`);
});
