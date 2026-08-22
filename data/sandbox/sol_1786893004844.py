import sys

# Tăng giới hạn đệ quy nếu cần thiết cho các bài toán phức tạp hơn, 
# nhưng không cần thiết cho bài toán này.
# sys.setrecursionlimit(2000)

def solve():
    """
    Giải quyết bài toán tính tổng hai số nguyên a và b.
    Độ phức tạp thời gian là O(1) vì chỉ thực hiện phép cộng cơ bản.
    Python tự động xử lý số nguyên lớn (BigInt).
    """
    try:
        # Tối ưu I/O: Đọc toàn bộ nội dung input và tách thành các phần tử.
        # Phương pháp này nhanh hơn việc gọi nhiều lần sys.stdin.readline().
        input_data = sys.stdin.read().split()
        
        if not input_data:
            # Trường hợp không có input
            return
            
        # Giả định input luôn chứa ít nhất hai số.
        if len(input_data) < 2:
            # Xử lý trường hợp chỉ có 1 số hoặc 0 số
            if len(input_data) == 1:
                a = int(input_data[0])
                # Nếu chỉ có 1 số, ta có thể coi b = 0
                print(a)
                return
            else:
                return

        # Chuyển đổi hai phần tử đầu tiên thành số nguyên.
        # Python's int handles arbitrary precision integers.
        a = int(input_data[0])
        b = int(input_data[1])
        
        # Thực hiện phép cộng.
        result = a + b
        
        # In kết quả ra stdout
        print(result)

    except Exception as e:
        # Trong môi trường thi đấu, thường không in lỗi ra stderr
        # print(f"An error occurred: {e}", file=sys.stderr)
        pass

if __name__ == "__main__":
    solve()