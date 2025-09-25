const API_ENDPOINT_CANDIDATES = [
  '/.netlify/functions/generate-quiz',
  '/api/generate'
];

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
