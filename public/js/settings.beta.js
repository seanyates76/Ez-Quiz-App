import { has, setFlag, addCookieFlag, clearCookieFlag } from './flags.js';

export function initBetaToggle() {
  const el = document.querySelector('#toggleBetaFeatures');
  if (!el) return;
  el.checked = has('beta');
  el.addEventListener('change', () => {
    setFlag('beta', el.checked);
    if (el.checked) {
      addCookieFlag('beta');
    } else {
      clearCookieFlag('beta');
    }
  });
}
