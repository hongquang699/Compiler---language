import re
from typing import Dict, Any, List, Optional

# Canonical language tag aliases for detection
LANG_TAGS = {
    "cpp": ["cpp", "c++", "cxx"],
    "c":   ["c"],
    "python": ["python", "python3", "py"],
    "java": ["java"],
    "rust": ["rust", "rs"],
    "go":   ["go", "golang"],
}

# Known C++ indicators (for wrong-language detection)
_CPP_FINGERPRINT = [
    r'#include\s*<', r'\busing namespace std\b', r'\bint main\s*\(',
    r'\bstd::', r'\bcout\b', r'\bcin\b', r'#define\b'
]

def _looks_like_cpp(code: str) -> bool:
    return any(re.search(p, code) for p in _CPP_FINGERPRINT)

def _looks_like_target(code: str, lang: str) -> bool:
    """Light-weight heuristic: does the code smell like `lang`?"""
    if lang == "python":
        return any(t in code for t in ["def ", "import ", "print(", "sys.stdin", "for ", "if __name__"])
    if lang == "java":
        return "public class" in code or "public static void main" in code
    if lang == "c":
        return "#include <stdio.h>" in code or "#include<stdio.h>" in code
    if lang == "rust":
        return "fn main()" in code
    if lang == "go":
        return "package main" in code or "func main()" in code
    return True  # cpp – accept anything


class ProblemPlanner:
    @staticmethod
    def infer_target_complexity(constraints_text: str) -> Dict[str, str]:
        """Infers theoretical upper-bound time and space complexity based on common CP bounds."""
        text = constraints_text.lower()
        if re.search(r'10\^?5|100000|200000|300000|500000', text):
            return {"time": "O(N log N) hoặc O(N)", "space": "O(N)", "note": "Phù hợp cấu trúc dữ liệu, Two Pointers, Greedy, Segment Tree"}
        elif re.search(r'10\^?6|1000000', text):
            return {"time": "O(N)", "space": "O(N)", "note": "Phải dùng thuật toán tuyến tính O(N) hoặc O(N log(log N)) cho sàng số nguyên tố"}
        elif re.search(r'10\^?9|10\^?18|1000000000', text):
            return {"time": "O(log N) hoặc O(sqrt(N))", "space": "O(1)", "note": "Phù hợp Binary Search trên đáp án, Nhân ma trận, hoặc Toán rời rạc"}
        elif re.search(r'5000|2000|3000', text):
            return {"time": "O(N^2)", "space": "O(N^2) hoặc O(N)", "note": "Quy hoạch động 2 chiều, 2 vòng lặp lồng nhau"}
        elif re.search(r'300|400|500', text):
            return {"time": "O(N^3)", "space": "O(N^2)", "note": "Floyd-Warshall, Matrix Multiplication"}
        elif re.search(r'20|18|16', text):
            return {"time": "O(2^N * N)", "space": "O(2^N)", "note": "Bitmask DP, Quay lui nhánh cận"}
        elif re.search(r'10|11|12', text):
            return {"time": "O(N!)", "space": "O(N)", "note": "Sinh hoán vị, Brute Force"}
        return {"time": "O(N log N)", "space": "O(N)", "note": "Mặc định an toàn cho hầu hết bài toán"}


