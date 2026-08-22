### Phân tích thuật toán

**1. Mục tiêu và Ràng buộc:**
Bài toán yêu cầu tìm độ dài của Dãy con tăng dài nhất (LIS) trong dãy $A$ có $N \le 200,000$. Yêu cầu độ phức tạp là $O(N \log N)$.

**2. Phương pháp tối ưu (Patience Sorting + Binary Search):**
Để đạt được độ phức tạp $O(N \log N)$, chúng ta sử dụng phương pháp duy trì một danh sách `tails`. Danh sách này không lưu trữ LIS thực tế, mà lưu trữ một tập hợp các giá trị tối ưu: `tails[i]` là **giá trị nhỏ nhất** mà một dãy con tăng có độ dài $i+1$ có thể kết thúc bằng.

Danh sách `tails` luôn được sắp xếp tăng dần.

Khi xử lý phần tử $A[i]$:
1. **Tìm kiếm:** Ta tìm vị trí $j$ trong `tails` sao cho `tails[j]` là phần tử nhỏ nhất $\ge A[i]$. Thao tác này được thực hiện bằng Binary Search (tìm Lower Bound/Ceiling).
2. **Cập nhật:**
    *   Nếu $j$ là kích thước hiện tại của `tails` (tức là $A[i]$ lớn hơn tất cả các phần tử trong `tails`), ta thêm $A[i]$ vào cuối `tails`. Điều này mở rộng LIS dài nhất hiện tại.
    *   Ngược lại, ta thay thế `tails[j]` bằng $A[i]$. Việc này tối ưu hóa LIS độ dài $j+1$ vì nó cho phép chúng ta đạt được cùng độ dài LIS nhưng với một giá trị kết thúc nhỏ hơn ($A[i]$), giúp các phần tử sau này có cơ hội mở rộng dãy con này hơn.

**3. Độ phức tạp:**
*   **Time Complexity:** $O(N \log N)$. Chúng ta duyệt qua $N$ phần tử, và mỗi lần, thao tác Binary Search trên danh sách `tails` (kích thước tối đa $N$) mất $O(\log N)$. Tổng độ phức tạp là $O(N \log N)$.
*   **Space Complexity:** $O(N)$ để lưu trữ danh sách `tails`.

### Mã nguồn Java

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.StringTokenizer;

/**
 * Giải bài toán Longest Increasing Subsequence (LIS) với độ phức tạp O