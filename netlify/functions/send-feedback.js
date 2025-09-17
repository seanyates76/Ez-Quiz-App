'use strict';

const nodemailer = require('nodemailer');

function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function getOrigin(headers) {
  const h = headers || {};
  return h.origin || h.Origin || '';
}

function makeHeaders(origin) {
  const H = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (origin) H['Access-Control-Allow-Origin'] = origin;
  return H;
}

function reply(code, body, origin) {
  return { statusCode: code, headers: makeHeaders(origin), body: typeof body === 'string' ? body : JSON.stringify(body) };
}

// Sliding window rate limit per IP: 20 requests / 15 minutes
const RL = new Map(); // ip -> [timestamps]
const LIMIT = 20;
const WINDOW_MS = 15 * 60 * 1000;
function clientIp(event) {
  const h = event.headers || {};
  const xf = h['x-forwarded-for'] || h['X-Forwarded-For'] || '';
  const ip = (Array.isArray(xf) ? xf[0] : String(xf).split(',')[0]).trim() || h['client-ip'] || h['x-nf-client-connection-ip'] || 'unknown';
  return String(ip);
}
function rateLimited(event) {
  const now = Date.now();
  const ip = clientIp(event);
  const arr = RL.get(ip) || [];
  const fresh = arr.filter(ts => now - ts < WINDOW_MS);
  if (fresh.length >= LIMIT) return true;
  fresh.push(now);
  RL.set(ip, fresh);
  // occasional pruning of map size
  if (RL.size > 500) {
    for (const [k, list] of RL.entries()) {
      const keep = list.filter(ts => now - ts < WINDOW_MS);
      if (keep.length) RL.set(k, keep); else RL.delete(k);
    }
  }
  return false;
}

function sanitizeMessage(input) {
  let s = String(input || '');
  // drop control chars except newline and tab
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  s = s.trim();
  if (s.length > 500) s = s.slice(0, 500);
  return s;
}

function sanitizeEmail(input) {
  let s = String(input || '');
  s = s.replace(/[\x00-\x1F\x7F]/g, '').trim();
  if (s.length > 254) s = s.slice(0, 254);
  // naive allowlist: basic email pattern or empty
  if (!s) return '';
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  return ok ? s : '';
}

exports.handler = async (event) => {
  const allowed = parseAllowedOrigins();
  const origin = getOrigin(event.headers);
  const originAllowed = !origin || allowed.length === 0 || allowed.includes(origin);

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    if (!originAllowed) return reply(403, { success: false, error: 'Forbidden origin' }, '');
    return reply(204, '', origin || '*');
  }
  if (event.httpMethod !== 'POST') return reply(405, 'Method Not Allowed', originAllowed ? origin : '');
  if (!originAllowed) return reply(403, { success: false, error: 'Forbidden origin' }, '');

  try {
    const { message = '', email = '', hp = '' } = JSON.parse(event.body || '{}');
    const trap = String(hp || '').trim();
    // Honeypot: silently succeed
    if (trap) return reply(200, { success: true }, origin || '*');

    const msg = sanitizeMessage(message);
    const fromEmail = sanitizeEmail(email);
    if (!msg) return reply(400, { success: false, error: 'Message required' }, origin || '*');

    // Rate limit
    if (rateLimited(event)) {
      const r = reply(429, { success: false, error: 'Rate limited' }, origin || '*');
      r.headers['Retry-After'] = String(Math.ceil(WINDOW_MS / 1000));
      return r;
    }

    const user = process.env.FEEDBACK_EMAIL;
    const pass = process.env.FEEDBACK_PASS;
    if (!user || !pass) return reply(500, { success: false, error: 'Missing mail credentials' }, origin || '*');

    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });

    await transporter.sendMail({
      from: `EZ-Quiz Feedback <${user}>`,
      to: user,
      subject: 'New EZ-Quiz Feedback',
      text: `${msg}\n\nFrom: ${fromEmail || 'Anonymous'}`,
      replyTo: fromEmail || undefined,
    });

    return reply(200, { success: true }, origin || '*');
  } catch (e) {
    return reply(500, { success: false, error: 'Mailer error' }, origin || '*');
  }
};
