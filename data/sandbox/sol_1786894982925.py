import sys

def solve():
    """
    Đọc hai số nguyên từ input và in ra tổng của chúng.
    Tối ưu hóa I/O bằng sys.stdin.readline.
    """
    # Đọc toàn bộ dòng input và loại bỏ ký tự xuống dòng
    # Sau đó, split() sẽ chia chuỗi thành các phần tử dựa trên khoảng trắng
    try:
        line = sys.stdin.readline()
        if not line:
            return
        
        # Chuyển các phần tử đã split thành số nguyên
        a, b = map(int, line.split())
        
        # Tính và in kết quả
        print(a + b)
        
    except EOFError:
        # Xử lý trường hợp hết file input
        pass
    except ValueError:
        # Xử lý trường hợp input không đúng định dạng
        pass

if __name__ == "__main__":
    solve()