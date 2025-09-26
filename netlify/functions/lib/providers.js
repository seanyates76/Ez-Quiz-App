'use strict';

// Utility: build strict prompt compatible with front-end parser
function buildPrompt(topic, count, types, difficulty){
  const allowed = Array.isArray(types) && types.length ? types.map(t=>t.toUpperCase()).filter(t=>/^(MC|TF|YN|MT)$/.test(t)) : ['MC','TF','YN','MT'];
  const allowLine = `Allowed question types: ${allowed.join(', ')} (use only these).`;
  const diff = (difficulty && String(difficulty).toLowerCase()) || '';
  const prettyDiff = diff ? diff.split(/[-_\s]+/).map(w=> w ? w.charAt(0).toUpperCase()+w.slice(1) : '').join(' ') : '';
  const diffLine = diff
    ? `Difficulty guidance: scale is Very Easy < Easy < Medium < Hard < Expert. Target level: ${prettyDiff}. Match question complexity, vocabulary, and expected knowledge to this level.`
    : '';
  return [
    `Task: Produce a quiz about ${topic}.`,
    allowLine,
    diffLine,
    `Output format:`,
    `1) First line must be: TITLE: <Professional Title>`,
    `   - Use Title Case, depluralize the last word if plural (e.g., "Histories" -> "History", "Ports" -> "Port").`,
    `   - No parentheses or file extensions; keep it concise (e.g., "World History Quiz").`,
    `2) Then output EXACTLY ${count} quiz lines, one per line, using ONLY these formats:`,
    `MC|Question?|A) Option 1;B) Option 2;C) Option 3;D) Option 4|A`,
    `MC|Question with multiple answers?|A) 1;B) 2;C) 3;D) 4|A,C`,
    `TF|A true/false statement.|T`,
    `YN|A yes/no question.|Y`,
    `MT|Match.|1) L1;2) L2;3) L3|A) R1;B) R2;C) R3|1-A,2-B,3-C`,
    `Hard rules:`,
    `- Output only plain text. No numbering, bullet points, or commentary.`,
    `- Exactly 1 title line starting with "TITLE:" plus ${count} quiz lines.`,
    `- Use only allowed types: ${allowed.join(', ')}.`,
    `- MC correct field may be single (A) or multiple (A,C).`,
    `- No blank lines.`,
  ].join('\n');
}

// Utility: normalize model output into valid lines
function normalizeOutputToLines(text, count){
  if(!text) return { title: '', lines: '' };
  const raw = String(text)
    .split('\n')
    .map((l)=>l.trim())
    .filter(Boolean)
    .map((l)=> l.replace(/^\d+\.\s*/, ''));
  // Extract optional TITLE line
  let title = '';
  if(raw.length && /^title\s*:/i.test(raw[0])){
    title = raw.shift().replace(/^title\s*:/i,'').trim();
  }
  const lines = raw.filter((l)=> /^(MC|TF|YN|MT)\|/i.test(l)).slice(0, count);
  return { title, lines: lines.join('\n') };
}

async function geminiGenerate({ apiKey, model = 'gemini-2.5-flash', topic, count, types, difficulty }){
  if(!apiKey) throw new Error('Missing GEMINI_API_KEY');
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const m = genAI.getGenerativeModel({ model });
  const prompt = buildPrompt(topic, count, types, difficulty);
  const result = await m.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.6, topK: 32, topP: 0.9, maxOutputTokens: 1024 },
  });
  const text = (result?.response?.text?.() || '').trim();
  return normalizeOutputToLines(text, count);
}

async function openaiGenerate({ apiKey, model = 'gpt-4o-mini', topic, count, types, difficulty }){
  if(!apiKey) throw new Error('Missing OPENAI_API_KEY');
  const prompt = buildPrompt(topic, count, types, difficulty);
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

function echoGenerate({ topic, count, types }){
  // Deterministic stub for testing/no-key scenarios
  const out = [];
  const t = topic || 'General knowledge';
  const allowed = Array.isArray(types) && types.length ? types.map(x=>x.toUpperCase()).filter(x=>/^(MC|TF|YN|MT)$/.test(x)) : ['MC','TF','YN','MT'];
  const pickType = (i)=> allowed[i % allowed.length];
  for(let i=0;i<count;i++){
    const tt = pickType(i);
    if(tt==='MC') out.push(`MC|${t}: Sample MC ${i+1}?|A) One;B) Two;C) Three;D) Four|A`);
    else if(tt==='TF') out.push(`TF|${t}: Sample TF ${i+1}.|T`);
    else if(tt==='YN') out.push(`YN|${t}: Sample YN ${i+1}?|Y`);
    else out.push(`MT|${t}: Match ${i+1}.|1) L1;2) L2|A) R1;B) R2|1-A,2-B`);
  }
  return out.join('\n');
}

async function generateLines({ provider, model, topic, count, types, difficulty, env }){
  const p = (provider || (env.AI_PROVIDER || 'gemini')).toLowerCase();
  const n = Math.max(1, Math.min(50, parseInt(count||10,10)));
  const args = { topic, count: n, types, difficulty };
  try{
    if(p==='gemini'){
      const resolvedModel = model || env.GEMINI_MODEL || 'gemini-2.5-flash';
      const { title, lines } = await geminiGenerate({ apiKey: env.GEMINI_API_KEY, model: resolvedModel, ...args });
      return { provider: 'gemini', model: resolvedModel, title, lines };
    }
    if(p==='openai'){
      const { title, lines } = await openaiGenerate({ apiKey: env.OPENAI_API_KEY, model: model || env.OPENAI_MODEL || 'gpt-4o-mini', ...args });
      return { provider: 'openai', model: model || env.OPENAI_MODEL || 'gpt-4o-mini', title, lines };
    }
    if(p==='echo'){
      return { provider: 'echo', model: 'stub', title: `${topic || 'General Knowledge'} Quiz`, lines: echoGenerate(args) };
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
