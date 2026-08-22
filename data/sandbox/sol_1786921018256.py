import sys
import bisect

# Tăng giới hạn đệ quy là một thói quen tốt trong CP, mặc dù bài này không cần
# sys.setrecursionlimit(300000)

def solve():
    """
    Giải quyết bài toán Longest Increasing Subsequence (LIS) bằng phương pháp O(N log N).
    """
    # Đọc toàn bộ input từ stdin để tối ưu tốc độ I/O
    input_data = sys.stdin.read().split()
    
    if not input_data:
        print(0)
        return

    # N là số phần tử
    try:
        N = int(input_data[0])
    except IndexError:
        # Xử lý trường hợp input rỗng
        print(0)
        return

    if N == 0:
        print(0)
        return

    # A là mảng các phần tử
    # Bắt đầu từ index 1 của input_data
    A = [int(x) for x in input_data[1:N+1]]

    # 'tails' sẽ lưu trữ các phần tử cuối cùng nhỏ nhất của tất cả các 
    # dãy con tăng có độ dài tương ứng. Danh sách này luôn được sắp xếp tăng dần.
    tails = []

    for x in A:
        # 1. Tìm vị trí chèn (index j) của x trong tails sao cho 
        #    tails[j] là phần tử đầu tiên >= x.
        #    bisect_left thực hiện tìm kiếm nhị phân trong O(log N).
        j = bisect.bisect_left(tails, x)
        
        if j == len(tails):
            # Trường hợp 1: x lớn hơn tất cả các phần tử trong tails.
            # x mở rộng LIS hiện tại.
            tails.append(x)
        else:
            # Trường hợp 2: x nhỏ hơn hoặc bằng tails[j].
            # Ta thay thế tails[j] bằng x. Điều này tạo ra một dãy con tăng 
            # có cùng độ dài (j+1) nhưng kết thúc bằng giá trị nhỏ hơn (x), 
            # giúp tăng cơ hội mở rộng sau này.
            tails[j] = x

    # Độ dài của tails chính là độ dài của LIS.
    print(len(tails))

if __name__ == "__main__":
    solve()