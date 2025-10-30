export default async (request: Request, context: any) => {
  const url = new URL(request.url);
  const off = url.searchParams.get('off') === '1';
  const cookie = off
    ? 'FEATURE_FLAGS=; Path=/; Max-Age=0; SameSite=Lax'
    : 'FEATURE_FLAGS=beta; Path=/; Max-Age=86400; SameSite=Lax';
  // Proper pass-through: let Netlify route to the site and then append cookie
  const originResponse = await context.next();
  const headers = new Headers(originResponse.headers);
  headers.append('Set-Cookie', cookie);
  return new Response(originResponse.body, { status: originResponse.status, headers });
};
