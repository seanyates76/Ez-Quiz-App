// netlify/functions/generate-quiz.js (CommonJS)

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// --- Main Handler ---
exports.handler = async (event) => {
  console.log("Function invoked. Method:", event.httpMethod, "Path:", event.path);

  // Health check for quick verification
  if (event.httpMethod === "GET" && event.queryStringParameters?.health === "1") {
    console.log("Health check requested.");
    return jsonResponse(200, { ok: true, hasKey: !!process.env.GEMINI_API_KEY });
  }

  if (event.httpMethod !== "POST") {
    console.log("Method Not Allowed:", event.httpMethod);
    return jsonResponse(405, { error: "Method Not Allowed", details: `Expected POST, got ${event.httpMethod}` });
  }

  try {
    const { topic = "General Knowledge", numQuestions = 5, difficulty = "easy" } = JSON.parse(event.body || "{}");
    console.log("Request received. Topic:", topic, "NumQuestions:", numQuestions, "Difficulty:", difficulty);

    const n = clampInt(numQuestions, 1, 100); // Ensure numQuestions is within a reasonable range

    // Generate quiz using Gemini API
    let generatedLines = [];
    try {
      const prompt = buildStrictPrompt(topic, n, difficulty);
      const rawGeminiResponse = await callGeminiAPI(prompt);
      generatedLines = parseAndSanitizeGeminiOutput(rawGeminiResponse, n);
      console.log(`Generated ${generatedLines.length} lines from Gemini.`);
    } catch (geminiError) {
      console.error("Error calling Gemini API:", geminiError.message, geminiError.stack);
      // Fallback to local generation if Gemini API fails
      generatedLines = generateLocalFallback(topic, n);
      console.log("Falling back to local generation.");
    }

    // Ensure we have exactly 'n' questions, padding with fallback if necessary
    const finalQuizLines = padWithFallback(generatedLines, n, topic);
    console.log("Final quiz lines count:", finalQuizLines.length);

    return jsonResponse(200, finalQuizLines.map(line => ({ line })));

  } catch (parseError) {
    console.error("Request parsing error:", parseError.message, parseError.stack);
    return jsonResponse(400, { error: "Invalid Request Body", details: parseError.message });
  } catch (overallError) {
    console.error("Unhandled function error:", overallError.message, overallError.stack);
    // Ultimate safety net for any unhandled errors
    return jsonResponse(500, { error: "Internal Server Error", details: overallError.message });
  }
};

// --- Helper Functions ---

function jsonResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

function clampInt(value, min, max) {
  const num = Number(value);
  if (isNaN(num)) return min; // Default to min if not a number
  return Math.max(min, Math.min(max, num));
}

async function callGeminiAPI(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-1.5-pro";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }

  const url = `${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`;
  const requestBody = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, topP: 0.1, topK: 1, maxOutputTokens: 1024 }
  };

  console.log("Calling Gemini API...");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Gemini API HTTP Error: ${res.status} - ${errorText}`);
    throw new Error(`Gemini API returned HTTP ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  // Extract text from the first candidate's first part
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function buildStrictPrompt(topic, n, difficulty) {
  // This prompt is designed to be very strict to guide Gemini's output
  return `
You are "EZ-Quiz Strict Formatter". Your only job is to produce valid quiz questions in a rigid schema.

Inputs:
- topic = ${topic}
- numQuestions = ${n}
- difficulty = ${difficulty}  // "easy" | "medium" | "hard"

Output:
- A single JSON array with exactly numQuestions objects.
- Each object has exactly one key: "line".
- No markdown, code fences, prose, extra keys, or extra whitespace.

Line grammar:
1) MC: MC|Question?|A) opt1;B) opt2;C) opt3;D) opt4|A
   - Exactly 3 pipes. Question ends with "?". Options A)→D) in order, semicolon+space separators. Answer = single A-D.
2) TF: TF|Statement.|T  or  TF|Statement.|F
   - Exactly 2 pipes. Statement ends with ".". Answer = single T/F.
3) YN: YN|Question?|Y  or  YN|Question?|N
   - Exactly 2 pipes. Question ends with "?". Answer = single Y/N.

Rules:
- ASCII only; no quotes inside the line, no extra pipes, no colons in labels.
- No explanations, hints, or reasoning in any field.
- Keep each line self-contained and factually correct.
- Vary types (mix MC/TF/YN). Aim >=50% MC; remainder TF/YN.
- Match difficulty:
  - easy = basic facts/definitions,
  - medium = applied concepts,
  - hard = subtle distinctions/common pitfalls.
- Topic MUST be clearly about: ${topic}.

GOOD EXAMPLES:
{ "line": "MC|Which layer of the OSI model handles routing?|A) Physical;B) Data Link;C) Network;D) Transport|C" }
{ "line": "TF|SSD access times are typically lower than HDDs.|T" }
{ "line": "YN|Is DHCP commonly used to assign IP addresses automatically?|Y" }

BAD (NEVER DO): explanations, multi-letter answers, missing options, extra fields, markdown, JSON keys other than "line".

Return ONLY the JSON array. Do not include any other text.
`.trim();
}

