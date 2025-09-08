// EZ Quiz: lightweight auto-refresh via ETag/Last-Modified polling
// Checks index revalidation every 30s without inline scripts (CSP-safe)
(function(){
  const CHECK_INTERVAL = 30000; // 30s
  let currentTag = null;

  async function checkForUpdate(){
    try{
      const res = await fetch(window.location.pathname || '/', {
        method: 'HEAD',
        cache: 'no-store',
      });
      const tag = res.headers.get('etag')
        || res.headers.get('last-modified')
        || res.headers.get('x-nf-request-id');
      if(currentTag && tag && tag !== currentTag){
        // Force refresh to pick up new index and assets
        window.location.reload(true);
        return;
      }
      currentTag = tag;
    }catch{ /* ignore transient network errors */ }
  }

  checkForUpdate();
  setInterval(checkForUpdate, CHECK_INTERVAL);
})();

