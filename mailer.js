// ============================================================
// mailer.js — sends real receipt emails via SMTP (nodemailer).
// Falls back to logging (no crash, no silent lie) if SMTP env
// vars aren't set — see README for setup with Gmail or any
// other SMTP provider.
// ============================================================
const nodemailer = require('nodemailer');

const SMTP_CONFIGURED = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

let transporter = null;
if (SMTP_CONFIGURED) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function buildReceiptHtml(order, items, { paymentConfirmation = false } = {}) {
  const rows = items.map(it => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;">${escapeHtml(it.product_name)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${it.qty}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">$${it.price.toFixed(2)}</td>
    </tr>`).join('');

  return `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#232220;">
    <h2 style="color:#142440;margin-bottom:4px;">JSmart Trade</h2>
    <p style="color:#5B5748;margin-top:0;">${paymentConfirmation ? 'Payment Confirmation' : 'Order Receipt'}</p>
    ${paymentConfirmation ? '<p>We have confirmed your payment. Here is your order receipt for your records.</p>' : ''}
    <p><b>Order ID:</b> ${escapeHtml(order.order_number)}<br>
    <b>Date:</b> ${escapeHtml(new Date(order.created_at).toLocaleString())}<br>
    <b>Name:</b> ${escapeHtml(order.name)}<br>
    <b>Delivery location:</b> ${escapeHtml(order.location)}<br>
    <b>Payment method:</b> ${escapeHtml(order.payment_method)}<br>
    <b>Payment status:</b> ${escapeHtml(order.payment_status)}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <thead>
        <tr>
          <th style="text-align:left;border-bottom:2px solid #142440;padding-bottom:6px;">Item</th>
          <th style="text-align:center;border-bottom:2px solid #142440;padding-bottom:6px;">Qty</th>
          <th style="text-align:right;border-bottom:2px solid #142440;padding-bottom:6px;">Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="text-align:right;font-size:1.1em;margin-top:12px;"><b>Subtotal: $${order.subtotal.toFixed(2)}</b></p>
    <p style="color:#5B5748;font-size:0.85em;">Final price includes freight, customs duty, VAT and service fee — confirmed with you before any deposit is due.</p>
    <p style="margin-top:24px;color:#5B5748;">Thank you for ordering with JSmart Trade!</p>
  </div>`;
}

async function sendReceiptEmail(order, items, { paymentConfirmation = false } = {}) {
  if (!order.email) return { sent: false, reason: 'no_email_provided' };

  const html = buildReceiptHtml(order, items, { paymentConfirmation });
  const subject = paymentConfirmation
    ? `Payment confirmed — JSmart Trade order ${order.order_number}`
    : `Your JSmart Trade order receipt — ${order.order_number}`;

  if (!SMTP_CONFIGURED) {
    console.log(`[mailer] SMTP not configured — would have emailed ${order.email}: "${subject}"`);
    return { sent: false, reason: 'smtp_not_configured' };
  }

  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: order.email,
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error('[mailer] Failed to send receipt email:', err.message);
    return { sent: false, reason: 'send_failed', error: err.message };
  }
}

async function sendLegacyPasswordResetEmail(email, resetUrl) {
  if (!SMTP_CONFIGURED) return { sent: false, reason: 'smtp_not_configured' };
  const safeUrl = String(resetUrl).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: 'Reset your JSmart Trade password',
      text: `Use this single-use link within 30 minutes to reset your password: ${resetUrl}`,
      html: `<p>Use this single-use link within 30 minutes to reset your password:</p><p><a href="${safeUrl}">Reset password</a></p>`,
    });
    return { sent: true };
  } catch (error) {
    console.error('[mailer] Failed to send password reset email:', error.message);
    return { sent: false, reason: 'send_failed' };
  }
}

module.exports = { buildReceiptHtml, sendReceiptEmail, sendLegacyPasswordResetEmail, SMTP_CONFIGURED };
