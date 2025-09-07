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

const topic = String(payload.topic || '').trim() || 'General knowledge';
const count = Math.max(1, Math.min(50, parseInt(payload.count || 10, 10)));
const types = Array.isArray(payload.types) ? payload.types.filter(t=> /^(MC|TF|YN|MT)$/i.test(String(t))) : undefined;
const difficulty = (payload.difficulty && String(payload.difficulty).toLowerCase()) || undefined;
const provider = String(payload.provider || process.env.AI_PROVIDER || 'gemini');
const model = String(payload.model || '');

try {
  const { title, lines, provider: usedProvider, model: usedModel } = await generateLines({ provider, model, topic, count, types, difficulty, env: process.env });
  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, lines, provider: usedProvider, model: usedModel, fallbackUsed: false }),
  };
} catch (err) {
  const msg = String((err && err.message) || err || 'Error');
  const is429 = msg.includes('429') || /quota|rate limit/i.test(msg) || (err && err.status===429);

  // Fallback to Gemini if primary provider failed and Gemini credentials exist
  const primary = (provider || '').toLowerCase();
  const canFallbackToGemini = primary !== 'gemini' && !!process.env.GEMINI_API_KEY;
  if (canFallbackToGemini) {
    try {
      const { title, lines, provider: usedProvider, model: usedModel } = await generateLines({ provider: 'gemini', model: process.env.GEMINI_MODEL || 'gemini-1.5-flash', topic, count, types, difficulty, env: process.env });
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, lines, provider: usedProvider, model: usedModel, fallbackUsed: true, fallbackFrom: primary, errorPrimary: msg }),
      };
    } catch (fallbackErr) {
      const fbMsg = String((fallbackErr && fallbackErr.message) || fallbackErr || 'Error');
      return {
        statusCode: (err && err.status) || (fallbackErr && fallbackErr.status) || (is429 ? 429 : 502),
        headers: { ...corsHeaders, ...(is429 ? { 'Retry-After': '30' } : {}) },
        body: JSON.stringify({ error: 'Generation failed', details: msg, fallback: { tried: 'gemini', details: fbMsg } }),
      };
    }
  }

  return {
    statusCode: is429 ? 429 : (err && err.status) || 502,
    headers: { ...corsHeaders, ...(is429 ? { 'Retry-After': '30' } : {}) },
    body: JSON.stringify({ error: 'Generation failed', details: msg, provider }),
  };
}
};
