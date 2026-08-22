#include <iostream>
#include <vector>
#include <algorithm>
#include <cmath>

using namespace std;

/**
 * @brief Hàm giải quyết bài toán Longest Increasing Subsequence (LIS)
 * 
 * Sử dụng phương pháp O(N log N) với Binary Search.
 * 
 * @param N Kích thước của dãy.
 * @param A Dãy số nguyên đầu vào.
 * @return int Độ dài LIS.
 */
int solve_lis(int N, const vector<long long>& A) {
    // 'tails' sẽ lưu trữ các phần tử cuối cùng (tail) nhỏ nhất 
    // của tất cả các dãy con tăng có độ dài tương ứng với chỉ số.
    // tails[i] là phần tử cuối nhỏ nhất của LIS có độ dài i+1.
    vector<long long> tails;

    for (long long num : A) {
        // 1. Tìm kiếm nhị phân: Tìm phần tử đầu tiên trong 'tails' 
        //    lớn hơn hoặc bằng 'num'.
        //    std::lower_bound trả về iterator đến vị trí này.
        auto it = lower_bound(tails.begin(), tails.end(), num);

        if (it == tails.end()) {
            // Trường hợp 1: 'num' lớn hơn tất cả các phần tử hiện tại trong 'tails'.
            // Điều này có nghĩa là 'num' mở rộng LIS dài nhất hiện tại.
            tails.push_back(num);
        } else {
            // Trường hợp 2: Thay thế phần tử tại vị trí *it.
            // Chúng ta tìm thấy một LIS có độ dài bằng *it - tails.begin() + 1,
            // nhưng với phần tử cuối nhỏ hơn (là 'num'), điều này luôn tối ưu.
            *it = num;
        }
    }

    // Độ dài của vector 'tails' chính là độ dài LIS.
    return tails.size();
}

int main() {
    // Tối ưu hóa I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int N;
    if (!(cin >> N)) return 0;

    // Sử dụng long long cho các phần tử A_i vì |A_i| <= 10^9, 
    // mặc dù int (32-bit) là đủ, long long đảm bảo an toàn tuyệt đối.
    vector<long long> A(N);
    for (int i = 0; i < N; ++i) {
        cin >> A[i];
    }

    cout << solve_lis(N, A) << "\n";

    return 0;
}