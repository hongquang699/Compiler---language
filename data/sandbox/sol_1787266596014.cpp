#include <iostream>
#include <vector>
#include <algorithm>
#include <cmath>

/**
 * @brief Tính độ dài của Dãy con tăng dài nhất (LIS) trong một mảng số nguyên.
 * 
 * Sử dụng thuật toán tối ưu O(N log N) bằng cách duy trì một mảng 'tails' 
 * lưu trữ phần tử cuối cùng nhỏ nhất của tất cả các LIS có độ dài tương ứng.
 * 
 * @param nums Mảng đầu vào.
 * @return int Độ dài của LIS.
 */
int lengthOfLIS(const std::vector<int>& nums) {
    if (nums.empty()) {
        return 0;
    }

    // 'tails' sẽ lưu trữ các phần tử cuối cùng của các LIS có độ dài tăng dần.
    // tails[i] là phần tử cuối cùng nhỏ nhất của một LIS có độ dài i+1.
    std::vector<int> tails;

    for (int num : nums) {
        // Tìm vị trí đầu tiên (iterator) mà giá trị >= num
        // std::lower_bound trả về iterator đến phần tử đầu tiên không nhỏ hơn num.
        auto it = std::lower_bound(tails.begin(), tails.end(), num);

        if (it == tails.end()) {
            // Trường hợp 1: num lớn hơn tất cả các phần tử trong tails.
            // Điều này có nghĩa là num có thể mở rộng LIS hiện tại (tăng độ dài LIS lên 1).
            tails.push_back(num);
        } else {
            // Trường hợp 2: num nhỏ hơn hoặc bằng phần tử *it.
            // Ta thay thế *it bằng num. Việc này tối ưu vì nó tạo ra một LIS mới 
            // có cùng độ dài nhưng phần tử cuối cùng nhỏ hơn hoặc bằng, giúp tăng khả năng mở rộng LIS trong tương lai.
            *it = num;
        }
    }

    // Kích thước của vector tails chính là độ dài của LIS.
    return tails.size();
}

// Hàm main để kiểm tra
int main() {
    // Test case 1: LIS = 3 (ví dụ: [1, 2, 3])
    std::vector<int> nums1 = {1, 2, 3};
    std::cout << "LIS của [1, 2, 3] là: " << lengthOfLIS(nums1) << std::endl; // Expected: 3

    // Test case 2: LIS = 2 (ví dụ: [3, 1, 2])
    std::vector<int> nums2 = {3, 1, 2};
    std::cout << "LIS của [3, 1, 2] là: " << lengthOfLIS(nums2) << std::endl; // Expected: 2

    // Test case 3: Ví dụ từ đề bài (LIS = 5)
    std::vector<int> nums3 = {1, 2, 5, 3, 4, 7};
    std::cout << "LIS của [1, 2, 5, 3, 4, 7] là: " << lengthOfLIS(nums3) << std::endl; // Expected: 5

    // Test case 4: LIS = 1
    std::vector<int> nums4 = {5, 4, 3, 2, 1};
    std::cout << "LIS của [5, 4, 3, 2, 1] là: " << lengthOfLIS(nums4) << std::endl; // Expected: 1
    
    return 0;
}