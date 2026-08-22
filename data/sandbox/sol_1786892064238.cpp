#include <iostream>
#include <vector>
#include <algorithm>
#include <cmath>

/**
 * @brief Tính độ dài của dãy con tăng dài nhất (LIS) bằng phương pháp Tails Array (Binary Search).
 * 
 * Độ phức tạp thời gian: O(N log N)
 * Độ phức tạp không gian: O(N)
 * 
 * @param nums Mảng đầu vào.
 * @return int Độ dài LIS.
 */
int lengthOfLIS(const std::vector<int>& nums) {
    if (nums.empty()) {
        return 0;
    }

    // 'tails' sẽ lưu trữ các phần tử nhỏ nhất kết thúc của các dãy con tăng có độ dài khác nhau.
    // tails[i] là phần tử nhỏ nhất kết thúc của một LIS có độ dài i+1.
    std::vector<int> tails;

    for (int num : nums) {
        // Tìm vị trí đầu tiên (iterator) mà giá trị >= num
        // std::lower_bound trả về iterator đến phần tử đầu tiên không nhỏ hơn 'num'.
        auto it = std::lower_bound(tails.begin(), tails.end(), num);

        if (it == tails.end()) {
            // Trường hợp 1: num lớn hơn tất cả các phần tử trong tails.
            // Điều này có nghĩa là chúng ta tìm thấy một LIS mới dài hơn 1 đơn vị.
            tails.push_back(num);
        } else {
            // Trường hợp 2: num nhỏ hơn hoặc bằng *it.
            // Chúng ta có thể thay thế *it bằng num, vì num sẽ tạo ra một LIS 
            // có cùng độ dài nhưng kết thúc bằng một số nhỏ hơn, giúp tăng cơ hội mở rộng sau này.
            *it = num;
        }
    }

    // Kích thước của vector 'tails' chính là độ dài của LIS.
    return tails.size();
}

int main() {
    // Ví dụ 1: Test case cơ bản
    std::vector<int> nums1 = {10, 9, 2, 5, 3, 7, 101, 18};
    std::cout << "Test Case 1: {10, 9, 2, 5, 3, 7, 101, 18}" << std::endl;
    std::cout << "LIS Length: " << lengthOfLIS(nums1) << std::endl; // Output: 7 (2, 3, 7, 18 hoặc 2, 5, 7, 101...)

    std::cout << "----------------------------------------" << std::endl;

    // Ví dụ 2: Dãy tăng
    std::vector<int> nums2 = {1, 2, 3, 4, 5};
    std::cout << "Test Case 2: {1, 2, 3, 4, 5}" << std::endl;
    std::cout << "LIS Length: " << lengthOfLIS(nums2) << std::endl; // Output: 5

    std::cout << "----------------------------------------" << std::endl;

    // Ví dụ 3: Dãy giảm
    std::vector<int> nums3 = {5, 4, 3, 2, 1};
    std::cout << "Test Case 3: {5, 4, 3, 2, 1}" << std::endl;
    std::cout << "LIS Length: " << lengthOfLIS(nums3) << std::endl; // Output: 1

    return 0;
}