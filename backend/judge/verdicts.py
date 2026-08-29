class Verdict:
    AC = "AC"   # Accepted
    WA = "WA"   # Wrong Answer
    TLE = "TLE" # Time Limit Exceeded
    MLE = "MLE" # Memory Limit Exceeded
    OLE = "OLE" # Output Limit Exceeded
    RTE = "RTE" # Runtime Error / Exception
    IR = "IR"   # Invalid Return Code
    CE = "CE"   # Compile Error
    IE = "IE"   # Internal Error
    SC = "SC"   # Short-Circuited

    DESCRIPTIONS = {
        AC: "Accepted (Chấp nhận)",
        WA: "Wrong Answer (Kết quả sai)",
        TLE: "Time Limit Exceeded (Quá thời gian thực thi)",
        MLE: "Memory Limit Exceeded (Vượt quá bộ nhớ cho phép)",
        OLE: "Output Limit Exceeded (Xuất dữ liệu vượt giới hạn)",
        RTE: "Runtime Error (Lỗi thời gian chạy)",
        IR: "Invalid Return (Mã trả về khác 0)",
        CE: "Compile Error (Lỗi biên dịch)",
        IE: "Internal Error (Lỗi máy chấm hệ thống)",
        SC: "Short-Circuited (Bỏ qua do test trước đó thất bại)"
    }

class SubmissionStatus:
    QUEUED = "QU"
    COMPILING = "P"
    GRADING = "G"
    DONE = "D"
