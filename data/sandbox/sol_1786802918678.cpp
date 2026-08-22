#include <iostream>
#include <vector>
#include <algorithm>
#include <cmath>

using namespace std;

/**
 * @brief Giải bài toán Longest Increasing Subsequence (LIS)
 * 
 * Sử dụng kỹ thuật Tails Array kết hợp với Binary Search (std::lower_bound)
 * để đạt độ phức tạp thời gian O(N log N).
 */
void solve() {
    // Tăng tốc độ I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int N;
    if (!(cin >> N)) return;

    // Sử dụng long long cho các phần tử A_i vì |A_i| <= 10^9
    vector<long long> A(N);
    for (int i = 0; i < N; ++i) {
        cin >> A[i];
    }

    // 'tails' sẽ lưu trữ các phần tử cuối cùng (tails) của tất cả các LIS 
    // có độ dài tăng dần. tails[i] là phần tử nhỏ nhất kết thúc một LIS độ dài i+1.
    vector<long long> tails;

    for (long long current_element : A) {
        // 1. Tìm vị trí thích hợp để chèn current_element.
        // std::lower_bound tìm phần tử đầu tiên >= current_element.
        // Đây chính là phần tử mà current_element có thể thay thế để tạo ra 
        // một LIS mới có cùng độ dài nhưng phần tử cuối nhỏ hơn.
        auto it = lower_bound(tails.begin(), tails.end(), current_element);

        if (it == tails.end()) {
            // Trường hợp 1: current_element lớn hơn tất cả các tails hiện tại.
            // Nó mở rộng LIS dài nhất hiện tại lên 1.
            tails.push_back(current_element);
        } else {
            // Trường hợp 2: current_element thay thế *it.
            // *it là phần tử nhỏ nhất >= current_element.
            // Bằng cách thay thế *it bằng current_element, ta giữ nguyên độ dài 
            // của LIS nhưng làm cho phần tử cuối nhỏ hơn, giúp tăng cơ hội 
            // mở rộng LIS này sau này.
            *it = current_element;
        }
    }

    // Độ dài của mảng 'tails' chính là độ dài của LIS.
    cout << tails.size() << "\n";
}

int main() {
    solve();
    return 0;
}