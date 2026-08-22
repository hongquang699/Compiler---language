# Competitive Programmer's Handbook

## Purpose
Reference notes for competitive programming in C++17. Choose an algorithm from the input constraints, prove the invariant, and validate edge cases before coding.

## Complexity guide
- `O(1)`: direct formulas and constant-size state.
- `O(log n)`: binary search, doubling, balanced trees.
- `O(sqrt(n))`: block decomposition and square-root techniques.
- `O(n)`: one or a constant number of scans.
- `O(n log n)`: sorting, divide and conquer, ordered structures.
- `O(n^2)`: all pairs or quadratic dynamic programming.
- `O(2^n)`: subset enumeration; usually `n <= 20`.
- `O(n!)`: permutation enumeration; only very small `n`.

A one-second budget often permits approximately `10^8` simple operations, but constants, memory, and input/output still matter.

## C++ contest template
```cpp
#include <bits/stdc++.h>
using namespace std;

using ll = long long;
using i128 = __int128_t;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // solve the problem
}
```

Use `long long` for values near `2*10^9` or larger. Cast before multiplication, for example `(long long)a * a`. For modulo subtraction use `(x % mod + mod) % mod` when the result may be negative. Prefer `\\n` over `endl` in performance-sensitive code.

## Sorting and binary search
```cpp
sort(a.begin(), a.end());
auto first = lower_bound(a.begin(), a.end(), x);
auto after = upper_bound(a.begin(), a.end(), x);
int occurrences = int(after - first);
```

`lower_bound` returns the first value at least `x`; `upper_bound` returns the first value greater than `x`. For a monotone predicate, maintain the last invalid answer:
```cpp
long long lo = -1, hi = upper_bound;
while (hi - lo > 1) {
    long long mid = lo + (hi - lo) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
}
// hi is the first valid value
```

## Maximum subarray sum
Kadane's algorithm handles an empty subarray with answer zero:
```cpp
long long best = 0, current = 0;
for (long long value : a) {
    current = max(0LL, current + value);
    best = max(best, current);
}
```

## Subsets and permutations
```cpp
for (int mask = 0; mask < (1 << n); ++mask) {
    for (int bit = 0; bit < n; ++bit) {
        if (mask & (1 << bit)) {
            // element bit is selected
        }
    }
}
```

Enumerate submasks of `mask`:
```cpp
for (int sub = mask;; sub = (sub - 1) & mask) {
    // process sub
    if (sub == 0) break;
}
```

Use `next_permutation` for permutations in lexicographic order. Backtracking must undo every state mutation after the recursive call.

## Dynamic programming patterns
For minimum coins with unlimited use:
```cpp
const int INF = 1e9;
vector<int> dp(target + 1, INF);
dp[0] = 0;
for (int sum = 1; sum <= target; ++sum)
    for (int coin : coins)
        if (sum >= coin)
            dp[sum] = min(dp[sum], dp[sum - coin] + 1);
```

For 0/1 subset sum, iterate sums right-to-left:
```cpp
vector<char> possible(total + 1);
possible[0] = true;
for (int weight : weights)
    for (int sum = total - weight; sum >= 0; --sum)
        possible[sum + weight] |= possible[sum];
```

Grid path maximum:
`dp[y][x] = value[y][x] + max(dp[y-1][x], dp[y][x-1])` with explicit boundary handling. Edit distance uses insertion, deletion, and match/replace transitions and costs `O(nm)`.

## Two pointers and monotonic structures
Two pointers are linear when both endpoints only move forward. For positive values, maintain a window sum and expand the right endpoint while valid, then move the left endpoint.

Nearest smaller element uses a monotonic increasing stack:
```cpp
vector<int> previous_smaller(const vector<int>& a) {
    vector<int> answer(a.size(), -1);
    vector<int> stack;
    for (int i = 0; i < (int)a.size(); ++i) {
        while (!stack.empty() && a[stack.back()] >= a[i]) stack.pop_back();
        if (!stack.empty()) answer[i] = stack.back();
        stack.push_back(i);
    }
    return answer;
}
```

Sliding-window minimum uses a deque of indices with increasing values; remove expired indices from the front and dominated values from the back. Each index enters and leaves once, so the scan is `O(n)`.

## Range queries
Prefix sum: `prefix[0] = 0`, `sum(l, r) = prefix[r + 1] - prefix[l]` for a half-open interval `[l,r)`.

Fenwick tree, one-indexed:
```cpp
struct Fenwick {
    int n;
    vector<long long> tree;
    Fenwick(int n) : n(n), tree(n + 1) {}
    void add(int index, long long delta) {
        for (; index <= n; index += index & -index) tree[index] += delta;
    }
    long long sum(int index) const {
        long long result = 0;
        for (; index > 0; index -= index & -index) result += tree[index];
        return result;
    }
    long long range_sum(int left, int right) const {
        return sum(right) - sum(left - 1);
    }
};
```

