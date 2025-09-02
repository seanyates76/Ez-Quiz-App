// netlify/functions/generate-quiz.js
exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    // 1. Parse and validate input
    const body = JSON.parse(event.body || "{}");
    const topic = (body.topic || "").trim();
    let questionCount = body.questionCount;

    if (!topic) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Topic is required" }),
        headers: { "Content-Type": "application/json" },
      };
    }

    if (questionCount === undefined) {
      questionCount = 5; // Default value
    }

    const count = Number(questionCount);
    if (!Number.isInteger(count) || count <= 0 || count > 20) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid questionCount. Must be an integer between 1 and 20." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // 2. Construct Gemini API request
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Quiz generation failed. Please try again." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Generate a quiz with ${count} multiple-choice questions on the topic "${topic}".
Provide each question as a JSON object with:
- "question": the question text,
- "options": an array of four answer options (strings),
- "answerIndex": the index (0-3) of the correct option.
Respond with a JSON array of ${count} objects, and no additional text.`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
      },
    };

    // 3. Call Gemini API (using fetch) with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 seconds

    let geminiResponse;
    try {
      geminiResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!geminiResponse.ok) {
      console.error(`Gemini API error: ${geminiResponse.status} ${geminiResponse.statusText}`);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Failed to get a response from the quiz generator." }),
        headers: { "Content-Type": "application/json" },
      };
    }

    const result = await geminiResponse.json();

    // 4. Parse Gemini response and format output
    const outputText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!outputText) {
      throw new Error("Invalid response structure from Gemini API");
    }

    let quizData;
    try {
      quizData = JSON.parse(outputText);
    } catch (e) {
      console.error("Invalid JSON from model:", outputText);
      throw new Error("Invalid JSON from model");
    }

    // 5. Return result
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: quizData }),
    };

  } catch (err) {
    console.error("Error in generate-quiz function:", err);
    const errorMessage = (err.name === 'AbortError')
      ? "Quiz generation timed out. Please try again."
      : "Quiz generation failed. Please try again.";

    const statusCode = (err.name === 'AbortError') ? 504 : 500;

    return {
      statusCode: statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};
