const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
};

interface NetlifyHandlerEvent {
  httpMethod: string;
  headers?: Record<string, string | undefined>;
  body?: string | null;
}

interface NetlifyHandlerResult {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

type Handler = (event: NetlifyHandlerEvent) => Promise<NetlifyHandlerResult> | NetlifyHandlerResult;

// ─────────────────────────────────────────────────────────────────────────────
// Types / helpers shared by legacy + MCP code
// ─────────────────────────────────────────────────────────────────────────────
interface GenerateQuizSuccess {
  lines: string;
  title?: string;
  provider?: string;
  model?: string;
  fallbackUsed?: boolean;
  fallbackFrom?: string;
  errorPrimary?: string;
}
type UnknownRecord = Record<string, unknown>;

function sanitizeGenerateQuizParams(raw: unknown): UnknownRecord {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const source = raw as UnknownRecord;
  const result: UnknownRecord = {};
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) continue;
    if (key === 'count') {
      if (typeof value === 'number' && Number.isFinite(value)) {
        result.count = Math.max(1, Math.min(50, Math.trunc(value)));
        continue;
      }
      if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed)) {
          result.count = Math.max(1, Math.min(50, parsed));
          continue;
        }
      }
      continue;
    }
    if (key === 'types') {
      if (Array.isArray(value)) {
        result.types = value.map((item) => String(item).toUpperCase());
        continue;
      }
      if (typeof value === 'string') {
        const parts = value
          .split(/[,\s]+/)
          .map((part) => part.trim())
          .filter(Boolean)
          .map((part) => part.toUpperCase());
        if (parts.length > 0) {
          result.types = parts;
        }
        continue;
      }
      continue;
    }
    if (typeof value === 'string') {
      result[key] = value.trim();
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      result[key] = value;
      continue;
    }
    if (typeof value === 'boolean') {
      result[key] = value;
      continue;
    }
  }
  return result;
}

function validateGenerateQuizResponse(payload: unknown): GenerateQuizSuccess {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid generate-quiz response: expected object');
  }
  const record = payload as UnknownRecord;
  const { lines } = record;
  if (typeof lines !== 'string' || !lines.trim()) {
    throw new Error('Invalid generate-quiz response: missing lines');
  }
  const result: GenerateQuizSuccess = { lines };
  if (typeof record.title === 'string') result.title = record.title;
  if (typeof record.provider === 'string') result.provider = record.provider;
  if (typeof record.model === 'string') result.model = record.model;
  if (typeof record.fallbackUsed === 'boolean') result.fallbackUsed = record.fallbackUsed;
  if (typeof record.fallbackFrom === 'string') result.fallbackFrom = record.fallbackFrom;
  if (typeof record.errorPrimary === 'string') result.errorPrimary = record.errorPrimary;
  return result;
}

function resolveBaseUrl(event: NetlifyHandlerEvent): string {
  if (process.env.INTERNAL_GENERATE_URL) {
    return process.env.INTERNAL_GENERATE_URL;
  }
  const url = process.env.URL || process.env.DEPLOY_URL;
  if (url) return url;
  const headers = event.headers || {};
  const host = (headers.host || headers.Host || '') as string;
  if (host) {
    const isLocal = host.includes('localhost') || host.startsWith('127.') || host.startsWith('::1');
    const protocol = isLocal ? 'http' : 'https';
    return `${protocol}://${host}`;
  }
  return 'http://localhost:8888';
}

async function callGenerateQuiz(params: UnknownRecord, event: NetlifyHandlerEvent): Promise<GenerateQuizSuccess> {
  const base = resolveBaseUrl(event);
  const url = new URL('/.netlify/functions/generate-quiz', base);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = process.env.GENERATE_BEARER_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const resp = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => `status ${resp.status}`);
    throw new Error(`generate-quiz failed (${resp.status}): ${detail.slice(0, 200)}`);
  }
  const payload = await resp.json();
  return validateGenerateQuizResponse(payload);
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP HTTP (JSON-RPC) helpers
// ─────────────────────────────────────────────────────────────────────────────
type Json = UnknownRecord | unknown[] | string | number | boolean | null;
interface JsonRpcReq {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: UnknownRecord;
}
interface JsonRpcRes {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: Json;
  error?: { code: number; message: string; data?: Json };
}

function isJsonRpc(body: unknown): body is JsonRpcReq {
  return !!(
    body &&
    typeof body === 'object' &&
    (body as UnknownRecord)['jsonrpc'] === '2.0' &&
    typeof (body as UnknownRecord)['method'] === 'string'
  );
}

// JSON Schema for MCP tools (what clients expect in tools/list)
const GenerateQuizSchema = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    count: { type: 'integer', minimum: 1, maximum: 50 },
    difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'], default: 'medium' },
    types: { type: 'array', items: { type: 'string' } }
  },
  required: ['topic', 'count'],
  additionalProperties: true
};

const ValidateLinesSchema = {
  type: 'object',
  properties: {
    raw: { type: 'string' }
  },
  required: ['raw'],
  additionalProperties: false
};

