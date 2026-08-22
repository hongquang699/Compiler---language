import sys
data = sys.stdin.read().split()
if data:
    a, b = map(int, data)
    print(a + b)
