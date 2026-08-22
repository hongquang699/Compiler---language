#include <iostream>
#include <vector>
#include <algorithm>
#include <cmath>

using namespace std;

/**
 * @brief Giải bài toán Longest Increasing Subsequence (LIS)
 * 
 * Sử dụng kỹ thuật Patience Sorting (duy trì mảng tails) kết hợp Binary Search.
 * Độ phức tạp thời gian: O(N log N).
 * 
 * @param arr Mảng đầu vào.
 * @return int Độ dài của LIS.
 */
int lengthOfLIS(const vector<int>& arr) {
    if (arr.empty()) {
        return 0;
    }

    // tails[i] lưu trữ giá trị NHỎ NHẤT của đuôi (tail) của tất cả 
    // các dãy con tăng có độ dài i+1 được tìm thấy cho đến thời điểm hiện tại.
    vector<int> tails;

    for (int num : arr) {
        // 1. Tìm vị trí thích hợp nhất cho 'num' trong 'tails'.
        // Vị trí này là phần tử đầu tiên trong 'tails' mà giá trị của nó 
        // lớn hơn hoặc bằng 'num'.
        
        // std::lower_bound trả về một iterator trỏ đến phần tử đầu tiên 
        // không nhỏ hơn 'num'.
        auto it = lower_bound(tails.begin(), tails.end(), num);

        // 2. Xử lý kết quả tìm kiếm:
        
        if (it == tails.end()) {
            // Trường hợp 1: 'num' lớn hơn tất cả các phần tử trong 'tails'.
            // Điều này có nghĩa là 'num' mở rộng LIS hiện tại.
            tails.push_back(num);
        } else {
            // Trường hợp 2: Tìm thấy vị trí *it.
            // Ta thay thế *it bằng 'num'. Điều này có nghĩa là ta tìm thấy 
            // một dãy con tăng mới có độ dài bằng vị trí này, nhưng có đuôi nhỏ hơn (là 'num'), 
            // giúp tăng cơ hội mở rộng LIS sau này.
            *it = num;
        }
    }

    // Độ dài của LIS chính là kích thước của vector tails.
    return tails.size();
}

int main() {
    // Tăng tốc độ I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int N;
    cout << "Nhap so luong phan tu N: ";
    if (!(cin >> N)) return 0;

    vector<int> A(N);
    cout << "Nhap cac phan tu cua mang: ";
    for (int i = 0; i < N; ++i) {
        cin >> A[i];
    }

    int lis_length = lengthOfLIS(A);

    cout << "\n--------------------------------------------------\n";
    cout << "Do dai cua Longest Increasing Subsequence (LIS) la: " << lis_length << endl;
    cout << "--------------------------------------------------\n";

    return 0;
}