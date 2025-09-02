document.addEventListener('DOMContentLoaded', () => {
  const quizForm = document.getElementById('quizForm');
  const loadingMsg = document.getElementById('loadingMsg');
  const errorMsg = document.getElementById('errorMsg');
  const quizContainer = document.getElementById('quizContainer');

  let questions = [];
  let currentQuestionIndex = 0;
  let score = 0;

  quizForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const topic = quizForm.topic.value.trim();
    const count = parseInt(quizForm.count.value, 10);

    if (!topic) {
      showError('Please enter a topic.');
      return;
    }

    if (isNaN(count) || count < 1 || count > 20) {
      showError('Number of questions must be between 1 and 20.');
      return;
    }

    hideError();
    setLoading(true);

    try {
      const response = await fetch('/.netlify/functions/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic, questionCount: count }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz.');
      }

      questions = data.questions;
      currentQuestionIndex = 0;
      score = 0;
      startQuiz();
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    if (isLoading) {
      quizForm.style.display = 'none';
      loadingMsg.style.display = 'block';
      quizContainer.style.display = 'none';
    } else {
      loadingMsg.style.display = 'none';
    }
  }

  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    quizForm.style.display = 'block';
  }

  function hideError() {
    errorMsg.style.display = 'none';
  }

  function startQuiz() {
    quizForm.style.display = 'none';
    quizContainer.style.display = 'block';
    showQuestion();
  }

  function showQuestion() {
    if (currentQuestionIndex >= questions.length) {
      showResults();
      return;
    }

    const question = questions[currentQuestionIndex];
    quizContainer.innerHTML = `
      <h3>${question.question}</h3>
      <div class="options">
        ${question.options.map((option, index) => `
          <button class="option" data-index="${index}">${option}</button>
        `).join('')}
      </div>
      <div id="feedback"></div>
    `;

    document.querySelectorAll('.option').forEach(button => {
      button.addEventListener('click', handleAnswer);
    });
  }

  function handleAnswer(e) {
    const selectedIndex = parseInt(e.target.dataset.index, 10);
    const question = questions[currentQuestionIndex];
    const feedback = document.getElementById('feedback');

    if (selectedIndex === question.answerIndex) {
      score++;
      feedback.textContent = 'Correct!';
      feedback.style.color = 'green';
    } else {
      feedback.textContent = `Incorrect. The correct answer is: ${question.options[question.answerIndex]}`;
      feedback.style.color = 'red';
    }

    document.querySelectorAll('.option').forEach(button => {
      button.disabled = true;
    });

    setTimeout(() => {
      currentQuestionIndex++;
      showQuestion();
    }, 2000);
  }

  function showResults() {
    quizContainer.innerHTML = `
      <h2>Quiz Complete</h2>
      <p>You got ${score} out of ${questions.length} correct.</p>
      <button id="newQuizBtn">New Quiz</button>
    `;

    document.getElementById('newQuizBtn').addEventListener('click', () => {
      quizForm.style.display = 'block';
      quizContainer.style.display = 'none';
      quizForm.reset();
    });
  }
});