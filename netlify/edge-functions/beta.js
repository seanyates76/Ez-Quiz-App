// ===== BETA MODE ENTRY (DO NOT REMOVE / RENAME) =====
// Sets EZQ_BETA cookie and redirects to "/" to keep URLs clean.
// See README "Beta Mode (DO NOT REMOVE)" for the contract.

export default async () => {
  const headers = new Headers({ Location: '/' });
  const expires = new Date(Date.now() + 360 * 24 * 60 * 60 * 1000).toUTCString();
  headers.append('Set-Cookie', `EZQ_BETA=1; Path=/; Expires=${expires}; SameSite=Lax`);
  return new Response(null, { status: 302, headers });
};

export const config = { path: '/beta' };