class CodeEvaluator:
    @staticmethod
    def extract_code(text: str, language: str = "cpp") -> str:
        """
        Extracts code from the LLM response.
        Strategy (in order of priority):
          1. Strict match: fence tagged with target language aliases ONLY.
          2. Generic fence fallback, but REJECT if result looks like wrong language.
          3. Return raw text as-is.
        """
        lang = language.lower()
        aliases = LANG_TAGS.get(lang, [lang])

        # ── Step 1: strict match on target language fence ──────────────────────
        # Build alternation: python|python3|py  etc.
        tag_alt = "|".join(re.escape(a) for a in aliases)
        strict_pat = rf'```(?:{tag_alt})\s*([\s\S]*?)```'
        m = re.search(strict_pat, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()

        # ── Step 2: generic fence – grab first block ────────────────────────────
        m_any = re.search(r'```(?:[a-zA-Z0-9_+]*)\s*([\s\S]*?)```', text)
        if m_any:
            candidate = m_any.group(1).strip()
            # If the extracted code looks like C++ but we asked for something else, skip it
            if lang != "cpp" and _looks_like_cpp(candidate) and not _looks_like_target(candidate, lang):
                # Try to find a second fence block that's not C++
                all_fences = re.findall(r'```(?:[a-zA-Z0-9_+]*)\s*([\s\S]*?)```', text)
                for block in all_fences[1:]:
                    if _looks_like_target(block.strip(), lang):
                        return block.strip()
                # All blocks look like C++ – return empty so agent re-prompts
                return ""
            return candidate

        # ── Step 3: bare text fallback ──────────────────────────────────────────
        return text.strip()

    @staticmethod
    def static_analysis(code: str, language: str = "cpp") -> List[str]:
        """Performs static linting for typical CP mistakes across languages."""
        warnings = []
        lang = language.lower()
        if lang in ["cpp", "c++"]:
            if "ios_base::sync_with_stdio" not in code and "cin.tie" not in code:
                warnings.append("⚠️ C++: Chưa bật Fast I/O (`ios_base::sync_with_stdio(false); cin.tie(NULL);`) - có thể bị TLE với input lớn.")
            if "endl" in code:
                warnings.append("⚠️ C++: Sử dụng `endl` thay vì `'\\n'` - có thể làm chậm I/O do ép flush buffer.")
            if "int sum = 0" in code or "int ans = 0" in code:
                warnings.append("💡 C++: Cân nhắc dùng `long long` cho các biến tích lũy tổng/tích để phòng tràn số 32-bit (vượt quá 2*10^9).")
        elif lang in ["python", "py"]:
            if "sys.stdin.readline" not in code and "sys.stdin.read" not in code:
                warnings.append("💡 Python: Có thể dùng `import sys; input = sys.stdin.readline` để đọc input nhanh hơn khi N >= 10^5.")
            if "def " in code and "sys.setrecursionlimit" not in code and ("dfs" in code.lower() or "recur" in code.lower()):
                warnings.append("⚠️ Python: Khi dùng đệ quy sâu (DFS), nên thêm `import sys; sys.setrecursionlimit(300000)` để tránh RecursionError.")
        elif lang == "java":
            if "Scanner" in code and "BufferedReader" not in code:
                warnings.append("💡 Java: `Scanner` có thể gây TLE khi N >= 10^5. Nên dùng `BufferedReader` hoặc `StringTokenizer`.")
            if "public class" in code and "public class Main" not in code:
                warnings.append("⚠️ Java: Tên class bắt buộc phải là `public class Main` trên các hệ thống chấm.")
        return warnings

    @staticmethod
    def format_failure_report(test_run_result: Dict[str, Any]) -> str:
        """Formats test results into a compact diagnostic summary for the LLM to fix."""
        if test_run_result.get("overall_verdict") == "CE":
            return f"[COMPILATION ERROR - CE]\nCompiler log:\n{test_run_result.get('compiler_output')}"

        report = [f"Verdict tổng quan: {test_run_result.get('overall_verdict')}"]
        report.append(f"Số test đạt: {test_run_result.get('passed_tests')}/{test_run_result.get('total_tests')}")

        for test in test_run_result.get("test_results", []):
            if test.get("verdict") != "AC":
                report.append(f"\n--- TEST THẤT BẠI #{test.get('test_id')} [{test.get('verdict')}] ---")
                report.append(f"Input:\n{test.get('input')}")
                report.append(f"Kết quả mong đợi (Expected):\n{test.get('expected')}")
                report.append(f"Kết quả thực tế (Actual):\n{test.get('actual')}")
                if test.get("error"):
                    report.append(f"Lỗi hệ thống:\n{test.get('error')}")
                report.append(f"Chi tiết: {test.get('status_detail')}")
                break
        return "\n".join(report)
