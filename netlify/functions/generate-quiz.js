const MC="MC",TF="TF",YN="YN";

exports.handler = async (event) => {
  // Health GET
  if (event.httpMethod === "GET") {
    const qp = event.queryStringParameters || {};
    if (qp.health === "1") return json200([{ line: "TF|Health check OK.|T" }]); // exact UI shape
    return { statusCode:405, body:"Method Not Allowed" };
  }

  if (event.httpMethod !== "POST") return { statusCode:405, body:"Method Not Allowed" };

  try {
    const { topic="General Knowledge", numQuestions=5, difficulty="easy" } = JSON.parse(event.body || "{}");
    const n = clamp(numQuestions,1,100);

    // Bypass POST for path sanity
    const qp = event.queryStringParameters || {};
    if (qp.bypass === "1") {
      return json200(padWithFallback([], n, topic).map(line => ({ line })));
    }

    // Normal path
    const raw = await callGemini(strictPrompt(topic, n, difficulty));
    const lines = safeToArray(raw);
    const normalized = normalizeAll(lines, n, topic);
    const out = padWithFallback(normalized, n, topic).slice(0,n).map(line => ({ line }));
    return json200(out);

  } catch (e) {
    // TEMP during bring-up: surface error; flip to fallback once green
    return { statusCode:500, headers:{'Content-Type':'text/plain'}, body:String(e && e.stack || e) };
    // FINAL: return json200(padWithFallback([], 5, "General Knowledge").map(line => ({ line })));
  }
};

function json200(x){ return { statusCode:200, headers:{'Content-Type':'application/json'}, body:JSON.stringify(x) }; }
function clamp(v,min,max){ const n=Number(v)||min; return Math.max(min,Math.min(max,n)); }

async function callGemini(prompt){
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-1.5-pro";
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = { contents:[{role:"user",parts:[{text:prompt}]}],
                 generationConfig:{temperature:0.2, topP:0.1, topK:1, maxOutputTokens:1024} };
  const r = await fetch(url,{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body) });
  if (!r.ok) throw new Error(`Gemini HTTP ${r.status}`);
  const j = await r.json();
  return j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function strictPrompt(topic,n,difficulty){
  return `
  You are "EZ-Quiz Strict Formatter".
  Inputs: topic=${topic}, numQuestions=${n}, difficulty=${difficulty}
  Output: JSON array of exactly numQuestions objects, each: { "line": "<schema>" }.

  Line schema:
  - MC: MC|Question?|A) opt1;B) opt2;C) opt3;D) opt4|A
  - TF: TF|Statement.|T or TF|Statement.|F
  - YN: YN|Question?|Y or YN|Question?|N

  Rules: ASCII only; no markdown/fences/explanations; answers are single letters (A-D/T/F/Y/N). Return ONLY the JSON array.
  `
}

function safeToArray(txt){
  try { const j = JSON.parse(txt); if (Array.isArray(j)) return j.map(o=>String(o?.line||"").trim()).filter(Boolean); } catch {}
  return String(txt).replace(/^\s*```.*?\n|\n```$/g,"").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
}

function normalizeAll(lines, n, topic){
  const out = [];
  for (const raw of lines){
    const s = String(raw).replace(/[<>]/g,"").replace(/\s+/g, " ").trim();
    if (!s) continue;
    if (s.startsWith(`${TF}|`)){ const v=normTF(s); if (v) out.push(v); }
    else if (s.startsWith(`${YN}|`)){ const v=normYN(s); if (v) out.push(v); }
    else if (s.startsWith(`${MC}|`)){ const v=normMC(s); if (v) out.push(v); }
    if (out.length===n) break;
  }
  return out;
}
function normTF(s){
  const p=s.split("|"); if(p.length<3) return null;
  const stmt = ensureDot(p[1]); const ans = (p[2]||"T").trim().toUpperCase().startsWith("F")?"F":"T";
  return `TF|${stmt}|${ans}`;
}
function normYN(s){
  const p=s.split("|"); if(p.length<3) return null;
  const q = ensureQ(p[1]); const ans = (p[2]||"Y").trim().toUpperCase().startsWith("N")?"N":"Y";
  return `YN|${q}|${ans}`;
}
function normMC(s){
  let f = s.replace(/^(MC\|[^\n?]+\?)(\s*)(A\))/i,"$1|$3");
  const p=f.split("|"); if(p.length<3) return null;
  const q = ensureQ(p[1]||"");
  const raw = (p[2]||"").trim();
  const segs = raw.split(";").map(x=>x.trim()).filter(Boolean);
  const lbl = ["A)","B)","C)","D)"];
  const four = lbl.map((L,i)=>{
    const seg = segs[i]||""; const val = seg.replace(/^[A-D]\)\s*/i,"").trim() || `Option ${"ABCD"[i]}`;
    return `${L} ${val}`;
  });
  const ans = ((p[3]||"A").match(/[A-D]/i)||["A"])[0].toUpperCase();
  return `MC|${q}|${four.join(";")}|${ans}`;
}
function ensureQ(t){ const x=String(t||"").replace(/\?+$/,"").trim(); return x?`${x}?`:`Question?`; }
function ensureDot(t){ const x=String(t||"").replace(/\.+$/,"").trim(); return x?`${x}.`:`Statement.`; }
function padWithFallback(lines,n,topic){
  const out=[...lines], base=[
    `MC|Which relates to ${topic}?|A) Example A;B) Example B;C) Example C;D) Example D|A`,
    `TF|${topic} can be used to generate quiz questions.|T`,
    `YN|Do you want more questions about ${topic}?|Y`
  ];
  let i=0; while(out.length<n){ out.push(base[i%base.length]); i++; } return out;
}