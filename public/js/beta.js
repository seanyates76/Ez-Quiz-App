import { S } from './state.js';

// ===== BETA MODE CONTRACT (DO NOT EDIT IDENTIFIERS) =====
// Cookie:     EZQ_BETA=1 (set by /beta edge function)
// LocalStore: EZQ_BETA = '1' | '0'
// Global:     window.__EZQ__.flags.beta (boolean)
// Checkbox:   #beta-toggle mirrors the runtime flag (disabled by default)
// Boot order: QS ?beta -> localStorage -> Cookie -> DEFAULT_BETA (true)

const BETA_LS_KEY = 'EZQ_BETA';
const BETA_COOKIE = 'EZQ_BETA';
const BETA_TOGGLE_ID = 'beta-toggle';
const DEFAULT_BETA = true;
const COOKIE_MAX_AGE_MS = 360 * 24 * 60 * 60 * 1000; // ~1 year

function getCookie(name) {
  try {
    return document.cookie
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.split('='))
      .reduce((acc, [k, v]) => {
        acc[decodeURIComponent(k)] = decodeURIComponent(v || '');
        return acc;
      }, {})[name] || '';
  } catch {
    return '';
  }
}

function setCookie(enabled) {
  try {
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    if (enabled) {
      const expires = new Date(Date.now() + COOKIE_MAX_AGE_MS).toUTCString();
      document.cookie = `${BETA_COOKIE}=1; Expires=${expires}; Path=/; SameSite=Lax${secure}`;
    } else {
      document.cookie = `${BETA_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
    }
  } catch {}
}

function persistLocal(enabled) {
  try {
    localStorage.setItem(BETA_LS_KEY, enabled ? '1' : '0');
  } catch {}
}

function applyBetaUI(enabled) {
  try {
    document.body?.classList?.toggle('beta', !!enabled);
    document.body?.setAttribute?.('data-beta', enabled ? '1' : '0');
  } catch {}
}

function updateGlobalFlag(enabled) {
  S.flags = S.flags || {};
  S.flags.beta = !!enabled;
  try {
    if (!window.__EZQ__) window.__EZQ__ = {};
    const flags = window.__EZQ__.flags || {};
    flags.beta = !!enabled;
    window.__EZQ__.flags = flags;
  } catch {}
}

function syncToggle(enabled) {
  const toggle = document.getElementById(BETA_TOGGLE_ID);
  if (!toggle) return;
  if (toggle.checked !== !!enabled) toggle.checked = !!enabled;
  try {
    toggle.setAttribute('aria-checked', enabled ? 'true' : 'false');
  } catch {}
}

function resolveFromQuery() {
  try {
    const qs = new URLSearchParams(location.search);
    if (qs.has('beta')) {
      const raw = qs.get('beta') || '';
      return raw === '1' || raw.toLowerCase?.() === 'true';
    }
  } catch {}
  return null;
}

function resolveFromStorage() {
  try {
    const raw = localStorage.getItem(BETA_LS_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {}
  return null;
}

function resolveFromCookie() {
  const raw = getCookie(BETA_COOKIE);
  if (!raw) return null;
  if (raw === '1') return true;
  if (raw === '0') return false;
  return null;
}

function commitBeta(enabled, { sync = true, persist = true } = {}) {
  updateGlobalFlag(enabled);
  applyBetaUI(enabled);
  if (sync) syncToggle(enabled);
  if (persist) {
    persistLocal(enabled);
    setCookie(enabled);
  }
}

function resolveInitialBeta() {
  const qs = resolveFromQuery();
  if (qs !== null) return qs;

  const stored = resolveFromStorage();
  if (stored !== null) return stored;

  const cookie = resolveFromCookie();
  if (cookie !== null) return cookie;

  return DEFAULT_BETA;
}

export function bootstrapBetaMode() {
  const beta = resolveInitialBeta();
  commitBeta(beta);

  const toggle = document.getElementById(BETA_TOGGLE_ID);
  if (toggle) {
    toggle.addEventListener('change', () => {
      const enabled = !!toggle.checked;
      commitBeta(enabled, { sync: false });
      syncToggle(enabled);
    });
  }

  return beta;
}

export function isBetaEnabled() {
  return !!(S.flags && S.flags.beta);
}
