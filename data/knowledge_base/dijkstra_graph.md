# Dijkstra Shortest Path Algorithm (Priority Queue)

Tìm đường đi ngắn nhất từ một đỉnh nguồn tới tất cả các đỉnh trong đồ thị có trọng số không âm. Độ phức tạp: $\mathcal{O}((V + E) \log V)$.

```cpp
#include <bits/stdc++.h>
using namespace std;

typedef pair<long long, int> pli; // {distance, vertex}
const long long INF = 1e18;

vector<long long> dijkstra(int start_node, int n, const vector<vector<pair<int, long long>>>& adj) {
    vector<long long> dist(n + 1, INF);
    priority_queue<pli, vector<pli>, greater<pli>> pq;

    dist[start_node] = 0;
    pq.push({0, start_node});

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();

        if (d > dist[u]) continue; // Bỏ qua đỉnh đã được tối ưu trước đó

        for (auto& edge : adj[u]) {
            int v = edge.first;
            long long w = edge.second;
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    return dist;
}
```
