const cookieFlags = (() => {
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
})();

const lsFlags = (() => {
  try {
    const raw = localStorage.getItem('EZQ_FLAGS') || '{}';
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
})();

export const flags = { ...cookieFlags, ...lsFlags };
export const has = (name) => !!flags[name];
export const hasCookie = (name) => !!cookieFlags[name];

export function setFlag(name, value) {
  try {
    const raw = localStorage.getItem('EZQ_FLAGS') || '{}';
    const current = JSON.parse(raw) || {};
    if (value) {
      current[name] = true;
      lsFlags[name] = true;
      flags[name] = true;
    } else {
      delete current[name];
      delete lsFlags[name];
      delete flags[name];
    }
    localStorage.setItem('EZQ_FLAGS', JSON.stringify(current));
  } catch {}
}
