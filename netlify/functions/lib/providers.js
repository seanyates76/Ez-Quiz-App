'use strict';

// Utility: build strict prompt compatible with front-end parser
function buildPrompt(topic, count){
  return [
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
}

// Utility: normalize model output into valid lines
function normalizeOutputToLines(text, count){
  if(!text) return '';
  const lines = String(text)
    .split('\n')
    .map((l)=>l.trim())
    .filter(Boolean)
    .map((l)=> l.replace(/^\d+\.\s*/, ''))
    .filter((l)=> /^(MC|TF|YN|MT)\|/i.test(l));
  return lines.slice(0, count).join('\n');
}

async function geminiGenerate({ apiKey, model = 'gemini-1.5-flash', topic, count }){
  if(!apiKey) throw new Error('Missing GEMINI_API_KEY');
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const m = genAI.getGenerativeModel({ model });
  const prompt = buildPrompt(topic, count);
  const result = await m.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.6, topK: 32, topP: 0.9, maxOutputTokens: 1024 },
  });
  const text = (result?.response?.text?.() || '').trim();
  return normalizeOutputToLines(text, count);
}

async function openaiGenerate({ apiKey, model = 'gpt-4o-mini', topic, count }){
  if(!apiKey) throw new Error('Missing OPENAI_API_KEY');
  const prompt = buildPrompt(topic, count);
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a quiz line generator. Follow rules exactly.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 800,
    }),
  });
  if(!resp.ok){
    let detail = await resp.text().catch(()=>String(resp.status));
    try { detail = JSON.parse(detail); } catch {}
    const err = new Error(`OpenAI HTTP ${resp.status}`);
    err.status = resp.status;
    err.details = detail;
    throw err;
  }
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return normalizeOutputToLines(text, count);
}

function echoGenerate({ topic, count }){
  // Deterministic stub for testing/no-key scenarios
  const out = [];
  const t = topic || 'General knowledge';
  for(let i=0;i<count;i++){
    const j = (i%4);
    if(j===0) out.push(`MC|${t}: Sample MC ${i+1}?|A) One;B) Two;C) Three;D) Four|A`);
    else if(j===1) out.push(`TF|${t}: Sample TF ${i+1}.|T`);
    else if(j===2) out.push(`YN|${t}: Sample YN ${i+1}?|Y`);
    else out.push(`MT|${t}: Match ${i+1}.|1) L1;2) L2|A) R1;B) R2|1-A,2-B`);
  }
  return out.join('\n');
}

async function generateLines({ provider, model, topic, count, env }){
  const p = (provider || (env.AI_PROVIDER || 'gemini')).toLowerCase();
  const n = Math.max(1, Math.min(50, parseInt(count||10,10)));
  const args = { topic, count: n };
  try{
    if(p==='gemini'){
      return { provider: 'gemini', model: model || env.GEMINI_MODEL || 'gemini-1.5-flash', lines: await geminiGenerate({ apiKey: env.GEMINI_API_KEY, model: model || env.GEMINI_MODEL || 'gemini-1.5-flash', ...args }) };
    }
    if(p==='openai'){
      return { provider: 'openai', model: model || env.OPENAI_MODEL || 'gpt-4o-mini', lines: await openaiGenerate({ apiKey: env.OPENAI_API_KEY, model: model || env.OPENAI_MODEL || 'gpt-4o-mini', ...args }) };
    }
    if(p==='echo'){
      return { provider: 'echo', model: 'stub', lines: echoGenerate(args) };
    }
    throw new Error(`Unknown provider: ${provider}`);
  }catch(err){
    // propagate with lightweight shape
    const e = new Error(String(err && err.message || err));
    e.status = err && err.status;
    e.details = err && err.details;
    throw e;
  }
}

module.exports = { generateLines };

