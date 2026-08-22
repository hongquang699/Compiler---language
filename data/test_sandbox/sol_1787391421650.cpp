#include <iostream>
int main() {
    int a, b;
    std::cin >> a >> b;
    std::cout << (a - b) << "\n"; // BUG: minus instead of plus
    return 0;
}