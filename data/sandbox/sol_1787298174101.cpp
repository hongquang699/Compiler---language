#include <iostream>
#include <vector>
#include <numeric>
#include <algorithm>

using namespace std;

// Sử dụng long long cho các phần tử để đảm bảo an toàn khi xử lý giá trị lên đến 10^9
typedef long long ll;

/**
 * @brief Hàm giải quyết bài toán kiểm tra cấp số cộng.
 * 
 * Độ phức tạp thời gian: O(N)
 * Độ phức tạp không gian: O(N)
 */
void solve() {
    // Tăng tốc độ I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int n;
    // Đọc số lượng phần tử N
    if (!(cin >> n)) return;

    vector<ll> a(n);
    // Đọc dãy số
    for (int i = 0; i < n; ++i) {
        if (!(cin >> a[i])) return;
    }

    // 1. Xử lý trường hợp cơ sở N <= 1
    if (n <= 1) {
        cout << "yes\n";
        if (n == 1) {
            cout << a[0] << "\n";
        } else {
            // Trường hợp N=0
            cout << "\n"; 
        }
        return;
    }

    // 2. Xác định công sai d
    // Công sai d phải bằng a[1] - a[0]
    ll common_difference = a[1] - a[0];
    
    // 3. Kiểm tra tính đồng nhất
    bool is_ap = true;
    // Bắt đầu từ i=1, kiểm tra hiệu số giữa a[i+1] và a[i]
    for (int i = 1; i < n - 1; ++i) {
        // Kiểm tra xem a[i+1] - a[i] có bằng common_difference không
        if (a[i+1] - a[i] != common_difference) {
            is_ap = false;
            break;
        }
    }

    // 4. Xuất kết quả
    if (is_ap) {
        cout << "yes\n";
        // In lại toàn bộ dãy số
        for (int i = 0; i < n; ++i) {
            cout << a[i] << (i == n - 1 ? "" : " ");
        }
        cout << "\n";
    } else {
        cout << "no\n";
    }
}

int main() {
    // Theo yêu cầu đề bài, nếu chạy từ file:
    // freopen("capsocong.inp", "r", stdin);
    // freopen("capsocong.out", "w", stdout);
    
    solve();
    return 0;
}