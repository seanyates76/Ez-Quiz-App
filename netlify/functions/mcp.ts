import { requireBeta, betaForbiddenResponse } from './lib/betaGuard.js';

/**
 * Netlify Function: mcp
 * Model Context Protocol (MCP) server for Ez-Quiz-App
 * 
 * Provides tools for usage minimization:
 * - ingest_text: Process text/URL content without LLM usage
 * - explain_answer: Generate template-based explanations
 */

// TypeScript types
interface ToolSchema {
  type: string;
  properties?: any;
  required?: string[];
  description?: string;
  default?: any;
  enum?: string[];
  items?: any;
}

interface Tool {
  name: string;
  description: string;
  inputSchema: ToolSchema;
}

interface McpResponse {
  tools?: Tool[];
  content?: Array<{ type: string; text: string }>;
  meta?: any;
}

interface NetlifyEvent {
  httpMethod: string;
  headers: any;
  body?: string;
}

interface NetlifyResponse {
  statusCode: number;
  headers: any;
  body: string;
}

// JSON Schemas for MCP tools
const IngestTextSchema = {
  type: "object",
  properties: {
    text: {
      type: "string",
      description: "Text content to process (optional if url provided)"
    },
    url: {
      type: "string", 
      description: "URL to fetch content from (optional if text provided)"
    },
    maxChars: {
      type: "number",
      description: "Maximum characters to process (default: 500000)",
      default: 500000
    }
  },
  description: "Ingest and process text content for context reuse"
};

const ExplainAnswerSchema = {
  type: "object",
  properties: {
    question: {
      type: "string",
      description: "The quiz question text"
    },
    correctAnswer: {
      type: "string", 
      description: "The correct answer or answers"
    },
    options: {
      type: "array",
      items: { type: "string" },
      description: "Available answer options (for MC questions)"
    },
    questionType: {
      type: "string",
      enum: ["MC", "TF", "YN", "MT"],
      description: "Type of question"
    },
    detailed: {
      type: "boolean",
      description: "Whether to provide detailed explanation (default: false)",
      default: false
    }
  },
  required: ["question", "correctAnswer", "questionType"],
  description: "Generate template-based explanation for quiz answers"
};

// Build MCP tools list
function buildMcpToolsList(): McpResponse {
  return {
    tools: [
      {
        name: "generate_quiz",
        description: "Generate quiz questions using AI",
        inputSchema: {
          type: "object",
          properties: {
            topic: { type: "string", description: "Quiz topic" },
            count: { type: "number", description: "Number of questions" },
            types: { 
              type: "array", 
              items: { type: "string", enum: ["MC", "TF", "YN", "MT"] },
              description: "Question types to generate"
            },
            difficulty: { type: "string", description: "Difficulty level" }
          },
          required: ["topic", "count"]
        }
      },
      {
        name: "validate_lines", 
        description: "Validate quiz line format",
        inputSchema: {
          type: "object",
          properties: {
            lines: {
              type: "array",
              items: { type: "string" },
              description: "Quiz lines to validate"
            }
          },
          required: ["lines"]
        }
      },
      {
        name: "ingest_text",
        description: "Ingest and process text content for context reuse (no LLM usage)",
        inputSchema: IngestTextSchema
      },
      {
        name: "explain_answer",
        description: "Generate template-based explanation for quiz answers (no LLM usage)", 
        inputSchema: ExplainAnswerSchema
      }
    ]
  };
}

// CORS utilities (following existing pattern)
function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function getOrigin(headers: any): string {
  const h = headers || {};
  return h.origin || h.Origin || '';
}

function makeCorsHeaders(origin: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Origin': origin || '',
  };
  if (!origin) {
    delete headers['Access-Control-Allow-Origin'];
  }
  return headers;
}

