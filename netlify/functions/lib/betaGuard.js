export function requireBeta(request) {
  const cookieHeader = request?.headers?.get?.('cookie') || request?.headers?.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)FEATURE_FLAGS=([^;]+)/);
  const hasCookie = !!match && decodeURIComponent(match[1] || '')
    .split(',')
    .map((flag) => flag.trim())
    .includes('beta');

  const headerBeta = request?.headers?.get?.('x-ezq-beta') === '1'
    || request?.headers?.get?.('X-EZQ-Beta') === '1'
    || request?.headers?.['x-ezq-beta'] === '1'
    || request?.headers?.['X-EZQ-Beta'] === '1';

  return hasCookie || headerBeta;
}

export function betaForbiddenResponse() {
  return new Response(
    JSON.stringify({
      error: 'MCP is in beta.',
      action: 'Visit /beta to opt in, or send header x-ezq-beta: 1 in local dev.',
    }),
    {
      status: 403,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    }
  );
}
