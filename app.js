/*
 * Application logic for EZ Quiz Web
 *
 * This script handles theme management, modal interactions, timer functionality,
 * question parsing, quiz navigation, scoring and review. It is written as an
 * immediately invoked function expression (IIFE) to avoid leaking variables
 * into the global scope.
 */

(function () {
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

  function show(el) { if (el) el.style.display = 'block'; }
  function hide(el) { if (el) el.style.display = 'none'; }
  function closeModal() {
    hide(settingsModal);
    hide(faqModal);
    hide(overlay);
  }
  settingsBtn.addEventListener('click', () => {
    show(settingsModal);
    show(overlay);
    hide(faqModal);
  });
  faqBtn.addEventListener('click', () => {
    show(faqModal);
    show(overlay);
    hide(settingsModal);
  });
  closeSettings.addEventListener('click', closeModal);
  closeFaq.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

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
  const qCounter = $('qCounter');
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
      diag.textContent = 'File loaded.';
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
      diag.textContent = 'File dropped.';
    };
    reader.readAsText(f);
  });

  // Clear textarea
  clearBtn.addEventListener('click', () => {
    quizInput.value = '';
    diag.textContent = 'Cleared.';
    quizInput.focus();
  });

  // Built‑in sample loader
  builtInBtn.addEventListener('click', () => {
    quizInput.value = builtIn;
    diag.textContent = 'Built‑in loaded.';
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
      (overlay && overlay.style.display === 'block');
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

  // Parse question lines into objects
  function parseQuestions(str) {
    const lines = str.split(/\n/).map((l) => l.trim()).filter((l) => l);
    return lines.map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      const type = parts[0].toUpperCase();
      if (type === 'MC') {
        if (parts.length < 4) throw new Error('Invalid MC format');
        const question = parts[1];
        const optionStr = parts[2];
        const answerStr = parts[3];
        const options = optionStr.split(';').map((opt) => opt.trim());
        const answers = answerStr.split(',').map((s) => s.trim().toUpperCase());
        const multi = answers.length > 1;
        return { type: 'MC', question, options, answers, multi };
      } else if (type === 'TF') {
        if (parts.length < 3) throw new Error('Invalid TF format');
        const question = parts[1];
        const answer = parts[2].trim().toUpperCase();
        return { type: 'TF', question, answer };
      } else if (type === 'YN') {
        if (parts.length < 3) throw new Error('Invalid YN format');
        const question = parts[1];
        const answer = parts[2].trim().toUpperCase();
        return { type: 'YN', question, answer };
      } else if (type === 'MT') {
        if (parts.length < 5) throw new Error('Invalid MT format');
        const question = parts[1];
        const leftStr = parts[2];
        const rightStr = parts[3];
        const mapStr = parts[4];
        const lefts = leftStr.split(';').map((s) => s.trim());
        const rights = rightStr.split(';').map((s) => s.trim());
        const answerMap = {};
        mapStr.split(',').map((s) => s.trim()).forEach((pair) => {
          const [l, r] = pair.split('-').map((x) => x.trim());
          answerMap[l] = r.toUpperCase();
        });
        return { type: 'MT', question, lefts, rights, answerMap };
      } else {
        throw new Error('Unknown question type: ' + type);
      }
    });
  }

  // Start the quiz
  function startQuiz() {
    const raw = quizInput.value.trim();
    if (!raw) {
      diag.textContent = 'Please enter or load some questions.';
      return;
    }
    try {
      questions = parseQuestions(raw);
      userAnswers = new Array(questions.length).fill(null);
      currentIndex = 0;
      diag.textContent = '';
      showQuiz();
      showQuestion();
      if (timerOn) {
        startTimer();
      }
    } catch (err) {
      console.error(err);
      diag.textContent = 'Failed to parse questions.';
    }
  }

  // Display the current question
  function showQuestion() {
    const q = questions[currentIndex];
    qCounter.textContent = (currentIndex + 1) + '/' + questions.length;
    // hide timer if not enabled
    timerEl.classList.toggle('hidden', !timerOn);
    // clear previous body content
    qBody.innerHTML = '';
    if (q.type === 'MC') {
      const divQ = document.createElement('div');
      divQ.className = 'question';
      divQ.textContent = q.question;
      qBody.appendChild(divQ);
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
        });
        label.appendChild(input);
        label.appendChild(document.createTextNode(opt));
        qBody.appendChild(label);
      });
    } else if (q.type === 'TF') {
      const divQ = document.createElement('div');
      divQ.className = 'question';
      divQ.textContent = q.question;
      qBody.appendChild(divQ);
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
        });
        label.appendChild(input);
        label.appendChild(document.createTextNode(letter === 'T' ? 'True' : 'False'));
        qBody.appendChild(label);
      });
    } else if (q.type === 'YN') {
      const divQ = document.createElement('div');
      divQ.className = 'question';
      divQ.textContent = q.question;
      qBody.appendChild(divQ);
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
        });
        label.appendChild(input);
        label.appendChild(document.createTextNode(letter === 'Y' ? 'Yes' : 'No'));
        qBody.appendChild(label);
      });
    } else if (q.type === 'MT') {
      const divQ = document.createElement('div');
      divQ.className = 'question';
      divQ.textContent = q.question;
      qBody.appendChild(divQ);
      // Randomise right options for this question
      const rightsRandom = q.rights.slice();
      for (let i = rightsRandom.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = rightsRandom[i];
        rightsRandom[i] = rightsRandom[j];
        rightsRandom[j] = tmp;
      }
      q.lefts.forEach((leftItem) => {
        const row = document.createElement('div');
        row.className = 'pair-row';
        const leftDiv = document.createElement('div');
        leftDiv.className = 'pair-left';
        leftDiv.textContent = leftItem;
        row.appendChild(leftDiv);
        const select = document.createElement('select');
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
          mapping[leftKey] = select.value;
          userAnswers[currentIndex] = mapping;
        });
        row.appendChild(select);
        qBody.appendChild(row);
      });
    }
    updateNavButtons();
  }

  function updateNavButtons() {
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex >= questions.length - 1;
    finishBtn.classList.toggle('hidden', currentIndex < questions.length - 1);
    nextBtn.classList.toggle('hidden', currentIndex >= questions.length - 1);
  }

  function changeQuestion(delta) {
    if (delta === -1 && currentIndex === 0) return;
    if (delta === 1 && currentIndex >= questions.length - 1) return;
    currentIndex += delta;
    showQuestion();
  }

  function finishQuiz() {
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
    const btnRow = document.createElement('div');
    btnRow.className = 'row';
    const reviewMissedBtn = document.createElement('button');
    reviewMissedBtn.className = 'btn blue';
    reviewMissedBtn.textContent = 'Review Missed';
    reviewMissedBtn.addEventListener('click', () => {
      reviewQuestions(miss);
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
      showMenu();
    });
    const backBtn = document.createElement('button');
    backBtn.className = 'btn grey';
    backBtn.textContent = 'Back to Menu';
    backBtn.addEventListener('click', () => {
      showMenu();
    });
    btnRow.appendChild(reviewMissedBtn);
    btnRow.appendChild(reviewAllBtn);
    btnRow.appendChild(retryBtn);
    btnRow.appendChild(backBtn);
    result.appendChild(btnRow);
    showResult();
  }

  function reviewQuestions(indexes) {
    result.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'scorebig';
    header.textContent = 'Review';
    result.appendChild(header);
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

  // Initialise by showing the menu
  showMenu();
})();