function reply(statusCode: number, body: any, origin: string): NetlifyResponse {
  const headers = makeCorsHeaders(origin);
  return {
    statusCode,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

// Handle MCP calls
async function handleMcpCall(method: string, params: any = {}): Promise<McpResponse> {
  if (method === "tools/list") {
    return buildMcpToolsList();
  }
  
  if (method === "tools/call") {
    const { name, arguments: args } = params;
    
    if (name === "ingest_text") {
      return await handleIngestText(args);
    }
    
    if (name === "explain_answer") {
      return await handleExplainAnswer(args);
    }
    
    // Handle existing tools if needed
    if (name === "generate_quiz" || name === "validate_lines") {
      throw { 
        code: "MethodNotFound", 
        message: `Tool ${name} requires external implementation` 
      };
    }
    
    throw { 
      code: "MethodNotFound", 
      message: `Unknown tool: ${name}` 
    };
  }
  
  throw { 
    code: "MethodNotFound", 
    message: `Unknown method: ${method}` 
  };
}

// Handle ingest_text tool
async function handleIngestText(args: any): Promise<McpResponse> {
  try {
    const { text, url, maxChars = 500000 } = args;
    
    if (!text && !url) {
      throw { 
        code: "InvalidParams", 
        message: "Either 'text' or 'url' parameter is required" 
      };
    }
    
    let content = text || '';
    
    // Fetch URL content if text not provided
    if (!text && url) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        content = await response.text();
      } catch (err: any) {
        throw { 
          code: "NetworkError", 
          message: `Failed to fetch URL: ${err.message}` 
        };
      }
    }
    
    // Limit content length
    if (content.length > maxChars) {
      content = truncate(content, maxChars);
    }
    
    // Process the content
    const normalized = normalizeText(content);
    const headings = extractHeadings(normalized);
    const topics = rankTopics(normalized);
    const outline = buildOutline(headings, topics);
    
    const contextBlob = {
      original_length: content.length,
      processed_length: normalized.length,
      headings: headings.slice(0, 10), // Top 10 headings
      topics: topics.slice(0, 15), // Top 15 topics
      outline,
      source: url || 'direct_text'
    };
    
    return {
      content: [{
        type: "text",
        text: `Content ingested successfully. Processed ${normalized.length} characters from ${url || 'direct text input'}.\n\nKey topics identified: ${topics.slice(0, 5).join(', ')}\n\nOutline structure contains ${outline.length} main sections.`
      }],
      meta: {
        context_blob: contextBlob,
        outlineSize: outline.length
      }
    };
    
  } catch (err: any) {
    if (err.code) throw err;
    throw { 
      code: "InternalError", 
      message: `Failed to process content: ${err.message}` 
    };
  }
}

// Handle explain_answer tool
async function handleExplainAnswer(args: any): Promise<McpResponse> {
  try {
    const { question, correctAnswer, options, questionType, detailed = false } = args;
    
    if (!question || !correctAnswer || !questionType) {
      throw { 
        code: "InvalidParams", 
        message: "Required parameters: question, correctAnswer, questionType" 
      };
    }
    
    const explanation = templateExplain({
      question,
      correctAnswer, 
      options,
      questionType,
      detailed
    });
    
    return {
      content: [{
        type: "text",
        text: explanation
      }]
    };
    
  } catch (err: any) {
    if (err.code) throw err;
    throw { 
      code: "InternalError", 
      message: `Failed to generate explanation: ${err.message}` 
    };
  }
}

// Main handler
export const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
  const allowedOrigins = parseAllowedOrigins();
  const origin = getOrigin(event.headers);
  const originAllowed = !origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin);

  if (event.httpMethod === 'OPTIONS') {
    if (!originAllowed) return reply(403, { error: 'Forbidden origin' }, '');
    return reply(204, '', origin || (allowedOrigins.length === 0 ? '*' : ''));
  }

  if (!originAllowed) return reply(403, { error: 'Forbidden origin' }, '');

  const responseOrigin = origin || (allowedOrigins.length === 0 ? '*' : '');

  if (event.httpMethod !== 'POST') {
    return reply(405, { error: 'Method not allowed' }, responseOrigin);
  }

  const guardRequest = new Request('https://ez-quiz.app/.netlify/functions/mcp', {
    headers: new Headers(event.headers || {}),
    method: event.httpMethod,
  });

  if (!requireBeta(guardRequest)) {
    const forbidden = betaForbiddenResponse();
    const bodyText = await forbidden.text();
    const forbiddenHeaders = Object.fromEntries(forbidden.headers.entries());
    const corsHeaders = makeCorsHeaders(responseOrigin);

    return {
      statusCode: forbidden.status,
      headers: { ...corsHeaders, ...forbiddenHeaders },
      body: bodyText,
    };
  }

  let payload: any;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return reply(400, { error: 'Invalid JSON in request body' }, responseOrigin);
  }

  const { method, params } = payload;
  
  if (!method) {
    return reply(400, { error: 'Missing method parameter' }, responseOrigin);
  }

  try {
    const result = await handleMcpCall(method, params);
    return reply(200, result, responseOrigin);
  } catch (err: any) {
    const code = err.code || 'InternalError';
    const message = err.message || 'An unexpected error occurred';
    return reply(400, { error: { code, message } }, responseOrigin);
  }
};

