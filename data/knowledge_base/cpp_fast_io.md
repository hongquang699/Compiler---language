# C++ Fast I/O and Standard Competitive Programming Template

Khi giải bài trên các nền tảng Competitive Programming (Codeforces, AtCoder, VNOI, LeetCode), việc tối ưu I/O là bắt buộc để tránh bị TLE (Time Limit Exceeded) khi số lượng phần tử $N \ge 10^5$.

```cpp
#include <bits/stdc++.h>
using namespace std;

#define fast_io ios_base::sync_with_stdio(false); cin.tie(NULL); cout.tie(NULL)
#define ll long long
#define all(x) (x).begin(), (x).end()
#define pb push_back
#define fi first
#define se second

const int MOD = 1e9 + 7;
const ll INF = 1e18;

void solve() {
    // Logic bài toán
}

int main() {
    fast_io;
    int t = 1;
    // cin >> t; // Bỏ comment nếu bài có nhiều test cases
    while (t--) {
        solve();
    }
    return 0;
}
```

### Lưu ý tránh TLE / Bug:
1. Dùng `\n` thay vì `endl` vì `endl` ép xả buffer (`flush`) khiến tốc độ chậm đi hàng chục lần.
2. Với các phép cộng trừ modulo có thể ra âm: `(a - b) % MOD` phải viết là `((a - b) % MOD + MOD) % MOD`.
3. Số lớn vượt quá $2 \times 10^9$ phải dùng `long long` hoặc `__int128_t`.
