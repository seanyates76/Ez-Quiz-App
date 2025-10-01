export default async (request: Request) => {
  const url = new URL(request.url);
  const off = url.searchParams.get('off') === '1';
  const headers = new Headers({ Location: '/' });
  const cookie = off
    ? 'FEATURE_FLAGS=; Path=/; Max-Age=0; SameSite=Lax'
    : 'FEATURE_FLAGS=beta; Path=/; Max-Age=86400; SameSite=Lax';
  headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers });
};
