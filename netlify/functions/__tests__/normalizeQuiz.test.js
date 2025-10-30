const { normalizeQuizV2, quizToLegacyLines } = require('../lib/normalizer.js');

describe('normalizeQuizV2', () => {
  afterEach(() => {
    if (typeof jest !== 'undefined' && jest.restoreAllMocks) {
      jest.restoreAllMocks();
    }
  });

  it('normalizes mixed structured payloads', () => {
    const payload = {
      title: 'Structured Payload',
      topic: 'General Knowledge',
      questions: [
        {
          type: 'MC',
          prompt: 'Select every valid option',
          options: ['First', 'Second', 'Third'],
          correct: ['b', '1', 'Third'],
        },
        {
          type: 'TF',
          prompt: 'The sky is blue.',
          correct: 'TRUE',
        },
        {
          type: 'YN',
          prompt: 'Do you like quizzes?',
          correct: 0,
        },
        {
          type: 'MT',
          prompt: 'Match the objects',
          left: ['Sun', 'Moon'],
          right: ['Day', 'Night'],
          matches: ['1-A', '2-B'],
        },
      ],
    };

    const quiz = normalizeQuizV2(payload);

    expect(quiz).toEqual({
      title: 'Structured Payload',
      topic: 'General Knowledge',
      questions: [
        {
          type: 'MC',
          prompt: 'Select every valid option',
          options: ['First', 'Second', 'Third'],
          correct: [0, 1, 2],
        },
        {
          type: 'TF',
          prompt: 'The sky is blue.',
          correct: true,
        },
        {
          type: 'YN',
          prompt: 'Do you like quizzes?',
          correct: false,
        },
        {
          type: 'MT',
          prompt: 'Match the objects',
          left: ['Sun', 'Moon'],
          right: ['Day', 'Night'],
          matches: [
            [0, 0],
            [1, 1],
          ],
        },
      ],
    });
  });

  it('throws NO_QUESTIONS for empty payloads', () => {
    expect.assertions(2);

    try {
      normalizeQuizV2('');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('NO_QUESTIONS');
    }
  });

  it('repairs JSON wrapped in fences or noisy text', () => {
    const fenced = `\n\n\`\`\`json\n{"quiz":{"questions":[{"type":"TF","prompt":"JSON fence works?","correct":"true"}]}}\n\`\`\`\n`;
    const noisy = 'prefix text {"questions":[{"type":"MC","prompt":"Noise parser","options":["Alpha","Beta"],"correct":2}]} trailing chars';

    const quizFromFenced = normalizeQuizV2(fenced);
    const quizFromNoisy = normalizeQuizV2(noisy);

    expect(quizFromFenced.questions).toEqual([
      {
        type: 'TF',
        prompt: 'JSON fence works?',
        correct: true,
      },
    ]);
    expect(quizFromNoisy.questions).toEqual([
      {
        type: 'MC',
        prompt: 'Noise parser',
        options: ['Alpha', 'Beta'],
        correct: [1],
      },
    ]);
  });

  it('parses legacy lines with TITLE header and trims surrounding whitespace', () => {
    const legacy = 'TITLE: Legacy Set\nTF|Sky?|T\n';
    const quiz = normalizeQuizV2(legacy, { topic: 'Env' });
    expect(quiz.title).toBe('Legacy Set');
    expect(quiz.questions).toEqual([{ type: 'TF', prompt: 'Sky?', correct: true }]);
  });

  it('deduplicates and sorts multi-answer MC indices', () => {
    const payload = {
      questions: [
        {
          type: 'MC',
          prompt: 'Pick every prime number',
          options: ['Two', 'Three', 'Four', 'Five'],
          correct: ['1', 'D', 'three', { letter: 'B' }, 4],
        },
      ],
    };

    const quiz = normalizeQuizV2(payload);

    expect(quiz.questions[0]).toEqual({
      type: 'MC',
      prompt: 'Pick every prime number',
      options: ['Two', 'Three', 'Four', 'Five'],
      correct: [0, 1, 3],
    });
  });

  it('round-trips legacy lines through quizToLegacyLines', () => {
    const structured = {
      title: 'Legacy Deck',
      topic: 'History',
      questions: [
        {
          type: 'MC',
          prompt: 'Capital of France?',
          options: ['Paris', 'Lyon', 'Marseille'],
          correct: [0],
        },
        {
          type: 'TF',
          prompt: 'The pyramids are in Egypt.',
          correct: true,
        },
        {
          type: 'YN',
          prompt: 'Continue?',
          correct: false,
        },
        {
          type: 'MT',
          prompt: 'Match explorers to voyages',
          left: ['Columbus', 'Magellan'],
          right: ['Circumnavigated globe', 'Reached the Americas'],
          matches: [
            [0, 1],
            [1, 0],
          ],
        },
      ],
    };

    const legacy = quizToLegacyLines(structured);
    const legacyText = `Title: ${legacy.title}\n${legacy.lines}`;

    const roundTripped = normalizeQuizV2(legacyText, { topic: structured.topic });

    expect(roundTripped).toEqual(structured);
  });
});
