#!/usr/bin/env python3
import sys
import os
import re
import math
import tkinter as tk
from tkinter import messagebox, ttk
from functools import partial
from tkinter import font as tkFont

# ======================
# Color and Style Settings
# ======================
BG_COLOR         = "#2C2F33"   # Dark slate background
QUESTION_BG      = "#23272A"   # Dark header background
BUTTON_BG        = "#7289DA"   # Professional blue accent
BUTTON_FG        = "#FFFFFF"   # White button text
ACTIVE_BG        = "#677BC4"   # Slightly darker on hover
LABEL_FG         = "#FFFFFF"   # White text for labels
CORRECT_COLOR    = "#43B581"   # Vibrant green for correct answers
INCORRECT_COLOR  = "#F04747"   # Vibrant red for incorrect answers
SEPARATOR_COLOR  = "#99AAB5"   # Light gray for separator lines

# ======================
# Font Settings (using Segoe UI for a modern look)
# ======================
FONT_QUESTION       = ("Segoe UI", 16, "bold")
FONT_QUESTION_EXTRA = ("Segoe UI", 12, "bold")  # 2 sizes smaller for 4+ line questions
FONT_BUTTON         = ("Segoe UI", 12)
FONT_LABEL          = ("Segoe UI", 12)
FONT_TITLE          = ("Segoe UI", 20, "bold")

# ======================
# Helper Functions
# ======================
def clear_widgets(container):
    """Destroy all widgets in the given container."""
    for widget in container.winfo_children():
        widget.destroy()

def load_questions_from_file(filename):
    """
    Load questions from a file.
    Basic validations are applied; since the file is local and expected to be trusted,
    additional sanitization is not implemented.
    """
    questions = []
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                parts = line.split('|')
                if len(parts) < 3:
                    continue
                q_type, q_text = parts[0].strip().upper(), parts[1].strip()
                if q_type == 'MC' and len(parts) == 4:
                    options = [opt.strip() for opt in parts[2].split(';')]
                    questions.append({
                        'type': 'mc',
                        'question': q_text,
                        'options': options,
                        'answer': parts[3].strip().upper()
                    })
                elif q_type in ['TF', 'YN'] and len(parts) == 3:
                    answer = 'T' if parts[2].strip().upper() == 'Y' else 'F'
                    questions.append({
                        'type': 'tf',
                        'question': q_text,
                        'answer': answer
                    })
    except FileNotFoundError:
        print(f"File not found: {filename}")
        return []
    return questions

