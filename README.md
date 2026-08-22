# 🤖 LOCAL CODING AI — Competitive Programming & Algorithm Multi-Language System

> **Hệ Thống Trợ Lý AI Chạy Hoàn Toàn Trên Máy Cá Nhân Chuyên Sâu Lập Trình Thi Đấu (C++, Python 3, Java, C, Rust, Go), Thuật Toán & Tư Duy Logic.**

Hệ thống được thiết kế theo kiến trúc **LLM + RAG + Multi-Lang Sandbox Engine + Self-Debugging Loop + SQLite Memory + Web IDE**.

---

## 🌟 Hỗ Trợ Đa Ngôn Ngữ Thi Đấu (Competitive Programming)

Hệ thống hỗ trợ toàn diện các ngôn ngữ chuẩn thi đấu:
- 🚀 **C++ (g++ 16 / C++17 / C++20)**: Tối ưu Fast I/O, thư viện STL, Segment Tree, DSU, Dijkstra...
- 🐍 **Python 3**: Tối ưu `sys.stdin.readline`, `sys.setrecursionlimit(300000)`, `heapq`, `bisect`, DSU, xử lý BigInt không giới hạn bit.
- ☕ **Java**: Hỗ trợ `FastScanner`, `PrintWriter`, `BigInteger`, cấu trúc `public class Main`.
- ⚙️ **C (gcc)**: Tối ưu I/O nhị phân, bộ nhớ siêu thấp.
- 🦀 **Rust** & 🔵 **Go**: Sẵn sàng tích hợp khi máy cài đặt trình biên dịch.


1. **Bộ Não C++ Code Agent**:
   - **Tự động phân tích đề bài**: Xác định Input, Output, Constraints & Corner cases.
   - **Lựa chọn thuật toán & độ phức tạp**: Áp dụng quy tắc $10^8$ phép tính/giây để chọn $O(N \log N)$, $O(N)$, hay $O(\log N)$.
   - **Sinh mã nguồn C++17/20**: Tích hợp Fast I/O, phòng tránh tràn số (`long long`), viết theo phong cách Competitive Programming.
   - **Tự động chấm & Sửa lỗi (Auto-Debugging Feedback Loop)**: Chạy thử trên Test Cases; nếu gặp `WA`, `TLE`, `RTE`, hoặc `CE`, AI tự phân tích log lỗi / counterexample và sửa code đến khi `AC`.

2. **RAG Knowledge Hub (Vector Search & Templates)**:
   - Nạp sẵn kho template chuẩn: **Fast I/O**, **DSU / Kruskal**, **Segment Tree**, **Fenwick Tree**, **Dijkstra**, **DP Patterns**, **Sieve of Eratosthenes**...
   - Cho phép người dùng kéo thả thêm file `.cpp`, `.md`, `.hpp` vào để AI học và trích dẫn.

3. **C++ Sandbox Execution Engine**:
   - Biên dịch trực tiếp bằng `g++` (`-O2`, `-std=c++17`).
   - Giới hạn thời gian (Timeout), đo RAM & CPU (Peak Memory Tracking), kiểm tra lỗi tràn mảng (Segmentation Fault / SIGSEGV), chia cho 0 (SIGFPE), và tràn bộ nhớ (MLE).

4. **Giao Diện Web IDE Cao Cấp**:
   - Giao diện Dark Theme phong cách lập trình thi đấu.
   - Trực quan hóa từng bước trong tiến trình Agent Pipeline.
   - Tích hợp C++ Playground, Custom Test Runner, Chatbot Stream, và Solved Problems Vault.

---

## 🚀 Hướng Dẫn Khởi Động Nhanh

### 1. Khởi chạy 1-Click:
```bash
python run.py
```
*Trình duyệt sẽ tự động mở tại `http://127.0.0.1:8000`.*

### 2. Hoặc chạy qua Virtual Environment:
```bash
.\.venv\Scripts\python.exe run.py
```

### 3. Chạy Kiểm Thử Toàn Diện Hệ Thống:
```bash
.\.venv\Scripts\python.exe tests/test_system.py
```

---

## ⚙️ Cấu Trúc Dự Án

```
Local-Ai/
├── run.py                     # Script khởi động 1-click
├── config.yaml                # Cấu hình LLM, g++ compiler, sandbox, RAG
├── requirements.txt           # Danh sách thư viện Python
├── backend/
│   ├── main.py                # FastAPI server & API endpoints
│   ├── core/config.py         # Quản lý cấu hình
│   ├── ai/
│   │   ├── llm_client.py      # Kết nối Ollama / local LLM
│   │   ├── prompt_engine.py   # Prompts chuyên sâu C++ & CP
│   │   ├── planner.py         # Phân tích độ phức tạp theo ràng buộc
│   │   ├── evaluator.py       # Phân tích static code & định dạng lỗi
│   │   └── agent.py           # Multi-step Agent & Auto-Debugging Loop
│   ├── tools/
│   │   ├── compiler.py        # Wrapper g++
│   │   ├── sandbox.py         # Quản lý tiến trình an toàn & RAM/TLE
│   │   ├── tester.py          # Bộ chấm test cases & so sánh kết quả
│   │   └── generator.py       # Bộ sinh test biên (Edge-case generator)
│   ├── rag/
│   │   ├── embedding.py       # Local hybrid vector & BM25 embedding
│   │   ├── loader.py          # Đọc & chunking tài liệu
│   │   └── store.py           # Quản lý & truy vấn kho kiến thức
│   └── database/
│       └── db.py              # SQLite context memory & problem vault
├── data/
│   ├── knowledge_base/        # Kho tài liệu thuật toán & C++ templates
│   └── sandbox/               # Thư mục chứa binaries tạm thời
├── frontend/
│   ├── index.html             # Giao diện Web IDE
│   ├── style.css              # Dark IDE Theme
│   └── app.js                 # Frontend application logic
└── tests/
    └── test_system.py         # Bộ test tự động
```
