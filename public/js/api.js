const DEFAULT_NETLIFY_ORIGIN = 'https://eq-quiz.netlify.app';

function buildEndpointList(){
  const seen = new Set();
  const out = [];
  const push = (url)=>{
    if(!url || typeof url !== 'string') return;
    const trimmed = url.trim();
    if(!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push(trimmed);
  };

  // Allow runtime overrides via window.EZQ_API_ENDPOINTS (array of URLs).
  let configured = null;
  if (typeof window !== 'undefined' && window && Array.isArray(window.EZQ_API_ENDPOINTS)) {
    configured = window.EZQ_API_ENDPOINTS;
  }

  const origin = (typeof window !== 'undefined' && window && window.location && window.location.origin) ? window.location.origin : '';

  push('/.netlify/functions/generate-quiz');
  push('/api/generate');

  if (configured) {
    configured.forEach(push);
  }

  if (origin) {
    push(`${origin.replace(/\/$/, '')}/.netlify/functions/generate-quiz`);
    push(`${origin.replace(/\/$/, '')}/api/generate`);
  }

  if (!configured) {
    push(`${DEFAULT_NETLIFY_ORIGIN}/.netlify/functions/generate-quiz`);
    push(`${DEFAULT_NETLIFY_ORIGIN}/api/generate`);
  }

  return out;
}

const API_ENDPOINT_CANDIDATES = buildEndpointList();

export async function generateWithAI(topic, count, opts = {}){
  const payload = JSON.stringify({ topic, count, ...opts });
  const attemptErrors = [];

  for (let i = 0; i < API_ENDPOINT_CANDIDATES.length; i++) {
    const endpoint = API_ENDPOINT_CANDIDATES[i];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: controller.signal
      });

      if (!res.ok) {
        let body;
        try { body = await res.json(); }
        catch { body = await res.text().catch(() => String(res.status)); }

        // Fallback to the next endpoint when the route is missing (404).
        if (res.status === 404 && i < API_ENDPOINT_CANDIDATES.length - 1) {
          attemptErrors.push({ endpoint, status: res.status, body });
          continue;
        }

        const serious = new Error(JSON.stringify({ endpoint, status: res.status, body }));
        serious.__ezStopFallback = true;
        throw serious;
      }

      const data = await res.json();
      return { lines: String(data.lines || '').trim(), title: String(data.title || '') };
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      attemptErrors.push({ endpoint, error: message });
      if (err && err.__ezStopFallback) {
        throw err;
      }
      if (err && err.name === 'AbortError') {
        throw err;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(JSON.stringify({ error: 'All API endpoints failed', attempts: attemptErrors }));
}
