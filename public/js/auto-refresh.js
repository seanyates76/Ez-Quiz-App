// EZ Quiz: lightweight auto-refresh via ETag/Last-Modified polling
// Checks index revalidation every 30s without inline scripts (CSP-safe)
(function(){
  const CHECK_INTERVAL = 60000; // 60s
  let currentTag = null;

  async function checkForUpdate(){
    // Avoid noisy network errors when offline
    if(typeof navigator !== 'undefined' && navigator && navigator.onLine === false) return;
    // Only poll when tab is visible
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    try{
      const url = window.location.pathname || '/';
      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Accept': 'text/html' },
      });
      if(!res.ok) return;
      const tag = res.headers.get('etag')
        || res.headers.get('last-modified')
        || res.headers.get('x-nf-request-id');
      if(currentTag && tag && tag !== currentTag){
        // Only reload automatically while on main menu (idle)
        const mode = (window.EZQ && window.EZQ.mode) || 'idle';
        if(mode === 'idle'){
          window.location.reload(true);
          return;
        }
        // Otherwise, mark update to apply when returning to main menu
        try{ localStorage.setItem('ezq.update.ready','1'); }catch{}
      }
      currentTag = tag;
    }catch{ /* silently ignore */ }
  }

  checkForUpdate();
  setInterval(checkForUpdate, CHECK_INTERVAL);
})();
