#!/usr/bin/env python3
"""Command-line version of the EZ Quiz app."""
import sys
import re

def load_questions_from_file(filename):
    """Load questions from a file in the same format as the GUI app."""
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


def ask_question(q):
    """Display a question and return True if the user answered correctly."""
    print()
    print(q['question'])
    if q.get('options'):
        for opt in q['options']:
            print(opt)
        answer = input('Your answer: ').strip().upper()
    else:
        answer = input('Enter T for True or F for False: ').strip().upper()
        if answer in ['Y', 'N']:
            answer = 'T' if answer == 'Y' else 'F'
    return answer == q['answer'], answer


def run_quiz(questions):
    correct = 0
    incorrect = []
    for q in questions:
        is_correct, user_ans = ask_question(q)
        if is_correct:
            correct += 1
        else:
            incorrect.append((q, user_ans))
    score = int((correct / len(questions)) * 100)
    print(f"\nYou scored {score} out of 100!\n")
    if incorrect:
        print("Review your missed questions:")
        for i, (q, ua) in enumerate(incorrect, start=1):
            ca = q['answer']
            if q.get('options'):
                ca_text = re.sub(r'^([A-Z]\)\s*)', '', q['options'][ord(ca)-65])
                ua_text = (
                    re.sub(r'^([A-Z]\)\s*)', '', q['options'][ord(ua)-65])
                    if ua in ['A','B','C','D','E','F'] else ua
                )
                print(f"{i}. {q['question']}")
                print(f"   Correct Answer: {ca} {ca_text}")
                if ua_text:
                    print(f"   Your Answer: {ua} {ua_text}")
            else:
                correct_text = 'True' if ca == 'T' else 'False'
                ua_text = 'True' if ua == 'T' else 'False'
                print(f"{i}. {q['question']}")
                print(f"   Correct Answer: {correct_text}")
                print(f"   Your Answer: {ua_text}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 ez_quiz_cli.py <questions_file>")
        sys.exit(1)
    questions = load_questions_from_file(sys.argv[1])
    if not questions:
        print("No valid questions loaded.")
        sys.exit(1)
    run_quiz(questions)


if __name__ == '__main__':
    main()
