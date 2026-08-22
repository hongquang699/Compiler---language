#include <iostream>
#include <vector>
#include <algorithm>
#include <cmath>

/**
 * @brief Hàm tính độ dài Dãy con tăng dài nhất (LIS) bằng phương pháp O(N log N).
 * 
 * Phương pháp này sử dụng một mảng 'tails' để lưu trữ phần tử nhỏ nhất 
 * kết thúc cho các dãy con tăng có độ dài tương ứng.
 * 
 * @param nums Mảng đầu vào.
 * @return int Độ dài LIS.
 */
int lengthOfLIS(const std::vector<long long>& nums) {
    if (nums.empty()) {
        return 0;
    }

    // 'tails' sẽ lưu trữ các phần tử kết thúc nhỏ nhất cho các dãy con tăng 
    // có độ dài 1, 2, 3, ...
    // Mảng này luôn được sắp xếp tăng dần.
    // Sử dụng long long để đảm bảo tính nhất quán với kiểu dữ liệu input.
    std::vector<long long> tails;

    for (long long num : nums) {
        // Tìm vị trí chèn (iterator) của 'num' trong 'tails' 
        // sao cho nó là phần tử đầu tiên >= num.
        // std::lower_bound trả về iterator đến phần tử đầu tiên không nhỏ hơn 'num'.
        auto it = std::lower_bound(tails.begin(), tails.end(), num);

        if (it == tails.end()) {
            // Trường hợp 1: 'num' lớn hơn tất cả các phần tử trong 'tails'.
            // Mở rộng LIS hiện tại.
            tails.push_back(num);
        } else {
            // Trường hợp 2: 'num' nhỏ hơn hoặc bằng phần tử tại vị trí *it.
            // Thay thế *it bằng 'num' để tối ưu hóa giá trị kết thúc.
            *it = num;
        }
    }

    // Độ dài của mảng 'tails' chính là độ dài LIS.
    return tails.size();
}

int main() {
    // Tối ưu hóa I/O cho môi trường thi đấu
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    // 1. Đọc số lượng phần tử N
    int N;
    if (!(std::cin >> N)) {
        // Xử