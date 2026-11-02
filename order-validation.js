const { randomBytes } = require('node:crypto');

const ORDER_STATUSES = new Set(['pending', 'confirmed', 'shipped', 'delivered']);
const PAYMENT_STATUSES = new Set(['unpaid', 'paid']);

function createOrderNumber(now = Date.now()) {
  return `JS${now.toString(36).toUpperCase()}${randomBytes(4).toString('hex').toUpperCase()}`;
}

function parsePositiveInteger(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function normalizeOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'At least one item is required' };
  }

  const normalized = [];
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { error: 'Each item must include a product and quantity' };
    }
    const id = parsePositiveInteger(item.id);
    const qty = item.qty === undefined ? 1 : parsePositiveInteger(item.qty);
    if (id === null || qty === null) {
      return { error: 'Each item must include a valid product and positive whole-number quantity' };
    }
    normalized.push({ id, qty });
  }

  return { items: normalized };
}

function validateGuestOrderContact(input) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const location = typeof input.location === 'string' ? input.location.trim() : '';

  if (!name || name.length > 100) return { error: 'Enter your name (up to 100 characters)' };
  if (!phone || phone.length > 40) return { error: 'Enter a valid phone number (up to 40 characters)' };
  if (!location || location.length > 500) return { error: 'Enter a delivery location (up to 500 characters)' };
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address to receive your order receipt' };
  }

  return { contact: { name, email, phone, location } };
}

function validateOrderUpdate(input, currentOrder) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Order update must be an object' };
  }

  const status = input.status ?? currentOrder.status;
  const paymentStatus = input.paymentStatus ?? currentOrder.payment_status;
  if (!ORDER_STATUSES.has(status)) return { error: 'Invalid order status' };
  if (!PAYMENT_STATUSES.has(paymentStatus)) return { error: 'Invalid payment status' };
  return { status, paymentStatus };
}

module.exports = { createOrderNumber, normalizeOrderItems, validateGuestOrderContact, validateOrderUpdate };