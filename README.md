# 🤖 LOCAL CP AI — Competitive Programming & Algorithm SaaS Studio

> **An Autonomous, Local-First AI Competitive Programming & Online Judge Ecosystem (C++, Python 3, Java, C, Rust, Go) with Real-Time Multi-Agent Pipelines, RAG Knowledge Hub, ClueOJ Contest Engine, Military-Grade Cybersecurity, VietQR Subscription Approval Workflow, and Community Hub.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python)](https://python.org)
[![SQLite](https://img.shields.io/badge/SQLite3-Database-003B57?style=flat-square&logo=sqlite)](https://sqlite.org)
[![Monaco Editor](https://img.shields.io/badge/Monaco_Editor-IDE-1e1e1e?style=flat-square&logo=visualstudiocode)](https://microsoft.github.io/monaco-editor/)
[![VietQR](https://img.shields.io/badge/VietQR-Manual_Approval-00b14f?style=flat-square)](https://vietqr.io)
[![Security](https://img.shields.io/badge/Security-HMAC--SHA256_%7C_WebArmor-red?style=flat-square)](https://csrc.nist.gov)
[![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)](#license)

---

## 🌟 Core Architecture & Features

### 1. 🧠 Multi-Agent Autonomous Problem Solver
- **Automated Problem Formulation**: Parses raw text or problem statement images (OCR Vision), extracts Input/Output specifications, constraints, and edge-cases.
- **Complexity Planning**: Uses the $10^8$ ops/second rule to design asymptotically optimal algorithms ($O(1)$, $O(\log N)$, $O(N)$, $O(N \log N)$).
- **Self-Healing & Auto-Debugging Loop**: Continuously compiles and tests solutions against sample and generated testcases. Automatically intercepts `WA`, `TLE`, `MLE`, `RTE` (SIGSEGV, SIGFPE), and `CE` errors, feeding diagnostics back into the LLM until reaching `AC`.
- **Cross-Language Solution Converter**: Seamlessly translates algorithms between **C++17/20, Python 3, Java 17, C11, Rust, and Go**.

### 2. ⚡ Multi-Language Sandbox & 5-Worker Judge Pool
- **Native Host Toolchains**: Auto-detects and orchestrates system compilers: `g++` (C++17/C++20 with `-O2`), `gcc`, `python3`, `javac/java`, `go`, and `Node.js`.
- **High-Precision Sandbox**: Process-level resource monitoring (CPU time limits, peak RAM/resident set size tracking, syscall filtering).
- **Distributed Judge Pool**: 5 independent concurrent judge workers for high-throughput stress testing and contest submissions.

### 3. 🏆 ClueOJ Contest Builder & Problem Bank
- **Official Contest Management**: Full support for ICPC & IOI contest formats, rated/unrated modes, access codes, and freeze/unfreeze scoreboards.
- **ClueOJ Problem Import**: One-click import from ClueOJ folders containing `init.yml`, test archives, and problem statements.
- **AI Testcase Synthesizer**: Generates boundary cases, extreme constraints ($N = 10^5$, negative numbers, disconnected graphs), and expected outputs from reference logic.

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

### 5. 👥 Developer Communities Hub
- **Access Gating**: Community creation is exclusively reserved for **`PRO`**, **`ENTERPRISE`**, **`ADMIN`**, **`SUPERADMIN`**, and **`DEV`** members.
- **Free User Guard**: Non-upgraded users attempting community creation receive `HTTP 403 Forbidden` and are guided to the VietQR upgrade modal.
- **Public & Private Communities**: Private communities feature join requests and approval controls by community owners.

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
- **Googlebot & Search Engine De-indexing**:
  - Comprehensive `robots.txt` disallowing all administrative routes and APIs.
  - `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">` in all console files.
  - `X-Robots-Tag: noindex, nofollow` HTTP response header for all admin endpoints.

### 7. 🔐 Cryptographic Integrity Suite (`security/crypto.py`)
- **Streaming SHA-256 Checksums**: High-speed chunked checksum computation for database backups, storage archives, and `ETag` headers.
- **HMAC-SHA256 Signature Verification**: Constant-time signature comparison for payment webhooks and telemetry reports.
- **Signed JWT Tokens**: HS256-signed session tokens for secure authentication.

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
# Run comprehensive system test suite
python -m unittest discover -s tests

# Run payment approval & security verification tests
python scratch/test_payment_approval_flow.py
python scratch/test_community_roles.py
```

---

## 📐 System Architecture

```
                                ┌──────────────────────────────────────────────┐
                                │           Monaco Web IDE Studio              │
                                │  (Playground, Agent, Chat, RAG, Vault, Admin) │
                                └──────────────────────┬───────────────────────┘
                                                       │ HTTP / SSE Stream
                                                       ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        FastAPI Application Server                                      │
│                                                                                                        │
│  ┌───────────────────────┐   ┌────────────────────────┐   ┌─────────────────────────────────────────┐  │
│  │   Auth & RBAC Layer   │   │  AI Agent Pipeline     │   │     Security & Sentinel Radar           │  │
│  │  (Token Auth, Dev/    │   │  (Planner, Evaluator,  │   │  (Anti-Cheat AST, Threat Scoring,       │  │
│  │   Admin Guards)       │   │   Self-Debugging Loop) │   │   Web Armor, WAF, Honeypots)            │  │
│  └──────────┬────────────┘   └───────────┬────────────┘   └────────────────────┬────────────────────┘  │
│             │                            │                                     │                       │
│  ┌──────────▼────────────┐   ┌───────────▼────────────┐   ┌────────────────────▼────────────────────┐  │
│  │   SQLite Memory DB    │   │   Local / Cloud LLM    │   │    Multi-Language Sandbox & Judges      │  │
│  │  (Users, Quota, Contests, │  (Ollama, DeepSeek,    │   │  (g++, gcc, python, java, go            │  │
│  │   Payments, Approvals)│   │   Qwen, Gemma, LLaMA)  │   │   5-Worker Isolated Execution Pool)     │  │
│  └───────────────────────┘   └────────────────────────┘   └─────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
Local-Ai/
├── CHAY_DU_AN.bat             # 1-Click automated server & browser launcher
├── start.bat                  # Fast batch launcher
├── run.bat                    # Shortcut launcher
├── run.py                     # Python server launcher & browser opener
├── config.yaml                # Core config (LLM model, g++ paths, timeouts, RAG)
├── requirements.txt           # Python dependencies
├── data/
│   ├── memory.db              # SQLite database (Users, contests, submissions, payments)
│   ├── knowledge_base/        # RAG algorithm templates (DSU, Segment Tree, Dijkstra, etc.)
│   ├── media/                 # Problem images & user avatars
│   └── sandbox/               # Ephemeral compile & execution binaries
├── security/
│   ├── crypto.py              # SHA-256 streaming, HMAC-SHA256 signatures, JWT helpers
│   └── middleware.py          # WAF, HTTP method filtering, X-Robots-Tag headers
├── backend/
│   ├── main.py                # Main FastAPI backend & REST / SSE endpoints
│   ├── core/
│   │   ├── config.py          # Configuration manager
│   │   └── auth_helper.py     # Role levels & token helpers
│   ├── ai/
│   │   ├── agent.py           # Multi-step Agent & Auto-Fixing Pipeline
│   │   ├── planner.py         # Algorithm design & complexity estimator
│   │   ├── prompt_engine.py   # Competitive Programming system prompts
│   │   ├── evaluator.py       # Static analysis & error diagnostics
│   │   ├── llm_client.py      # Ollama & LLM streaming client
│   │   └── vision_client.py   # OCR image extraction client
│   ├── tools/
│   │   ├── sandbox.py         # Resource-monitored execution environment
│   │   ├── compiler.py        # Compiler wrapper (g++, gcc, javac, rustc, go)
│   │   ├── tester.py          # Output validator & test evaluator
│   │   └── generator.py       # Boundary testcase synthesizer
│   ├── judge/
│   │   └── pool.py            # 5-Worker Judge Pool manager
│   ├── security/
│   │   └── sentinel.py        # Threat analysis, honeypot traps & AST anti-cheat
│   ├── rag/
│   │   ├── store.py           # Vector search & document retrieval
│   │   ├── embedding.py       # Hybrid BM25 & vector embeddings
│   │   └── loader.py          # Markdown & source code chunker
│   └── database/
│       └── db.py              # SQLite storage, payment approvals & migrations
└── frontend/
    ├── landing.html           # SaaS Landing & Pricing Page (Served at /)
    ├── index.html             # Monaco Web IDE & Client Application
    ├── admin-console.html     # Dedicated Dev & SuperAdmin Master Console
    ├── admin-problems.html    # Problem Studio & AI Authoring Studio
    ├── contest.html           # Contest Arena & Leaderboard
    ├── community.html         # Developer Communities Hub
    ├── css/
    │   ├── style.css          # Cyberpunk IDE dark theme & animations
    │   ├── admin.css          # Admin Console styles
    │   └── glassmorphism.css  # Glassmorphism UI effects
    └── js/
        ├── app.js             # Client IDE, AI Agent, Monaco & Quota logic
        ├── admin.js           # Admin Dashboard, Judge monitoring & Payment Approvals
        ├── admin-problems.js  # Problem authoring & test generator logic
        ├── competition.js     # Contest timers, scoreboard & submissions
        ├── community.js       # Communities management & permission gating
        ├── landing.js         # Landing page interactivity & VietQR modal
        └── web-armor.js       # Client-side anti-tampering & debugger traps
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
