#include <iostream>
#include <vector>
#include <algorithm>
#include <cmath>

using namespace std;

// Sử dụng long long cho các phần tử để đảm bảo an toàn khi xử lý giá trị lên đến 10^9
typedef long long ll;

/**
 * @brief Hàm giải quyết bài toán kiểm tra cấp số cộng.
 * 
 * Logic: Sắp xếp dãy số đầu vào, sau đó kiểm tra xem dãy đã sắp xếp có phải là cấp số cộng hay không.
 * 
 * Độ phức tạp thời gian: O(N log N) do bước sắp xếp.
 * Độ phức tạp không gian: O(N).
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

    // 1. Xử lý trường hợp cơ sở N <= 2
    // Bất kỳ dãy số nào có 0, 1 hoặc 2 phần tử đều là cấp số cộng.
    if (n <= 2) {
        cout << "yes\n";
        // In lại toàn bộ dãy số (không cần sắp xếp nếu N <= 2 vì việc in ra dãy số gốc là đủ)
        // Tuy nhiên, để đảm bảo tính nhất quán với kết quả mong đợi (dãy AP), ta nên in ra dãy đã sắp xếp.
        // Nhưng vì đề bài chỉ yêu cầu in dãy số cấp số cộng nếu có, và dãy đã sắp xếp chính là dãy đó.
        
        // Sắp xếp để in ra thứ tự AP chuẩn
        sort(a.begin(), a.end());
        for (int i = 0; i < n; ++i) {
            cout << a[i] << (i == n - 1 ? "" : " ");
        }
        cout << "\n";
        return;
    }

    // 2. BƯỚC QUAN TRỌNG: Sắp xếp dãy số để tìm thứ tự AP
    sort(a.begin(), a.end());

    // 3. Xác định công sai d
    // Công sai d phải bằng a[1] - a[0]
    ll common_difference = a[1] - a[0];
    
    // 4. Kiểm tra tính đồng nhất
    bool is_ap = true;
    // Bắt đầu từ i=2 (phần tử thứ 3), kiểm tra hiệu số giữa a[i] và a[i-1]
    for (int i = 2; i < n; ++i) {
        // Kiểm tra xem a[i] - a[i-1] có bằng common_difference không
        if (a[i] - a[i-1] != common_difference) {
            is_ap = false;
            break;
        }
    }

    // 5. Xuất kết quả
    if (is_ap) {
        cout << "yes\n";
        // In lại toàn bộ dãy số đã sắp xếp (là dãy AP)
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