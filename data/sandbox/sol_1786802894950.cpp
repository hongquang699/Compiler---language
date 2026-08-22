Chào bạn. Với vai trò là một Chuyên Gia Lập Trình Thi Đấu và Kỹ Sư C++ Thuật Toán, tôi đã tiến hành phân tích bài toán LIS này một cách chi tiết và xác định được phương pháp tối ưu nhất.

Bài toán LIS là một bài toán kinh điển. Việc áp dụng Quy hoạch động (DP) trực tiếp sẽ dẫn đến độ phức tạp $\mathcal{O}(N^2)$, hoàn toàn không đáp ứng được giới hạn thời gian với $N=200,000$.

Giải pháp bắt buộc phải là phương pháp **Tails Array** (hay còn gọi là kỹ thuật Patience Sorting), kết hợp với **Tìm kiếm Nhị phân (Binary Search)** để đạt được độ phức tạp tối ưu $\mathcal{O}(N \log N)$.

---

## 1. Phân Tích Thuật Toán (Tails Array)

### Nguyên lý hoạt động:
Thay vì lưu trữ tất cả các LIS có thể, chúng ta chỉ cần duy trì một mảng `tails`. Mảng