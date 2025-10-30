function parseCookieFlags() {
  try {
    const match = document.cookie.match(/(?:^|;\s*)FEATURE_FLAGS=([^;]+)/);
    if (!match) return {};
    const value = decodeURIComponent(match[1] || '');
    return value.split(',').reduce((acc, flag) => {
      const key = flag.trim();
      if (key) acc[key] = true;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function parseLocalFlags() {
  try {
    const raw = localStorage.getItem('EZQ_FLAGS') || '{}';
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalFlags(next) {
  try {
    localStorage.setItem('EZQ_FLAGS', JSON.stringify(next));
  } catch {}
}

function writeCookieFlags(flags) {
  try {
    const keys = Object.keys(flags).filter(Boolean);
    const secure = (typeof location !== 'undefined' && location.protocol === 'https:') ? '; Secure' : '';
    if (!keys.length) {
      document.cookie = `FEATURE_FLAGS=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
      return;
    }
    const value = encodeURIComponent(keys.join(','));
    document.cookie = `FEATURE_FLAGS=${value}; Max-Age=86400; Path=/; SameSite=Lax${secure}`;
  } catch {}
}

export function has(name) {
  const cookieFlags = parseCookieFlags();
  if (cookieFlags[name]) return true;
  const localFlags = parseLocalFlags();
  return !!localFlags[name];
}

export function hasCookie(name) {
  const cookieFlags = parseCookieFlags();
  return !!cookieFlags[name];
}

export function setFlag(name, value) {
  const localFlags = parseLocalFlags();
  if (value) {
    localFlags[name] = true;
  } else {
    delete localFlags[name];
  }
  writeLocalFlags(localFlags);
}

export function clearCookieFlag(name) {
  const cookieFlags = parseCookieFlags();
  if (!cookieFlags[name]) return;
  delete cookieFlags[name];
  writeCookieFlags(cookieFlags);
}

export function addCookieFlag(name) {
  const cookieFlags = parseCookieFlags();
  cookieFlags[name] = true;
  writeCookieFlags(cookieFlags);
}
