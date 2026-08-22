# Disjoint Set Union (DSU) / Union-Find

Cấu trúc DSU hỗ trợ 2 thao tác chính trong $\mathcal{O}(\alpha(N)) \approx \mathcal{O}(1)$:
1. `find(u)`: Tìm đỉnh đại diện tập hợp của `u` kèm nén đường đi (Path Compression).
2. `unite(u, v)`: Hợp nhất hai tập hợp theo kích thước (Union by Size/Rank).

```cpp
struct DSU {
    int n;
    vector<int> parent, sz;

    DSU(int n) : n(n), parent(n + 1), sz(n + 1, 1) {
        for (int i = 1; i <= n; ++i) parent[i] = i;
    }

    int find(int u) {
        if (parent[u] == u) return u;
        return parent[u] = find(parent[u]); // Path compression
    }

    bool unite(int u, int v) {
        u = find(u);
        v = find(v);
        if (u == v) return false;
        if (sz[u] < sz[v]) swap(u, v);
        parent[v] = u;
        sz[u] += sz[v];
        return true;
    }

    bool same(int u, int v) {
        return find(u) == find(v);
    }

    int size(int u) {
        return sz[find(u)];
    }
};
```
Ứng dụng: Thuật toán Kruskal tìm cây khung nhỏ nhất (MST), kiểm tra chu trình đồ thị, đếm thành phần liên thông động.
