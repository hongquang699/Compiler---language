class PromptEngine:
    # Language display names
    LANG_DISPLAY = {
        "cpp":    "C++ (C++17)",
        "python": "Python 3",
        "java":   "Java (OpenJDK 17)",
        "rust":   "Rust",
        "go":     "Go",
        "c":      "C",
    }

    # Hard language enforcement header — placed at the VERY TOP of every user prompt
    # so the model cannot miss it even if it skims the system prompt.
    @staticmethod
    def _lang_header(language: str) -> str:
        lang = language.lower()
        display = PromptEngine.LANG_DISPLAY.get(lang, lang.upper())
        if lang == "cpp":
            return f"[NGÔN NGỮ LẬP TRÌNH: C++ (C++17)] — Sinh MÃ NGUỒN C++ trong khối ```cpp ... ```.\n"
        return (
            f"╔══════════════════════════════════════════════════════════╗\n"
            f"║  ⚠️  NGÔN NGỮ BẮT BUỘC: {display:<34}║\n"
            f"║  Viết 100% bằng {display}. KHÔNG ĐƯỢC dùng C++ hay ngôn ngữ khác.  ║\n"
            f"║  Đặt code trong khối ```{lang} ... ```.                    ║\n"
            f"╚══════════════════════════════════════════════════════════╝\n"
        )

    @staticmethod
    def get_system_prompt(language: str = "cpp") -> str:
        lang_map = {
            "cpp":    ("C++ (C++17/20)", "C++17/20 chuẩn, có Fast I/O và tối ưu bộ nhớ. Dùng `#include <bits/stdc++.h>`."),
            "python": ("Python 3",       "Python 3. TUYỆT ĐỐI KHÔNG VIẾT C++. Dùng `sys.stdin.readline`, `sys.setrecursionlimit` nếu cần đệ quy sâu."),
            "java":   ("Java",           "Java. TUYỆT ĐỐI KHÔNG VIẾT C++. Class phải là `public class Main`. Dùng `BufferedReader`/`StringTokenizer`."),
            "c":      ("C",              "C thuần. KHÔNG dùng C++. Dùng `#include <stdio.h>` và `scanf/printf`."),
            "rust":   ("Rust",           "Rust. KHÔNG dùng C++. Hàm `fn main()` đọc stdin qua `std::io::stdin().read_to_string`."),
            "go":     ("Go",             "Go. KHÔNG dùng C++. Bắt đầu bằng `package main` và `func main()`."),
        }
        lang_name, lang_desc = lang_map.get(language.lower(), ("C++", "C++17"))

        return f"""Bạn là một Chuyên Gia Lập Trình Thi Đấu (Competitive Programming Grandmaster).
Ngôn ngữ làm việc của bạn trong phiên này là: {lang_name}.
Bạn CHỈ được phép sinh mã nguồn bằng {lang_name}. Nếu bạn sinh mã nguồn bằng bất kỳ ngôn ngữ nào khác thì câu trả lời coi như SAI.

Nhiệm vụ:
1. Phân tích bài toán thuật toán một cách chặt chẽ và logic.
2. Khớp ràng buộc với độ phức tạp tối ưu ($10^8$ phép tính/giây):
   - N ≤ 10: O(N!), N ≤ 20: O(2^N), N ≤ 500: O(N^3)
   - N ≤ 5000: O(N^2), N ≤ 2×10^5: O(N log N) hoặc O(N), N ≥ 10^9: O(√N) hoặc O(log N)
3. {lang_desc}
4. Giải thích tư duy thuật toán bằng tiếng Việt, kèm Time & Space Complexity.
"""

    @staticmethod
    def build_plan_prompt(problem_text: str, rag_context: str = "", language: str = "cpp") -> str:
        lang_tag = language.upper()
        return f"""{PromptEngine._lang_header(language)}
Phân tích đề bài toán sau để chuẩn bị lập trình bằng {lang_tag}:

--- ĐỀ BÀI ---
{problem_text}

--- TÀI LIỆU THUẬT TOÁN LIÊN QUAN (RAG) ---
{rag_context if rag_context else "Không có tài liệu bổ sung."}

Yêu cầu:
1. Tóm tắt Input, Output và Constraints.
2. Độ phức tạp thời gian mục tiêu dựa trên constraints.
3. Dạng bài (DP, Greedy, Graph, Segment Tree, Binary Search...).
4. Ý tưởng thuật toán và Corner Cases (N=0, N=1, số âm, số lớn).
5. Thiết kế giải pháp tối ưu cho ngôn ngữ {lang_tag}.
"""

    @staticmethod
    def build_codegen_prompt(problem_text: str, plan_text: str, rag_context: str = "", language: str = "cpp") -> str:
        lang = language.lower()
        lang_display = PromptEngine.LANG_DISPLAY.get(lang, lang.upper())

        extra_reqs = {
            "cpp":    "- Code C++17 hoàn chỉnh, có `#include <bits/stdc++.h>`, Fast I/O (`ios_base::sync_with_stdio(false); cin.tie(NULL);`), hàm `main()`.\n- Dùng `long long` khi tổng/tích vượt 2×10^9.",
            "python": "- Code Python 3 HOÀN TOÀN. KHÔNG ĐƯỢC DÙNG C++.\n- Dòng đầu: `import sys\\ninput = sys.stdin.readline`.\n- Nếu đệ quy: thêm `sys.setrecursionlimit(300000)`.\n- Hàm main gọi bằng `if __name__ == '__main__': main()`.",
            "java":   "- Code Java HOÀN TOÀN. KHÔNG ĐƯỢC DÙNG C++.\n- Cấu trúc: `public class Main { public static void main(String[] args) throws IOException { ... } }`.\n- Dùng `BufferedReader` + `StringTokenizer` để đọc input nhanh.",
            "rust":   "- Code Rust HOÀN TOÀN với `fn main()`. KHÔNG DÙNG C++.\n- Đọc stdin: `use std::io::{self,Read}; let mut input=String::new(); io::stdin().read_to_string(&mut input).unwrap();`",
            "go":     "- Code Go HOÀN TOÀN với `package main` và `func main()`. KHÔNG DÙNG C++.\n- Dùng `bufio.NewReader(os.Stdin)` để đọc nhanh.",
            "c":      "- Code C HOÀN TOÀN. KHÔNG DÙNG C++.\n- Bắt đầu bằng `#include <stdio.h>`. Dùng `scanf`/`printf`.",
        }

        return f"""{PromptEngine._lang_header(language)}

Viết một chương trình {lang_display} hoàn chỉnh và tối ưu để giải bài toán sau:

--- ĐỀ BÀI ---
{problem_text}

--- KẾ HOẠCH THUẬT TOÁN ---
{plan_text}

--- TEMPLATE & THƯ VIỆN THAM KHẢO ---
{rag_context if rag_context else "Dùng thư viện chuẩn."}

YÊU CẦU BẮT BUỘC:
{extra_reqs.get(lang, extra_reqs['cpp'])}
- Đặt TOÀN BỘ mã nguồn trong khối ```{lang}\\n...\\n```.
- KHÔNG được đặt bất kỳ dòng code nào ra ngoài khối ``` ```.
"""

    @staticmethod
    def build_debug_prompt(problem_text: str, current_code: str, error_report: str, language: str = "cpp") -> str:
        lang = language.lower()
        lang_display = PromptEngine.LANG_DISPLAY.get(lang, lang.upper())
        return f"""{PromptEngine._lang_header(language)}

Chương trình {lang_display} hiện tại gặp lỗi khi chạy thử nghiệm:

--- ĐỀ BÀI ---
{problem_text}

--- CODE HIỆN TẠI ({lang_display}) ---
```{lang}
{current_code}
```

--- BÁO CÁO LỖI ---
{error_report}

NHIỆM VỤ:
1. Tìm chính xác nguyên nhân lỗi (sai công thức, tràn số, TLE, RecursionError, CE...).
2. Sửa lại code {lang_display} hoàn chỉnh. Đặt code đã sửa trong khối ```{lang} ... ```.
3. KHÔNG ĐƯỢC chuyển sang ngôn ngữ khác.
"""