# ======================
# Main Quiz Application
# ======================
class QuizApp:
    def __init__(self, master, questions):
        self.master = master
        self.questions = questions
        self.restart_quiz()

    def center_window(self, width, height):
        """Resize and recenter the window on the screen."""
        self.master.geometry(f"{width}x{height}")
        self.master.update_idletasks()
        screen_width = self.master.winfo_screenwidth()
        screen_height = self.master.winfo_screenheight()
        x = (screen_width - width) // 2
        y = (screen_height - height) // 2
        self.master.geometry(f"{width}x{height}+{x}+{y}")

    def restart_quiz(self):
        """Reset quiz state, clear global scroll bindings, and set window size."""
        self.master.unbind_all("<MouseWheel>")
        self.master.unbind_all("<Button-4>")
        self.master.unbind_all("<Button-5>")
        
        self.center_window(700, 500)
        self.current_question = 0
        self.correct_count = 0
        self.incorrect_answers = []
        
        clear_widgets(self.master)
        self.master.configure(bg=BG_COLOR)
        
        # Fixed header, 130px to prevent top-line clipping
        self.header_frame = tk.Frame(self.master, bg=QUESTION_BG, height=130)
        self.header_frame.pack(fill="x")
        self.header_frame.pack_propagate(False)

        # Anchor top-left, with padding
        self.question_label = tk.Label(
            self.header_frame,
            text="",
            wraplength=680,
            font=FONT_QUESTION,
            bg=QUESTION_BG,
            fg=LABEL_FG,
            anchor="nw"
        )
        self.question_label.pack(side="top", padx=20, pady=10, fill="both", expand=True)
        
        self.buttons_frame = tk.Frame(self.master, bg=BG_COLOR)
        self.buttons_frame.pack(pady=10)
        self.load_question()

    def load_question(self):
        if self.current_question >= len(self.questions):
            self.display_score()
            return
        
        clear_widgets(self.buttons_frame)
        q = self.questions[self.current_question]
        question_text = f"Question {self.current_question + 1}: {q['question']}"
        
        # Estimate line count using the normal font
        wrap_length = 680
        normal_font_obj = tkFont.Font(font=FONT_QUESTION)
        explicit_lines = question_text.count("\n") + 1
        estimated_lines = math.ceil(normal_font_obj.measure(question_text) / wrap_length)
        total_lines = max(explicit_lines, estimated_lines)
        
        # If 4+ lines, shrink to 12pt
        if total_lines >= 4:
            question_font = FONT_QUESTION_EXTRA
        else:
            question_font = FONT_QUESTION
        
        self.question_label.config(text=question_text, font=question_font)
        
        if q.get('options'):
            for option in q['options']:
                answer_letter = option[0].upper()
                tk.Button(
                    self.buttons_frame,
                    text=option,
                    width=40,
                    font=FONT_BUTTON,
                    command=partial(self.check_answer, answer_letter),
                    bg=BUTTON_BG,
                    fg=BUTTON_FG,
                    activebackground=ACTIVE_BG,
                    relief="flat", bd=0
                ).pack(pady=5)
        elif q['type'] == 'tf':
            for text, letter in [("True", "T"), ("False", "F")]:
                tk.Button(
                    self.buttons_frame,
                    text=text,
                    width=20,
                    font=FONT_BUTTON,
                    command=partial(self.check_answer, letter),
                    bg=BUTTON_BG,
                    fg=BUTTON_FG,
                    activebackground=ACTIVE_BG,
                    relief="flat", bd=0
                ).pack(pady=5)
        self.buttons_frame.pack(pady=10)

    def check_answer(self, selected):
        q = self.questions[self.current_question]
        correct_answer = q['answer']
        if selected == correct_answer:
            self.correct_count += 1
        else:
            self.incorrect_answers.append((q['question'], selected, correct_answer, q.get('options', [])))
        self.current_question += 1
        self.load_question()

    def display_score(self):
        score = int((self.correct_count / len(self.questions)) * 100)
        clear_widgets(self.master)
        self.center_window(700, 500)
        
        score_frame = tk.Frame(self.master, bg=BG_COLOR)
        score_frame.pack(pady=30)
        tk.Label(
            score_frame,
            text=f"You scored {score} out of 100!",
            font=FONT_TITLE,
            fg=LABEL_FG,
            bg=BG_COLOR,
            pady=20
        ).pack()
        
        button_frame = tk.Frame(self.master, bg=BG_COLOR)
        button_frame.pack(pady=20)
        tk.Button(
            button_frame,
            text="Retry",
            command=self.restart_quiz,
            font=FONT_BUTTON,
            width=15, height=1,
            bg=BUTTON_BG, fg=BUTTON_FG,
            activebackground=ACTIVE_BG,
            relief="flat", bd=0
        ).pack(side="left", padx=5)
        tk.Button(
            button_frame,
            text="View Results",
            command=self.display_results,
            font=FONT_BUTTON,
            width=15, height=1,
            bg=BUTTON_BG, fg=BUTTON_FG,
            activebackground=ACTIVE_BG,
            relief="flat", bd=0
        ).pack(side="left", padx=5)
        tk.Button(
            button_frame,
            text="Exit",
            command=self.master.quit,
            font=FONT_BUTTON,
            width=15, height=1,
            bg=BUTTON_BG, fg=BUTTON_FG,
            activebackground=INCORRECT_COLOR,
            relief="flat", bd=0
        ).pack(side="left", padx=5)

    def display_results(self):
        self.center_window(1000, 900)
        clear_widgets(self.master)
        
        outer_frame = tk.Frame(self.master, bg=BG_COLOR)
        outer_frame.pack(fill="both", expand=True)
        canvas = tk.Canvas(outer_frame, bg=BG_COLOR, highlightthickness=0)
        scrollbar = ttk.Scrollbar(outer_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=BG_COLOR)
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # Global scroll bindings for the results page
        canvas.bind_all("<MouseWheel>", lambda event: self._on_mousewheel(event, canvas))
        canvas.bind_all("<Button-4>", lambda event: canvas.yview_scroll(-1, "units"))
        canvas.bind_all("<Button-5>", lambda event: canvas.yview_scroll(1, "units"))
        
        tk.Label(
            scrollable_frame,
            text="Review Your Missed Questions",
            font=FONT_TITLE,
            fg=LABEL_FG,
            bg=BG_COLOR,
            pady=10
        ).pack(pady=10)
        
        for i, (question, user_letter, correct_letter, options) in enumerate(self.incorrect_answers, start=1):
            q_frame = tk.Frame(scrollable_frame, bg=BG_COLOR)
            q_frame.pack(fill="x", padx=20, pady=10)
            tk.Label(
                q_frame,
                text=f"{i}. {question}",
                font=FONT_LABEL,
                fg=LABEL_FG,
                bg=BG_COLOR,
                wraplength=900,
                justify="left"
            ).pack(anchor="w", padx=5, pady=5)
            
            ca_frame = tk.Frame(q_frame, bg=BG_COLOR)
            ca_frame.pack(anchor="w", padx=25, pady=2)
            tk.Label(
                ca_frame,
                text="Correct Answer: ",
                font=FONT_LABEL,
                fg=LABEL_FG,
                bg=BG_COLOR
            ).pack(side="left")
            self.create_answer_display(ca_frame, correct_letter, options, CORRECT_COLOR)
            
            ua_frame = tk.Frame(q_frame, bg=BG_COLOR)
            ua_frame.pack(anchor="w", padx=25, pady=2)
            tk.Label(
                ua_frame,
                text="Your Answer: ",
                font=FONT_LABEL,
                fg=LABEL_FG,
                bg=BG_COLOR
            ).pack(side="left")
            self.create_answer_display(ua_frame, user_letter, options, INCORRECT_COLOR)
            
            separator = tk.Frame(scrollable_frame, bg=SEPARATOR_COLOR, height=1)
            separator.pack(fill="x", padx=20, pady=5)
        
        button_frame = tk.Frame(self.master, bg=BG_COLOR)
        button_frame.pack(pady=20)
        tk.Button(
            button_frame,
            text="Retry",
            command=self.restart_quiz,
            font=FONT_BUTTON,
            width=15, height=1,
            bg=BUTTON_BG, fg=BUTTON_FG,
            activebackground=ACTIVE_BG,
            relief="flat", bd=0
        ).pack(side="left", padx=5)
        tk.Button(
            button_frame,
            text="Exit",
            command=self.master.quit,
            font=FONT_BUTTON,
            width=15, height=1,
            bg=BUTTON_BG, fg=BUTTON_FG,
            activebackground=INCORRECT_COLOR,
            relief="flat", bd=0
        ).pack(side="left", padx=5)

    def _on_mousewheel(self, event, canvas):
        canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

    def create_answer_display(self, parent, letter, options, letter_color):
        """
        For True/False questions, show full text.
        For multiple-choice, display the letter and cleaned answer text.
        """
        if not options:
            full_text = "True" if letter.upper() == "T" else "False"
            tk.Label(parent, text=full_text, font=FONT_LABEL, fg=letter_color, bg=BG_COLOR).pack(side="left")
        else:
            tk.Label(parent, text=letter, font=FONT_LABEL, fg=letter_color, bg=BG_COLOR).pack(side="left")
            answer_text = self.get_option_text(letter, options)
            cleaned_text = re.sub(r'^[A-Z]\)\s*', '', answer_text)
            tk.Label(parent, text=" " + cleaned_text, font=FONT_LABEL, fg=LABEL_FG, bg=BG_COLOR).pack(side="left")

    def get_option_text(self, letter, options):
        if options:
            index = ord(letter.upper()) - 65  # 'A' -> 0, 'B' -> 1, etc.
            if 0 <= index < len(options):
                return options[index]
            return ""
        else:
            return "True" if letter.upper() == "T" else "False"

# ======================
# Application Entry Point
# ======================
def main():
    root = tk.Tk()
    root.title("EZ Quiz")

    # On Linux, setting a custom WM_CLASS can help your app appear as a separate window:
    try:
        root.wm_class("EZQuiz", "EZQuiz")
    except Exception as e:
        print("Could not set WM_CLASS:", e)

    root.configure(bg=BG_COLOR)
    
    # Set an icon if available
    icon_path = os.path.join(os.path.dirname(__file__), "ez_quiz_icon.png")
    if os.path.exists(icon_path):
        root.iconphoto(False, tk.PhotoImage(file=icon_path))
    
    # Center the window initially
    app_width, app_height = 700, 500
    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()
    x = (screen_width - app_width) // 2
    y = (screen_height - app_height) // 2
    root.geometry(f"{app_width}x{app_height}+{x}+{y}")
    
    if len(sys.argv) > 1:
        questions = load_questions_from_file(sys.argv[1])
        if not questions:
            messagebox.showerror("Error", "No valid questions loaded from file.")
            sys.exit(1)
    else:
        print("Usage: python quiz-app.py <questions_file>")
        sys.exit(1)
    
    QuizApp(root, questions)
    root.mainloop()

if __name__ == "__main__":
    main()
