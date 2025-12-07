
import re

filename = 'main.js'
with open(filename, 'r') as f:
    text = f.read()

# Mask comments to preserve formatting/indices but ignore content
def mask_comments(text):
    # Mask // comments
    text = re.sub(r'//.*', lambda m: ' ' * len(m.group(0)), text)
    # Mask /* */ comments (simple check)
    pattern = re.compile(r'/\*.*?\*/', re.DOTALL)
    text = pattern.sub(lambda m: ' ' * len(m.group(0)), text)
    return text

masked_text = mask_comments(text)

stack = []
lines = masked_text.split('\n')
for i, line in enumerate(lines):
    for j, char in enumerate(line):
        if char in '({[':
            stack.append((char, i + 1, j + 1))
        elif char in ')}]':
            if not stack:
                print(f"Error: Unexpected closing {char} at line {i+1} col {j+1}")
            else:
                last, r, c = stack.pop()
                matches = {'(': ')', '{': '}', '[': ']'}
                if matches[last] != char:
                    print(f"Error: Mismatched {char} at line {i+1} col {j+1}. Expected closing for {last} from line {r} col {c}")

if stack:
    print("Error: Unclosed items at end of file:")
    for item in stack:
        print(f"  {item[0]} from line {item[1]} col {item[2]}")
else:
    print("Syntax Balanced OK")
