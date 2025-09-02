// Netlify Function: generate-quiz
// POST JSON: { topic: string, questionCount: number (1..20), difficulty?: "easy"|"medium"|"hard" }
// Returns: { questions: [{ question, options:[4], answerIndex:0..3 }] }
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const API   = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
const JSON_HDR = { "Content-Type":"application/json" };

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: JSON_HDR, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return { statusCode: 500, headers: JSON_HDR, body: JSON.stringify({ error: "Server config error (API key missing)" }) };
    }

    let body;
    try { body = JSON.parse(event.body || "{}"); } 
    catch { return { statusCode: 400, headers: JSON_HDR, body: JSON.stringify({ error: "Invalid JSON body" }) }; }

    const tRaw = String(body.topic ?? "").trim();
    const nRaw = Number(body.questionCount);
    const dRaw = String(body.difficulty ?? "medium").toLowerCase();
    const d = ({"easy":"easy","medium":"medium","hard":"hard"})[dRaw] || "medium";

    if (!tRaw) {
      return { statusCode: 400, headers: JSON_HDR, body: JSON.stringify({ error: "Topic is required" }) };
    }
    const n = Math.max(1, Math.min(20, Number.isFinite(nRaw) ? nRaw : 5));

    const prompt = [
      `Generate exactly ${n} multiple-choice questions about "${tRaw}" at ${d} difficulty.`, 
      `Return ONLY JSON (no markdown, no prose), following this schema:`, 
      `[{ "question": "string", "options": ["string","string","string","string"], "answerIndex": 0 }]`, 
      `Rules:`, 
      `- Exactly ${n} objects.`, 
      `- "options" has length 4.`, 
      `- "answerIndex" is an integer 0..3.`, 
      `- Wording must be concise and unambiguous.`, 
    ].join("\n");

    // 10s timeout
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), 10000);

    const req = {
      method: "POST",
      headers: JSON_HDR,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" },
      }),
      signal: controller.signal,
    };

    const res = await fetch(API, req).catch(err => ({ ok:false, statusText:String(err) }));
    clearTimeout(timer);

    if (!res.ok) {
      return { statusCode: 502, headers: JSON_HDR, body: JSON.stringify({ error: `Upstream ${res.status || ""} ${res.statusText || ""}`.trim() }) };
    }

    const j = await res.json();
    const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let questions;

    try {
      questions = JSON.parse(text);
    } catch {
      return { statusCode: 502, headers: JSON_HDR, body: JSON.stringify({ error: "AI did not return valid JSON" }) };
    }

    if (!Array.isArray(questions)) {
      return { statusCode: 502, headers: JSON_HDR, body: JSON.stringify({ error: "AI output is not an array" }) };
    }

    // Normalize & validate
    questions = questions.slice(0, n).map(q => ({
      question: String(q?.question ?? "").trim(),
      options: Array.isArray(q?.options) ? q.options.slice(0, 4).map(s => String(s ?? "").trim()) : [],
      answerIndex: Number.isInteger(q?.answerIndex) ? q.answerIndex : -1,
    })).filter(q => q.question && q.options.length === 4 && q.answerIndex >= 0 && q.answerIndex < 4);

    if (questions.length !== n) {
      return { statusCode: 502, headers: JSON_HDR, body: JSON.stringify({ error: "Malformed AI output" }) };
    }

    return { statusCode: 200, headers: JSON_HDR, body: JSON.stringify({ questions }) };
  } catch (e) {
    return { statusCode: 500, headers: JSON_HDR, body: JSON.stringify({ error: "Quiz generation failed" }) };
  }
};