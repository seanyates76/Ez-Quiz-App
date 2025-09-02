// netlify/functions/generate-quiz.js
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const API  = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
const JSON_HDR = { "Content-Type":"application/json" };

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return { statusCode:405, headers:JSON_HDR, body:JSON.stringify({ error:"Method Not Allowed" }) };

  try {
    const { topic, questionCount } = JSON.parse(event.body || "{}");
    const t = String(topic||"").trim();
    const n = Math.max(1, Math.min(20, Number(questionCount)||5));
    if (!t) return { statusCode:400, headers:JSON_HDR, body:JSON.stringify({ error:"Topic is required" }) };
    if (!process.env.GEMINI_API_KEY) return { statusCode:500, headers:JSON_HDR, body:JSON.stringify({ error:"Server config error" }) };

    const prompt = [
      `Generate exactly ${n} multiple-choice questions about "${t}".`,
      `Return ONLY JSON (no markdown, no prose):`,
      `[{ "question": "...", "options": ["...","...","...","..."], "answerIndex": 0-3 }]`,
      `Rules:`,
      `- Exactly ${n} objects.`,
      `- options has length 4.`,
      `- answerIndex is an integer 0..3.`,
      `- Use concise, unambiguous wording.`
    ].join("\n");

    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), 10000);

    const body = {
      contents:[{ role:"user", parts:[{ text: prompt }] }],
      generationConfig:{ response_mime_type:"application/json" }
    };

    const res = await fetch(API, { method:"POST", headers:JSON_HDR, body:JSON.stringify(body), signal:controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { statusCode:502, headers:JSON_HDR, body:JSON.stringify({ error:`Upstream ${res.status}` }) };

    const j = await res.json();
    const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let questions = JSON.parse(text); // must be valid JSON per response_mime_type
    if (!Array.isArray(questions)) throw new Error("Model did not return an array");

    // Server-side validation & trimming
    questions = questions.slice(0, n).map(q => ({
      question: String(q?.question||"").trim(),
      options: Array.isArray(q?.options) ? q.options.slice(0,4).map(s=>String(s||"").trim()) : [],
      answerIndex: Number.isInteger(q?.answerIndex) ? q.answerIndex : 0
    })).filter(q => q.question && q.options.length===4 && q.answerIndex>=0 && q.answerIndex<4);

    if (questions.length !== n) return { statusCode:502, headers:JSON_HDR, body:JSON.stringify({ error:"Malformed AI output" }) };

    return { statusCode:200, headers:JSON_HDR, body:JSON.stringify({ questions }) };
  } catch (e) {
    return { statusCode:500, headers:JSON_HDR, body:JSON.stringify({ error:"Quiz generation failed" }) };
  }
};
