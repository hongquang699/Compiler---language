# 🤖 COMPILER---LANGUAGE — Competitive Programming & Online Judge Ecosystem

> **An Autonomous, Local-First AI Competitive Programming Platform & Online Judge Ecosystem (C++17/20, Python 3, Java, C, Rust, Go, Pascal, JS, TS, C#) featuring Decoupled Modular Architecture, DMOJ/OJ-Master Judge Engine, Subtasks IOI Scoring, Custom Checkers, Multi-Agent AI Pipelines, RAG Knowledge Hub, VietQR Subscription Flow, and Developer Community Hub.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python)](https://python.org)
[![DMOJ Judge](https://img.shields.io/badge/Judge_Engine-DMOJ_%26_VNOJ-orange?style=flat-square)](https://github.com/DMOJ/judge)
[![SQLite](https://img.shields.io/badge/SQLite3-Database-003B57?style=flat-square&logo=sqlite)](https://sqlite.org)
[![Monaco Editor](https://img.shields.io/badge/Monaco_Editor-IDE-1e1e1e?style=flat-square&logo=visualstudiocode)](https://microsoft.github.io/monaco-editor/)
[![VietQR](https://img.shields.io/badge/VietQR-Manual_Approval-00b14f?style=flat-square)](https://vietqr.io)
[![Security](https://img.shields.io/badge/Security-HMAC--SHA256_%7C_WebArmor-red?style=flat-square)](https://csrc.nist.gov)
[![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)](#license)

---

## 🌟 Core Architecture & Feature Matrix

### 1. ⚙️ Decoupled Modular Backend Architecture
To prevent errors in one subsystem from cascading and affecting the entire web platform, the monolithic backend is decomposed into **10 isolated APIRouters**:
- `routers/auth.py`: User registration, Email OTP verification, login, JWT session management, user profile & submission histories.
- `routers/admin.py`: System administration, judge cluster node monitoring, backup/restore, GitHub sync, and model settings.
- `routers/problems.py`: Problem bank management, problem detail, testcase ZIP import/export, custom checkers, subtasks configuration, and rejudge engine.
- `routers/contests.py`: Contest creation, live arena, leaderboard, clarifications Q&A, and scoreboard freeze.
- `routers/community.py`: Developer groups, Club management, Forum discussion threads, hierarchical comments, and upvote/downvote reactions.
- `routers/ai.py`: Streaming AI chat, autonomous multi-step solver pipeline, vision OCR problem extraction, and code translation.
- `routers/rag.py`: Algorithm template retrieval, vector search, and document upload.
- `routers/payments.py`: VietQR subscription checkout, approval/rejection console for SuperAdmin/Dev.
- `routers/security.py`: Sentinel Bot SOC dashboard, IP blocking, anti-cheat detection, honeypot traps, and Dev immunity rule.
- `routers/upload.py`: Profile avatars, problem images, and AI session attachments.
- `core/dependencies.py`: Unified dependency injection and singletons management.

---

### 2. 🏛️ DMOJ & OJ-Master Judge Subsystem (`backend/judge/`)
Integrated with the complete judge protocol and grading engine from **DMOJ / VNOI Online Judge**:
- **Standard & Advanced Graders (`backend/judge/graders/`)**:
  - `StandardGrader`: Token-by-token comparison (whitespace and newline agnostic).
  - `ExactGrader`: Byte-for-byte exact character matching.
  - `FloatGrader`: Floating-point comparator with relative and absolute tolerance ($\epsilon = 10^{-6}$).
  - `CustomScriptGrader`: Executes custom Python checker scripts (`def check(inp, exp, out) -> bool`).
- **Contest Scoring Formats (`backend/judge/contest_format/`)**:
  - `ICPCContestFormat`: Solved problems count + 20-minute penalty per failed attempt.
  - `IOIContestFormat`: Subtask-based scoring where points are awarded only when all test cases in a subtask pass.
  - `VNOJContestFormat`: Standard VNOI contest scoring with 5-minute penalty and best submission tracking.
  - `AtCoderContestFormat`: Maximum points + completion time tiebreaker.
- **Judge Protocol & Optimization**:
  - **Short-Circuiting**: Automatically terminates subsequent test cases in a failed batch (`SC - Short-Circuited`), saving critical compute resources.
  - **Load Balancer (`balancer.py`)**: Least-load distribution across judge worker nodes with latency tracking and automatic failover.
  - **Bridge Event Dispatcher (`protocol.py`)**: Real-time packet streaming (`grading-begin`, `test-case-status`, `batch-end`, `grading-end`).

---

### 3. 🧠 Multi-Agent Autonomous Problem Solver
- **Automated Problem Formulation**: Parses raw text or problem statement images (OCR Vision), extracting constraints, I/O specifications, and edge cases.
- **Complexity Planning**: Uses the $10^8$ ops/second rule to design asymptotically optimal algorithms ($O(1)$, $O(\log N)$, $O(N)$, $O(N \log N)$).
- **Self-Healing & Auto-Debugging Loop**: Continuously compiles and tests solutions against sample and generated test cases. Automatically intercepts `WA`, `TLE`, `MLE`, `RTE` (SIGSEGV, SIGFPE), and `CE`, feeding diagnostics back into the LLM until reaching `AC`.
- **Cross-Language Converter**: Seamlessly translates algorithms between **C++17/20, Python 3, Java 17, C11, Rust, Go, JavaScript, TypeScript, C#, and Pascal**.

---

### 4. 💳 VietQR Subscription & Manual Admin Approval Workflow
- **Monthly Token Quota System**:
  - **Free Users (`user`)**: **30 complimentary AI requests per month** (Chat, Solve, Convert, OCR). Automatically renews on the 1st of every month with visual quota badges.
  - **Pro / Enterprise / Dev / Admin**: **100% Unlimited AI usage** with zero throttling.
- **Bank Transfer Verification Flow (Zero Auto-Exploit)**:
  1. User enters transfer sender name (`sender_name`) and scans VietQR code.
  2. Transaction is created in **`PENDING`** state. User role remains strictly `user` (no automatic privilege escalation).
  3. Real-time alert dispatched to **Dev & SuperAdmin** in the Admin Console (**"Thông Báo & Duyệt Gói"**).
  4. Dev / SuperAdmin cross-checks bank statement and performs 1-click action:
     - `[ ✓ Approve & Upgrade ]`: Upgrades user role to `PRO` or `ENTERPRISE`.
     - `[ ✕ Reject with Reason ]`: Rejects invalid transactions with reason logging.
  5. Cryptographic transaction validation with **HMAC-SHA256** tamper-proof digital signatures.

---

### 5. 👥 Developer Communities & Discussion Forum
- **Developer Communities**: Private and public clubs with join requests and membership controls.
- **Forum Discussions**: Multi-category discussion threads, pinned & locked topics.
- **Threaded Comments**: Multi-level nested replies on both Forum posts and Problem Bank challenges.
- **Vote Reactions**: Upvote / Downvote system with live counter updates.

---

### 6. 🛡️ Military-Grade Cybersecurity & Web Armor
- **Client-Side Web Armor (`web-armor.js`)**:
  - Blocks shortcut hijacking (`F12`, `Ctrl+Shift+I/J/C/K`, `Ctrl+U`, `Ctrl+S`) and right-click context menu scraping.
  - Anti-debugging tarpit loops activate for unauthorized users if DevTools is inspected.
  - Memory scraper neutralizer and `MutationObserver` DOM protection against injected malicious external scripts.
  - Anti-clickjacking iframe breakout protection.
- **Web Application Firewall (WAF)**:
  - Dangerous HTTP method blocker (`TRACE`, `TRACK`, `DEBUG`, `CONNECT` -> 405 Method Not Allowed).
  - Null-byte and path traversal filter (`%00`, `\x00`, `..%2f`, `..%5c` -> 400 Bad Request).
  - Threat scoring, honeypot traps, and automated scanner detection.
  - **Dev Immunity Rule**: The `dev` role holds absolute immunity from automated bans.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (64-bit recommended)
- **C++ Compiler**: `g++` (MinGW-w64 on Windows or GCC on Linux/macOS) with C++17/20 support.
- **Ollama / Local LLM / Cloud Endpoint**: Defaults to local models (`qwen2.5-coder:7b`, `gemma4`, `deepseek-coder-v2`).

### 1. 1-Click Startup (Windows)
Double-click either:
- **`CHAY_DU_AN.bat`** (or **`start.bat`** / **`run.bat`**)

The script will automatically configure `.venv`, verify dependencies, start the backend on `http://127.0.0.1:8000`, and launch your default browser.

### 2. Manual CLI Installation & Run
```bash
# Clone the repository
git clone https://github.com/hongquang699/Compiler---language.git
cd Compiler---language

# Create and activate virtual environment
python -m venv .venv
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
python run.py
```

### 3. Run Automated Verification Test Suite
```bash
# Run comprehensive system & DMOJ test suite (33 tests)
python -m unittest discover tests
```

---

## 📂 Project Structure

```text
Local-Ai/
├── CHAY_DU_AN.bat                 # 1-Click automated server & browser launcher
├── start.bat                      # Fast batch launcher
├── run.py                         # Python server launcher & browser opener
├── config.yaml                    # Core config (LLM model, g++ paths, timeouts, RAG)
├── requirements.txt               # Python dependencies
├── data/
│   ├── memory.db                  # SQLite database (Users, contests, submissions, payments)
│   ├── knowledge_base/            # RAG algorithm templates (DSU, Segment Tree, Dijkstra, etc.)
│   ├── media/                     # Problem images & user avatars
│   └── sandbox/                   # Ephemeral compile & execution binaries
├── security/
│   ├── crypto.py                  # SHA-256 streaming, HMAC-SHA256 signatures, JWT helpers
│   ├── middleware.py              # WAF, HTTP method filtering, X-Robots-Tag headers
│   └── sentinel_bot.py            # Threat analysis, honeypot traps & AST anti-cheat
├── backend/
│   ├── main.py                    # Modular FastAPI master entrypoint
│   ├── core/
│   │   ├── dependencies.py        # Centralized dependency injection & singletons
│   │   ├── config.py              # Configuration manager
│   │   ├── auth_helper.py         # Role levels & token helpers
│   │   └── storage.py             # File storage service
│   ├── routers/                   # 10 Decoupled Domain Routers
│   │   ├── auth.py                # Auth, registration, OTP, profiles, submissions
│   │   ├── admin.py               # Node judges, members, storage backup, GitHub sync
│   │   ├── problems.py            # Problem Bank, custom checkers, zip import, rejudge
│   │   ├── contests.py            # Contests arena, scoreboard, clarifications, freeze
│   │   ├── community.py           # Communities, forum posts, comments, reactions
│   │   ├── ai.py                  # AI Chat, solver pipeline, OCR vision, code convert
│   │   ├── rag.py                 # RAG search & knowledge indexing
│   │   ├── payments.py            # VietQR checkout & admin package approvals
│   │   ├── security.py            # IP block, Sentinel radar, anti-cheat logs
│   │   └── upload.py              # Avatars, problem images, AI attachments
│   ├── judge/                     # DMOJ / OJ-Master Judge Subsystem
│   │   ├── engine.py              # Master DMOJ Judge Engine (Short-circuit, subtasks)
│   │   ├── verdicts.py            # Standard Verdicts (AC, WA, TLE, MLE, RTE, CE, SC)
│   │   ├── pool.py                # Multi-worker execution pool
│   │   ├── balancer/              # Least-load balancing & health monitoring
│   │   ├── bridge/                # Real-time packet event dispatcher
│   │   ├── contest_format/        # ICPC, IOI Subtasks, VNOJ, AtCoder
│   │   └── graders/               # Standard, Exact, Float (1e-6), Custom Python
│   ├── tools/
│   │   ├── sandbox.py             # Process sandbox (timeout & memory limit)
│   │   ├── compiler.py            # Multi-language compiler wrapper
│   │   ├── tester.py              # Testrunner and batch execution
│   │   └── generator.py           # Boundary testcase synthesizer
│   ├── ai/
│   │   ├── agent.py               # Autonomous Solve Pipeline with self-debugging
│   │   ├── planner.py             # Algorithm design & complexity estimator
│   │   ├── prompt_engine.py       # Competitive Programming system prompts
│   │   ├── evaluator.py           # Static analysis & error diagnostics
│   │   ├── llm_client.py          # Ollama & LLM streaming client
│   │   └── vision_client.py       # OCR image extraction client
│   ├── rag/
│   │   ├── store.py               # Vector search & document retrieval
│   │   └── embedding.py           # Hybrid BM25 & vector embeddings
│   └── database/
│       └── db.py                  # SQLite storage, migrations & transactions
└── frontend/
    ├── landing.html               # SaaS Landing & Pricing Page (Served at /)
    ├── workspace.html             # Monaco Web IDE & Client Studio
    ├── admin-console.html         # Dedicated Dev & SuperAdmin Master Console
    ├── admin-problems.html        # Problem Studio & AI Authoring Studio
    ├── contest.html               # Contest Arena & Leaderboard
    ├── community.html             # Developer Communities & Forum Hub
    ├── problems.html              # Problem Bank explorer
    ├── css/                       # Cyberpunk IDE dark theme & glassmorphism
    └── js/                        # Modular frontend client scripts & Web Armor
```

---

## 👥 Role Hierarchy & Access Matrix

| Role | Level | AI Quota | Community Creation | Admin Console Access | Payment Approval |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`dev`** | **9 (Root)** | Unlimited | ✅ Allowed | Full Master Workspace (13 views) | ✅ Full Authority |
| **`superadmin`** | **8** | Unlimited | ✅ Allowed | Control Center (Contests, Users, IP, Notifs) | ✅ Full Authority |
| **`admin`** | **7** | Unlimited | ✅ Allowed | Contest & Problem Bank Workspace | ❌ Blocked (403) |
| **`enterprise`** | **5** | Unlimited | ✅ Allowed | ❌ No Access | ❌ No Access |
| **`pro`** | **3** | Unlimited | ✅ Allowed | ❌ No Access | ❌ No Access |
| **`user`** | **1** | 30 / month | ❌ Blocked (Must Upgrade) | ❌ No Access | ❌ No Access |

---

## 🔒 Security & Data Privacy

- **100% Local Execution**: All source code, AI prompts, and database records remain strictly within your local environment.
- **Isolated Process Sandboxing**: Compilations and executions run with constrained wall-clock timeouts and memory limits to prevent malicious system access (`fork` bombs, unauthorized syscalls).
- **PBKDF2 Password Hashing**: Cryptographically secure salts and PBKDF2-HMAC-SHA256 password storage.
- **Military-Grade Anti-Tampering**: Multi-layered browser armor, WAF method filtering, null-byte traversal sanitization, and Google search engine de-indexing.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Developed with ❤️ for the Competitive Programming & Algorithm Community.
