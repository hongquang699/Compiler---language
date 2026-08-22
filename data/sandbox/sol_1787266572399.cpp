#include <iostream>
#include <vector>
#include <algorithm>
#include <cmath>
#include <bits/stdc++.h>

using namespace std;

/**
 * @brief Giải bài toán Longest Increasing Subsequence (LIS) với độ phức tạp O(N log N).
 * 
 * Thuật toán sử dụng kỹ thuật duy trì mảng 'tails', trong đó tails[i] là giá trị 
 * nhỏ nhất có thể là phần tử cuối cùng của một dãy con tăng có độ dài i+1.
 * 
 * @param A Dãy số nguyên đầu vào.
 * @return int Độ dài của LIS.
 */
int solve_lis(const vector<long long>& A) {
    if (A.empty()) {
        return 0;
    }

    // 'tails' sẽ lưu trữ các phần tử cuối cùng nhỏ nhất của các LIS có độ dài tăng dần.
    // Mảng này luôn được sắp xếp tăng dần.
    vector<long long> tails;

    for (long long num : A) {
        // 1. Tìm vị trí: Tìm phần tử đầu tiên trong 'tails' >= num.
        // std::lower_bound trả về iterator đến phần tử này.
        // Nếu num nhỏ hơn tất cả, nó sẽ trỏ đến tails.begin().
        // Nếu num lớn hơn tất cả, nó sẽ trỏ đến tails.end().
        auto it = lower_bound(tails.begin(), tails.end(), num);

        if (it == tails.end()) {
            // Trường hợp 1: num lớn hơn tất cả các phần tử trong tails.
            // Nó mở rộng LIS hiện tại.
            tails.push_back(num);
        } else {
            // Trường hợp 2: num có thể thay thế một phần tử trong tails.
            // Ta thay thế *it bằng num. Điều này tạo ra một LIS mới có cùng độ dài 
            // nhưng phần tử cuối cùng nhỏ hơn hoặc bằng, giúp tăng cơ hội mở rộng sau này.
            *it = num;
        }
    }

    // Độ dài của mảng tails chính là độ dài của LIS.
    return tails.size();
}

int main() {
    // Tối ưu hóa I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int N;
    if (!(cin >> N)) return 0;

    // Sử dụng long long cho A[i] vì |A[i]| <= 10^9
    vector<long long> A(N);
    for (int i = 0; i < N; ++i) {
        cin >> A[i];
    }

    cout << solve_lis(A) << "\n";

    return 0;
}