import sys
import bisect

# Tăng giới hạn đệ quy (mặc dù bài này không cần, nhưng là thói quen tốt trong CP)
# sys.setrecursionlimit(300000)

def solve():
    """
    Giải quyết bài toán Longest Increasing Subsequence (LIS) bằng thuật toán O(N log N).
    """
    # Tăng tốc độ đọc input bằng cách đọc toàn bộ nội dung
    input_data = sys.stdin.read().split()
    
    if not input_data:
        print(0)
        return

    try:
        # N là phần tử đầu tiên
        N = int(input_data[0])
        if N == 0:
            print(0)
            return
        
        # A là các phần tử còn lại
        A = [int(x) for x in input_data[1:N+1]]
    except IndexError:
        # Xử lý trường hợp input không đủ dữ liệu
        print(0)
        return

    # tails[i] lưu trữ giá trị nhỏ nhất của phần tử kết thúc một dãy con tăng có độ dài i+1.
    # Mảng này luôn được sắp xếp tăng dần.
    tails = []

    for x in A:
        # Sử dụng bisect_left để tìm chỉ số j nhỏ nhất sao cho tails[j] >= x.
        # Đây là vị trí tối ưu để thay thế x.
        j = bisect.bisect_left(tails, x)
        
        if j == len(tails):
            # Trường hợp 1: x lớn hơn tất cả các phần tử trong tails.
            # Mở rộng LIS hiện tại.
            tails.append(x)
        else:
            # Trường hợp 2: x thay thế tails[j].
            # Vì x <= tails[j], việc thay thế này tạo ra một "đuôi" nhỏ hơn
            # cho LIS có độ dài j+1, giúp tăng cơ hội mở rộng sau này.
            tails[j] = x

    # Độ dài của mảng tails chính là độ dài LIS.
    print(len(tails))

if __name__ == "__main__":
    solve()