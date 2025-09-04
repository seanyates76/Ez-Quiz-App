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

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
return {
statusCode: 500,
headers: corsHeaders,
body: JSON.stringify({ error: 'Missing GEMINI_API_KEY env var' }),
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

// Construct strict instructions (matches front-end parser)
const prompt = [
`Create EXACTLY ${count} quiz lines about ${topic}.`,
`Output ONLY the lines, no commentary or numbering, one per line.`,
`Allowed formats ONLY (mix them):`,
`MC|Question?|A) Option 1;B) Option 2;C) Option 3;D) Option 4|A`,
`MC|Question with multiple answers?|A) 1;B) 2;C) 3;D) 4|A,C`,
`TF|A true/false statement.|T`,
`YN|A yes/no question.|Y`,
`MT|Match.|1) L1;2) L2;3) L3|A) R1;B) R2;C) R3|1-A,2-B,3-C`,
`Rules:`,
`- EXACTLY ${count} lines.`,
`- Use only MC, TF, YN, MT.`,
`- MC correct field may be single (A) or multiple (A,C).`,
`- No blank lines or extra prose.`,
].join('\n');

// Lazy require to avoid cold start cost if OPTIONS
let GoogleGenerativeAI;
try {
({ GoogleGenerativeAI } = require(' @google/generative-ai'));
} catch (e) {
return {
statusCode: 500,
headers: corsHeaders,
body: JSON.stringify({ error: 'Failed to load @google/generative-ai' }),
};
}

try {
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

const result = await model.generateContent({
contents: [{ role: 'user', parts: [{ text: prompt }] }],
generationConfig: {
temperature: 0.6,
topK: 32,
topP: 0.9,
maxOutputTokens: 1024,
},
});

const text = (result?.response?.text?.() || '').trim();

// Post-process to keep ONLY valid lines & enforce count
const lines = text
.split('\n')
.map((l) => l.trim())
.filter(Boolean)
// strip leading numbering like "1. ..." if present
.map((l) => l.replace(/^\d+\.\s*/, ''))
// keep only valid prefixes
.filter((l) => /^(MC|TF|YN|MT)\|/i.test(l));

// If fewer than requested, return what we have; if more, truncate
const normalized = lines.slice(0, count);
const body = { lines: normalized.join('\n') };

return {
statusCode: 200,
headers: { ...corsHeaders, 'Content-Type': 'application/json' },
body: JSON.stringify(body),
};
} catch (err) {
return {
statusCode: 502,
headers: corsHeaders,
body: JSON.stringify({ error: 'Generation failed', details: String(err && err.message || err) }),
};
}
};