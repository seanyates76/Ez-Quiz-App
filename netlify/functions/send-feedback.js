'use strict';

const nodemailer = require('nodemailer');

const H = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};
const reply = (code, body) => ({ statusCode: code, headers: H, body: typeof body === 'string' ? body : JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(204, '');
  if (event.httpMethod !== 'POST') return reply(405, 'Method Not Allowed');
  try {
    const { message = '', email = '', hp = '' } = JSON.parse(event.body || '{}');
    const msg = String(message || '').trim();
    const fromEmail = String(email || '').trim();
    const trap = String(hp || '').trim();
    if (!msg) return reply(400, 'Message required');
    // Honeypot: silently succeed
    if (trap) return reply(200, { success: true });

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
