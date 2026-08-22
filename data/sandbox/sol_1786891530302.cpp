Chào bạn. Với vai trò là một Chuyên Gia Lập Trình Thi Đấu, tôi đã phân tích bài toán LIS này và xác định phương pháp tối ưu nhất là sử dụng kỹ thuật **Greedy kết hợp với Tìm kiếm Nhị phân (Binary Search)**.

Đây là giải pháp kinh điển, đạt độ phức tạp $\mathcal{O}(N \log N)$ và là cách triển khai gọn gàng nhất cho bài toán này.

---

## 1. Phân tích và Tư duy Thuật toán

### Phương pháp: Greedy + Binary Search
Thay vì sử dụng Quy hoạch động (DP) $\mathcal{O}(N^2)$, chúng ta sẽ duy trì một mảng đặc biệt, gọi là `tails`.

**Ý nghĩa của `tails`:**
Mảng `tails` sẽ lưu trữ các giá trị nhỏ nhất có thể của phần tử cuối cùng của tất cả các dãy con tăng có độ dài $k+1$ mà chúng ta đã tìm thấy cho đến thời điểm hiện tại.

**Tính chất quan trọng:**
Mảng `tails` luôn được sắp xếp tăng dần.

**Quy trình xử lý phần tử $A_i$:**
Khi ta gặp một phần tử $A_i$, ta cần tìm xem $A_i$ có thể mở rộng dãy con tăng nào.

1.  **Tìm kiếm:** Ta sử dụng `std::lower_bound` để tìm vị trí của phần tử nhỏ nhất trong `tails` mà **lớn hơn hoặc bằng** $A_i$.
2.  **Cập nhật:**
    *   **Nếu $A_i$ lớn hơn tất cả các phần tử trong `tails`:** Điều này có nghĩa $A_i$ mở rộng LIS hiện tại. Ta thêm $A_i$ vào cuối `tails`.
    *   **Nếu $A_i$ nhỏ hơn hoặc bằng phần tử tại vị trí tìm thấy:** Ta thay thế phần tử đó bằng $A_i$. Việc này là tối ưu vì ta vẫn giữ được độ dài của dãy con tăng đó, nhưng bằng một giá trị kết thúc nhỏ hơn ($A_i \le \text{tails}[j]$). Một giá trị kết thúc nhỏ hơn sẽ giúp các phần tử tiếp theo có cơ hội mở rộng dãy con này dễ dàng hơn.

**Kết quả:** Sau khi duyệt hết $N$ phần tử, độ dài của mảng `tails` chính là độ dài LIS.

### Độ phức tạp
*   **Thời gian (Time Complexity):** $\mathcal{O}(N \log N)$. Ta duyệt qua $N$ phần tử, và trong mỗi bước, ta thực hiện một thao tác tìm kiếm nhị phân (Binary Search) trên mảng `tails` có kích thước tối đa $N$, với độ phức tạp là $\mathcal{O}(\log N)$.
*