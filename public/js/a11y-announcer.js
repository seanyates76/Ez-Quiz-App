'use strict';

// Lightweight aria-live announcer
// Usage: import { announce } from './a11y-announcer.js'; announce('Importing…');
const LIVE_REGION_ID = 'ez-quiz-a11y-live-region';

function ensureLiveRegion() {
  let region = document.getElementById(LIVE_REGION_ID);
  if (region) return region;

  region = document.createElement('div');
  region.id = LIVE_REGION_ID;
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('role', 'status');
  region.setAttribute('aria-atomic', 'true');
  // visually hidden styles
  try {
    region.style.position = 'absolute';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.margin = '-1px';
    region.style.border = '0';
    region.style.padding = '0';
    region.style.clip = 'rect(0 0 0 0)';
    region.style.overflow = 'hidden';
    region.style.whiteSpace = 'nowrap';
  } catch {}

  document.body.appendChild(region);
  return region;
}

export function announce(message, mode = 'polite') {
  try {
    const region = ensureLiveRegion();
    region.setAttribute('aria-live', mode === 'assertive' ? 'assertive' : 'polite');
    // Clear then set text to ensure SR picks up changes
    region.textContent = '';
    setTimeout(() => {
      region.textContent = String(message || '');
    }, 10);
  } catch {
    // no-op
  }
}

