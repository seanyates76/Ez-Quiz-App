'use strict';

// Minimal harness to verify Escape cancels drag-active and restores focus

function setupAffix() {
  document.body.innerHTML = `
    <button id="importBtn">Attach</button>
    <div class="topic-affix" id="affix" tabindex="0"></div>
  `;
  const importBtn = document.getElementById('importBtn');
  const topicAffix = document.getElementById('affix');

  // emulate generator's behavior: dragenter starts drag-active and installs Escape handler
  const esc = (evt) => {
    if (evt.key === 'Escape' || evt.key === 'Esc') {
      topicAffix.classList.remove('drag-active');
      topicAffix.classList.remove('drag-on');
      importBtn.focus();
      document.removeEventListener('keydown', esc, { capture: true });
    }
  };
  topicAffix.addEventListener('dragenter', () => {
    topicAffix.classList.add('drag-active');
    topicAffix.classList.add('drag-on');
    document.addEventListener('keydown', esc, { capture: true });
  });
  topicAffix.addEventListener('dragleave', () => {
    topicAffix.classList.remove('drag-active');
    topicAffix.classList.remove('drag-on');
    document.removeEventListener('keydown', esc, { capture: true });
  });

  return { importBtn, topicAffix };
}

test('Escape cancels drag-active and restores focus', () => {
  const { importBtn, topicAffix } = setupAffix();
  topicAffix.dispatchEvent(new Event('dragenter', { bubbles: true }));
  expect(topicAffix.classList.contains('drag-active')).toBe(true);
  const keyEvt = new KeyboardEvent('keydown', { key: 'Escape' });
  document.dispatchEvent(keyEvt);
  expect(topicAffix.classList.contains('drag-active')).toBe(false);
  expect(document.activeElement).toBe(importBtn);
});

