export async function generateWithAI(topic, count){
  const controller = new AbortController();
  const id = setTimeout(()=>controller.abort(), 30000);
  try{
    const res = await fetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ topic, count }), signal: controller.signal
    });
    clearTimeout(id);
    if(!res.ok){
      let body;
      try { body = await res.json(); } catch { body = await res.text().catch(()=>String(res.status)); }
      throw new Error(JSON.stringify({ status: res.status, body }));
    }
    const data = await res.json();
    return { lines: String(data.lines || '').trim(), title: String(data.title || '') };
  }catch(err){ clearTimeout(id); throw err; }
}

