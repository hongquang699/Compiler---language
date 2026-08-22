# Segment Tree with Point Update & Range Sum / Min Query

Cây phân đoạn (Segment Tree) cho phép thực hiện truy vấn đoạn và cập nhật điểm trong thời gian $\mathcal{O}(\log N)$.

```cpp
struct SegmentTree {
    int n;
    vector<long long> tree;

    SegmentTree(int n) : n(n), tree(4 * n + 5, 0) {}

    void build(const vector<long long>& a, int id, int l, int r) {
        if (l == r) {
            tree[id] = a[l];
            return;
        }
        int mid = (l + r) / 2;
        build(a, 2 * id, l, mid);
        build(a, 2 * id + 1, mid + 1, r);
        tree[id] = tree[2 * id] + tree[2 * id + 1]; // or min/max
    }

    void update(int id, int l, int r, int pos, long long val) {
        if (l == r) {
            tree[id] = val;
            return;
        }
        int mid = (l + r) / 2;
        if (pos <= mid) update(2 * id, l, mid, pos, val);
        else update(2 * id + 1, mid + 1, r, pos, val);
        tree[id] = tree[2 * id] + tree[2 * id + 1];
    }

    long long query(int id, int l, int r, int u, int v) {
        if (v < l || r < u) return 0; // Giá trị trung hòa (0 cho sum, INF cho min)
        if (u <= l && r <= v) return tree[id];
        int mid = (l + r) / 2;
        return query(2 * id, l, mid, u, v) + query(2 * id + 1, mid + 1, r, u, v);
    }
};
```
