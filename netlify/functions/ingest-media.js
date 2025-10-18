'use strict';

// Netlify Function: ingest-media (beta)
// POST /.netlify/functions/ingest-media { name, type, size, data: base64 }
// Returns 501 Not Implemented with guidance, or 403 if beta not enabled.

function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function getOrigin(headers) {
  const h = headers || {};
  return h.origin || h.Origin || '';
}

function makeCorsHeaders(origin) {
  const H = {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ezq-beta',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (origin) H['Access-Control-Allow-Origin'] = origin;
  return H;
}

function reply(statusCode, body, origin) {
  const headers = makeCorsHeaders(origin);
  return {
    statusCode,
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function isBetaRequest(event) {
  const h = event.headers || {};
  const cookie = h.cookie || h.Cookie || '';
  let hasCookie = false;
  try {
    const m = String(cookie).match(/(?:^|;\s*)FEATURE_FLAGS=([^;]+)/);
    if (m) {
      const flags = decodeURIComponent(m[1] || '').split(',').map((x)=>x.trim());
      hasCookie = flags.includes('beta');
    }
  } catch {}
  const headerBeta = h['x-ezq-beta'] === '1' || h['X-EZQ-Beta'] === '1';
  return hasCookie || headerBeta;
}

exports.handler = async (event) => {
  const allowedOrigins = parseAllowedOrigins();
  const origin = getOrigin(event.headers);
  const originAllowed = !origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin);

  if (event.httpMethod === 'OPTIONS') {
    if (!originAllowed) return reply(403, { error: 'Forbidden origin' }, '');
    return reply(204, '', origin || (allowedOrigins.length === 0 ? '*' : ''));
  }

  if (!originAllowed) return reply(403, { error: 'Forbidden origin' }, '');
  const responseOrigin = origin || (allowedOrigins.length === 0 ? '*' : '');

  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method Not Allowed' }, responseOrigin);

  if (!isBetaRequest(event)) {
    return reply(403, { error: 'Media ingest is beta-only. Visit /beta to opt in.' }, responseOrigin);
  }

  // Placeholder stub: not implemented yet
  // Validate minimal payload shape to aid future wiring; ignore content for now
  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch { payload = {}; }
  const name = String(payload.name || '');
  const type = String(payload.type || '');
  const size = Number(payload.size || 0);
  const dataLen = typeof payload.data === 'string' ? payload.data.length : 0;

  return reply(501, {
    enabled: false,
    reason: 'Not Implemented',
    hint: 'Media ingest endpoint is stubbed. UI should show a friendly message.',
    received: { name, type, size, dataLen },
    docs: '/docs/agenda-ui-visual-refresh-media-input.md',
  }, responseOrigin);
};