// Helper functions

function normalizeText(text: string): string {
  if (!text) return '';
  
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove special characters but keep basic punctuation
    .replace(/[^\w\s.,!?;:\-()]/g, ' ')
    // Clean up multiple spaces again
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHeadings(text: string): string[] {
  if (!text) return [];
  
  const headings: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Look for markdown-style headings or lines that look like headings
    if (trimmed.match(/^#{1,6}\s+/) || 
        (trimmed.length > 3 && trimmed.length < 100 && 
         trimmed.match(/^[A-Z][^.!?]*$/) &&
         !trimmed.includes(' the ') &&
         !trimmed.includes(' and '))) {
      headings.push(trimmed.replace(/^#+\s*/, ''));
    }
  }
  
  return dedup(headings).slice(0, 20);
}

function rankTopics(text: string): string[] {
  if (!text) return [];
  
  // Simple keyword extraction
  const words = text.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'would', 'could', 'should'].includes(word));
  
  const wordCount = new Map<string, number>();
  
  for (const word of words) {
    const clean = word.replace(/[^\w]/g, '');
    if (clean.length > 3) {
      wordCount.set(clean, (wordCount.get(clean) || 0) + 1);
    }
  }
  
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => toTitle(word))
    .slice(0, 20);
}

function buildOutline(headings: string[], topics: string[]): any[] {
  const outline = [];
  
  // Create sections from headings
  for (let i = 0; i < Math.min(headings.length, 8); i++) {
    const heading = headings[i];
    const relatedTopics = topics.slice(i * 2, (i + 1) * 2);
    
    outline.push({
      section: heading,
      topics: relatedTopics,
      level: 1
    });
  }
  
  return outline;
}

function templateExplain(params: any): string {
  const { question, correctAnswer, options, questionType, detailed } = params;
  
  let explanation = '';
  
  if (questionType === 'MC') {
    const correctOptions = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
    explanation = `For this multiple choice question, the correct answer is ${correctOptions.join(' and ')}.`;
    
    if (detailed && options) {
      explanation += '\n\nLet\'s examine each option:\n';
      options.forEach((option: string, index: number) => {
        const letter = String.fromCharCode(65 + index);
        const isCorrect = correctOptions.includes(letter) || correctOptions.includes(option);
        explanation += `${letter}) ${option} - ${isCorrect ? 'Correct' : 'Incorrect'}\n`;
      });
    }
  } else if (questionType === 'TF') {
    explanation = `This statement is ${correctAnswer.toUpperCase() === 'T' ? 'True' : 'False'}.`;
    
    if (detailed) {
      explanation += correctAnswer.toUpperCase() === 'T' 
        ? '\n\nThis statement accurately reflects the facts or principles being tested.'
        : '\n\nThis statement contains an error or misconception that makes it false.';
    }
  } else if (questionType === 'YN') {
    explanation = `The answer to this question is ${correctAnswer.toUpperCase() === 'Y' ? 'Yes' : 'No'}.`;
    
    if (detailed) {
      explanation += correctAnswer.toUpperCase() === 'Y'
        ? '\n\nThe conditions or criteria described in the question are met.'
        : '\n\nThe conditions or criteria described in the question are not met.';
    }
  } else if (questionType === 'MT') {
    explanation = `The correct matching pairs are: ${correctAnswer}`;
    
    if (detailed) {
      explanation += '\n\nEach item on the left should be matched with its corresponding item on the right based on the relationship being tested.';
    }
  } else {
    explanation = `The correct answer is: ${correctAnswer}`;
  }
  
  return explanation;
}

function dedup(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

function toTitle(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Try to truncate at word boundary
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

// CommonJS export for compatibility
