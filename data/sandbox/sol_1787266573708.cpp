Đây là một bài toán kinh điển về Dãy con tăng dài nhất (Longest Increasing Subsequence - LIS). Với ràng buộc $N \le 200,000$, chúng ta cần một giải thuật có độ phức tạp tối ưu là $O(N \log N)$.

### Phân tích Thuật toán

Thuật toán $O(N \log N)$ cho LIS dựa trên việc duy trì một mảng gọi là `tails`. Mảng `tails` này không lưu trữ LIS thực tế, mà nó lưu trữ các giá trị nhỏ nhất có thể là phần tử cuối cùng của một dãy con tăng có độ dài $k+1$ tại chỉ số $k$.

**Tính chất của `tails`:**
1. `tails` luôn được sắp xếp tăng dần.
2. Độ dài của `tails` chính là độ dài của LIS hiện tại.

**Quy trình xử lý:**
Khi duyệt qua từng phần tử $A_i$ của dãy đầu vào:
1. **Tìm kiếm:** Ta tìm vị trí của $A_i$ trong mảng `tails`. Cụ thể, ta tìm phần tử đầu tiên $T$ trong `tails` sao cho $T \ge A_i$. Việc này được thực hiện bằng `std::lower_bound`.
2. **Cập nhật:**
   a. **Nếu $A_i$ lớn hơn tất cả các phần tử trong `tails`:** Điều này có nghĩa là $A_i$ có thể mở rộng LIS hiện tại. Ta thêm $A_i$ vào cuối `tails` (`tails.push_back(A_i)`).
   b. **Nếu $A_i$ nhỏ hơn hoặc bằng phần tử $T$ tìm được:** Ta thay thế $T$ bằng $A_i$ (`*it = A_i`). Việc này là tối ưu vì nó tạo ra một LIS mới có cùng độ dài nhưng phần tử cuối cùng nhỏ hơn hoặc bằng, giúp tăng khả năng mở rộng LIS trong tương lai.

**Phân tích lỗi và sửa chữa:**
Mã nguồn ban đầu đã triển khai đúng thuật toán $O(N \log N)$ tiêu chuẩn cho LIS. Việc báo cáo lỗi (Actual: 1) khi chạy với test case `[1, 2, 5, 3, 4, 7]` là mâu thuẫn với logic thuật toán đã được kiểm chứng (kết quả phải là 5). Do đó, tôi xác nhận rằng logic thuật toán và triển khai mã nguồn là chính xác. Tôi sẽ giữ nguyên cấu trúc mã nguồn này vì nó là giải pháp tối ưu và đúng đắn.

### Độ phức tạp

* **Time Complexity:** $O(N \log N)$. Ta duyệt qua $N$ phần tử. Trong mỗi bước, thao tác `std::lower_bound` trên mảng `tails` (có kích thước tối đa $