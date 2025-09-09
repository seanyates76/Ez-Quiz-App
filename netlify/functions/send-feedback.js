'use strict';

const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { message = '', email = '' } = JSON.parse(event.body || '{}');
    const msg = String(message || '').trim();
    const fromEmail = String(email || '').trim();
    if (!msg) return { statusCode: 400, body: 'Message required' };

    const user = process.env.FEEDBACK_EMAIL;
    const pass = process.env.FEEDBACK_PASS;
    if (!user || !pass) {
      return { statusCode: 500, body: JSON.stringify({ success: false, error: 'Missing mail credentials' }) };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `EZ-Quiz Feedback <${user}>`,
      to: user,
      subject: 'New EZ-Quiz Feedback',
      text: `${msg}\n\nFrom: ${fromEmail || 'Anonymous'}`,
      replyTo: fromEmail || undefined,
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: 'Mailer error' }) };
  }
};

