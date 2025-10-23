'use strict';

// Small utility to attach drag/drop handlers and support tidy teardown.
// Usage:
//   const { controller, dispose } = attachDragDrop(elem, handlers, { preventDefault: true });
//   // to teardown:
//   dispose(); // or controller.abort();
export function attachDragDrop(element, handlers = {}, options = {}) {
  if (!element || typeof element.addEventListener !== 'function') {
    throw new Error('attachDragDrop: element must be a DOM node');
  }

  const {
    onDragEnter = () => {},
    onDragOver = () => {},
    onDragLeave = () => {},
    onDrop = () => {},
  } = handlers;

  const { preventDefault = true } = options;

  // Prefer native AbortController when available, but do not rely on it for removal.
  // We remove listeners explicitly in dispose() so tests/environments without
  // abortable event listeners still work consistently.
  const controller = (typeof AbortController !== 'undefined')
    ? new AbortController()
    : {
        aborted: false,
        signal: {
          aborted: false,
          addEventListener: () => {},
          removeEventListener: () => {},
        },
        abort() { this.aborted = true; this.signal.aborted = true; try { dispose(); } catch {} },
      };

  // Named listener functions so they can be removed
  function handleDragEnter(e) {
    if (preventDefault && e && typeof e.preventDefault === 'function') e.preventDefault();
    onDragEnter(e);
  }
  function handleDragOver(e) {
    if (preventDefault && e && typeof e.preventDefault === 'function') e.preventDefault();
    onDragOver(e);
  }
  function handleDragLeave(e) {
    if (preventDefault && e && typeof e.preventDefault === 'function') e.preventDefault();
    onDragLeave(e);
  }
  function handleDrop(e) {
    if (preventDefault && e && typeof e.preventDefault === 'function') e.preventDefault();
    onDrop(e);
  }

  element.addEventListener('dragenter', handleDragEnter);
  element.addEventListener('dragover', handleDragOver);
  element.addEventListener('dragleave', handleDragLeave);
  element.addEventListener('drop', handleDrop);

  // Dispose function to explicitly remove listeners.
  function dispose() {
    try { element.removeEventListener('dragenter', handleDragEnter); } catch {}
    try { element.removeEventListener('dragover', handleDragOver); } catch {}
    try { element.removeEventListener('dragleave', handleDragLeave); } catch {}
    try { element.removeEventListener('drop', handleDrop); } catch {}
    try { if (controller && typeof controller.abort === 'function' && !controller.aborted) { controller.aborted = true; } } catch {}
  }

  // If controller supports signals, abort should trigger dispose once.
  try { controller.signal && controller.signal.addEventListener && controller.signal.addEventListener('abort', dispose, { once: true }); } catch {}

  return { controller, dispose };
}

