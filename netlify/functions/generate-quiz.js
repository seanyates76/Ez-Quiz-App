'use strict';

/**

- Netlify Function: generate-quiz
- POST /api/generate  { topic: string, count: number }
- Returns: { lines: string }  // newline-separated quiz lines
- 
- Requires env: GEMINI_API_KEY
  */

const corsHeaders = {
'Access-Control-Allow-Origin': '*', 
'Access-Control-Allow-Headers': 'Content-Type, Authorization',
'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const { generateLines } = require('./lib/providers.js');

exports.handler = async (event) => {
// Preflight
if (event.httpMethod === 'OPTIONS') {
return { statusCode: 204, headers: corsHeaders, body: '' };
}

if (event.httpMethod !== 'POST') {
return {
statusCode: 405,
headers: corsHeaders,
body: JSON.stringify({ error: 'Method Not Allowed' }),
};
}

let payload;
try { payload = JSON.parse(event.body || '{}'); } catch {
return {
statusCode: 400,
headers: corsHeaders,
body: JSON.stringify({ error: 'Invalid JSON' }),
};
}

// Normalization + validation (non‑breaking)
const topicRaw = (payload.topic == null ? '' : String(payload.topic)).trim();
const topic = topicRaw || 'General knowledge';

let count = payload.count;
if (count == null) { count = 10; }
const parsedCount = parseInt(count, 10);
if (!Number.isFinite(parsedCount)) {
  // Bad type for count — reject clearly
  return {
    statusCode: 400,
    headers: corsHeaders,
    body: JSON.stringify({ error: 'Invalid count: must be a number between 1 and 50' }),
  };
}
count = Math.max(1, Math.min(50, parsedCount));

let types = undefined;
if (payload.types !== undefined) {
  if (!Array.isArray(payload.types)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid types: must be an array of MC|TF|YN|MT' }),
    };
  }
  const filtered = payload.types.filter(t => /^(MC|TF|YN|MT)$/i.test(String(t)));
  // If caller provided types but none are valid, reject; otherwise pass filtered
  if (payload.types.length && filtered.length === 0) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid types: use MC, TF, YN, MT' }) };
  }
  types = filtered;
}

const difficulty = (payload.difficulty && String(payload.difficulty).toLowerCase()) || undefined;
const provider = String(payload.provider || process.env.AI_PROVIDER || 'gemini');
const model = String(payload.model || '');

// Timeout guard so the function never hangs on upstream calls
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(Object.assign(new Error('Upstream timeout'), { status: 504 })), ms);
    promise.then(v => { clearTimeout(id); resolve(v); }, e => { clearTimeout(id); reject(e); });
  });
}

const TIMEOUT_MS = Math.max(8000, Math.min(20000, parseInt(process.env.GENERATE_TIMEOUT_MS || '15000', 10)));

try {
  const { title, lines, provider: usedProvider, model: usedModel } = await withTimeout(
    generateLines({ provider, model, topic, count, types, difficulty, env: process.env }),
    TIMEOUT_MS
  );
  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, lines, provider: usedProvider, model: usedModel, fallbackUsed: false }),
  };
} catch (err) {
  const msg = String((err && err.message) || err || 'Error');
  const is429 = msg.includes('429') || /quota|rate limit/i.test(msg) || (err && err.status===429);
  const isTimeout = (err && (err.status === 504 || /timeout/i.test(msg)));

  // Fallback to Gemini if primary provider failed and Gemini credentials exist
  const primary = (provider || '').toLowerCase();
  const canFallbackToGemini = primary !== 'gemini' && !!process.env.GEMINI_API_KEY;
  if (canFallbackToGemini && !isTimeout) {
    try {
      const { title, lines, provider: usedProvider, model: usedModel } = await withTimeout(
        generateLines({ provider: 'gemini', model: process.env.GEMINI_MODEL || 'gemini-2.0-flash', topic, count, types, difficulty, env: process.env }),
        TIMEOUT_MS
      );
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, lines, provider: usedProvider, model: usedModel, fallbackUsed: true, fallbackFrom: primary, errorPrimary: msg }),
      };
    } catch (fallbackErr) {
      const fbMsg = String((fallbackErr && fallbackErr.message) || fallbackErr || 'Error');
      return {
        statusCode: isTimeout ? 504 : ((err && err.status) || (fallbackErr && fallbackErr.status) || (is429 ? 429 : 502)),
        headers: { ...corsHeaders, ...(is429 ? { 'Retry-After': '30' } : {}), ...(isTimeout ? { 'Retry-After': '15' } : {}) },
        body: JSON.stringify({ error: 'Generation failed', details: msg, fallback: { tried: 'gemini', details: fbMsg } }),
      };
    }
  }

  const statusFromError = err && err.status;
  let statusCode = isTimeout ? 504 : (is429 ? 429 : statusFromError || 502);
  if (statusCode === 404) {
    statusCode = 502;
  }

  return {
    statusCode,
    headers: { ...corsHeaders, ...(is429 ? { 'Retry-After': '30' } : {}), ...(isTimeout ? { 'Retry-After': '15' } : {}) },
    body: JSON.stringify({ error: isTimeout ? 'Generation timed out' : 'Generation failed', details: msg, provider }),
  };
}
};
