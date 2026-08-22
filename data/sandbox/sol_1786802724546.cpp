#include <iostream>
#include <string>
#include <vector>

// Hàm main là điểm bắt đầu của chương trình C++
int main() {
    // In ra một chuỗi văn bản hợp lệ bằng C++
    std::cout << "Xin chào! Đây là một chương trình C++ hợp lệ." << std::endl;

    // Ví dụ về việc sử dụng biến và vòng lặp
    int a = 10;
    int b = 20;
    int sum = a + b;

    std::cout << "Tổng của " << a << " và " << b << " là: " << sum << std::endl;

    // Vòng lặp đơn giản
    for (int i = 0; i < 3; ++i) {
        std::cout << "Lặp lần thứ " << i << std::endl;
    }

    return 0;
}