A segment tree supports associative range operations and point updates in `O(log n)`. For lazy propagation, store the segment aggregate and pending update; push the pending update to children before descending. Sparse tables answer static idempotent min/max queries in `O(1)` after `O(n log n)` preprocessing.

## Graph algorithms
Adjacency list is the default representation:
```cpp
vector<vector<pair<int, int>>> graph(n + 1);
graph[u].push_back({v, weight});
```

- DFS/BFS: `O(n + m)`; BFS gives shortest edge-count distances in an unweighted graph.
- Topological sort: DFS finish order or Kahn's algorithm; a back edge / incomplete ordering proves a cycle.
- Dijkstra: non-negative weights, priority queue, `O((n+m) log n)`.
- Bellman-Ford: handles negative edges and detects reachable negative cycles in `O(nm)`.
- Floyd-Warshall: all-pairs shortest paths in `O(n^3)`; initialize diagonal to zero and absent edges to `INF`.
- Kruskal: sort edges and use DSU for a minimum spanning tree.
- DSU: union by size/rank plus path compression.
- Kosaraju: DFS finish order, reverse edges, then DFS in reverse finish order for SCCs.
- Maximum flow: residual edges, augmenting paths, and reverse capacity; Edmonds-Karp uses BFS.

Dijkstra template:
```cpp
const long long INF = (1LL << 62);
vector<long long> distance(n + 1, INF);
priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>> queue;
distance[source] = 0;
queue.push({0, source});
while (!queue.empty()) {
    auto [current_distance, node] = queue.top();
    queue.pop();
    if (current_distance != distance[node]) continue;
    for (auto [next, weight] : graph[node]) {
        if (distance[next] > current_distance + weight) {
            distance[next] = current_distance + weight;
            queue.push({distance[next], next});
        }
    }
}
```

## Trees
Root a tree with DFS and store `parent`, `depth`, and subtree sizes. Binary lifting stores `up[level][node]` and answers ancestors/LCA in `O(log n)`. For a rooted tree, `distance(a,b) = depth[a] + depth[b] - 2*depth[lca(a,b)]`.

Euler-tour entry/exit times turn each subtree into a contiguous interval. Combine this with a Fenwick or segment tree for subtree sums and updates. Tree diameter can be found by two BFS/DFS runs: farthest from an arbitrary node, then farthest from that endpoint.

## Number theory
Trial division tests primality and factors in `O(sqrt n)`. Sieve of Eratosthenes preprocesses primes up to `N` in `O(N log log N)`. Euclid's algorithm:
```cpp
long long gcd_value(long long a, long long b) {
    while (b != 0) {
        long long remainder = a % b;
        a = b;
        b = remainder;
    }
    return a;
}
```

`lcm(a,b) = a / gcd(a,b) * b`. Binary exponentiation computes `x^n mod m` in `O(log n)`. A modular inverse modulo prime `m` is `x^(m-2) mod m` when `x` is not divisible by `m`.

## Bit operations
Use `x & (1 << bit)` to test a bit, `x | (1 << bit)` to set it, `x & ~(1 << bit)` to clear it, and `x ^ (1 << bit)` to toggle it. `x & -x` isolates the least significant set bit. `__builtin_popcount` counts set bits in an unsigned integer.

## String algorithms
Polynomial rolling hash gives substring comparison in `O(1)` after `O(n)` preprocessing, but collisions are possible; use two independent moduli or a deterministic algorithm when correctness cannot tolerate probability. The Z-algorithm constructs the Z-array in `O(n)` and finds pattern occurrences by running it on `pattern + separator + text`.

## Geometry
For points `a=(x1,y1)` and `b=(x2,y2)`, cross product is `a.x*b.y - a.y*b.x`. Its sign determines left turn, collinearity, or right turn. Polygon area uses the shoelace formula:
`area = abs(sum(x[i]*y[i+1] - x[i+1]*y[i])) / 2`.

For Manhattan distance, transform `(x,y)` to `(x+y, y-x)`. Then the distance between two points is the maximum absolute difference in either transformed coordinate. Convex hull can be built in `O(n log n)` with Andrew's monotonic chain; while the last turn is not convex, remove the middle point.

## Verification checklist
1. Confirm the constraints fit the selected complexity and integer types.
2. Define the invariant for each loop or data structure.
3. Test empty, singleton, duplicate, sorted, reverse-sorted, disconnected, and boundary inputs.
4. Check overflow before multiplication and `INF` additions.
5. Compile with `-std=c++17 -O2 -Wall -Wextra` and run representative tests.