function parseAndSanitizeGeminiOutput(rawText, expectedCount) {
  const lines = [];
  try {
    // Attempt to parse as JSON array first
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === 'object' && item !== null && typeof item.line === 'string') {
          lines.push(item.line);
        }
      }
    }
  } catch (e) {
    // If not valid JSON, treat as plain text lines
    console.log("Gemini output not JSON, parsing as plain text.", e.message);
    String(rawText).split(/\r?\n/).forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine) lines.push(trimmedLine);
    });
  }

  const sanitized = [];
  const mcRe = /^MC\|[^|?]+\?\|A\) [^;]+;B\) [^;]+;C\) [^;]+;D\) [^|]+\|[ABCD]$/; 
  const tfRe = /^TF\|[^|]+\.|[TF]$/; 
  const ynRe = /^YN\|[^|?]+\?\|[YN]$/; 

  for (const line of lines) {
    let s = line.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();

    // Apply specific coercions/normalizations
    if (s.startsWith("TF|")) {
      const parts = s.split("|");
      if (parts.length >= 3) {
        const statement = parts[1].trim().replace(/\.+$/, '') + '.';
        const ans = (parts[2] || "T").trim().toUpperCase().startsWith("F") ? "F" : "T";
        s = `TF|${statement}|${ans}`;
      }
    } else if (s.startsWith("YN|")) {
      const parts = s.split("|");
      if (parts.length >= 3) {
        const question = parts[1].trim().replace(/\?+$/, '') + '?';
        const ans = (parts[2] || "Y").trim().toUpperCase().startsWith("N") ? "N" : "Y";
        s = `YN|${question}|${ans}`;
      }
    } else if (s.startsWith("MC|")) {
      // Attempt to fix common MC formatting issues
      s = s.replace(/^(MC\|[^|?]+\?)(\s*)(A\))/i, "$1|$3"); // Fix missing pipe before A)
      const parts = s.split("|");
      if (parts.length >= 4) { // Expecting 4 parts: Type|Q|Options|Ans
        const question = parts[1].trim().replace(/\?+$/, '') + '?';
        let optionsStr = parts[2].trim();
        const answer = (parts[3] || "A").trim().toUpperCase().match(/[A-D]/)?.[0] || "A";

        // Normalize options: ensure A) B) C) D) format
        const rawOptions = optionsStr.split(';').map(opt => opt.trim());
        const normalizedOptions = ["A", "B", "C", "D"].map((label, idx) => {
          const currentOpt = rawOptions[idx] || `Option ${label}`;
          return `${label}) ${currentOpt.replace(/^[A-D]\)\s*/, '').trim()}`;
        }).join(';');

        s = `MC|${question}|${normalizedOptions}|${answer}`;
      }
    }

    // Final validation with strict regexes
    if (mcRe.test(s) || tfRe.test(s) || ynRe.test(s)) {
      sanitized.push(s);
    }
    if (sanitized.length === expectedCount) break; // Stop if we have enough valid lines
  }
  return sanitized;
}

function generateLocalFallback(topic, n) {
  const fallbackLines = [];
  const base = [
    `MC|Which relates to ${topic}?|A) Example A;B) Example B;C) Example C;D) Example D|A`,
    `TF|${topic} can be used to generate quiz questions.|T`,
    `YN|Do you want more questions about ${topic}?|Y`
  ];
  for (let i = 0; i < n; i++) {
    fallbackLines.push(base[i % base.length]);
  }
  return fallbackLines;
}
