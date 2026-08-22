# Python 3 Competitive Programming Template & Tricks

Python rất mạnh về toán học, xử lý chuỗi và số nguyên lớn vô hạn bit (BigInt). Để tránh bị TLE trên các trang chấm (Codeforces, VNOI, LeetCode), cần áp dụng các kỹ thuật sau:

```python
import sys

# Fast I/O
input = sys.stdin.readline

# Tránh RecursionError khi DFS sâu
sys.setrecursionlimit(300000)

def solve():
    # Đọc nhanh toàn bộ file nếu cần
    # data = sys.stdin.read().split()
    pass

if __name__ == '__main__':
    solve()
```

### 1. Tìm kiếm nhị phân (Binary Search):
```python
import bisect
# bisect_left(arr, x) tương đương std::lower_bound
# bisect_right(arr, x) tương đương std::upper_bound
```

### 2. Hàng đợi ưu tiên (Min-Heap / Max-Heap):
```python
import heapq
pq = []
heapq.heappush(pq, (cost, u)) # Min-heap
cost, u = heapq.heappop(pq)
```

### 3. DSU / Disjoint Set Union trong Python:
```python
class DSU:
    def __init__(self, n):
        self.parent = list(range(n + 1))
        self.sz = [1] * (n + 1)
        
    def find(self, i):
        if self.parent[i] == i:
            return i
        self.parent[i] = self.find(self.parent[i])
        return self.parent[i]
        
    def unite(self, i, j):
        root_i = self.find(i)
        root_j = self.find(j)
        if root_i != root_j:
            if self.sz[root_i] < self.sz[root_j]:
                root_i, root_j = root_j, root_i
            self.parent[root_j] = root_i
            self.sz[root_i] += self.sz[root_j]
            return True
        return False
```
