/*
 * Application logic for EZ Quiz Web
 *
 * This script handles theme management, modal interactions, timer functionality,
 * question parsing, quiz navigation, scoring and review. It is written as an
 * immediately invoked function expression (IIFE) to avoid leaking variables
 * into the global scope.
 */

(function () {
  const APP_VERSION = document.querySelector('meta[name="app-version"]').getAttribute('content') || '';
  // Helper to get elements by ID
  const $ = (id) => document.getElementById(id);

  // Theme handling
  const root = document.documentElement;
  const themeSelect = $('themeSelect');
  const savedTheme = localStorage.getItem('ezq_theme') || 'dark';
  root.setAttribute('data-theme', savedTheme);
  themeSelect.value = savedTheme;
  themeSelect.addEventListener('change', () => {
    root.setAttribute('data-theme', themeSelect.value);
    localStorage.setItem('ezq_theme', themeSelect.value);
  });

  // Modal logic
  const overlay = $('overlay');
  const settingsBtn = $('settingsBtn');
  const settingsModal = $('settingsModal');
  const closeSettings = $('closeSettings');
  const faqBtn = $('faqBtn');
  const faqModal = $('faqModal');
  const closeFaq = $('closeFaq');
  const resetAppBtn = $('resetAppBtn');
  // Prompt popover elements
  const promptBtn = $('promptBtn');
  const promptPopover = $('promptPopover');
  const promptTopic = $('promptTopic');
  const promptLength = $('promptLength');
  const copyPromptBtn = $('copyPromptBtn');
  const cancelPromptBtn = $('cancelPromptBtn');
  const toastEl = document.getElementById('toast');

  let lastFocusedEl = null;
  function show(el) {
    if (!el) return;
    const isModal = el.classList && (el.classList.contains('settings-modal') || el.classList.contains('faq-modal'));
    el.style.display = isModal ? 'flex' : 'block';
    if (isModal) {
      lastFocusedEl = document.activeElement;
      lockBodyScroll(true);
      trapFocus(el);
      // Ensure FAQ starts at top on every open
      if (el.classList.contains('faq-modal')) {
        const scroller = el.querySelector('.faq-content');
        if (scroller) {
          setTimeout(() => {
            scroller.scrollTop = 0;
          }, 0);
        }
      }
    }
  }
  function hide(el) { if (el) el.style.display = 'none'; }
  function closeModal() {
    hide(settingsModal);
    hide(faqModal);
    hide(overlay);
    lockBodyScroll(false);
    // Restore focus to the last trigger
    if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
      try { lastFocusedEl.focus(); } catch {}
    }
  }
  settingsBtn.addEventListener('click', () => {
    show(settingsModal);
    show(overlay);
    hide(faqModal);
    hidePrompt();
  });
  faqBtn.addEventListener('click', () => {
    show(faqModal);
    show(overlay);
    hide(settingsModal);
    hidePrompt();
  });
  closeSettings.addEventListener('click', closeModal);
  closeFaq.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  // Focus trap for modals
  function trapFocus(container) {
    const focusables = container.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    // Move focus to first
    setTimeout(() => { try { first.focus(); } catch {} }, 0);
    function onKey(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        closeModal();
      }
    }
    container._trapHandler = onKey;
    document.addEventListener('keydown', onKey, true);
    const off = () => document.removeEventListener('keydown', onKey, true);
    // Remove handler when closed
    const mo = new MutationObserver(() => {
      if (container.style.display === 'none') { off(); mo.disconnect(); }
    });
    mo.observe(container, { attributes: true, attributeFilter: ['style'] });
  }

  // Toast helper
  function showToast(msg, opts) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    // Position near cursor if coordinates provided
    if (opts && typeof opts.x === 'number' && typeof opts.y === 'number') {
      const x = opts.x;
      const y = opts.y;
      toastEl.style.setProperty('--toast-x', x + 'px');
      toastEl.style.setProperty('--toast-y', (y - 8) + 'px');
      toastEl.classList.add('at-cursor');
    } else {
      toastEl.classList.remove('at-cursor');
    }
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove('show'), 1600);
  }

  // Prompt popover logic
  function openPrompt() {
    if (!promptPopover) return;
    promptPopover.classList.add('open');
    promptBtn && promptBtn.setAttribute('aria-expanded', 'true');
    // Focus topic
    setTimeout(() => { if (promptTopic) promptTopic.focus(); }, 0);
    lockBodyScroll(true);
  }
  function hidePrompt() {
    if (!promptPopover) return;
    promptPopover.classList.remove('open');
    promptBtn && promptBtn.setAttribute('aria-expanded', 'false');
    lockBodyScroll(false);
  }
  function togglePrompt() {
    if (!promptPopover) return;
    const isOpen = promptPopover.classList.contains('open');
    if (isOpen) hidePrompt(); else openPrompt();
  }
  if (promptBtn) promptBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePrompt();
  });
  if (cancelPromptBtn) cancelPromptBtn.addEventListener('click', () => hidePrompt());
  // Outside click closes
  document.addEventListener('click', (e) => {
    if (!promptPopover || !promptPopover.classList.contains('open')) return;
    const t = e.target;
    if (promptPopover.contains(t) || (promptBtn && promptBtn.contains(t))) return;
    hidePrompt();
  });
  // Esc closes when popover is open
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && promptPopover && promptPopover.classList.contains('open')) {
      e.stopPropagation();
      hidePrompt();
    }
  }, true);
  // Ctrl/Cmd+P opens popover (override print)
  document.addEventListener('keydown', (e) => {
    const p = (e.key === 'p' || e.key === 'P');
    if (p && (e.ctrlKey || e.metaKey) && !isTypingContext()) {
      e.preventDefault();
      openPrompt();
    }
  });

  // Clipboard helpers
  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) { /* fall through */ }
    // Fallback
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-1000px';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  }

  function buildPrompt(topic, length) {
    const n = Math.max(1, Math.min(200, Number(length) || 30));
    const t = (topic || 'General Knowledge').trim();
    return [
      `You are QuizMaker. Create exactly ${n} quiz lines about ${t}.`,
      '',
      'Allowed line types (choose any mix):',
      '',
      'MC: MC|Question?|A) Opt1;B) Opt2;C) Opt3;D) Opt4|A',
      '',
      'For multi-answer MC: separate letters with commas, no spaces (e.g., A,C).',
      '',
      'TF: TF|Statement.|T OR TF|Statement.|F',
      '',
      'YN: YN|Question?|Y OR YN|Question?|N',
      '',
      'MT: MT|Prompt.|1) L1;2) L2;3) L3|A) R1;B) R2;C) R3|1-A,2-B,3-C',
      '',
      'Hard constraints:',
      '',
      'Output only the quiz lines. No headings, numbering, quotes, explanations, or extra text.',
      `Exactly ${n} non-blank lines. One question per line. No empty lines.`,
      'ASCII characters only (no smart quotes). No trailing spaces.',
      'Follow the exact separators: pipes |, semicolons ;, and commas , as shown.',
      'MC has exactly A-D options; answer is letters only (e.g., A or A,C). TF uses T/F. YN uses Y/N.',
      'MT includes at least 2 left items and 2 right items, with a correct mapping (e.g., 1-A,2-B,...).',
      '',
      'Begin output now (no extra text before or after the lines).'
    ].join('\n');
  }

  if (copyPromptBtn) {
    copyPromptBtn.addEventListener('click', async (e) => {
      const topic = promptTopic ? promptTopic.value : '';
      const length = promptLength ? promptLength.value : '30';
      const text = buildPrompt(topic, length);
      const ok = await copyToClipboard(text);
      hidePrompt();
      showToast(ok ? 'Prompt copied' : 'Copy failed', { x: e.clientX, y: e.clientY });
    });
  }

  // Utilities for keyboard navigation vs typing contexts
  function isTypingContext() {
    const ae = document.activeElement;
    if (!ae) return false;
    const tag = ae.tagName;
    if (ae.isContentEditable) return true;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (tag === 'INPUT') {
      const type = (ae.getAttribute('type') || '').toLowerCase();
      // Treat text-like inputs as typing; allow shortcuts on radios/checkboxes
      return !['radio', 'checkbox', 'button'].includes(type);
    }
    return false;
  }
  function blurActive() {
    const ae = document.activeElement;
    if (ae && typeof ae.blur === 'function') ae.blur();
  }

  // Timer settings and functions
  const toggleTimer = $('toggleTimer');
  const countdownMode = $('countdownMode');
  const countdownInput = $('countdownInput');
  const timerEl = $('timer');
  let timerOn = false;
  let countdown = false;
  let durationSec = 600; // default 10 minutes
  let timerInterval;
  let startTimestamp;
  let paused = false;
  let pausedAt = 0;

  toggleTimer.addEventListener('change', () => {
    timerOn = toggleTimer.checked;
    timerEl.classList.toggle('hidden', !timerOn);
  });
  countdownMode.addEventListener('change', () => {
    countdown = countdownMode.checked;
  });

  function parseDuration(input) {
    const parts = input.split(':');
    const min = parseInt(parts[0], 10) || 0;
    const sec = parseInt(parts[1], 10) || 0;
    return min * 60 + sec;
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  function startTimer() {
    if (!timerOn) return;
    clearInterval(timerInterval);
    paused = false;
    if (countdown) {
      durationSec = parseDuration(countdownInput.value || '10:00');
      let remaining = durationSec;
      timerEl.textContent = formatTime(remaining);
      startTimestamp = Date.now();
      timerInterval = setInterval(() => {
        if (paused) return;
        const diff = Math.floor((Date.now() - startTimestamp) / 1000);
        remaining = durationSec - diff;
        timerEl.textContent = formatTime(remaining > 0 ? remaining : 0);
        if (remaining <= 0) {
          clearInterval(timerInterval);
        }
      }, 1000);
    } else {
      let elapsed = 0;
      timerEl.textContent = formatTime(elapsed);
      startTimestamp = Date.now();
      timerInterval = setInterval(() => {
        if (paused) return;
        elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
        timerEl.textContent = formatTime(elapsed);
      }, 1000);
    }
  }

  function stopTimer() {
    clearInterval(timerInterval);
  }

  function pauseTimer() {
    paused = true;
    pausedAt = Date.now();
  }

  function resumeTimer() {
    if (paused) {
      startTimestamp += (Date.now() - pausedAt);
      paused = false;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  });

  // Body scroll lock (ref-counted) to prevent background scroll on iOS
  const body = document.body;
  let lockCount = 0;
  let scrollLockY = 0;
  function lockBodyScroll(lock) {
    if (lock) {
      lockCount++;
      if (lockCount > 1) return;
      scrollLockY = window.scrollY || document.documentElement.scrollTop || 0;
      body.style.top = `-${scrollLockY}px`;
      body.classList.add('no-scroll');
      body.classList.add('overlay-open');
    } else {
      if (lockCount === 0) return;
      lockCount--;
      if (lockCount === 0) {
        body.classList.remove('no-scroll');
        body.classList.remove('overlay-open');
        body.style.top = '';
        window.scrollTo(0, scrollLockY);
      }
    }
  }

  // Quiz DOM elements
  const quizInput = $('quizInput');
  const loadBtn = $('loadBtn');
  const fileInput = $('fileInput');
  const builtInBtn = $('builtInBtn');
  const clearBtn = $('clearBtn');
  const startBtn = $('startBtn');
  const menu = $('menu');
  const quiz = $('quiz');
  const result = $('result');
  const diag = $('diag');
  // Status helper with color coding for the diag area
  function setDiag(text, level = 'info') {
    if (!diag) return;
    diag.textContent = text;
    diag.classList.remove('ok','warn','err','info');
    if (['ok','warn','err','info'].includes(level)) diag.classList.add(level);
  }
  const qCounter = $('qCounter');
  const progBar = $('progBar');
  const qBody = $('qBody');
  const backDuringQuiz = $('backDuringQuiz');
  const prevBtn = $('prevBtn');
  const nextBtn = $('nextBtn');
  const finishBtn = $('finishBtn');

  // Built‑in dataset (K‑12 friendly sample). Format preserved.
  const builtIn = [
    "MC|Which shape has exactly three sides?|A) Triangle;B) Square;C) Circle;D) Pentagon|A",
    "MC|Which of these numbers are prime?|A) 2;B) 4;C) 5;D) 9|A,C",
    "TF|The Sun is a star.|T",
    "MC|Which process changes liquid water into gas?|A) Freezing;B) Evaporation;C) Condensation;D) Melting|B",
    "YN|Is 0 an even number?|Y",
    "MC|Which punctuation mark usually ends a question?|A) Period (.) ;B) Question mark (?) ;C) Comma (,) ;D) Exclamation point (!)|B",
    "TF|Plants make their own food using photosynthesis.|T",
    "MC|Which continent has the largest land area?|A) Africa;B) Asia;C) Europe;D) Antarctica|B",
    "MT|Match the fraction to its decimal value.|1) 1/2;2) 1/4;3) 3/4|A) 0.25;B) 0.50;C) 0.75|1-B,2-A,3-C",
    "YN|Can a verb be an action word?|Y"
  ].join("\n");

  // File input handler
  loadBtn.addEventListener('click', () => {
    fileInput.click();
  });
  fileInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      quizInput.value = ev.target.result || '';
      setDiag('File loaded.', 'ok');
      saveSession('menu');
    };
    reader.readAsText(f);
  });

  // Drag-and-drop .txt onto the textarea
  ['dragenter','dragover'].forEach((ev) => {
    quizInput.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      quizInput.classList.add('textarea-drop');
    });
  });
  ['dragleave','drop'].forEach((ev) => {
    quizInput.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      quizInput.classList.remove('textarea-drop');
    });
  });
  quizInput.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      quizInput.value = ev.target.result || '';
      setDiag('File dropped.', 'ok');
    };
    reader.readAsText(f);
  });

  // Clear textarea
  clearBtn.addEventListener('click', () => {
    quizInput.value = '';
    setDiag('Cleared.', 'info');
    quizInput.focus();
    saveSession('menu');
  });

  // Built‑in sample loader
  builtInBtn.addEventListener('click', () => {
    quizInput.value = builtIn;
    setDiag('Demo set loaded.', 'ok');
    saveSession('menu');
  });

  // Quiz state
  let questions = [];
  let userAnswers = [];
  let currentIndex = 0;
  // Holds the last results summary for rebuilding after review
  let lastSummary = null; // { correctCount:number, miss:number[] }

  // Start button handler
  startBtn.addEventListener('click', () => {
    startQuiz();
  });

  // Navigation handlers
  backDuringQuiz.addEventListener('click', () => {
    stopTimer();
    showMenu();
    saveSession('menu');
  });
  prevBtn.addEventListener('click', () => {
    changeQuestion(-1);
  });
  nextBtn.addEventListener('click', () => {
    changeQuestion(1);
  });
  finishBtn.addEventListener('click', () => {
    finishQuiz();
  });

  // Keyboard shortcuts: Enter = next/finish, Backspace = previous
  document.addEventListener('keydown', (e) => {
    const modalOpen = (settingsModal && settingsModal.style.display === 'block') ||
      (faqModal && faqModal.style.display === 'block') ||
      (overlay && overlay.style.display === 'block') ||
      (promptPopover && promptPopover.classList && promptPopover.classList.contains('open'));
    if (modalOpen) return;

    const menuVisible = !menu.classList.contains('hidden');
    const quizVisible = !quiz.classList.contains('hidden');

    // On menu: Enter starts quiz (when not typing)
    if (menuVisible) {
      if (e.key === 'Enter' && !isTypingContext()) {
        e.preventDefault();
        blurActive();
        startQuiz();
      }
      return;
    }

    // Only handle shortcuts during quiz view
    if (!quizVisible) return;

    // Ignore when typing/editing (but allow when focused on radio/checkbox)
    if (isTypingContext()) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      blurActive();
      if (currentIndex >= questions.length - 1) {
        finishQuiz();
      } else {
        changeQuestion(1);
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      blurActive();
      changeQuestion(-1);
    }
  });

  // Show menu (initial state)
  function showMenu() {
    menu.classList.remove('hidden');
    quiz.classList.add('hidden');
    result.classList.add('hidden');
    saveSession('menu');
  }

  // Show quiz container
  function showQuiz() {
    menu.classList.add('hidden');
    quiz.classList.remove('hidden');
    result.classList.add('hidden');
  }

  // Show result container
  function showResult() {
    menu.classList.add('hidden');
    quiz.classList.add('hidden');
    result.classList.remove('hidden');
  }

  // Helpers to split with support for backslash-escapes (e.g., \|, \;, \,)
  function splitEscaped(str, delim) {
    const out = [];
    let buf = '';
    let i = 0;
    while (i < str.length) {
      const ch = str[i];
      if (ch === '\\' && i + 1 < str.length) {
        buf += str[i + 1];
        i += 2;
        continue;
      }
      if (ch === delim) {
        out.push(buf.trim());
        buf = '';
        i++;
        continue;
      }
      buf += ch;
      i++;
    }
    out.push(buf.trim());
    return out;
  }

  // Parse question lines into objects with validation and per-line errors
  function parseQuestions(str) {
    const lines = str.split(/\n/).map((l) => l).filter((l) => l.trim());
    const out = [];
    const errors = [];
    lines.forEach((raw, idx) => {
      try {
        const parts = splitEscaped(raw, '|');
        const type = (parts[0] || '').trim().toUpperCase();
        if (!['MC','TF','YN','MT'].includes(type)) throw new Error('Unknown type');
        if (type === 'MC') {
          if (parts.length < 4) throw new Error('MC requires 4 fields');
          const question = (parts[1] || '').trim();
          const optionStr = parts[2] || '';
          const answerStr = parts[3] || '';
          const options = splitEscaped(optionStr, ';');
          if (options.length < 2) throw new Error('MC needs at least 2 options');
          if (options.some((o) => !o)) throw new Error('MC has an empty option');
          const answers = (answerStr || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
          if (!answers.length) throw new Error('MC answer missing');
          const validLetters = options.map((_, i) => String.fromCharCode(65 + i));
          const seen = new Set();
          const invalid = answers.find((a) => !validLetters.includes(a) || (seen.has(a) ? true : (seen.add(a), false)));
          if (invalid) throw new Error('Invalid answer letter: ' + invalid);
          const multi = answers.length > 1;
          out.push({ type: 'MC', question, options, answers, multi, raw });
        } else if (type === 'TF') {
          if (parts.length < 3) throw new Error('TF requires 3 fields');
          const question = (parts[1] || '').trim();
          const answer = (parts[2] || '').trim().toUpperCase();
          if (!['T','F'].includes(answer)) throw new Error('TF answer must be T or F');
          out.push({ type: 'TF', question, answer, raw });
        } else if (type === 'YN') {
          if (parts.length < 3) throw new Error('YN requires 3 fields');
          const question = (parts[1] || '').trim();
          const answer = (parts[2] || '').trim().toUpperCase();
          if (!['Y','N'].includes(answer)) throw new Error('YN answer must be Y or N');
          out.push({ type: 'YN', question, answer, raw });
        } else if (type === 'MT') {
          if (parts.length < 5) throw new Error('MT requires 5 fields');
          const question = (parts[1] || '').trim();
          const lefts = splitEscaped(parts[2] || '', ';');
          const rights = splitEscaped(parts[3] || '', ';');
          const pairs = splitEscaped(parts[4] || '', ',');
          if (lefts.length < 2 || rights.length < 2) throw new Error('MT needs at least 2 left and 2 right');
          if (lefts.some((o) => !o) || rights.some((o) => !o)) throw new Error('MT has an empty option');
          const leftKeys = new Set(lefts.map((l) => (l.split(')')[0] || '').trim()).filter(Boolean));
          const rightKeys = new Set(rights.map((r) => (r.split(')')[0] || '').trim().toUpperCase()).filter(Boolean));
          const answerMap = {};
          pairs.forEach((pair) => {
            const [l, r] = pair.split('-').map((x) => (x || '').trim());
            if (!l || !r) throw new Error('MT mapping invalid: ' + pair);
            const lk = (l.split(')')[0] || '').trim();
            const rk = r.toUpperCase();
            if (!leftKeys.has(lk)) throw new Error('MT mapping references unknown left: ' + l);
            if (!rightKeys.has(rk)) throw new Error('MT mapping references unknown right: ' + r);
            answerMap[lk] = rk;
          });
          out.push({ type: 'MT', question, lefts, rights, answerMap, raw });
        }
      } catch (e) {
        errors.push(`Line ${idx + 1}: ${e.message}`);
      }
    });
    if (errors.length) {
      const err = new Error('Parse errors');
      err._details = errors;
      throw err;
    }
    return out;
  }

  // Start the quiz
  function startQuiz() {
    const raw = quizInput.value.trim();
    if (!raw) {
      setDiag('Please enter or load some questions.', 'warn');
      return;
    }
    try {
      questions = parseQuestions(raw);
      userAnswers = new Array(questions.length).fill(null);
      currentIndex = 0;
      setDiag('', 'info');
      showQuiz();
      showQuestion();
      if (timerOn) {
        startTimer();
      }
      sessionSeed = (Math.random() * 0xffffffff) >>> 0;
      saveSession('quiz');
    } catch (err) {
      console.error(err);
      if (err && err._details) {
        setDiag(err._details.slice(0, 3).join(' | ') + (err._details.length > 3 ? ' …' : ''), 'err');
        alert('Could not start quiz due to errors:\n' + err._details.join('\n'));
      } else {
        setDiag('Failed to parse questions.', 'err');
      }
    }
  }

  // Display the current question
  function showQuestion() {
    const q = questions[currentIndex];
    qCounter.textContent = (currentIndex + 1) + '/' + questions.length;
    // hide timer if not enabled
    timerEl.classList.toggle('hidden', !timerOn);
    // Update progress bar
    updateProgress();
    // clear previous body content
    qBody.innerHTML = '';
    if (q.type === 'MC') {
      const fs = document.createElement('fieldset');
      const lg = document.createElement('legend');
      lg.textContent = q.question;
      fs.appendChild(lg);
      q.options.forEach((opt, idx) => {
        const label = document.createElement('label');
        label.className = 'option';
        const input = document.createElement('input');
        if (q.multi) {
          input.type = 'checkbox';
        } else {
          input.type = 'radio';
          input.name = 'mc';
        }
        input.value = String.fromCharCode(65 + idx); // A, B, C, ...
        const ua = userAnswers[currentIndex];
        if (ua) {
          if (q.multi) {
            if (Array.isArray(ua) && ua.includes(input.value)) input.checked = true;
          } else {
            if (ua === input.value) input.checked = true;
          }
        }
        input.addEventListener('change', () => {
          if (q.multi) {
            const checked = Array.from(qBody.querySelectorAll('input'))
              .filter((i) => i.checked)
              .map((i) => i.value);
            userAnswers[currentIndex] = checked;
          } else {
            userAnswers[currentIndex] = input.value;
          }
          saveSession('quiz');
        });
        label.appendChild(input);
        label.appendChild(document.createTextNode(opt));
        fs.appendChild(label);
      });
      qBody.appendChild(fs);
    } else if (q.type === 'TF') {
      const fs = document.createElement('fieldset');
      const lg = document.createElement('legend');
      lg.textContent = q.question;
      fs.appendChild(lg);
      ['T', 'F'].forEach((letter) => {
        const label = document.createElement('label');
        label.className = 'option';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'tf';
        input.value = letter;
        if (userAnswers[currentIndex] === letter) input.checked = true;
        input.addEventListener('change', () => {
          userAnswers[currentIndex] = input.value;
          saveSession('quiz');
        });
        label.appendChild(input);
        label.appendChild(document.createTextNode(letter === 'T' ? 'True' : 'False'));
        fs.appendChild(label);
      });
      qBody.appendChild(fs);
    } else if (q.type === 'YN') {
      const fs = document.createElement('fieldset');
      const lg = document.createElement('legend');
      lg.textContent = q.question;
      fs.appendChild(lg);
      ['Y', 'N'].forEach((letter) => {
        const label = document.createElement('label');
        label.className = 'option';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'yn';
        input.value = letter;
        if (userAnswers[currentIndex] === letter) input.checked = true;
        input.addEventListener('change', () => {
          userAnswers[currentIndex] = input.value;
          saveSession('quiz');
        });
        label.appendChild(input);
        label.appendChild(document.createTextNode(letter === 'Y' ? 'Yes' : 'No'));
        fs.appendChild(label);
      });
      qBody.appendChild(fs);
    } else if (q.type === 'MT') {
      const fs = document.createElement('fieldset');
      const lg = document.createElement('legend');
      lg.textContent = q.question;
      fs.appendChild(lg);
      // Deterministic shuffle for rights using seeded RNG
      const rightsRandom = getShuffledRights(q.rights, currentIndex);
      q.lefts.forEach((leftItem) => {
        const row = document.createElement('div');
        row.className = 'pair-row';
        const leftDiv = document.createElement('div');
        leftDiv.className = 'pair-left';
        leftDiv.textContent = leftItem;
        row.appendChild(leftDiv);
        const select = document.createElement('select');
        // Placeholder blank option to require explicit choice
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '\u2014 Select \u2014';
        select.appendChild(placeholder);
        rightsRandom.forEach((opt) => {
          const option = document.createElement('option');
          const parts = opt.split(')');
          const letter = parts[0].trim();
          const text = parts[1].trim();
          option.value = letter;
          option.textContent = letter + ') ' + text;
          select.appendChild(option);
        });
        // Preselect if user previously answered
        const ua = userAnswers[currentIndex];
        const leftKey = leftItem.split(')')[0].trim();
        if (ua && ua[leftKey]) {
          select.value = ua[leftKey];
        }
        select.addEventListener('change', () => {
          let mapping = userAnswers[currentIndex] || {};
          if (select.value) {
            mapping[leftKey] = select.value;
          } else {
            // Remove mapping if placeholder selected
            if (mapping && mapping.hasOwnProperty(leftKey)) delete mapping[leftKey];
          }
          userAnswers[currentIndex] = mapping;
          saveSession('quiz');
        });
        row.appendChild(select);
        fs.appendChild(row);
      });
      qBody.appendChild(fs);
    }
    updateNavButtons();
    saveSession('quiz');
  }

  function updateNavButtons() {
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex >= questions.length - 1;
    finishBtn.classList.toggle('hidden', currentIndex < questions.length - 1);
    nextBtn.classList.toggle('hidden', currentIndex >= questions.length - 1);
    updateProgress();
  }

  function updateProgress() {
    if (!progBar || !questions.length) { return; }
    const pct = Math.max(0, Math.min(100, Math.round(((currentIndex + 1) / questions.length) * 100)));
    progBar.style.width = pct + '%';
  }

  function changeQuestion(delta) {
    if (delta === -1 && currentIndex === 0) return;
    if (delta === 1 && currentIndex >= questions.length - 1) return;
    // Validate MT before moving forward
    if (delta > 0 && !validateCurrentQuestion(true)) return;
    currentIndex += delta;
    showQuestion();
    saveSession('quiz');
  }

  function finishQuiz() {
    // Validate current question (e.g., MT requires all selections) before finishing
    if (!validateCurrentQuestion(true)) return;
    stopTimer();
    let correctCount = 0;
    const miss = [];
    questions.forEach((q, idx) => {
      const ua = userAnswers[idx];
      let isCorrect = false;
      if (q.type === 'MC') {
        if (!ua) {
          isCorrect = false;
        } else if (q.multi) {
          const correctSet = new Set(q.answers);
          const userSet = new Set(Array.isArray(ua) ? ua : []);
          isCorrect = (q.answers.length === userSet.size) && [...correctSet].every((x) => userSet.has(x));
        } else {
          isCorrect = ua === q.answers[0];
        }
      } else if (q.type === 'TF' || q.type === 'YN') {
        isCorrect = ua && ua.toUpperCase() === q.answer;
      } else if (q.type === 'MT') {
        if (!ua || typeof ua !== 'object') {
          isCorrect = false;
        } else {
          isCorrect = true;
          for (const key of Object.keys(q.answerMap)) {
            if (ua[key] !== q.answerMap[key]) {
              isCorrect = false;
              break;
            }
          }
        }
      }
      if (isCorrect) {
        correctCount++;
      } else {
        miss.push(idx);
      }
    });
    // Save and render summary
    lastSummary = { correctCount, miss };
    renderSummary();
    saveSession('result');
  }

  function validateCurrentQuestion(showMsg) {
    const q = questions[currentIndex];
    if (!q) return true;
    if (q.type === 'MT') {
      const ua = userAnswers[currentIndex];
      const required = q.lefts.map((l) => l.split(')')[0].trim());
      const missing = required.filter((k) => !ua || !ua[k]);
      if (missing.length) {
        if (showMsg) showToast('Please select an option for all rows');
        return false;
      }
    }
    return true;
  }

  function renderSummary() {
    if (!lastSummary) return;
    const { correctCount, miss } = lastSummary;
    // Build results UI
    result.innerHTML = '';
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'scorebig';
    scoreDiv.textContent = 'Score: ' + correctCount + ' / ' + questions.length;
    result.appendChild(scoreDiv);
    if (timerOn) {
      const timeDiv = document.createElement('div');
      timeDiv.className = 'subtle';
      if (countdown) {
        timeDiv.textContent = 'Time remaining: ' + timerEl.textContent;
      } else {
        timeDiv.textContent = 'Time elapsed: ' + timerEl.textContent;
      }
      result.appendChild(timeDiv);
    }
    // Ratio bar (correct vs incorrect)
    const total = questions.length || 1;
    const wrongCount = Math.max(0, total - correctCount);
    const goodPct = Math.round((correctCount / total) * 100);
    const badPct = 100 - goodPct;
    const ratioWrap = document.createElement('div');
    ratioWrap.className = 'ratio-wrap';
    const ratioRow = document.createElement('div');
    ratioRow.className = 'ratio-row';
    const goodSeg = document.createElement('div');
    goodSeg.className = 'ratio-good';
    goodSeg.style.width = goodPct + '%';
    const badSeg = document.createElement('div');
    badSeg.className = 'ratio-bad';
    badSeg.style.width = badPct + '%';
    ratioRow.appendChild(goodSeg);
    ratioRow.appendChild(badSeg);
    ratioWrap.appendChild(ratioRow);
    result.appendChild(ratioWrap);
    // Accessible label
    ratioWrap.setAttribute('role', 'img');
    ratioWrap.setAttribute('aria-label', correctCount + ' correct (' + goodPct + '%), ' + wrongCount + ' incorrect (' + badPct + '%)');
    const legend = document.createElement('div');
    legend.className = 'ratio-legend';
    const goodItem = document.createElement('span');
    goodItem.className = 'legend-item';
    const goodDot = document.createElement('span');
    goodDot.className = 'legend-dot legend-good';
    const goodText = document.createElement('span');
    goodText.textContent = 'Correct ' + correctCount + ' (' + goodPct + '%)';
    goodItem.appendChild(goodDot);
    goodItem.appendChild(goodText);
    const badItem = document.createElement('span');
    badItem.className = 'legend-item';
    const badDot = document.createElement('span');
    badDot.className = 'legend-dot legend-bad';
    const badText = document.createElement('span');
    badText.textContent = 'Incorrect ' + wrongCount + ' (' + badPct + '%)';
    badItem.appendChild(badDot);
    badItem.appendChild(badText);
    legend.appendChild(goodItem);
    legend.appendChild(badItem);
    result.appendChild(legend);
    const btnRow = document.createElement('div');
    btnRow.className = 'row result-actions';
    const reviewMissedBtn = document.createElement('button');
    reviewMissedBtn.className = 'btn blue';
    reviewMissedBtn.textContent = 'Review Missed';
    reviewMissedBtn.addEventListener('click', () => {
      reviewQuestions(miss);
    });
    const exportMissedBtn = document.createElement('button');
    exportMissedBtn.className = 'btn orange';
    exportMissedBtn.textContent = 'Export Missed';
    exportMissedBtn.addEventListener('click', () => {
      exportMissed(miss);
    });
    const reviewAllBtn = document.createElement('button');
    reviewAllBtn.className = 'btn grey';
    reviewAllBtn.textContent = 'Review All';
    reviewAllBtn.addEventListener('click', () => {
      reviewQuestions(questions.map((_, i) => i));
    });
    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn green';
    retryBtn.textContent = 'Retry';
    retryBtn.addEventListener('click', () => {
      restartQuiz();
    });
    const backBtn = document.createElement('button');
    backBtn.className = 'btn grey';
    backBtn.textContent = 'Back to Menu';
    backBtn.addEventListener('click', () => {
      showMenu();
    });
    btnRow.appendChild(reviewMissedBtn);
    btnRow.appendChild(exportMissedBtn);
    btnRow.appendChild(reviewAllBtn);
    btnRow.appendChild(retryBtn);
    btnRow.appendChild(backBtn);
    result.appendChild(btnRow);
    showResult();
  }

  function restartQuiz() {
    if (!questions || !questions.length) { showMenu(); return; }
    userAnswers = new Array(questions.length).fill(null);
    currentIndex = 0;
    showQuiz();
    showQuestion();
    if (timerOn) startTimer();
    saveSession('quiz');
  }

  function exportMissed(indexes){
    if (!indexes || !indexes.length) { showToast('Nothing to export'); return; }
    const lines = indexes.map((i) => (questions[i] && questions[i].raw) ? questions[i].raw : '').filter(Boolean);
    if (!lines.length) { showToast('Nothing to export'); return; }
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'missed-questions.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function reviewQuestions(indexes) {
    result.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'scorebig';
    // Determine if this matches the current 'missed' set
    let isMissedView = false;
    if (lastSummary && Array.isArray(lastSummary.miss)) {
      const setA = new Set(indexes);
      const setB = new Set(lastSummary.miss);
      isMissedView = setA.size === setB.size && [...setA].every((x) => setB.has(x));
    }
    header.textContent = isMissedView ? 'Missed Questions' : 'Review';
    result.appendChild(header);
    if (isMissedView) {
      const topRow = document.createElement('div');
      topRow.className = 'row review-top-actions';
      const retakeBtn = document.createElement('button');
      retakeBtn.className = 'btn orange ml-auto';
      retakeBtn.textContent = 'Retake Missed Only';
      retakeBtn.addEventListener('click', () => {
        retakeOnly(indexes);
      });
      topRow.appendChild(retakeBtn);
      result.appendChild(topRow);
    }
    const listDiv = document.createElement('div');
    listDiv.className = 'miss-list';
    indexes.forEach((idx) => {
      const q = questions[idx];
      const item = document.createElement('div');
      item.className = 'miss-item';
      const qDiv = document.createElement('div');
      qDiv.className = 'miss-q';
      qDiv.textContent = (idx + 1) + '. ' + q.question;
      item.appendChild(qDiv);
      if (q.type === 'MC') {
        const correct = q.answers
          .map((l) => {
            const index = l.charCodeAt(0) - 65;
            return q.options[index];
          })
          .join(', ');
        const ua = userAnswers[idx];
        const uaText = ua
          ? Array.isArray(ua)
            ? ua.map((l) => q.options[l.charCodeAt(0) - 65]).join(', ')
            : q.options[ua.charCodeAt(0) - 65]
          : 'None';
        const corrDiv = document.createElement('div');
        const corrLabel = document.createElement('span');
        corrLabel.className = 'label';
        corrLabel.textContent = 'Correct:';
        const corrVal = document.createElement('span');
        corrVal.className = 'good';
        corrVal.textContent = correct;
        corrDiv.appendChild(corrLabel);
        corrDiv.appendChild(document.createTextNode(' '));
        corrDiv.appendChild(corrVal);

        const userDiv = document.createElement('div');
        let good = false;
        if (ua) {
          if (q.multi) {
            const correctSet = new Set(q.answers);
            const userSet = new Set(Array.isArray(ua) ? ua : []);
            good = q.answers.length === userSet.size && [...correctSet].every((x) => userSet.has(x));
          } else {
            good = ua === q.answers[0];
          }
        }
        const uaLabel = document.createElement('span');
        uaLabel.className = 'label';
        uaLabel.textContent = 'Your answer:';
        const uaVal = document.createElement('span');
        uaVal.className = good ? 'good' : 'bad';
        uaVal.textContent = uaText;
        userDiv.appendChild(uaLabel);
        userDiv.appendChild(document.createTextNode(' '));
        userDiv.appendChild(uaVal);
        item.appendChild(corrDiv);
        item.appendChild(userDiv);
      } else if (q.type === 'TF' || q.type === 'YN') {
        const correct = q.type === 'TF' ? (q.answer === 'T' ? 'True' : 'False') : (q.answer === 'Y' ? 'Yes' : 'No');
        const ua = userAnswers[idx];
        const uaText = ua
          ? q.type === 'TF'
            ? (ua === 'T' ? 'True' : 'False')
            : (ua === 'Y' ? 'Yes' : 'No')
          : 'None';
        const corrDiv = document.createElement('div');
        const corrLabel = document.createElement('span');
        corrLabel.className = 'label';
        corrLabel.textContent = 'Correct:';
        const corrVal = document.createElement('span');
        corrVal.className = 'good';
        corrVal.textContent = correct;
        corrDiv.appendChild(corrLabel);
        corrDiv.appendChild(document.createTextNode(' '));
        corrDiv.appendChild(corrVal);

        const userDiv = document.createElement('div');
        const isGood = ua && ua.toUpperCase() === q.answer;
        const uaLabel2 = document.createElement('span');
        uaLabel2.className = 'label';
        uaLabel2.textContent = 'Your answer:';
        const uaVal2 = document.createElement('span');
        uaVal2.className = isGood ? 'good' : 'bad';
        uaVal2.textContent = uaText;
        userDiv.appendChild(uaLabel2);
        userDiv.appendChild(document.createTextNode(' '));
        userDiv.appendChild(uaVal2);
        item.appendChild(corrDiv);
        item.appendChild(userDiv);
      } else if (q.type === 'MT') {
        const correctList = Object.keys(q.answerMap)
          .map((k) => {
            const left = q.lefts.find((l) => l.startsWith(k));
            const rightLetter = q.answerMap[k];
            const rightItem = q.rights.find((r) => r.startsWith(rightLetter));
            return left + ' -> ' + rightItem;
          })
          .join(', ');
        const ua = userAnswers[idx];
        let uaList = 'None';
        let correctFlag = false;
        if (ua && typeof ua === 'object') {
          const pairs = [];
          let allCorrect = true;
          for (const key of Object.keys(q.answerMap)) {
            const left = q.lefts.find((l) => l.startsWith(key));
            const userLetter = ua[key];
            const rightOpt = q.rights.find((r) => r.startsWith(userLetter));
            pairs.push(left + ' -> ' + (rightOpt || '?'));
            if (userLetter !== q.answerMap[key]) allCorrect = false;
          }
          uaList = pairs.join(', ');
          correctFlag = allCorrect;
        }
        const corrDiv = document.createElement('div');
        const corrLabel3 = document.createElement('span');
        corrLabel3.className = 'label';
        corrLabel3.textContent = 'Correct:';
        const corrVal3 = document.createElement('span');
        corrVal3.className = 'good';
        corrVal3.textContent = correctList;
        corrDiv.appendChild(corrLabel3);
        corrDiv.appendChild(document.createTextNode(' '));
        corrDiv.appendChild(corrVal3);
        const userDiv = document.createElement('div');
        const uaLabel3 = document.createElement('span');
        uaLabel3.className = 'label';
        uaLabel3.textContent = 'Your answer:';
        const uaVal3 = document.createElement('span');
        uaVal3.className = correctFlag ? 'good' : 'bad';
        uaVal3.textContent = uaList;
        userDiv.appendChild(uaLabel3);
        userDiv.appendChild(document.createTextNode(' '));
        userDiv.appendChild(uaVal3);
        item.appendChild(corrDiv);
        item.appendChild(userDiv);
      }
      listDiv.appendChild(item);
    });
    result.appendChild(listDiv);
    const actions = document.createElement('div');
    actions.className = 'row review-actions';
    const backBtn = document.createElement('button');
    backBtn.className = 'btn grey';
    backBtn.textContent = 'Back to Results';
    backBtn.addEventListener('click', () => {
      renderSummary();
    });
    const menuBtn = document.createElement('button');
    menuBtn.className = 'btn blue';
    menuBtn.textContent = 'Main Menu';
    menuBtn.addEventListener('click', () => {
      showMenu();
    });
    actions.appendChild(backBtn);
    actions.appendChild(menuBtn);
    result.appendChild(actions);
    showResult();
  }

  function retakeOnly(indexes) {
    const subset = indexes.map((i) => questions[i]);
    if (!subset.length) { renderSummary(); return; }
    questions = subset;
    userAnswers = new Array(questions.length).fill(null);
    currentIndex = 0;
    showQuiz();
    showQuestion();
    if (timerOn) startTimer();
    saveSession('quiz');
  }

  // Initialise by showing the menu and ensure modals are closed
  showMenu();
  closeModal();

  // Header wordmark fallback (no inline handlers to satisfy CSP)
  document.addEventListener('DOMContentLoaded', () => {
    const img = document.querySelector('.brand-title-img');
    if (!img) return;
    let attemptedFallback = false;
    img.addEventListener('error', () => {
      if (!attemptedFallback) {
        attemptedFallback = true;
        img.src = 'icons/brand-title.png';
      } else {
        img.style.display = 'none';
        const txt = img.nextElementSibling;
        if (txt) txt.hidden = false;
      }
    });
  });

  // Buy Me a Coffee widget is included in index.html for reliability

  // Register service worker (moved out of inline script to tighten CSP)
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('SW register failed:', err);
    });
  } else {
    console.info('SW skipped (insecure context or file://)');
  }

  // Soft refresh / site reset via title clicks
  const titleEl = document.querySelector('.brand-title');
  let lastTitleClick = 0;
  function softRefresh() {
    try { stopTimer(); } catch {}
    questions = [];
    userAnswers = [];
    currentIndex = 0;
    qBody.innerHTML = '';
    qCounter.textContent = '0/0';
    finishBtn.classList.add('hidden');
    nextBtn.classList.remove('hidden');
    timerEl.classList.add('hidden');
    result.innerHTML = '';
    showMenu();
    setDiag('Ready.', 'ok');
  }
  if (titleEl) {
    titleEl.style.cursor = 'pointer';
    titleEl.title = 'Click to refresh • double‑click to reset';
    titleEl.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastTitleClick < 5000) {
        // Second click within 5 seconds: hard reset
        try { localStorage.removeItem('ezq_theme'); } catch {}
        location.reload();
        return;
      }
      lastTitleClick = now;
      softRefresh();
    });
  }

  // Set version in footer
  const verEl = document.getElementById('appVersion');
  if (verEl) {
    verEl.textContent = 'EZ Quiz Web ' + APP_VERSION;
  }

  // Reset app: clear storage, unregister SW, clear caches, reload
  async function resetApp() {
    try { localStorage.clear(); } catch {}
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {}
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {}
    location.reload();
  }
  if (resetAppBtn) {
    resetAppBtn.addEventListener('click', () => {
      if (confirm('Reset EZ Quiz Web? This clears saved data and reloads.')) resetApp();
    });
  }

  // Autosave session and deterministic shuffle seed
  let sessionSeed = (Math.random() * 0xffffffff) >>> 0;
  function mulberry32(a){return function(){var t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
  function hashSeed(seed, idx){
    // simple mixing
    let h = seed ^ 0x9e3779b9;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h ^= idx + 0x165667b1;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }
  function getShuffledRights(rights, idx){
    const arr = rights.slice();
    const rng = mulberry32(hashSeed(sessionSeed, idx));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function saveSession(view){
    try {
      const data = {
        v: 1,
        view,
        raw: quizInput ? quizInput.value : '',
        answers: userAnswers,
        idx: currentIndex,
        seed: sessionSeed,
        timerOn,
        countdown,
        duration: countdownInput ? countdownInput.value : '10:00'
      };
      localStorage.setItem('ezq_session', JSON.stringify(data));
    } catch {}
  }
  function restoreSession(){
    try {
      const s = localStorage.getItem('ezq_session');
      if (!s) return;
      const data = JSON.parse(s);
      if (!data || data.v !== 1) return;
      if (quizInput) quizInput.value = data.raw || '';
      if (typeof data.timerOn === 'boolean') {
        toggleTimer.checked = data.timerOn; timerOn = data.timerOn; timerEl.classList.toggle('hidden', !timerOn);
      }
      if (typeof data.countdown === 'boolean') {
        countdownMode.checked = data.countdown; countdown = data.countdown;
      }
      if (data.duration && countdownInput) countdownInput.value = data.duration;
      if (data.view === 'quiz' && data.raw) {
        try {
          questions = parseQuestions(data.raw);
          userAnswers = Array.isArray(data.answers) ? data.answers : new Array(questions.length).fill(null);
          currentIndex = Math.max(0, Math.min(questions.length - 1, data.idx || 0));
          sessionSeed = (data.seed >>> 0) || sessionSeed;
          showQuiz();
          showQuestion();
          setDiag('Session restored.', 'ok');
        } catch {}
      } else {
        setDiag('Ready.', 'ok');
      }
    } catch {}
  }

  // Persist textarea input changes
  if (quizInput) {
    quizInput.addEventListener('input', () => saveSession('menu'));
  }

  // Attempt session restore on load
  restoreSession();
})();
