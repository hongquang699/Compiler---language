#include <iostream>
#include <vector>
#include <algorithm>
#include <cmath>

using namespace std;

/**
 * @brief Giải bài toán Longest Increasing Subsequence (LIS) bằng phương pháp O(N log N).
 * 
 * @param A Dãy số nguyên đầu vào.
 * @return int Độ dài của LIS.
 */
int solve_lis(const vector<int>& A) {
    // 'tails' lưu trữ các phần tử nhỏ nhất có thể là phần tử cuối cùng 
    // của một dãy con tăng có độ dài tương ứng với chỉ số của nó.
    // tails[i] là phần tử cuối nhỏ nhất của LIS có độ dài i+1.
    vector<int> tails;

    for (int x : A) {
        // 1. Tìm kiếm nhị phân: Tìm phần tử đầu tiên trong 'tails' >= x.
        // std::lower_bound trả về iterator đến vị trí này.
        auto it = lower_bound(tails.begin(), tails.end(), x);

        if (it == tails.end()) {
            // Trường hợp 1: x lớn hơn tất cả các phần tử hiện tại trong tails.
            // x mở rộng LIS hiện tại, tăng độ dài lên 1.
            tails.push_back(x);
        } else {
            // Trường hợp 2: x thay thế một phần tử T[k] tại vị trí *it.
            // Vì x <= *it, việc thay thế này tạo ra một LIS mới có cùng độ dài 
            // nhưng phần tử cuối nhỏ hơn, tối ưu hóa cho các bước sau.
            *it = x;
        }
    }

    // Kích thước cuối cùng của vector tails chính là độ dài LIS.
    return tails.size();
}

int main() {
    // Tối ưu hóa I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int N;
    if (!(cin >> N)) return 0;

    // Sử dụng vector<int> vì |Ai| <= 10^9, vẫn nằm trong giới hạn của int 32-bit.
    vector<int> A(N);
    for (int i = 0; i < N; ++i) {
        cin >> A[i];
    }

    cout << solve_lis(A) << "\n";

    return 0;
}