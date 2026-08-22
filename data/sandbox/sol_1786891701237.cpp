Chào bạn. Với vai trò là một Chuyên Gia Lập Trình Thi Đấu, tôi đã phân tích bài toán LIS và xác nhận rằng giải pháp tối ưu nhất để đạt độ phức tạp $\mathcal{O}(N \log N)$ là sử dụng kỹ thuật **Binary Search** kết hợp với việc duy trì mảng các phần tử cuối cùng tối ưu (Tail Array).

Dưới đây là phân tích chi tiết và mã nguồn C++ hoàn chỉnh.

---

## 1. Phân Tích Thuật Toán (The $O(N \log N)$ Approach)

### 1.1. Nguyên lý hoạt động
Thay vì sử dụng Quy hoạch động (DP) truyền thống $DP[i] = 1 + \max(DP[j])$ với $j < i$ và $A_j < A_i$ (độ phức tạp $O(N^2)$), chúng ta sẽ duy trì một mảng đặc biệt gọi là `tails`.

**`tails`** lưu trữ các giá trị: `tails[k]` là **giá trị nhỏ nhất** có thể của phần tử cuối cùng của một dãy con tăng có độ dài $k+1$.

**Tính chất quan trọng:** Mảng `tails` luôn được sắp xếp tăng dần.

### 1.2. Quy trình xử lý
Khi duyệt qua từng phần tử $A_i$ của dãy đầu vào:

1.  **Tìm kiếm:** Ta sử dụng tìm kiếm nhị phân (`std::lower_bound`) để tìm vị trí $P$ trong `tails` là phần tử đầu tiên $\ge A_i$.
2.  **Cập nhật:**
    *   **Nếu $A_i$ lớn hơn tất cả các phần tử trong `tails`:** Điều này có nghĩa $A_i$ mở rộng LIS hiện tại. Ta thêm $A_i$ vào cuối `tails`.