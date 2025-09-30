export default async (request, context) => {
  const url = new URL(request.url);
  
  // Only handle /beta path
  if (url.pathname !== '/beta') {
    return;
  }
  
  // Check for beta preference in cookies
  const cookies = request.headers.get('cookie') || '';
  const betaEnabled = cookies.includes('ezq.betaEnabled=true');
  
  // Check for beta preference in query parameter (for initial opt-in)
  const urlParams = new URLSearchParams(url.search);
  const betaParam = urlParams.get('beta');
  
  if (betaEnabled || betaParam === 'true') {
    // Serve the beta build
    // For now, we'll serve the regular index.html but with a beta flag
    // This will be enhanced when we create the actual beta build
    const response = await context.next();
    
    if (response.status === 200 && response.headers.get('content-type')?.includes('text/html')) {
      let html = await response.text();
      
      // Inject beta flag into the HTML
      html = html.replace(
        '<body data-theme="dark">',
        '<body data-theme="dark" data-beta="true">'
      );
      
      return new Response(html, {
        status: response.status,
        headers: response.headers
      });
    }
    
    return response;
  } else {
    // Beta flag not set - return minimal page or redirect
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>EZ Quiz - Beta Access</title>
  <style>
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      max-width: 600px; 
      margin: 2rem auto; 
      padding: 1rem;
      background: #1a1a1a;
      color: #e0e0e0;
    }
    .card { 
      background: #2a2a2a; 
      padding: 2rem; 
      border-radius: 0.5rem; 
      border: 1px solid #444;
    }
    .btn { 
      background: #0066cc; 
      color: white; 
      border: none; 
      padding: 0.75rem 1.5rem; 
      border-radius: 0.25rem; 
      cursor: pointer; 
      margin: 0.5rem;
      text-decoration: none;
      display: inline-block;
    }
    .btn:hover { background: #0052a3; }
  </style>
</head>
<body>
  <div class="card">
    <h1>EZ Quiz Beta</h1>
    <p>You've accessed the beta route, but beta features are not enabled for your account.</p>
    <p>To access beta features, please enable them in the main application settings first.</p>
    <a href="/" class="btn">Go to Main App</a>
    <a href="/?beta=enable" class="btn">Enable Beta & Continue</a>
  </div>
  <script>
    // If user clicks "Enable Beta & Continue", set the preference
    if (window.location.search.includes('beta=enable')) {
      try {
        localStorage.setItem('ezq.betaEnabled', 'true');
        document.cookie = 'ezq.betaEnabled=true; Max-Age=31536000; Path=/; SameSite=Lax' + 
          (location.protocol === 'https:' ? '; Secure' : '');
        window.location.href = '/beta';
      } catch (e) {
        console.warn('Failed to set beta preference:', e);
      }
    }
  </script>
</body>
</html>`;
    
    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html',
        'cache-control': 'no-cache'
      }
    });
  }
};