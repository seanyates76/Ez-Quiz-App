'use strict';

const nodemailer = require('nodemailer');

const H = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};
const reply = (code, body) => ({ statusCode: code, headers: H, body: typeof body === 'string' ? body : JSON.stringify(body) });

// Simple in-memory rate limit (best-effort per warm instance)
const RECENT = new Map(); // key -> timestamp
const WINDOW_MS = 30_000;
function keyFor(event){
  const h = event.headers || {};
  const xf = h['x-forwarded-for'] || h['X-Forwarded-For'] || '';
  const ip = (Array.isArray(xf) ? xf[0] : String(xf).split(',')[0]).trim() || h['client-ip'] || h['x-nf-client-connection-ip'] || 'unknown';
  return String(ip);
}
function isLimited(event){
  const k = keyFor(event);
  const now = Date.now();
  const last = RECENT.get(k) || 0;
  if (now - last < WINDOW_MS) return true;
  RECENT.set(k, now);
  // occasionally prune
  if (RECENT.size > 200) {
    const cutoff = now - WINDOW_MS;
    for (const [kk, ts] of RECENT.entries()) { if (ts < cutoff) RECENT.delete(kk); }
  }
  return false;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(204, '');
  if (event.httpMethod !== 'POST') return reply(405, 'Method Not Allowed');
  try {
    const { message = '', email = '', hp = '' } = JSON.parse(event.body || '{}');
    const msg = String(message || '').trim();
    const fromEmail = String(email || '').trim();
    const trap = String(hp || '').trim();
    if (!msg) return reply(400, 'Message required');
    if (msg.length > 500) return reply(400, 'Message too long');
    if (fromEmail.length > 254) return reply(400, 'Email too long');
    // Honeypot: silently succeed
    if (trap) return reply(200, { success: true });

    // Rate limit
    if (isLimited(event)) {
      const r = reply(429, { success: false, error: 'Rate limited' });
      r.headers['Retry-After'] = '30';
      return r;
    }

    const user = process.env.FEEDBACK_EMAIL;
    const pass = process.env.FEEDBACK_PASS;
    if (!user || !pass) return reply(500, { success: false, error: 'Missing mail credentials' });

    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });

    await transporter.sendMail({
      from: `EZ-Quiz Feedback <${user}>`,
      to: user,
      subject: 'New EZ-Quiz Feedback',
      text: `${msg}\n\nFrom: ${fromEmail || 'Anonymous'}`,
      replyTo: fromEmail || undefined,
    });

    return reply(200, { success: true });
  } catch {
    return reply(500, { success: false, error: 'Mailer error' });
  }
};
