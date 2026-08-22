#include <iostream>
#include <vector>
#include <algorithm>
#include <cmath>

using namespace std;

/**
 * @brief Hàm giải quyết bài toán Longest Increasing Subsequence (LIS)
 * 
 * Sử dụng kỹ thuật Patience Sorting và Binary Search để đạt độ phức tạp O(N log N).
 * 
 * @param N Kích thước của dãy.
 * @param A Dãy số nguyên đầu vào.
 * @return int Độ dài của LIS.
 */
int solve_lis(int N, const vector<long long>& A) {
    // 'tails' sẽ lưu trữ các phần tử cuối cùng (tail) của các dãy con tăng
    // có độ dài tăng dần. tails[i] là phần tử cuối nhỏ nhất của mọi LIS có độ dài i+1.
    vector<long long> tails;

    for (long long num : A) {
        // 1. Tìm kiếm nhị phân: Tìm phần tử đầu tiên trong 'tails' >= num.
        // std::lower_bound trả về iterator trỏ đến vị trí này.
        auto it = lower_bound(tails.begin(), tails.end(), num);

        if (it == tails.end()) {
            // Trường hợp 1: num lớn hơn tất cả các phần tử trong tails.
            // Nó mở rộng LIS dài nhất hiện tại.
            tails.push_back(num);
        } else {
            // Trường hợp 2: num có thể thay thế một phần tử trong tails.
            // Ta thay thế *it bằng num. Điều này giúp duy trì phần tử cuối nhỏ nhất 
            // cho độ dài dãy con này, tối ưu cho các lần lặp sau.
            *it = num;
        }
    }

    // Kích thước của vector 'tails' chính là độ dài của LIS.
    return tails.size();
}

int main() {
    // Tăng tốc độ I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int N;
    if (!(cin >> N)) return 0;

    // Sử dụng long long cho các phần tử A_i vì |A_i| <= 10^9
    vector<long long> A(N);
    for (int i = 0; i < N; ++i) {
        cin >> A[i];
    }

    cout << solve_lis(N, A) << "\n";

    return 0;
}