function buildMcpToolsList(): JsonRpcRes {
  return {
    jsonrpc: '2.0',
    id: null,
    result: {
      tools: [
        {
          name: 'generate_quiz',
          description: 'Return EZ-Quiz lines (MC|/TF|/YN|/MT) via Netlify generator proxy.',
          inputSchema: GenerateQuizSchema
        },
        {
          name: 'validate_lines',
          description: 'Validate EZ-Quiz formatted lines and report any invalid rows.',
          inputSchema: ValidateLinesSchema
        }
      ]
    }
  };
}

async function handleMcpCall(method: string, params: UnknownRecord | undefined, id: string | number | null, event: NetlifyHandlerEvent): Promise<JsonRpcRes> {
  try {
    if (method === 'tools/list') {
      return { ...buildMcpToolsList(), id };
    }

    if (method === 'tools/call') {
      const name = params?.name as string | undefined;
      const args = (params?.arguments as UnknownRecord) ?? {};

      if (name === 'generate_quiz') {
        const safe = sanitizeGenerateQuizParams(args);
        const quiz = await callGenerateQuiz(safe, event);

        const meta: UnknownRecord = {};
        if (quiz.title) meta.title = quiz.title;
        if (quiz.provider) meta.provider = quiz.provider;
        if (quiz.model) meta.model = quiz.model;
        if (quiz.fallbackUsed !== undefined) meta.fallbackUsed = quiz.fallbackUsed;
        if (quiz.fallbackFrom) meta.fallbackFrom = quiz.fallbackFrom;
        if (quiz.errorPrimary) meta.errorPrimary = quiz.errorPrimary;

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: quiz.lines }],
            meta
          }
        };
      }

      if (name === 'validate_lines') {
        const raw = typeof (args as UnknownRecord).raw === 'string' ? String((args as UnknownRecord).raw) : '';
        if (!raw) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Missing required argument: raw' }
          };
        }
        const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
        const bad = lines.filter((l) => !/^(MC|TF|YN|MT)\|/.test(l));
        const msg = bad.length
          ? `Invalid lines detected (${bad.length}):\n${bad.join('\n')}`
          : 'All lines are valid ✅';
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: msg }] }
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Unknown tool: ${name ?? '(missing name)'}` }
      };
    }

    // Method not supported
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Unsupported method: ${method}` }
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message }
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy body shape (your previous `{ tool, params }`) for backward compat
// ─────────────────────────────────────────────────────────────────────────────
interface ToolRequest {
  id?: string | number;
  tool: string;
  params?: unknown;
}
function parseLegacyToolRequest(body: string | null | undefined): ToolRequest {
  if (!body) throw new Error('Missing request body');
  let parsed: unknown;
  try { parsed = JSON.parse(body); } catch { throw new Error('Invalid JSON'); }
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid request payload');
  const candidate = parsed as UnknownRecord;
  const tool = candidate.tool;
  if (typeof tool !== 'string' || !tool.trim()) throw new Error('Missing tool name');
  const id = candidate.id;
  if (id !== undefined && typeof id !== 'string' && typeof id !== 'number') {
    throw new Error('Invalid id');
  }
  return { id, tool, params: candidate.params };
}

function buildLegacySuccess(id: string | number | undefined, quiz: GenerateQuizSuccess) {
  const meta: UnknownRecord = {};
  if (quiz.title) meta.title = quiz.title;
  if (quiz.provider) meta.provider = quiz.provider;
  if (quiz.model) meta.model = quiz.model;
  if (quiz.fallbackUsed !== undefined) meta.fallbackUsed = quiz.fallbackUsed;
  if (quiz.fallbackFrom) meta.fallbackFrom = quiz.fallbackFrom;
  if (quiz.errorPrimary) meta.errorPrimary = quiz.errorPrimary;
  const response: UnknownRecord = {
    id: id ?? null,
    tool: 'generate_quiz',
    lines: quiz.lines,
    content: [{ type: 'text', text: quiz.lines }],
  };
  if (Object.keys(meta).length > 0) {
    response.meta = meta;
  }
  return response;
}

function buildLegacyError(id: string | number | undefined, error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
  return { id: id ?? null, tool: 'generate_quiz', error: { message } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Netlify handler
// ─────────────────────────────────────────────────────────────────────────────
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        ...JSON_HEADERS,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // Parse the body once
  let parsed: unknown;
  try {
    parsed = event.body ? JSON.parse(event.body) : null;
  } catch {
    return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // If it looks like MCP JSON-RPC, handle that path
  if (isJsonRpc(parsed)) {
    const req = parsed as JsonRpcReq;
    const res = await handleMcpCall(req.method, (req.params as UnknownRecord) ?? {}, req.id ?? null, event);
    return { statusCode: res.error ? 400 : 200, headers: JSON_HEADERS, body: JSON.stringify(res) };
  }

  // Otherwise fall back to the legacy `{ tool, params }` envelope
  let request: ToolRequest;
  try {
    request = parseLegacyToolRequest(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid request' }),
    };
  }

  if (request.tool !== 'generate_quiz') {
    return {
      statusCode: 404,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Unknown tool', id: request.id ?? null, tool: request.tool }),
    };
  }

  const params = sanitizeGenerateQuizParams(request.params);

  try {
    const quiz = await callGenerateQuiz(params, event);
    const response = buildLegacySuccess(request.id, quiz);
    return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(response) };
  } catch (error) {
    const response = buildLegacyError(request.id, error);
    return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify(response) };
  }
};
