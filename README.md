# 🤖 LOCAL CP AI — Competitive Programming & Algorithm Studio

> **An Autonomous, Local-First AI Competitive Programming & Online Judge Ecosystem (C++, Python 3, Java, C, Rust, Go) with Real-Time Multi-Agent Pipelines, RAG Knowledge Hub, ClueOJ Contest Engine, and Enterprise Security.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python)](https://python.org)
[![SQLite](https://img.shields.io/badge/SQLite3-Database-003B57?style=flat-square&logo=sqlite)](https://sqlite.org)
[![Monaco Editor](https://img.shields.io/badge/Monaco_Editor-IDE-1e1e1e?style=flat-square&logo=visualstudiocode)](https://microsoft.github.io/monaco-editor/)
[![VietQR](https://img.shields.io/badge/VietQR-Instant_Checkout-00b14f?style=flat-square)](https://vietqr.io)
[![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)](#license)

---

## 🌟 Core Highlights

### 1. 🧠 Multi-Agent Autonomous Problem Solver
- **Automated Problem Formulation**: Parses raw text or problem statement images (OCR Vision), extracts Input/Output specs, constraints, and edge-cases.
- **Complexity Planning**: Uses the $10^8$ ops/second rule to design asymptotically optimal algorithms ($O(1)$, $O(\log N)$, $O(N)$, $O(N \log N)$).
- **Self-Healing & Auto-Debugging Loop**: Continuously compiles and tests solutions against sample and generated testcases. Automatically intercepts `WA`, `TLE`, `MLE`, `RTE` (SIGSEGV, SIGFPE), and `CE` errors, feeding diagnostics back into the LLM until reaching `AC`.
- **Cross-Language Solution Converter**: Seamlessly translates algorithms between **C++17/20, Python 3, Java 17, C11, Rust, and Go**.

### 2. ⚡ Multi-Language Sandbox & 5-Worker Judge Pool
- **Native g++ / gcc / Python / Java / Rust / Go Sandbox**: High-precision execution monitoring (CPU time limits, peak RAM/resident set size tracking, process sandboxing).
- **Distributed Judge Pool**: 5 independent judge workers capable of concurrent benchmarking, test suite execution, and stress-testing.

### 3. 🏆 ClueOJ Contest Builder & Problem Bank
- **Official Contest Management**: Full support for ICPC & IOI contest formats, rated/unrated modes, access codes, and freeze/unfreeze scoreboards.
- **ClueOJ Problem Import**: One-click import from ClueOJ folders containing `init.yml`, test archives, and problem statements.
- **AI Testcase Synthesizer**: Generates boundary cases, extreme constraints ($N = 10^5$, negative numbers, disconnected graphs), and expected outputs from reference logic.

### 4. 🛡️ Enterprise Security Sentinel & Anti-Cheat Radar
- **Anti-Cheat Scanner**: AST similarity analysis and token frequency comparison across student and contestant submissions.
- **Web Security Radar**: Real-time IP threat scoring, automatic bot trapping, adaptive rate limiting, and 1-click IP blocking.
- **Strict Role-Based Access Control (RBAC)**:
  - **`DEV` (Level 9)**: Root master access to server storage, Nginx logs, 5 judge workers, LLM switching, and system reset.
  - **`SUPERADMIN` (Level 8)**: Full administrative authority over contests, members, security events, and IP bans.
  - **`ADMIN` (Level 7)**: Contest creation, problem bank editing, and testcase generation.
  - **`PRO` / `ENTERPRISE`**: Unlimited AI usage and community creation privileges.
  - **`USER`**: Free tier with 30 AI requests per month (automatically resets on the 1st of every month).

### 5. 💳 VietQR Instant Subscription & Quota Engine
- **Monthly Token Quota System**:
  - **Free Users**: **30 complimentary AI requests per month** (Chat, Solve, Convert, OCR). Automatically renews on the 1st of every month. Real-time visual badge tracking.
  - **Pro / Enterprise / Dev / Admin**: **100% Unlimited AI usage** with zero throttling.
- **Automated VietQR Integration**: Dynamic QR generation with memo reference codes and automated notification dispatch to `dev` and `superadmin` containing account username, transfer name, plan, and timestamp.

### 6. 🎨 Cyberpunk UI/UX Pro Max Web Studio
- **Monaco Editor Integration**: Custom `cp-aurora` dark theme, syntax highlighting, and auto-completion.
- **Smooth FAQ & Knowledge Navigation**: Hardware-accelerated CSS Grid accordions with real-time fuzzy search (`/` shortcut) and category pills.
- **Showcase Floating Scroll Controller**: Interactive neon scrollbar with progress slider and 1-click top/bottom navigation.
- **Unified Master Console**: Dedicated admin console (`admin-console.html`) and problem bank studio (`admin-problems.html`).

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (64-bit recommended)
- **C++ Compiler**: `g++` (MinGW-w64 on Windows or GCC on Linux/macOS) with C++17/20 support.
- **Ollama / Local LLM / Cloud Endpoint**: Defaults to local models (`gemma4`, `deepseek-coder-v2`, `qwen2.5-coder`, `llama3.1`).

### 1. Installation
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
```

### 2. Launch the Application
```bash
# 1-Click launcher (Starts FastAPI backend and opens browser at http://127.0.0.1:8000)
python run.py
```

### 3. Run System Test Suite
```bash
python -m unittest discover -s tests
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
│  │   Admin Guards)       │   │   Self-Debugging Loop) │   │   Honeypots, Rate Limiters)             │  │
│  └──────────┬────────────┘   └───────────┬────────────┘   └────────────────────┬────────────────────┘  │
│             │                            │                                     │                       │
│  ┌──────────▼────────────┐   ┌───────────▼────────────┐   ┌────────────────────▼────────────────────┐  │
│  │   SQLite Memory DB    │   │   Local / Cloud LLM    │   │    Multi-Language Sandbox & Judges      │  │
│  │  (Users, Quota, Contests, │  (Ollama, DeepSeek,    │   │  (g++, python, java, rust, go           │  │
│  │   Payments, Vault)    │   │   Qwen, Gemma, LLaMA)  │   │   5-Worker Isolated Execution Pool)     │  │
│  └───────────────────────┘   └────────────────────────┘   └─────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
Local-Ai/
├── run.py                     # 1-Click server launcher & browser opener
├── config.yaml                # Core config (LLM model, g++ paths, timeouts, RAG)
├── requirements.txt           # Python dependencies
├── data/
│   ├── memory.db              # SQLite database (Users, contests, submissions, payments)
│   ├── knowledge_base/        # RAG algorithm templates (DSU, Segment Tree, Dijkstra, etc.)
│   ├── media/                 # Problem images & user avatars
│   └── sandbox/               # Ephemeral compile & execution binaries
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
│       └── db.py              # SQLite storage & database migrations
└── frontend/
    ├── index.html             # Main IDE & Client Application
    ├── landing.html           # SaaS Landing & Pricing Page
    ├── admin-console.html     # Dedicated Dev & SuperAdmin Master Console
    ├── admin-problems.html    # Problem Studio & AI Authoring Studio
    ├── contest.html           # Contest Arena & Leaderboard
    ├── community.html         # Developer Communities Hub
    ├── css/
    │   ├── style.css          # Cyberpunk IDE dark theme & animations
    │   └── admin.css          # Admin Console styles
    └── js/
        ├── app.js             # Client IDE, AI Agent, Monaco & Quota logic
        ├── admin.js           # Admin Dashboard & Judge monitoring
        ├── admin-problems.js  # Problem authoring & test generator logic
        ├── competition.js     # Contest timers, scoreboard & submissions
        └── landing.js         # Landing page interactivity & VietQR modal
```

---

## 👥 Roles & Access Permissions

| Role | Hierarchy Level | Privileges & Access Scope |
| :--- | :---: | :--- |
| **`dev`** | **Level 9** | **Root Access**: Storage/Nginx monitor, 5 Judge workers, AI model switching, system reset, unlimited AI, all administrative actions. |
| **`superadmin`**| **Level 8** | Contest management, user role promotion/demotion, IP security bans, submission audits, unlimited AI. |
| **`admin`** | **Level 7** | Contest builder, problem bank authoring, AI test generation, unlimited AI. |
| **`enterprise`**| **Level 6** | Unlimited AI usage, community creation, priority queue. |
| **`pro`** | **Level 5** | Unlimited AI usage, community creation, standard priority. |
| **`user`** | **Level 2** | Free tier (30 AI requests limit), public contests, code playground. |

---

## 🔒 Security & Data Privacy

- **100% Local Execution**: All source code, AI prompts, and database records remain strictly within your local environment.
- **Isolated Process Sandboxing**: Compilations and executions run with constrained wall-clock timeouts and memory limits to prevent malicious system access (`fork` bombs, unauthorized syscalls).
- **PBKDF2 Password Hashing**: Cryptographically secure salts and PBKDF2-HMAC-SHA256 password storage.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Developed with ❤️ for the Competitive Programming & Algorithm Community.
