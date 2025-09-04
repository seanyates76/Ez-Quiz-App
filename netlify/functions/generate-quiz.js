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
const provider = String(payload.provider || process.env.AI_PROVIDER || 'gemini');
const model = String(payload.model || '');

try {
  const { lines, provider: usedProvider, model: usedModel } = await generateLines({ provider, model, topic, count, env: process.env });
  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines, provider: usedProvider, model: usedModel }),
  };
} catch (err) {
  const msg = String((err && err.message) || err || 'Error');
  const is429 = msg.includes('429') || /quota|rate limit/i.test(msg) || (err && err.status===429);
  return {
    statusCode: is429 ? 429 : (err && err.status) || 502,
    headers: { ...corsHeaders, ...(is429 ? { 'Retry-After': '30' } : {}) },
    body: JSON.stringify({ error: 'Generation failed', details: msg, provider }),
  };
}
};
