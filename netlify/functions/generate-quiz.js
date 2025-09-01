const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const MODEL_NAME = "gemini-pro";

// Function to build the prompt
function buildPrompt(topic, length) {
  const n = Math.max(1, Math.min(200, Number(length) || 30));
  const t = (topic || 'General Knowledge').trim();
  return [
    `You are QuizMaker. Create exactly ${n} quiz lines about ${t}.`,
    '',
    'Allowed line types (choose any mix):',
    '',
    'MC: MC|Question?|A) Opt1;B) Opt2;C) Opt3;D) Opt4|A',
    '',
    'For multi-answer MC: separate letters with commas, no spaces (e.g., A,C).',
    '',
    'TF: TF|Statement.|T OR TF|Statement.|F',
    '',
    'YN: YN|Question?|Y OR YN|Question?|N',
    '',
    'MT: MT|Prompt.|1) L1;2) L2;3) L3|A) R1;B) R2;C) R3|1-A,2-B,3-C',
    '',
    'FITB: FITB|Sentence with a [BLANK] word.|answer',
    '',
    'Hard constraints:',
    '',
    'Output only the quiz lines. No headings, numbering, quotes, explanations, or extra text.',
    `Exactly ${n} non-blank lines. One question per line. No empty lines.`,
    'ASCII characters only (no smart quotes). No trailing spaces.',
    'Follow the exact separators: pipes |, semicolons ;, and commas , as shown.',
    'MC has exactly A-D options; answer is letters only (e.g., A or A,C). TF uses T/F. YN uses Y/N.',
    'MT includes at least 2 left items and 2 right items, with a correct mapping (e.g., 1-A,2-B,...).',
    '',
    'Begin output now (no extra text before or after the lines).'
  ].join('\n');
}

exports.handler = async (event) => {
  const API_KEY = process.env.GEMINI_API_KEY;
  console.log("API_KEY: ", API_KEY);
  console.log("API_KEY: ", API_KEY);
  console.log(event.headers);
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: 'API key not configured.' };
  }

  try {
    const { topic, length } = JSON.parse(event.body);
    const prompt = buildPrompt(topic, length);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 0.9,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    };

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
      safetySettings,
    });

    if (result.response && result.response.candidates && result.response.candidates.length > 0) {
      const content = result.response.candidates[0].content;
      if (content && content.parts && content.parts.length > 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ quiz: content.parts[0].text.trim() }),
          headers: { 'Content-Type': 'application/json' }
        };
      }
    }
    
    // Handle cases where the response is not as expected
    return { statusCode: 500, body: 'Failed to generate quiz from model.' };

  } catch (error) {
    console.error('Error generating quiz:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An error occurred while generating the quiz.' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
