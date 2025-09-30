import { has, setFlag } from './flags.js';

export function initBetaToggle() {
  const el = document.querySelector('#toggleBetaFeatures');
  if (!el) return;
  el.checked = has('beta');
  el.addEventListener('change', () => setFlag('beta', el.checked));
}
