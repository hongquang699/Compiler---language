import sys

def solve():
    """
    Giải quyết bài toán tính tích của hai số nguyên a và b.
    Sử dụng sys.stdin.readline để tối ưu hóa tốc độ I/O.
    """
    # Thiết lập input/output qua sys module để tối ưu tốc độ
    input = sys.stdin.readline
    
    # Đọc dòng input. Giả định a và b được cung cấp trên cùng một dòng.
    line = input().strip()
    
    if not line:
        # Xử lý trường hợp input rỗng
        return
    
    try:
        # Tách và chuyển sang kiểu số nguyên (Python int hỗ trợ số lớn)
        parts = line.split()
        if len(parts) < 2:
            # Cần ít nhất hai số
            return
            
        a = int(parts[0])
        b = int(parts[1])
    except ValueError:
        # Xử lý trường hợp input không đúng định dạng
        return

    # Tính toán tích
    result = a * b
    
    # In kết quả
    sys.stdout.write(str(result) + '\n')

if __name__ == "__main__":
    # Gọi hàm giải quyết bài toán
    solve()