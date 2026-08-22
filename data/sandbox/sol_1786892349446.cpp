#include <iostream>
#include <vector>
#include <algorithm>
#include <cmath>

/**
 * @brief Giải bài toán Longest Increasing Subsequence (LIS) bằng phương pháp O(N log N).
 * 
 * Sử dụng kỹ thuật duy trì mảng 'tails' (các phần tử nhỏ nhất kết thúc của 
 * các dãy con tăng có độ dài khác nhau) và Binary Search (std::lower_bound) 
 * để đạt độ phức tạp tối ưu.
 */
void solve() {
    // Tăng tốc độ I/O
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    int N;
    if (!(std::cin >> N)) return;

    // A_i có thể lên đến 10^9, dùng int là đủ (32-bit signed integer)
    std::vector<int> A(N);
    for (int i = 0; i < N; ++i) {
        std::cin >> A[i];
    }

    // 'tails' sẽ lưu trữ các phần tử nhỏ nhất kết thúc của các dãy con tăng 
    // có độ dài 1, 2, 3, ...
    std::vector<int> tails;

    for (int x : A) {
        // 1. Tìm vị trí chèn/thay thế: 
        // lower_bound tìm phần tử đầu tiên >= x.
        // Nếu x lớn hơn tất cả các phần tử trong tails, nó sẽ trả về tails.end().
        auto it = std::lower_bound(tails.begin(), tails.end(), x);

        if (it == tails.end()) {
            // Trường hợp 1: x lớn hơn tất cả các phần tử trong tails.
            // Mở rộng LIS dài nhất hiện tại.
            tails.push_back(x);
        } else {
            // Trường hợp 2: x thay thế phần tử *it.
            // *it là phần tử nhỏ nhất >= x. 
            // Thay thế *it bằng x giúp ta tạo ra một dãy con tăng mới 
            // có cùng độ dài nhưng có phần tử kết thúc nhỏ hơn, tối ưu hơn.
            *it = x;
        }
    }

    // Độ dài của mảng tails chính là độ dài LIS.
    std::cout << tails.size() << "\n";
}

int main() {
    solve();
    return 0;
}