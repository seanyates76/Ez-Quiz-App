# Quiz App

Easily run a quiz from a simple text file. Create and refine your quiz questions with ChatGPT for a quick and convenient setup. Great for testing knowledge quickly andGreat for testing knowledge quickly and informally.

## Features

- Multiple-choice, true/false, and yes/no questions
- Easy-to-edit text-based question files
- Instant scoring
- Displays what you got wrong with correct answers

## Usage

1. **Create a question file:**

   - Multiple-choice: `MC|Question?|A) Option1;B) Option2;...|CorrectOption`
   - True/false: `TF|Question?|T or F`
   - Yes/no: `YN|Question?|Y or N`
   - Example:
     ```
     MC|What color is the sky?|A) Blue;B) Green;C) Yellow;D) Red|A
     TF|The Earth is flat.|F
     YN|Are apples fruits?|Y
     ```

2. **Run the app:**

   ```bash
   python3 quiz-app.py questions.txt
   ```

3. **Take the quiz:**

   - Answer each question by clicking a button.

4. **See your results:**

   - Review what you got wrong and the correct answers.

## Customizing

- **Use ChatGPT to Create Questions:** Quickly generate questions by asking ChatGPT to help, then paste them into your text file.

  -Ex: "Hey GPT, create a practice test for \<Whatever> using this format: \<insert example questions>"
- **Change colors or fonts:** Modify the app’s code to suit your style.

## Quick Setup

1. Install Python.
2. Save your questions in a text file.
3. Run the script.

No need to overthink—just write your questions and start testing.

