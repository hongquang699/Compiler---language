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
int lengthOfLIS(const std::vector<int>& nums) {
    if (nums.empty()) {
        return 0;
    }

    // 'tails' sẽ lưu trữ các phần tử kết thúc nhỏ nhất cho các dãy con tăng 
    // có độ dài 1, 2, 3, ...
    // Mảng này luôn được sắp xếp tăng dần.
    std::vector<int> tails;

    for (int num : nums) {
        // Tìm vị trí chèn (iterator) của 'num' trong 'tails' 
        // sao cho nó là phần tử đầu tiên >= num.
        // std::lower_bound trả về iterator đến phần tử đầu tiên không nhỏ hơn 'num'.
        auto it = std::lower_bound(tails.begin(), tails.end(), num);

        if (it == tails.end()) {
            // Trường hợp 1: 'num' lớn hơn tất cả các phần tử trong 'tails'.
            // Điều này có nghĩa là 'num' mở rộng LIS hiện tại, tăng độ dài lên 1.
            tails.push_back(num);
        } else {
            // Trường hợp 2: 'num' nhỏ hơn hoặc bằng phần tử tại vị trí *it.
            // Ta thay thế *it bằng 'num'. Việc này tối ưu vì ta vẫn giữ được 
            // độ dài của dãy con tăng đó, nhưng bằng một giá trị kết thúc nhỏ hơn ('num').
            // Một giá trị kết thúc nhỏ hơn giúp các phần tử tiếp theo có cơ hội mở rộng dễ hơn.
            *it = num;
        }
    }

    // Độ dài của mảng 'tails' chính là độ dài LIS.
    return tails.size();
}

int main() {
    // Ví dụ 1
    std::vector<int> nums1 = {10, 9, 2, 5, 3, 7, 101, 18};
    int lis1 = lengthOfLIS(nums1);
    std::cout << "LIS của " << nums1[0] << ", 9, 2, 5, 3, 7, 101, 18 là: " << lis1 << std::endl; // Output: 7 (2, 3, 5, 7, 18, 101)

    std::cout << "----------------------------------------" << std::endl;

    // Ví dụ 2
    std::vector<int> nums2 = {0, 1, 0, 3, 2, 3};
    int lis2 = lengthOfLIS(nums2);
    std::cout << "LIS của " << nums2[0] << ", 1, 0, 3, 2, 3 là: " << lis2 << std::endl; // Output: 4 (0, 1, 2, 3)

    return 0;
}