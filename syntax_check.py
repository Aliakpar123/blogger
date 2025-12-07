
filename = 'main.js'
with open(filename, 'r') as f:
    text = f.read()

stack = []
lines = text.split('\n')
for i, line in enumerate(lines):
    for j, char in enumerate(line):
        if char in '({[':
            stack.append((char, i + 1, j + 1))
        elif char in ')}]':
            if not stack:
                print(f"Error: Unexpected closing {char} at line {i+1} col {j+1}")
                exit(1)
            last, r, c = stack.pop()
            matches = {'(': ')', '{': '}', '[': ']'}
            if matches[last] != char:
                print(f"Error: Mismatched {char} at line {i+1} col {j+1}. Expected closing fo {last} from line {r} col {c}")
                exit(1)

if stack:
    print("Error: Unclosed items at end of file:")
    for item in stack:
        print(f"  {item[0]} from line {item[1]} col {item[2]}")
else:
    print("Syntax Balanced OK")
