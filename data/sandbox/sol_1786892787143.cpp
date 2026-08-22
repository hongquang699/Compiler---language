#include <iostream>
#include <vector>
#include <algorithm>
#include <cmath>

using namespace std;

/**
 * @brief Hàm giải quyết bài toán Longest Increasing Subsequence (LIS)
 * 
 * Sử dụng phương pháp tối ưu O(N log N) bằng cách duy trì mảng 'tails'.
 * 'tails[i]' lưu trữ giá trị nhỏ nhất của tất cả các dãy con tăng có độ dài i+1.
 * 
 * @param arr Mảng đầu vào chứa các phần tử cần xét.
 * @return int Độ dài của dãy con tăng dài nhất.
 */
int solve_lis(const vector<long long>& arr) {
    if (arr.empty()) {
        return 0;
    }

    // 'tails' sẽ lưu trữ các phần tử cuối cùng (tails) của các dãy con tăng 
    // có độ dài tăng dần. Mảng này luôn được sắp xếp tăng dần.
    vector<long long> tails;

    for (long long num : arr) {
        // Tìm vị trí đầu tiên (iterator) trong 'tails' mà giá trị >= num.
        // std::lower_bound trả về iterator đến phần tử đầu tiên không nhỏ hơn 'num'.
        auto it = lower_bound(tails.begin(), tails.end(), num);

        if (it == tails.end()) {
            // Trường hợp 1: num lớn hơn tất cả các phần tử trong 'tails'.
            // Ta mở rộng dãy con tăng dài nhất hiện tại bằng cách thêm num vào cuối.
            tails.push_back(num);
        } else {
            // Trường hợp 2: num nhỏ hơn hoặc bằng *it.
            // Ta thay thế *it bằng num. Điều này giúp ta tạo ra một dãy con tăng 
            // có cùng độ dài nhưng có phần tử cuối nhỏ hơn (tối ưu hơn cho các bước sau).
            *it = num;
        }
    }

    // Kích thước của mảng 'tails' chính là độ dài của LIS.
    return tails.size();
}

void solve() {
    // Tăng tốc độ I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int N;
    // Đọc số lượng phần tử
    if (!(cin >> N)) return;

    vector<long long> A(N);
    // Đọc các phần tử A_i. Sử dụng long long vì giá trị có thể lên đến 10^9.
    for (int i = 0; i < N; ++i) {
        cin >> A[i];
    }

    // Tính toán và in kết quả
    int lis_length = solve_lis(A);
    cout << lis_length << endl;
}

int main() {
    solve();
    return 0;
}