#!/usr/bin/env python3
import sys
import tkinter as tk
from tkinter import messagebox

def load_questions_from_file(filename):
    """
    Load questions from a text file.

    Expected file format:
    - Each question is on a separate line.
    - Fields are separated by a pipe '|' character.

    For Multiple Choice (MC):
      MC|<question text>|<option1;option2;...>|<correct answer letter>
      Example:
      MC|Which planet is known as the Red Planet?|A) Mars;B) Venus;C) Jupiter;D) Saturn|A

    For True/False (TF):
      TF|<question text>|<correct answer letter (T or F)>
      Example:
      TF|The Earth is flat.|F

    For Yes/No (YN):
      YN|<question text>|<correct answer letter (Y or N)>
      Example:
      YN|Are pandas classified as bears?|Y

    Returns a list of question dictionaries.
    """
    questions = []
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            for line in f:
                # Remove whitespace and ignore empty lines or comments
                line = line.strip()
                if not line or line.startswith('#'):
                    continue

                parts = line.split('|')
                if len(parts) < 3:
                    print(f"Skipping invalid line: {line}")
                    continue

                q_type = parts[0].strip().upper()
                q_text = parts[1].strip()

                if q_type == 'MC':
                    if len(parts) != 4:
                        print(f"Skipping invalid MC line (should have 4 parts): {line}")
                        continue
                    # Split the options by semicolon
                    options = [opt.strip() for opt in parts[2].split(';')]
                    answer = parts[3].strip().upper()
                    question = {
                        'type': 'mc',
                        'question': q_text,
                        'options': options,
                        'answer': answer
                    }
                    questions.append(question)
                elif q_type in ['TF', 'YN']:
                    if len(parts) != 3:
                        print(f"Skipping invalid {q_type} line (should have 3 parts): {line}")
                        continue
                    answer = parts[2].strip().upper()
                    # For YN, convert Y/N to T/F (optional)
                    if q_type == 'YN':
                        if answer == 'Y':
                            answer = 'T'
                        elif answer == 'N':
                            answer = 'F'
                    question = {
                        'type': 'tf',  # We'll use the same handling as TF
                        'question': q_text,
                        'answer': answer
                    }
                    questions.append(question)
                else:
                    print(f"Unknown question type '{q_type}' in line: {line}")
    except FileNotFoundError:
        print(f"File not found: {filename}")
        sys.exit(1)
    return questions

class QuizApp:
    def __init__(self, master, questions):
        self.master = master
        self.questions = questions
        self.current_question = 0
        self.correct_count = 0
        self.incorrect_answers = []  # To track wrong answers
        self.total_questions = len(questions)

        # Configure master background
        self.master.configure(bg="black")

        # Set up the main GUI components with black and grey styling.
        self.question_label = tk.Label(
            master, text="", wraplength=600, font=("Arial", 14),
            bg="black", fg="grey"
        )
        self.question_label.pack(pady=20)

        self.buttons_frame = tk.Frame(master, bg="black")
        self.buttons_frame.pack(pady=10)

        self.load_question()

    def clear_buttons(self):
        for widget in self.buttons_frame.winfo_children():
            widget.destroy()

    def load_question(self):
        if self.current_question >= self.total_questions:
            self.end_quiz()
            return

        self.clear_buttons()
        q = self.questions[self.current_question]
        self.question_label.config(
            text=f"Question {self.current_question + 1}: {q['question']}"
        )

        if q['type'] == 'mc':
            # Create a button for each multiple-choice option
            for option in q['options']:
                btn = tk.Button(
                    self.buttons_frame,
                    text=option,
                    width=40,
                    font=("Arial", 12),
                    command=lambda opt=option: self.check_answer(opt),
                    bg="grey", fg="white", activebackground="darkgrey",
                    relief="flat"
                )
                btn.pack(pady=5)
        elif q['type'] == 'tf':
            # For true/false, create two buttons: True and False
            btn_true = tk.Button(
                self.buttons_frame,
                text="True",
                width=20,
                font=("Arial", 12),
                command=lambda: self.check_answer("T"),
                bg="grey", fg="white", activebackground="darkgrey",
                relief="flat"
            )
            btn_true.pack(pady=5)
            btn_false = tk.Button(
                self.buttons_frame,
                text="False",
                width=20,
                font=("Arial", 12),
                command=lambda: self.check_answer("F"),
                bg="grey", fg="white", activebackground="darkgrey",
                relief="flat"
            )
            btn_false.pack(pady=5)
        else:
            tk.Label(
                self.buttons_frame,
                text="Unsupported question type.",
                bg="black", fg="grey",
                font=("Arial", 12)
            ).pack()
            tk.Button(
                self.buttons_frame,
                text="Continue",
                command=self.next_question,
                bg="grey", fg="white", activebackground="darkgrey",
                relief="flat"
            ).pack(pady=5)

    def check_answer(self, selected):
        q = self.questions[self.current_question]
        correct_answer = q['answer'].upper()

        if q['type'] == 'mc':
            # For MC, assume option text starts with letter + ')', e.g., "A) Mars"
            letter = selected.split(')')[0].strip().upper()
            if letter == correct_answer:
                self.correct_count += 1
            else:
                self.incorrect_answers.append((q['question'], letter, correct_answer))
        elif q['type'] == 'tf':
            if selected.upper() == correct_answer:
                self.correct_count += 1
            else:
                self.incorrect_answers.append((q['question'], selected.upper(), correct_answer))

        self.next_question()

    def next_question(self):
        self.current_question += 1
        self.load_question()

    def end_quiz(self):
        # Calculate a percentage score based on the total number of questions.
        score = int((self.correct_count / self.total_questions) * 100)

        # Show results
        result_message = f"You scored {score} out of 100!\n\n"
        result_message += "Here are the questions you missed:\n\n"

        for i, (question, user_answer, correct_answer) in enumerate(self.incorrect_answers, start=1):
            result_message += f"{i}. {question}\n"
            result_message += f"   Your answer: {user_answer}\n"
            result_message += f"   Correct answer: {correct_answer}\n\n"

        messagebox.showinfo("Quiz Results", result_message)
        self.master.destroy()

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 quiz-app.py <question_list.txt>")
        sys.exit(1)

    filename = sys.argv[1]
    questions = load_questions_from_file(filename)

    if not questions:
        print("No valid questions loaded. Please check your file format.")
        sys.exit(1)

    # Set up the Tkinter window and start the quiz.
    root = tk.Tk()
    root.title("Practice Quiz")
    root.geometry("700x400")
    # Set the background of the root window as well.
    root.configure(bg="black")
    app = QuizApp(root, questions)
    root.mainloop()

if __name__ == "__main__":
    main()
