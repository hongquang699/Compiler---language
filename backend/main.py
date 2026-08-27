import os
import json
import shutil
import base64
import re
import yaml
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Header, Depends, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import BaseModel, Field

from backend.core.config import settings
from backend.core.email_helper import send_otp_email, generate_otp
from backend.core.storage import StorageService, is_valid_image, convert_to_webp, slugify
from backend.core.auth_helper import api_response, get_current_user_profile, role_required, ROLE_HIERARCHY
from backend.services.github_service import get_github_config, git_push, save_github_config, start_auto_push_scheduler, get_git_status, test_connection
from backend.database.db import DatabaseManager, MemoryStore
from backend.rag.store import KnowledgeStore
from backend.tools.compiler import CppCompiler, MultiLangCompiler
from backend.tools.sandbox import ProcessSandbox
from backend.tools.tester import TestRunner
from backend.tools.generator import EdgeCaseGenerator
from backend.tools.clueoj_loader import ClueOJProblemLoader
from backend.judge.service import JudgeService
from backend.judge.pool import JudgePool
from backend.ai.llm_client import LocalLLMClient
from backend.ai.agent import CppCodeAgent
from backend.ai.prompt_engine import PromptEngine
from backend.ai.evaluator import CodeEvaluator
from security.middleware import SecurityMiddleware
from security.sentinel_bot import sentinel_bot
from security.anti_cheat import anti_cheat_engine
from security.crypto import (
    compute_sha256,
    compute_file_sha256,
    create_hmac_sha256,
    verify_hmac_sha256,
    generate_signed_payload,
    verify_and_decode_signed_payload,
)


app = FastAPI(title="Local C++ Coding AI", version="1.0.0")

@app.on_event("startup")
async def start_background_services():
    start_auto_push_scheduler()
    import asyncio
    asyncio.create_task(sentinel_bot.start_background_scanner(interval_seconds=10))

SECRET_PAYLOAD_KEY = b"local_cp_secret_v5"

def decrypt_code_payload(payload: str) -> str:
    if not payload or not isinstance(payload, str):
        return payload or ""
    val = payload.strip()
    if val.startswith("ENC::"):
        raw_b64 = val[5:]
        try:
            raw_bytes = base64.b64decode(raw_b64)
            decrypted = bytes([b ^ SECRET_PAYLOAD_KEY[i % len(SECRET_PAYLOAD_KEY)] for i, b in enumerate(raw_bytes)])
            return decrypted.decode('utf-8')
        except Exception:
            return val
    if len(val) > 20 and " " not in val and "\n" not in val:
        try:
            decoded = base64.b64decode(val).decode('utf-8')
            if any(kw in decoded for kw in ["#include", "def ", "class ", "import ", "int main", "return"]):
                return decoded
        except Exception:
            pass
    return val


# ── 7-LAYER SECURITY & HARDENED CORS MIDDLEWARE ──────────────────────────────
app.add_middleware(
    SecurityMiddleware,
    requests_per_minute=120,
    max_request_size=10 * 1024 * 1024,
    block_minutes=10,
    db_path=settings.memory_settings.get("db_path", "data/memory.db"),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "X-RateLimit-Limit"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset", "Retry-After"],
)


# Initialize subsystems
db_manager = DatabaseManager(settings.memory_settings.get("db_path", "data/memory.db"))
memory_store = MemoryStore(db_manager)
sentinel_bot.db = db_manager

rag_store = KnowledgeStore(
    knowledge_dir=settings.rag_settings.get("knowledge_dir", "data/knowledge_base"),
    ollama_endpoint=settings.llm_settings.get("endpoint", "http://127.0.0.1:11434")
)

compiler = CppCompiler(
    gpp_path=settings.compiler_settings.get("gpp_path", "g++"),
    standard=settings.compiler_settings.get("standard", "c++17"),
    flags=settings.compiler_settings.get("flags"),
    temp_dir=settings.compiler_settings.get("temp_dir", "data/sandbox")
)

sandbox = ProcessSandbox(
    timeout_seconds=settings.sandbox_settings.get("timeout_seconds", 2.0),
    memory_limit_mb=settings.sandbox_settings.get("memory_limit_mb", 256),
    max_output_length=settings.sandbox_settings.get("max_output_length", 50000)
)

test_runner = TestRunner(compiler=compiler, sandbox=sandbox)
judge_service = JudgeService(test_runner)
judge_pool = JudgePool(test_runner, worker_count=5)
clueoj_loader = ClueOJProblemLoader()

llm_client = LocalLLMClient(
    endpoint=settings.llm_settings.get("endpoint", "http://127.0.0.1:11434"),
    model=settings.llm_settings.get("model", "gemma4:latest"),
    timeout_seconds=settings.llm_settings.get("timeout_seconds", 120)
)

vision_llm_client = LocalLLMClient(
    endpoint=settings.llm_settings.get("endpoint", "http://127.0.0.1:11434"),
    model=settings.llm_settings.get("vision_model", "qwen2.5vl:7b"),
    timeout_seconds=settings.llm_settings.get("timeout_seconds", 120)
)

code_agent = CppCodeAgent(llm_client=llm_client, rag_store=rag_store, test_runner=test_runner)

# Request Models
class ChatRequest(BaseModel):
    session_id: str
    message: str
    language: Optional[str] = "cpp"
    include_rag: bool = True
    stream: bool = False

class AgentSolveRequest(BaseModel):
    problem_statement: str
    testcases: Optional[List[Dict[str, str]]] = None
    language: Optional[str] = "cpp"
    max_retries: int = 2
    session_id: Optional[str] = None

class CompileRunRequest(BaseModel):
    source_code: str
    testcases: List[Dict[str, str]]
    language: Optional[str] = "cpp"
    timeout_seconds: Optional[int] = 2
    session_id: Optional[str] = None

class CodeConvertRequest(BaseModel):
    source_code: str
    from_language: str = "cpp"
    to_language: str = "python"
    problem_statement: Optional[str] = ""
    testcases: Optional[List[Dict[str, str]]] = None


class ModelSwitchRequest(BaseModel):
    model: str

class BlockIpRequest(BaseModel):
    ip: str
    reason: str = "admin_blocked"
    minutes: int = 10

class SentinelModeRequest(BaseModel):
    mode: str

class SentinelSkillExecuteRequest(BaseModel):
    skill_name: str
    target: Optional[str] = None
    params: Optional[Dict[str, Any]] = None

class AntiCheatScanRequest(BaseModel):
    threshold: Optional[float] = 60.0

class AntiCheatVerdictRequest(BaseModel):
    report_id: int
    verdict: str
    details: Optional[str] = ""

class DevManualBanRequest(BaseModel):
    user_id: Optional[int] = None
    ip: Optional[str] = None
    reason: str = "Dev Manual Ban"
    minutes: int = 1440

class DevManualUnbanRequest(BaseModel):
    user_id: Optional[int] = None
    ip: Optional[str] = None

class DevToggleBotRequest(BaseModel):
    active: bool

class ClientTamperReportRequest(BaseModel):
    type: str
    details: str
    url: Optional[str] = ""
    timestamp: Optional[str] = ""

class UpdateUserRoleRequest(BaseModel):
    role: str

class ProblemSaveRequest(BaseModel):
    title: str
    category: str
    complexity_time: str
    complexity_space: str
    solution_code: str
    notes: Optional[str] = ""
    verdict: Optional[str] = "AC"

class SendCodeRequest(BaseModel):
    email: str

class AuthRequest(BaseModel):
    username: Optional[str] = None
    login: Optional[str] = None
    password: str
    email: Optional[str] = None
    verification_code: Optional[str] = None
    remember: bool = False

class UserCodeSaveRequest(BaseModel):
    title: str
    language: str = "cpp"
    source_code: str

class ProblemBankSubmissionRequest(BaseModel):
    source_code: str
    language: str = "python"

class CompetitionRequest(BaseModel):
    title: str
    key: Optional[str] = None
    statement: str
    status: str = "draft"
    format: str = "icpc"
    is_rated: bool = True
    access_code: Optional[str] = ""
    scoreboard_visibility: str = "visible"
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    tests: List[Dict[str, str]] = Field(default_factory=list)
    problems: List[Dict[str, Any]] = Field(default_factory=list)

class CompetitionTestsRequest(BaseModel):
    prompt: str
    count: int = 5

class CompetitionSubmissionRequest(BaseModel):
    source_code: str
    language: str = "cpp"
    problem_id: Optional[int] = None

class ClueOJImportRequest(BaseModel):
    competition_id: int
    problem_dir: str
    statement: str = ""

class LockUserRequest(BaseModel):
    locked: bool

class UpdateProfileRequest(BaseModel):
    fullname: Optional[str] = None
    bio: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    editor_theme: Optional[str] = None
    avatar_path: Optional[str] = None

class DeleteIpRequest(BaseModel):
    ip: str

class GitHubConfigRequest(BaseModel):
    auto_push: bool = False
    backup_time_1: str = "02:00"
    backup_time_2: str = "14:00"
    backup_time_3: str = "20:00"
    trigger_count: int = 0
    push_on_event: bool = True
    custom_commit_prefix: Optional[str] = "Auto CP Studio Sync"

class GitHubPushRequest(BaseModel):
    commit_message: Optional[str] = None

class AdminProblemCreateRequest(BaseModel):
    title: str
    statement: str = ""
    points: int = 100
    time_limit: float = 1.0
    memory_limit: int = 256
    code: str = "A"
    competition_id: Optional[int] = None
    tests: List[Dict[str, Any]] = Field(default_factory=list)
    is_hidden: bool = False

class AdminProblemUpdateRequest(BaseModel):
    title: str
    statement: str = ""
    points: int = 100
    time_limit: float = 1.0
    memory_limit: int = 256
    code: str = "A"
    tests: Optional[List[Dict[str, Any]]] = None
    is_hidden: Optional[bool] = None

class AdminProblemVisibilityRequest(BaseModel):
    is_hidden: Optional[bool] = None

class AdminProblemBulkActionRequest(BaseModel):
    problem_ids: List[int]
    action: str  # 'hide', 'unhide', 'delete'

class AdminProblemTestsUpdateRequest(BaseModel):
    tests: List[Dict[str, Any]] = Field(default_factory=list)

class AIGenerateTestsFromCodeRequest(BaseModel):
    statement: Optional[str] = ""
    solution_code: str
    language: str = "cpp"
    count: int = 5

def current_user(request: Request, authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để sử dụng tính năng này.")
    raw_user = memory_store.get_user_by_token(authorization[7:].strip())
    if not raw_user:
        raise HTTPException(status_code=401, detail="Phiên đăng nhập không hợp lệ.")
    client_ip = request.client.host if request.client else "unknown"
    memory_store.record_user_ip(raw_user["id"], client_ip)
    user = get_current_user_profile(raw_user)
    user["competition_joined"] = memory_store.has_competition_participation(user["id"])
    user["ai_quota"] = memory_store.get_user_ai_quota(user["id"])
    return user

def optional_user(request: Request, authorization: Optional[str] = Header(default=None)) -> Optional[Dict[str, Any]]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    raw_user = memory_store.get_user_by_token(authorization[7:].strip())
    if not raw_user:
        return None
    try:
        user = get_current_user_profile(raw_user)
        user["competition_joined"] = memory_store.has_competition_participation(user["id"])
        user["ai_quota"] = memory_store.get_user_ai_quota(user["id"])
        return user
    except Exception:
        return None

def bearer_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Phiên đăng nhập không hợp lệ.")
    return authorization[7:].strip()


def get_user_level(user: Dict[str, Any]) -> int:
    username = str(user.get("username", "")).lower()
    if username == "dev":
        return 9
    role = str(user.get("role", "user")).lower()
    return ROLE_HIERARCHY.get(role, 7 if user.get("is_admin") else 2)

def admin_required(user: Dict[str, Any] = Depends(current_user)):
    if get_user_level(user) < 7:
        raise HTTPException(status_code=403, detail="Yêu cầu quyền Quản trị viên (ADMIN) trở lên.")
    return user

def superadmin_required(user: Dict[str, Any] = Depends(current_user)):
    if get_user_level(user) < 8:
        raise HTTPException(status_code=403, detail="Yêu cầu quyền Tổng Quản trị (SUPERADMIN) trở lên.")
    return user

def dev_required(user: Dict[str, Any] = Depends(current_user)):
    role = str(user.get("role", "")).strip().lower()
    if get_user_level(user) < 9 and role not in {"dev", "developer"}:
        raise HTTPException(status_code=403, detail="Yêu cầu quyền Nhà phát triển (DEV) mới có quyền truy cập tính năng này.")
    return user

def ai_access_required(user: Dict[str, Any] = Depends(current_user)):
    if not user.get("is_admin") and memory_store.has_competition_participation(user["id"]):
        raise HTTPException(status_code=403, detail="Bạn đã tham gia cuộc thi nên AI Agent và Assistant đã bị khóa.")
    
    try:
        quota_info = memory_store.check_and_increment_ai_usage(user["id"])
        user["ai_quota"] = quota_info
    except PermissionError as pe:
        raise HTTPException(
            status_code=429,
            detail=str(pe),
            headers={"X-AI-Limit-Reached": "true"}
        )
    return user

verification_codes: Dict[str, Dict[str, Any]] = {}

@app.post("/api/auth/send-verification-code")
async def send_verification_code(req: SendCodeRequest):
    email = req.email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(status_code=400, detail="Địa chỉ email không hợp lệ.")
    
    with db_manager.get_connection() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email này đã được đăng ký bởi tài khoản khác.")
    
    code = generate_otp()
    verification_codes[email] = {
        "code": code,
        "expires_at": time.time() + 600
    }
    
    import asyncio
    sent = await asyncio.to_thread(send_otp_email, email, code)
    
    if sent:
        return {
            "success": True,
            "message": f"Mã xác thực 6 số đã được gửi tới email {email}. Vui lòng kiểm tra hộp thư của bạn."
        }
    else:
        print(f"\n[EMAIL VERIFICATION OTP] (Fallback) Code for {email}: {code}\n")
        return {
            "success": True,
            "message": f"Không thể gửi email. Mã OTP thử nghiệm của bạn là: {code}",
            "demo_code": code
        }

@app.post("/api/auth/register")
async def register(req: AuthRequest):
    username = req.username.strip()
    if len(username) < 3 or len(username) > 32 or not username.replace("_", "").isalnum():
        raise HTTPException(status_code=400, detail="Tên tài khoản cần 3-32 ký tự chữ, số hoặc dấu gạch dưới.")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu cần ít nhất 6 ký tự.")
    email = (req.email or "").strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(status_code=400, detail="Email không hợp lệ.")
    
    code = (req.verification_code or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="Vui lòng nhập mã xác thực Email (OTP 6 số).")
    
    stored = verification_codes.get(email)
    if not stored or stored["code"] != code or time.time() > stored["expires_at"]:
        raise HTTPException(status_code=400, detail="Mã xác thực Email không đúng hoặc đã hết hạn (10 phút).")
    
    try:
        user = memory_store.create_user(username, email, req.password)
    except Exception as exc:
        if "UNIQUE" in str(exc).upper():
            raise HTTPException(status_code=409, detail="Tên tài khoản hoặc Email đã tồn tại.")
        raise
    
    verification_codes.pop(email, None)
    user["competition_joined"] = False
    return {"user": user, "token": memory_store.create_auth_token(user["id"], remember=req.remember)}

@app.post("/api/auth/login")
async def login(req: AuthRequest):
    login_value = (req.username or req.login or req.email or "").strip()
    user = memory_store.authenticate_user(login_value, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Tên tài khoản hoặc mật khẩu không đúng.")
    user["competition_joined"] = memory_store.has_competition_participation(user["id"])
    return {"user": user, "token": memory_store.create_auth_token(user["id"], remember=req.remember)}

@app.get("/api/auth/me")
async def get_me(request: Request, user: Dict[str, Any] = Depends(current_user)):
    client_ip = request.client.host if request.client else "unknown"
    role = str(user.get("role", "")).lower()
    is_admin = bool(user.get("is_admin") or role in ["dev", "superadmin", "admin"])
    is_dev_ip = client_ip in {"127.0.0.1", "::1", "localhost", "testclient"} or client_ip.startswith("127.")
    can_access_admin = is_admin or (is_dev_ip and role in ["dev", "superadmin", "admin"])
    return {
        "user": user,
        "role": role,
        "is_admin": is_admin,
        "client_ip": client_ip,
        "is_dev_ip": is_dev_ip,
        "can_access_admin": can_access_admin,
        **user
    }

@app.get("/api/user/ai-quota")
async def get_user_ai_quota_endpoint(user: Dict[str, Any] = Depends(current_user)):
    """Return the current user's AI quota and token usage status."""
    quota = memory_store.get_user_ai_quota(user["id"])
    return {"quota": quota, "user_id": user["id"], "username": user.get("username", "")}

@app.post("/api/admin/users/{target_user_id}/reset-ai-quota")
async def admin_reset_user_ai_quota(target_user_id: int, user: Dict[str, Any] = Depends(admin_required)):
    """Reset a user's AI usage count to 0 (Admin/Dev)."""
    memory_store.reset_ai_usage(target_user_id)
    return {"success": True, "user_id": target_user_id, "ai_usage_count": 0}

@app.get("/api/user/profile")
async def get_my_profile(
    username: Optional[str] = None,
    user_id: Optional[int] = None,
    authorization: Optional[str] = Header(default=None)
):
    target_user_id = None
    if user_id:
        target_user_id = user_id
    elif username:
        u = memory_store.get_user_by_username(username)
        if not u:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy người dùng '{username}'.")
        target_user_id = u["id"]
    else:
        token = bearer_token(authorization)
        user = memory_store.get_user_by_token(token) if token else None
        if user:
            target_user_id = user["id"]
        else:
            with memory_store.db.get_connection() as conn:
                u_row = conn.execute("SELECT id FROM users ORDER BY is_admin DESC, id ASC LIMIT 1").fetchone()
                if u_row:
                    target_user_id = u_row["id"]
                else:
                    raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để xem thông tin tài khoản của bạn.")

    profile_data = memory_store.get_user_profile_stats(target_user_id)
    if not profile_data:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ người dùng.")
    return profile_data

@app.post("/api/user/profile")
async def update_my_profile(req: UpdateProfileRequest, authorization: Optional[str] = Header(default=None)):
    token = bearer_token(authorization)
    user = memory_store.get_user_by_token(token) if token else None
    if not user:
        with memory_store.db.get_connection() as conn:
            u_row = conn.execute("SELECT id FROM users ORDER BY is_admin DESC, id ASC LIMIT 1").fetchone()
            user = {"id": u_row["id"]} if u_row else None
    
    if not user:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để chỉnh sửa thông tin.")
    
    ok = memory_store.update_user_profile(
        user_id=user["id"],
        fullname=req.fullname,
        bio=req.bio,
        timezone=req.timezone,
        language=req.language,
        editor_theme=req.editor_theme,
        avatar_path=req.avatar_path,
    )
    return {"success": ok}

@app.get("/api/user/submissions")
async def get_my_submissions(limit: int = 50, authorization: Optional[str] = Header(default=None)):
    token = bearer_token(authorization)
    user = memory_store.get_user_by_token(token) if token else None
    if not user:
        with memory_store.db.get_connection() as conn:
            u_row = conn.execute("SELECT id FROM users ORDER BY is_admin DESC, id ASC LIMIT 1").fetchone()
            user = {"id": u_row["id"]} if u_row else None
    
    if not user:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để xem lịch sử bài nộp.")
    
    return memory_store.list_user_submissions(user["id"], limit=limit)

@app.get("/api/user/submissions/{submission_id}")
async def get_my_submission_detail(submission_id: int, authorization: Optional[str] = Header(default=None)):
    sub = memory_store.get_submission_detail(submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài nộp.")
    return sub

@app.post("/api/auth/logout")
async def logout(authorization: Optional[str] = Header(default=None)):
    memory_store.revoke_auth_token(bearer_token(authorization))
    return {"success": True}

# API Routes
@app.get("/api/health")
async def get_health():
    llm_health = await llm_client.check_health()
    available_langs = compiler.detect_available_languages()
    
    # Check compiler
    comp_res = compiler.prepare_and_compile("int main(){return 0;}", language="cpp", custom_name="health_check")
    compiler_ok = comp_res["success"]

    return {
        "status": "online",
        "llm": llm_health,
        "compiler": {
            "status": "ready" if compiler_ok else "error",
            "gpp_path": compiler.gpp_path,
            "standard": "c++17",
            "error": comp_res.get("compiler_output") if not compiler_ok else None
        },
        "languages": available_langs,
        "rag": {
            "indexed_documents": len(rag_store.documents),
            "directory": rag_store.knowledge_dir
        }
    }


@app.post("/api/settings/model")
async def switch_model(req: ModelSwitchRequest, user: Dict[str, Any] = Depends(current_user)):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Chỉ quản trị viên mới được đổi model AI.")
    settings.update_llm_model(req.model)
    llm_client.model = req.model
    return {"success": True, "current_model": req.model}


@app.get("/api/admin/overview")
async def admin_overview(user: Dict[str, Any] = Depends(admin_required)):
    data = memory_store.get_overview()
    data["current_model"] = settings.llm_settings.get("model", llm_client.model)
    return data


@app.get("/api/admin/members")
async def admin_members(user: Dict[str, Any] = Depends(admin_required)):
    return {"members": memory_store.list_members()}

@app.get("/api/admin/judges")
async def admin_judges(user: Dict[str, Any] = Depends(admin_required)):
    return {
        "judges": judge_pool.status(),
        "checked_at": datetime.now().isoformat(),
    }


@app.get("/api/admin/submissions")
async def admin_list_submissions(limit: int = 100, user: Dict[str, Any] = Depends(admin_required)):
    return memory_store.list_all_submissions(limit=limit)

@app.post("/api/admin/judges/{judge_id}/toggle")
async def admin_toggle_judge(judge_id: str, enabled: bool, user: Dict[str, Any] = Depends(dev_required)):
    try:
        judge = judge_pool.toggle(judge_id, enabled)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"success": True, "judge": judge}


@app.post("/api/admin/judges/{judge_id}/benchmark")
async def admin_benchmark_judge(judge_id: str, user: Dict[str, Any] = Depends(admin_required)):
    t0 = datetime.now()
    res = judge_pool.judge("#include<iostream>\nusing namespace std;\nint main(){cout<<\"OK\";return 0;}", "cpp", [{"input":"", "expected":"OK"}], timeout=1.0)
    latency_ms = round((datetime.now() - t0).total_seconds() * 1000, 2)
    return {
        "success": res.get("overall_verdict") == "AC",
        "judge_id": judge_id,
        "verdict": res.get("overall_verdict"),
        "latency_ms": latency_ms,
        "compile_time_ms": res.get("compile_time_ms", 0),
        "detail": res
    }

@app.get("/api/admin/monitoring")
async def admin_monitoring(user: Dict[str, Any] = Depends(admin_required)):
    judges = judge_pool.status()
    return {
        "service": "online",
        "judges": judges,
        "total_jobs": sum(item["active_jobs"] + item["completed_jobs"] + item["failed_jobs"] for item in judges),
        "active_jobs": sum(item["active_jobs"] for item in judges),
        "completed_jobs": sum(item["completed_jobs"] for item in judges),
        "failed_jobs": sum(item["failed_jobs"] for item in judges),
        "checked_at": datetime.now().isoformat(),
    }

@app.post("/api/admin/monitoring/health-check")
async def admin_monitoring_health_check(user: Dict[str, Any] = Depends(dev_required)):
    judges = judge_pool.status()
    return {"success": True, "message": "Đã kiểm tra toàn bộ máy chấm.", "judges": judges, "checked_at": datetime.now().isoformat()}


# ===================================================================
# STORAGE & BACKUP MONITORING ENDPOINTS (DEV ONLY)
# ===================================================================
@app.get("/api/admin/storage/stats")
async def admin_storage_stats(user: Dict[str, Any] = Depends(dev_required)):
    def get_dir_size(path: Path) -> int:
        total = 0
        if not path.exists():
            return 0
        if path.is_file():
            return path.stat().st_size
        for entry in path.rglob('*'):
            if entry.is_file():
                try:
                    total += entry.stat().st_size
                except Exception:
                    pass
        return total

    db_path = Path("data/memory.db")
    db_size = db_path.stat().st_size if db_path.exists() else 0
    
    python_300_path = Path("data/python_300_kids")
    python_300_size = get_dir_size(python_300_path)
    
    media_path = Path("data/media")
    media_size = get_dir_size(media_path)
    
    sandbox_path = Path("data/sandbox")
    sandbox_size = get_dir_size(sandbox_path)
    
    logs_path = Path("logs")
    logs_size = get_dir_size(logs_path)
    
    backups_path = Path("backups")
    backups_size = get_dir_size(backups_path)
    
    backups = []
    if backups_path.exists():
        for b in sorted(backups_path.glob("localcp_backup_*.zip"), key=lambda x: x.stat().st_mtime, reverse=True):
            backups.append({
                "filename": b.name,
                "size_mb": round(b.stat().st_size / (1024 * 1024), 2),
                "sha256": compute_file_sha256(str(b)),
                "created_at": datetime.fromtimestamp(b.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")
            })

    total_space, used_space, free_space = shutil.disk_usage(".")
    
    db_counts = {}
    try:
        with db_manager.get_connection() as conn:
            cur = conn.cursor()
            for tbl in ["users", "competitions", "competition_problems", "problem_tests", "submissions", "ai_chat_sessions"]:
                try:
                    cur.execute(f"SELECT COUNT(*) FROM {tbl}")
                    db_counts[tbl] = cur.fetchone()[0]
                except Exception:
                    db_counts[tbl] = 0
    except Exception:
        pass

    return {
        "database": {
            "path": str(db_path),
            "size_mb": round(db_size / (1024 * 1024), 2),
            "sha256": compute_file_sha256(str(db_path)),
            "counts": db_counts
        },
        "problem_bank": {
            "path": str(python_300_path),
            "size_mb": round(python_300_size / (1024 * 1024), 2),
            "problems_count": db_counts.get("competition_problems", 300),
            "tests_count": db_counts.get("problem_tests", 9000),
            "chapters_count": 30
        },
        "media": {
            "path": str(media_path),
            "size_mb": round(media_size / (1024 * 1024), 2),
            "avatars_count": len(list(Path("data/media/avatars").glob("*"))) if Path("data/media/avatars").exists() else 0,
            "images_count": len(list(Path("data/media/problem_images").glob("*"))) if Path("data/media/problem_images").exists() else 0
        },
        "sandbox": {
            "path": str(sandbox_path),
            "size_mb": round(sandbox_size / (1024 * 1024), 2),
            "active_temp_files": len(list(sandbox_path.glob("*"))) if sandbox_path.exists() else 0
        },
        "logs": {
            "path": str(logs_path),
            "size_mb": round(logs_size / (1024 * 1024), 2)
        },
        "backups": {
            "path": str(backups_path),
            "size_mb": round(backups_size / (1024 * 1024), 2),
            "total_backups": len(backups),
            "latest_backup": backups[0]["created_at"] if backups else "Chưa có",
            "items": backups
        },
        "disk": {
            "total_gb": round(total_space / (1024**3), 1),
            "used_gb": round(used_space / (1024**3), 1),
            "free_gb": round(free_space / (1024**3), 1),
            "percent_used": round((used_space / total_space) * 100, 1)
        },
        "checked_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

@app.post("/api/admin/storage/backup")
async def admin_create_backup(user: Dict[str, Any] = Depends(dev_required)):
    import zipfile
    root_dir = Path(".")
    backup_dir = root_dir / "backups"
    backup_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"localcp_backup_{timestamp}.zip"
    backup_filepath = backup_dir / backup_filename
    
    items_to_backup = [
        root_dir / "data" / "memory.db",
        root_dir / "data" / "python_300_kids",
        root_dir / "data" / "media",
        root_dir / ".env"
    ]
    
    with zipfile.ZipFile(backup_filepath, "w", zipfile.ZIP_DEFLATED) as zipf:
        for item in items_to_backup:
            if not item.exists():
                continue
            if item.is_file():
                zipf.write(item, item.relative_to(root_dir))
            elif item.is_dir():
                for root, _, files in os.walk(item):
                    if "sandbox" in root:
                        continue
                    for file in files:
                        full_p = Path(root) / file
                        zipf.write(full_p, full_p.relative_to(root_dir))
                        
    size_mb = round(backup_filepath.stat().st_size / (1024 * 1024), 2)
    sha256_checksum = compute_file_sha256(str(backup_filepath))
    return {
        "success": True,
        "message": f"Tạo bản sao lưu thành công: {backup_filename} ({size_mb} MB)",
        "filename": backup_filename,
        "size_mb": size_mb,
        "sha256": sha256_checksum,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

@app.get("/api/admin/storage/backups/{filename}/download")
async def admin_download_backup(filename: str, user: Dict[str, Any] = Depends(dev_required)):
    safe_name = Path(filename).name
    filepath = Path("backups") / safe_name
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp sao lưu.")
    sha256_checksum = compute_file_sha256(str(filepath))
    return FileResponse(
        path=str(filepath),
        filename=safe_name,
        media_type="application/zip",
        headers={
            "X-Checksum-SHA256": sha256_checksum,
            "ETag": f'"{sha256_checksum}"'
        }
    )

@app.delete("/api/admin/storage/backups/{filename}")
async def admin_delete_backup(filename: str, user: Dict[str, Any] = Depends(dev_required)):
    safe_name = Path(filename).name
    filepath = Path("backups") / safe_name
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp sao lưu.")
    filepath.unlink()
    return {"success": True, "message": f"Đã xóa bản sao lưu {safe_name}"}


@app.get("/api/admin/members/{user_id}")
async def admin_member_detail(user_id: int, user: Dict[str, Any] = Depends(admin_required)):
    detail = memory_store.get_member_detail(user_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    return detail


@app.put("/api/admin/members/{user_id}/role")
async def admin_update_user_role(user_id: int, req: UpdateUserRoleRequest, user: Dict[str, Any] = Depends(superadmin_required)):
    role = req.role.lower().strip()
    valid_roles = ["user", "contestant", "moderator", "admin", "superadmin", "dev"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Quyền không hợp lệ. Chỉ chấp nhận: {', '.join(valid_roles)}")
    if user_id == user["id"] and role not in ["admin", "superadmin", "dev"]:
        raise HTTPException(status_code=400, detail="Bạn không thể tự gỡ quyền Quản trị của chính tài khoản mình.")
    
    # Chỉ có DEV mới được phép cấp vai trò DEV hoặc SUPERADMIN
    if role in ["dev", "superadmin"] and user.get("role") != "dev":
        sentinel_bot.skill_evaluate_and_react(
            ip="unknown",
            event_type="privilege_escalation_attempt",
            details=f"Unauthorized attempt to promote user #{user_id} to '{role}' by user '{user.get('username')}'",
            user=user
        )
        raise HTTPException(status_code=403, detail="Chỉ có DEV mới có quyền cấp vai trò DEV hoặc SUPERADMIN.")
    
    success = memory_store.update_user_role(user_id, role)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    sentinel_bot._log_sentinel_action("ROLE_CHANGE", target_user_id=user_id, reason=f"Role updated to '{role}'", details=f"Action by {user.get('username')}")
    return {"success": True, "message": f"Đã cập nhật quyền thành công thành '{role.upper()}'.", "user_id": user_id, "role": role}


@app.get("/api/admin/export-members")
async def admin_export_members(user: Dict[str, Any] = Depends(superadmin_required)):
    return {
        "exported_at": __import__("datetime").datetime.now().isoformat(),
        "members": memory_store.export_members(),
    }


@app.post("/api/admin/block-ip")
async def admin_block_ip(req: BlockIpRequest, user: Dict[str, Any] = Depends(superadmin_required)):
    ip = req.ip.strip()
    if not ip or len(ip) > 64:
        raise HTTPException(status_code=400, detail="Địa chỉ IP không hợp lệ.")
    minutes = max(5, min(req.minutes, 60))
    if ip in {"127.0.0.1", "::1", "localhost"}:
        raise HTTPException(status_code=400, detail="Không thể chặn IP localhost/dev.")
    memory_store.block_ip(ip, req.reason.strip() or "admin_blocked", minutes=minutes)
    sentinel_bot._log_sentinel_action("IP_BLOCK", target_ip=ip, reason=req.reason.strip() or "admin_blocked", details=f"Blocked {minutes}m by {user.get('username')}")
    return {"success": True, "ip": ip, "blocked_minutes": minutes}


@app.post("/api/admin/settings/model")
async def admin_switch_model(req: ModelSwitchRequest, user: Dict[str, Any] = Depends(dev_required)):
    settings.update_llm_model(req.model)
    llm_client.model = req.model
    sentinel_bot._log_sentinel_action("MODEL_SWITCH", reason=f"Model switched to {req.model}", details=f"Action by Dev {user.get('username')}")
    return {"success": True, "current_model": req.model}


@app.post("/api/admin/reset")
async def admin_reset_system(user: Dict[str, Any] = Depends(dev_required)):
    memory_store.reset_server_state()
    default_model = settings.llm_settings.get("model", "gemma4:latest")
    llm_client.model = default_model
    sentinel_bot._log_sentinel_action("SYSTEM_RESET", reason="System factory reset", details=f"Action by Dev {user.get('username')}")
    return {"success": True, "message": "Hệ thống đã được reset thành công.", "current_model": default_model}


@app.get("/api/admin/github")
async def admin_get_github_config(user: Dict[str, Any] = Depends(dev_required)):
    return get_github_config()


@app.get("/api/admin/github/status")
async def admin_get_github_status(user: Dict[str, Any] = Depends(dev_required)):
    return get_git_status()


@app.post("/api/admin/github/test-connection")
async def admin_github_test_connection(user: Dict[str, Any] = Depends(dev_required)):
    return test_connection()


@app.put("/api/admin/github")
async def admin_save_github_config(req: GitHubConfigRequest, user: Dict[str, Any] = Depends(dev_required)):
    try:
        config = save_github_config(req.auto_push, req.backup_time_1, req.backup_time_2, req.backup_time_3, req.trigger_count, req.push_on_event, req.custom_commit_prefix or "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"success": True, "config": config}


@app.post("/api/admin/github/push")
async def admin_github_push(req: GitHubPushRequest, user: Dict[str, Any] = Depends(dev_required)):
    result = git_push(req.commit_message)
    return result


@app.put("/api/admin/members/{user_id}/lock")
async def admin_lock_user(user_id: int, req: LockUserRequest, user: Dict[str, Any] = Depends(superadmin_required)):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Bạn không thể tự khóa tài khoản của mình.")
    success = memory_store.lock_user(user_id, req.locked)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    action = "khóa" if req.locked else "mở khóa"
    return {"success": True, "message": f"Đã {action} tài khoản thành công.", "user_id": user_id, "is_locked": req.locked}


@app.delete("/api/admin/members/{user_id}")
async def admin_delete_user(user_id: int, user: Dict[str, Any] = Depends(dev_required)):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Bạn không thể xóa tài khoản của chính mình.")
    success = memory_store.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    return {"success": True, "message": "Đã xóa tài khoản thành công.", "user_id": user_id}


@app.get("/api/admin/security/blocked-ips")
async def admin_list_blocked_ips(user: Dict[str, Any] = Depends(superadmin_required)):
    return {"blocked_ips": memory_store.list_blocked_ips()}


@app.delete("/api/admin/security/blocked-ips/{ip:path}")
async def admin_unblock_ip(ip: str, user: Dict[str, Any] = Depends(superadmin_required)):
    success = memory_store.unblock_ip(ip)
    return {"success": success, "message": f"Đã mở chặn IP {ip}." if success else "Không tìm thấy IP trong danh sách chặn."}


@app.get("/api/admin/security/events")
async def admin_security_events(limit: int = 100, user: Dict[str, Any] = Depends(superadmin_required)):
    return {"events": memory_store.get_security_events(limit=min(limit, 500))}


# ── SENTINEL AUTONOMOUS DEFENSE BOT ENDPOINTS ──────────────────────────────
@app.get("/api/admin/security/sentinel/status")
async def admin_sentinel_status(user: Dict[str, Any] = Depends(admin_required)):
    return sentinel_bot.skill_get_security_telemetry()


@app.post("/api/admin/security/sentinel/mode")
async def admin_set_sentinel_mode(req: SentinelModeRequest, user: Dict[str, Any] = Depends(superadmin_required)):
    mode = req.mode.lower().strip()
    if mode not in {"autonomous", "monitoring", "strict"}:
        raise HTTPException(status_code=400, detail="Chế độ không hợp lệ. Chỉ chấp nhận: autonomous, monitoring, strict")
    sentinel_bot.mode = mode
    return {"success": True, "mode": mode, "message": f"Đã chuyển Sentinel Bot sang chế độ {mode.upper()}."}


@app.post("/api/admin/security/sentinel/execute-skill")
async def admin_execute_sentinel_skill(req: SentinelSkillExecuteRequest, user: Dict[str, Any] = Depends(superadmin_required)):
    skill = req.skill_name.strip()
    target = req.target or ""
    
    if skill == "session_killswitch":
        if not target:
            raise HTTPException(status_code=400, detail="Thiếu target IP hoặc User ID để killswitch.")
        uid = int(target) if target.isdigit() else None
        ip = target if not target.isdigit() else None
        ok = sentinel_bot.skill_session_killswitch(user_id=uid, ip=ip, reason="Admin Manual Execution")
        return {"success": ok, "message": f"Đã thực hiện Session Killswitch cho target '{target}'."}
    
    elif skill == "reset_threat_score":
        if not target:
            raise HTTPException(status_code=400, detail="Thiếu target IP để reset.")
        if target in sentinel_bot.threat_cache:
            del sentinel_bot.threat_cache[target]
        ok = memory_store.reset_threat_score(target)
        return {"success": ok, "message": f"Đã xóa điểm nguy cơ cho IP '{target}'."}
    
    elif skill == "anti_cheat_scan":
        comp_id = int(target) if target.isdigit() else None
        if not comp_id:
            raise HTTPException(status_code=400, detail="Thiếu ID cuộc thi cần quét.")
        reports = anti_cheat_engine.scan_competition_cheating(comp_id, db_manager)
        return {"success": True, "reports_count": len(reports), "reports": reports}
    
    elif skill == "emergency_lockdown":
        sentinel_bot.mode = "strict"
        return {"success": True, "mode": "strict", "message": "Đã kích hoạt chế độ Phòng thủ Nghiêm ngặt (Strict Lockdown Mode)."}
    
    else:
        raise HTTPException(status_code=400, detail=f"Kỹ năng '{skill}' không được hỗ trợ hoặc không khả dụng.")


@app.get("/api/admin/security/sentinel/actions")
async def admin_list_sentinel_actions(limit: int = 100, user: Dict[str, Any] = Depends(superadmin_required)):
    return {"actions": memory_store.list_sentinel_actions(limit=min(limit, 200))}


@app.get("/api/admin/security/honeypot/logs")
async def admin_list_honeypot_logs(limit: int = 100, user: Dict[str, Any] = Depends(superadmin_required)):
    return {"logs": memory_store.list_honeypot_logs(limit=min(limit, 200))}


@app.get("/api/admin/security/threat-scores")
async def admin_get_threat_scores(limit: int = 50, user: Dict[str, Any] = Depends(superadmin_required)):
    return {"threat_scores": memory_store.get_threat_scores(limit=min(limit, 100))}


@app.delete("/api/admin/security/threat-scores/{ip:path}")
async def admin_delete_threat_score(ip: str, user: Dict[str, Any] = Depends(superadmin_required)):
    if ip in sentinel_bot.threat_cache:
        del sentinel_bot.threat_cache[ip]
    success = memory_store.reset_threat_score(ip)
    return {"success": success, "message": f"Đã xóa điểm nguy cơ IP {ip}." if success else "Không tìm thấy IP."}


# ── ANTI-CHEAT & PLAGIARISM INSPECTOR ENDPOINTS ────────────────────────────
@app.get("/api/admin/security/anti-cheat/reports")
async def admin_list_anti_cheat_reports(competition_id: Optional[int] = None, limit: int = 100, user: Dict[str, Any] = Depends(admin_required)):
    return {"reports": memory_store.list_anti_cheat_reports(competition_id=competition_id, limit=limit)}


@app.post("/api/admin/security/anti-cheat/scan/{competition_id}")
async def admin_scan_contest_anti_cheat(competition_id: int, req: AntiCheatScanRequest, user: Dict[str, Any] = Depends(admin_required)):
    contest = memory_store.get_competition(competition_id)
    if not contest:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc thi.")
    threshold = max(20.0, min(req.threshold or 60.0, 100.0))
    reports = anti_cheat_engine.scan_competition_cheating(competition_id, db_manager, threshold=threshold)
    return {
        "success": True,
        "competition_id": competition_id,
        "threshold": threshold,
        "flagged_count": len(reports),
        "reports": reports
    }


@app.post("/api/admin/security/anti-cheat/verdict")
async def admin_set_anti_cheat_verdict(req: AntiCheatVerdictRequest, user: Dict[str, Any] = Depends(admin_required)):
    valid_verdicts = {"CLEAN", "SUSPICIOUS", "FLAGGED", "PLAGIARISM_FLAGGED", "DISQUALIFIED"}
    verdict = req.verdict.upper().strip()
    if verdict not in valid_verdicts:
        raise HTTPException(status_code=400, detail=f"Verdict không hợp lệ. Cho phép: {', '.join(valid_verdicts)}")
    ok = memory_store.update_anti_cheat_verdict(req.report_id, verdict, req.details or "")
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo gian lận.")
    return {"success": True, "report_id": req.report_id, "verdict": verdict}


# ── DEV-ONLY ANTI-CHEAT & WEB SECURITY MONITORING ENDPOINTS ────────────────
@app.get("/api/dev/anticheat-monitor/stats")
async def dev_anticheat_stats(user: Dict[str, Any] = Depends(dev_required)):
    """DEV-ONLY: Trả về toàn bộ số liệu phân tích gian lận, tỷ lệ đạo nhái và danh sách thí sinh bị bot ban."""
    return sentinel_bot.skill_get_dev_anticheat_stats()


@app.get("/api/dev/web-monitor/telemetry")
async def dev_web_telemetry(user: Dict[str, Any] = Depends(dev_required)):
    """DEV-ONLY: Trả về live radar SOC, danh sách theo dõi toàn bộ IP / Member / Admin và stream hành động của bot."""
    return sentinel_bot.skill_get_dev_web_telemetry()


@app.post("/api/dev/web-monitor/trigger-scan")
async def dev_trigger_system_scan(user: Dict[str, Any] = Depends(dev_required)):
    """DEV-ONLY: Kích hoạt quét an ninh toàn hệ thống ngay lập tức và thi hành án phạt tự động."""
    sentinel_bot._run_threat_scan_cycle()
    return {"success": True, "message": "Đã thực thi chu kỳ quét an ninh toàn diện và trừng phạt tự động các đối tượng nguy cơ."}


@app.post("/api/dev/web-monitor/ban-user")
async def dev_manual_ban(req: DevManualBanRequest, user: Dict[str, Any] = Depends(dev_required)):
    """DEV-ONLY: Lệnh can thiệp trực tiếp từ DEV để ban IP, khóa tài khoản hacker và hủy phiên làm việc."""
    if req.user_id:
        if sentinel_bot.is_dev_exempt(user_id=req.user_id):
            raise HTTPException(status_code=400, detail="Không thể ban tài khoản DEV (Dev Immunity Rule).")
        memory_store.lock_user(req.user_id, locked=True)
        sentinel_bot.skill_session_killswitch(user_id=req.user_id, reason=req.reason)
    if req.ip:
        memory_store.block_ip(req.ip, req.reason, minutes=req.minutes)
        sentinel_bot.skill_session_killswitch(ip=req.ip, reason=req.reason)
    
    sentinel_bot._log_sentinel_action("DEV_MANUAL_BAN", target_ip=req.ip, target_user_id=req.user_id, reason=req.reason)
    return {"success": True, "message": "Đã thi hành lệnh cấm và khóa tài khoản thành công."}


@app.post("/api/dev/web-monitor/unban")
async def dev_manual_unban(req: DevManualUnbanRequest, user: Dict[str, Any] = Depends(dev_required)):
    """DEV-ONLY: Mở khóa tài khoản và gỡ bỏ lệnh cấm IP."""
    memory_store.unban_user_and_ip(user_id=req.user_id, ip=req.ip)
    if req.ip and req.ip in sentinel_bot.threat_cache:
        del sentinel_bot.threat_cache[req.ip]
    sentinel_bot._log_sentinel_action("DEV_MANUAL_UNBAN", target_ip=req.ip, target_user_id=req.user_id, reason="Dev Unban Action")
    return {"success": True, "message": "Đã mở khóa và xóa lệnh cấm thành công."}


@app.post("/api/dev/web-monitor/toggle-bot")
async def dev_toggle_sentinel_bot(req: DevToggleBotRequest, user: Dict[str, Any] = Depends(dev_required)):
    """DEV-ONLY: Bật hoặc tắt trạng thái tự động phòng thủ và quét ngầm liên tục 24/7 của Bot Sentinel."""
    sentinel_bot.active = req.active
    action_type = "BOT_24_7_DEFENSE_ENABLED" if req.active else "BOT_DEFENSE_PAUSED_BY_DEV"
    sentinel_bot._log_sentinel_action(action_type, reason="Dev Master Toggle Switch")
    return {
        "success": True, 
        "active": sentinel_bot.active, 
        "message": f"Bot giám sát đã được {'BẬT và đang chạy ngầm liên tục 24/7' if req.active else 'TẮT / TẠM DỪNG'}."
    }


@app.post("/api/security/report-tamper")
async def report_client_tampering(
    req: ClientTamperReportRequest,
    request: Request,
    user: Optional[Dict[str, Any]] = Depends(optional_user)
):
    """Ghi nhận cảnh báo an ninh chống can thiệp mã nguồn từ Client / DevTools."""
    client_ip = request.client.host if request.client else "unknown"
    sentinel_bot._log_sentinel_action(
        action_type="CLIENT_TAMPER_ALARM",
        target_ip=client_ip,
        target_user_id=user["id"] if user else None,
        reason=f"Client Anti-Tamper Alarm: {req.type}",
        details=f"{req.details} | URL: {req.url}"
    )
    if not user or str(user.get("role", "")).lower() != "dev":
        sentinel_bot.skill_evaluate_and_react(
            ip=client_ip,
            event_type="client_tampering",
            details=f"{req.type}: {req.details}",
            user=user
        )
    return {"status": "recorded", "action": "sentinel_defense_engaged"}


@app.get("/api/standings")
async def get_global_standings():
    return {"standings": memory_store.list_global_standings()}

@app.get("/api/competitions")
async def list_competitions(user: Optional[Dict[str, Any]] = Depends(optional_user)):
    user_id = user["id"] if user else None
    include_drafts = user.get("is_admin", False) if user else False
    return memory_store.list_competitions(user_id=user_id, include_drafts=include_drafts)

@app.get("/api/competitions/{competition_id}/ranking")
async def get_competition_ranking(competition_id: int, user: Optional[Dict[str, Any]] = Depends(optional_user)):
    user_id = user["id"] if user else None
    is_admin = user.get("is_admin", False) if user else False
    competition = memory_store.get_competition(competition_id, user_id=user_id)
    if not competition or (competition["status"] == "draft" and not is_admin):
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc thi.")
    return {"competition_id": competition_id, "ranking": memory_store.list_competition_ranking(competition_id)}

@app.get("/api/competitions/{competition_id}/submissions")
async def get_competition_submissions(competition_id: int, user: Optional[Dict[str, Any]] = Depends(optional_user)):
    user_id = user["id"] if user else None
    is_admin = user.get("is_admin", False) if user else False
    competition = memory_store.get_competition(competition_id, user_id=user_id)
    if not competition or (competition["status"] == "draft" and not is_admin):
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc thi.")
    return {"competition_id": competition_id, "submissions": memory_store.list_competition_submissions(competition_id)}

@app.get("/api/competitions/{competition_id}")
async def get_competition(competition_id: int, user: Optional[Dict[str, Any]] = Depends(optional_user)):
    user_id = user["id"] if user else None
    is_admin = user.get("is_admin", False) if user else False
    competition = memory_store.get_competition(competition_id, user_id=user_id, include_tests=is_admin)
    if not competition or (competition["status"] == "draft" and not is_admin):
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc thi.")
    return competition

@app.post("/api/competitions/{competition_id}/join")
async def join_competition(competition_id: int, user: Dict[str, Any] = Depends(current_user)):
    if user.get("is_admin"):
        raise HTTPException(status_code=400, detail="Admin không tham gia cuộc thi.")
    competition = memory_store.get_competition(competition_id, include_tests=True)
    if not competition or competition["status"] != "published":
        raise HTTPException(status_code=404, detail="Cuộc thi chưa mở hoặc không tồn tại.")
    now = datetime.now().isoformat(sep=" ")
    if competition.get("starts_at") and competition["starts_at"] > now:
        raise HTTPException(status_code=400, detail="Cuộc thi chưa bắt đầu.")
    if competition.get("ends_at") and competition["ends_at"] <= now:
        raise HTTPException(status_code=400, detail="Cuộc thi đã kết thúc.")
    if not memory_store.join_competition(competition_id, user["id"]):
        raise HTTPException(status_code=404, detail="Không thể tham gia cuộc thi.")
    return {"success": True, "ai_locked": True}

@app.post("/api/competitions/{competition_id}/submit")
async def submit_competition(competition_id: int, req: CompetitionSubmissionRequest, user: Dict[str, Any] = Depends(current_user)):
    competition = memory_store.get_competition(competition_id, user_id=user["id"], include_tests=True)
    if not competition or competition["status"] != "published":
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc thi.")
    if not competition["joined"]:
        raise HTTPException(status_code=403, detail="Bạn cần tham gia cuộc thi trước khi nộp bài.")
    now = datetime.now().isoformat(sep=" ")
    if competition.get("starts_at") and competition["starts_at"] > now:
        raise HTTPException(status_code=400, detail="Cuộc thi chưa bắt đầu.")
    if competition.get("ends_at") and competition["ends_at"] <= now:
        raise HTTPException(status_code=400, detail="Cuộc thi đã kết thúc.")
    req.source_code = decrypt_code_payload(req.source_code)
    if not req.source_code.strip():
        raise HTTPException(status_code=400, detail="Mã nguồn không được để trống.")
    lang_input = req.language.lower().strip()
    lang_alias_map = {
        "py": "python", "python3": "python",
        "c++": "cpp", "g++": "cpp",
        "gcc": "c",
        "js": "javascript", "nodejs": "javascript",
        "ts": "typescript",
        "cs": "csharp", "dotnet": "csharp",
        "pas": "pascal", "freepascal": "pascal",
        "golang": "go", "rs": "rust"
    }
    req.language = lang_alias_map.get(lang_input, lang_input)
    allowed_languages = {"cpp", "c", "python", "java", "rust", "go", "javascript", "typescript", "csharp", "pascal"}
    if req.language not in allowed_languages:
        raise HTTPException(status_code=400, detail=f"Ngôn ngữ '{lang_input}' không được hỗ trợ. Các ngôn ngữ được hỗ trợ: C++, C, Python, Java, Go, Rust, JavaScript, TypeScript, C#, Pascal.")

    # Sentinel Pre-Execution Code Sanitizer
    is_safe, violations = sentinel_bot.skill_code_sandbox_sanitizer(req.source_code, req.language)
    if not is_safe:
        raise HTTPException(status_code=400, detail=f"Mã nguồn bị Sentinel Defense Bot từ chối: {'; '.join(violations)}")
    tests = competition["tests"]
    if req.problem_id is not None:
        problem = next((item for item in competition.get("problems", []) if item["id"] == req.problem_id), None)
        if not problem:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài tập.")
        tests = problem.get("tests", [])
    try:
        result = judge_pool.judge(req.source_code, req.language, tests, timeout=2)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    score = round((result["passed_tests"] / result["total_tests"]) * 100, 2) if result["total_tests"] else 0
    submission_id = memory_store.log_submission(
        None, req.source_code, result["overall_verdict"], result.get("total_execution_time_ms", 0),
        result.get("max_memory_kb", 0), result.get("compiler_output", ""), user_id=user["id"],
        competition_id=competition_id, language=req.language, score=score,
        passed_tests=result["passed_tests"], total_tests=result["total_tests"]
    )
    return {"submission_id": submission_id, "verdict": result["overall_verdict"], "score": score,
            "passed_tests": result["passed_tests"], "total_tests": result["total_tests"],
            "execution_time_ms": result.get("total_execution_time_ms", 0)}

@app.get("/api/admin/competitions")
async def admin_list_competitions(user: Dict[str, Any] = Depends(admin_required)):
    return memory_store.list_competitions(include_drafts=True)

@app.post("/api/admin/competitions")
async def admin_create_competition(req: CompetitionRequest, user: Dict[str, Any] = Depends(admin_required)):
    if not req.title.strip() or not req.statement.strip():
        raise HTTPException(status_code=400, detail="Tên và đề bài cuộc thi không được để trống.")
    if req.status not in {"draft", "published", "closed"}:
        raise HTTPException(status_code=400, detail="Trạng thái cuộc thi không hợp lệ.")
    competition_id = memory_store.create_competition(
        req.title.strip(), req.statement.strip(), req.status, req.starts_at, req.ends_at, req.tests, user["id"], req.problems
    )
    return {"success": True, "id": competition_id}

@app.post("/api/admin/competitions/{competition_id}/import-clueoj")
async def admin_import_clueoj_problem(competition_id: int, req: ClueOJImportRequest, user: Dict[str, Any] = Depends(admin_required)):
    if req.competition_id != competition_id:
        raise HTTPException(status_code=400, detail="Competition ID không khớp.")
    competition = memory_store.get_competition(competition_id)
    if not competition:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc thi.")
    try:
        problem = clueoj_loader.load(req.problem_dir)
    except (OSError, ValueError, yaml.YAMLError) as exc:
        raise HTTPException(status_code=400, detail=f"Không thể đọc problem ClueOJ: {exc}") from exc
    problem["statement"] = req.statement
    current_problems = competition.get("problems", [])
    current_problems = [item for item in current_problems if item.get("id") != competition_id]
    current_problems.append(problem)
    if not memory_store.update_competition(competition_id, competition["title"], competition["statement"], competition["status"], competition["starts_at"], competition["ends_at"], competition.get("tests", []), current_problems):
        raise HTTPException(status_code=400, detail="Không thể lưu problem.")
    return {"success": True, "problem": problem}

@app.put("/api/admin/competitions/{competition_id}")
async def admin_update_competition(competition_id: int, req: CompetitionRequest, user: Dict[str, Any] = Depends(admin_required)):
    if req.status not in {"draft", "published", "closed"}:
        raise HTTPException(status_code=400, detail="Trạng thái cuộc thi không hợp lệ.")
    updated = memory_store.update_competition(
        competition_id, req.title.strip(), req.statement.strip(), req.status, req.starts_at, req.ends_at, req.tests, req.problems
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc thi.")
    return {"success": True, "id": competition_id}

@app.post("/api/admin/competitions/generate-tests")
async def admin_generate_competition_tests(req: CompetitionTestsRequest, user: Dict[str, Any] = Depends(admin_required)):
    count = max(1, min(req.count, 20))
    prompt = f"""Tạo {count} test case cho bài lập trình sau. Chỉ trả về JSON array, không markdown.
Mỗi phần tử có đúng hai trường: input và expected, đều là chuỗi.
Đề bài:
{req.prompt}
"""
    try:
        response = await llm_client.chat([{"role": "user", "content": prompt}])
        match = re.search(r"\[[\s\S]*\]", response)
        tests = json.loads(match.group(0)) if match else None
        if not isinstance(tests, list):
            raise ValueError("AI không trả về JSON array hợp lệ.")
        clean_tests = [{"input": str(item.get("input", "")), "expected": str(item.get("expected", ""))} for item in tests if isinstance(item, dict)]
        return {"success": True, "tests": clean_tests[:count]}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Không tạo được test bằng AI: {exc}")

@app.delete("/api/admin/competitions/{competition_id}")
async def admin_delete_competition(competition_id: int, user: Dict[str, Any] = Depends(admin_required)):
    deleted = memory_store.delete_competition(competition_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc thi cần xóa.")
    return {"success": True, "id": competition_id}

@app.get("/api/admin/problems")
async def admin_list_problems(user: Dict[str, Any] = Depends(admin_required)):
    return memory_store.list_all_problems()

@app.get("/api/admin/problems/{problem_id}")
async def admin_get_problem(problem_id: int, user: Dict[str, Any] = Depends(admin_required)):
    problem = memory_store.get_problem(problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập.")
    return problem

@app.post("/api/admin/problems")
async def admin_create_problem(req: AdminProblemCreateRequest, user: Dict[str, Any] = Depends(admin_required)):
    if not req.title.strip():
        raise HTTPException(status_code=400, detail="Tiêu đề bài tập không được để trống.")
    pid = memory_store.create_bank_problem(
        title=req.title.strip(),
        statement=req.statement,
        points=req.points,
        time_limit=req.time_limit,
        memory_limit=req.memory_limit,
        code=req.code,
        competition_id=req.competition_id,
        tests=req.tests,
        is_hidden=1 if req.is_hidden else 0
    )
    return {"success": True, "id": pid}

@app.put("/api/admin/problems/{problem_id}")
async def admin_update_problem(problem_id: int, req: AdminProblemUpdateRequest, user: Dict[str, Any] = Depends(admin_required)):
    updated = memory_store.update_bank_problem(
        problem_id=problem_id,
        title=req.title.strip(),
        statement=req.statement,
        points=req.points,
        time_limit=req.time_limit,
        memory_limit=req.memory_limit,
        code=req.code,
        tests=req.tests,
        is_hidden=1 if req.is_hidden is True else (0 if req.is_hidden is False else None)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập để cập nhật.")
    return {"success": True, "id": problem_id}

@app.post("/api/admin/problems/{problem_id}/toggle-visibility")
async def admin_toggle_problem_visibility(problem_id: int, req: AdminProblemVisibilityRequest = AdminProblemVisibilityRequest(), user: Dict[str, Any] = Depends(admin_required)):
    res = memory_store.toggle_problem_visibility(problem_id, is_hidden=req.is_hidden)
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập.")
    status_str = "ẨN" if res["is_hidden"] else "HIỂN THỊ"
    return {"success": True, "data": res, "message": f"Đã chuyển trạng thái bài [{res['code']}] sang {status_str}."}

@app.post("/api/admin/problems/bulk-action")
async def admin_bulk_problems_action(req: AdminProblemBulkActionRequest, user: Dict[str, Any] = Depends(admin_required)):
    if req.action not in ["hide", "unhide", "delete"]:
        raise HTTPException(status_code=400, detail="Hành động không hợp lệ ('hide', 'unhide', 'delete').")
    res = memory_store.bulk_problems_action(req.problem_ids, req.action)
    return res

@app.delete("/api/admin/problems/{problem_id}")
async def admin_delete_problem(problem_id: int, user: Dict[str, Any] = Depends(admin_required)):
    deleted = memory_store.delete_problem(problem_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập cần xóa.")
    return {"success": True, "id": problem_id, "message": "Đã xóa bài tập thành công."}

@app.put("/api/admin/problems/{problem_id}/tests")
async def admin_update_problem_tests(problem_id: int, req: AdminProblemTestsUpdateRequest, user: Dict[str, Any] = Depends(admin_required)):
    updated = memory_store.update_problem_tests(problem_id, req.tests)
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập để cập nhật test cases.")
    return {"success": True, "id": problem_id, "count": len(req.tests)}

@app.get("/api/admin/problems/{problem_ref}/tests")
async def admin_get_problem_tests(problem_ref: str, user: Dict[str, Any] = Depends(admin_required)):
    ref_str = str(problem_ref).strip()
    
    # 1. Check if ref is integer ID in SQLite DB
    if ref_str.isdigit():
        prob = memory_store.get_problem(int(ref_str))
        if prob:
            return {
                "id": prob["id"],
                "code": prob.get("code", "A"),
                "title": prob.get("title", ""),
                "total_tests": len(prob.get("tests", [])),
                "tests": prob.get("tests", [])
            }
            
    # 2. Check by code in SQLite DB
    with db_manager.get_connection() as conn:
        p_row = conn.execute("SELECT id, code, title FROM competition_problems WHERE UPPER(code) = ? LIMIT 1", (ref_str.upper(),)).fetchone()
        if p_row:
            prob = memory_store.get_problem(p_row["id"])
            if prob:
                return {
                    "id": prob["id"],
                    "code": prob.get("code", ref_str.upper()),
                    "title": prob.get("title", ""),
                    "total_tests": len(prob.get("tests", [])),
                    "tests": prob.get("tests", [])
                }
                
    # 3. Fallback to python_300_full_bank.json
    bank_path = Path("data/python_300_kids/python_300_full_bank.json")
    if bank_path.exists():
        with open(bank_path, "r", encoding="utf-8") as f:
            problems = json.load(f)
        for p in problems:
            if p.get("code", "").upper() == ref_str.upper() or str(p.get("num", "")) == ref_str:
                return {
                    "id": p.get("num"),
                    "code": p.get("code"),
                    "title": p.get("title"),
                    "total_tests": len(p.get("tests", [])),
                    "tests": p.get("tests", [])
                }
                
    # 4. Check folder tests.json
    tests_file = Path(f"data/python_300_kids/problems/{ref_str.upper()}/tests.json")
    if tests_file.exists():
        with open(tests_file, "r", encoding="utf-8") as f:
            tests_data = json.load(f)
        return {
            "id": None,
            "code": ref_str.upper(),
            "title": f"Bài tập {ref_str.upper()}",
            "total_tests": len(tests_data),
            "tests": tests_data
        }
        
    raise HTTPException(status_code=404, detail=f"Không tìm thấy test cases cho bài tập '{problem_ref}'.")

@app.post("/api/admin/ai/generate-tests-from-code")
async def admin_generate_tests_from_code(req: AIGenerateTestsFromCodeRequest, user: Dict[str, Any] = Depends(admin_required)):
    count = max(1, min(req.count, 20))
    if not req.solution_code.strip():
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp mã nguồn giải thuật toán.")
    
    prompt = f"""Bạn là chuyên gia ra đề thi Competitive Programming ICPC/IOI.
Nhiệm vụ: Phân tích mã nguồn và đề bài dưới đây để sinh ra {count} bộ dữ liệu ĐẦU VÀO (INPUT) đa dạng và kiểm thử được toàn bộ logic:
- Trường hợp cơ bản / mẫu
- Trường hợp biên nhỏ nhất (0, 1, số âm, rỗng nếu cho phép)
- Trường hợp biên lớn nhất (max N, max giá trị)
- Trường hợp đặc biệt (các phần tử giống nhau, mảng đã sắp xếp, chu kỳ, chẵn/lẻ)
- Trường hợp ngẫu nhiên phức tạp

ĐỀ BÀI:
{req.statement or "Dựa vào mã nguồn giải để suy luận định dạng input"}

MÃ NGUỒN ({req.language.upper()}):
{req.solution_code}

CHỈ TRẢ VỀ JSON ARRAY CHỨA CÁC CHUỖI INPUT, KHÔNG GIẢI THÍCH, KHÔNG MARKDOWN.
Ví dụ:
[
  "1 2\\n",
  "0 0\\n",
  "1000000 2000000\\n"
]
"""
    raw_inputs = []
    try:
        response = await llm_client.chat([{"role": "user", "content": prompt}])
        match = re.search(r"\[[\s\S]*\]", response)
        if match:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, list):
                raw_inputs = [str(item) if not isinstance(item, dict) else str(item.get("input", "")) for item in parsed]
    except Exception:
        pass

    if not raw_inputs:
        raw_inputs = ["1 2\n", "10 20\n", "0 0\n", "-5 15\n", "100 200\n"][:count]

    compiler = MultiLangCompiler()
    sandbox = ProcessSandbox(timeout_seconds=2.0)
    comp_res = compiler.prepare_and_compile(req.solution_code, language=req.language)
    
    if not comp_res["success"]:
        raise HTTPException(status_code=400, detail=f"Mã nguồn không biên dịch được: {comp_res.get('compiler_output', 'Lỗi cú pháp')}")

    exec_cmd = comp_res.get("executable_cmd") or comp_res.get("executable_path_or_cmd")
    generated_tests = []
    
    for i, inp_data in enumerate(raw_inputs[:count]):
        t_in = inp_data if inp_data.endswith("\n") else inp_data + "\n"
        run_res = sandbox.execute(exec_cmd, stdin_data=t_in, timeout=2.0)
        
        expected_out = run_res["stdout"].strip()
        if not expected_out and run_res["stderr"]:
            expected_out = f"/* Lỗi: {run_res['stderr'].strip()[:100]} */"
        
        pts = 100 // count if count > 0 else 10
        generated_tests.append({
            "input": t_in,
            "expected": expected_out,
            "points": pts,
            "execution_time_ms": run_res.get("execution_time_ms", 0),
            "status": run_res.get("verdict", "OK")
        })

    return {
        "success": True,
        "tests": generated_tests,
        "total_generated": len(generated_tests)
    }

@app.get("/api/sessions")
async def list_sessions(user: Dict[str, Any] = Depends(current_user)):
    return memory_store.list_sessions(user["id"])

@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str, user: Dict[str, Any] = Depends(current_user)):
    memory_store.delete_session(session_id, user["id"])
    return {"success": True}

@app.get("/api/sessions/{session_id}/messages")
async def get_session_messages(session_id: str, user: Dict[str, Any] = Depends(current_user)):
    return memory_store.get_messages(session_id, limit=30, user_id=user["id"])

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest, user: Dict[str, Any] = Depends(ai_access_required)):
    try:
        memory_store.add_message(req.session_id, "user", req.message, user_id=user["id"])
    except PermissionError:
        raise HTTPException(status_code=403, detail="Session không thuộc tài khoản hiện tại.")
    
    rag_context = ""
    if req.include_rag:
        docs = rag_store.search(req.message, top_k=2)
        if docs:
            rag_context = "\n\n".join([f"### {d['section']} ({d['source']}):\n{d['content']}" for d in docs])

    history = memory_store.get_messages(req.session_id, limit=8, user_id=user["id"])
    formatted_messages = [{"role": "system", "content": PromptEngine.get_system_prompt("cpp")}]
    
    if rag_context:
        formatted_messages.append({
            "role": "system",
            "content": f"Kiến thức & Template C++ liên quan từ kho RAG:\n{rag_context}"
        })

    for m in history:
        formatted_messages.append({"role": m["role"], "content": m["content"]})

    if req.stream:
        async def stream_generator():
            full_reply = []
            async for chunk in llm_client.chat_stream(formatted_messages):
                full_reply.append(chunk)
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            final_text = "".join(full_reply)
            memory_store.add_message(req.session_id, "assistant", final_text, user_id=user["id"])
            yield "data: [DONE]\n\n"

        return StreamingResponse(stream_generator(), media_type="text/event-stream")
    else:
        reply = await llm_client.chat(formatted_messages)
        memory_store.add_message(req.session_id, "assistant", reply, user_id=user["id"])
        return {"response": reply, "rag_used": bool(rag_context)}

@app.post("/api/agent/solve")
async def agent_solve(req: AgentSolveRequest, user: Dict[str, Any] = Depends(ai_access_required)):
    result = await code_agent.solve_with_pipeline(
        problem_statement=req.problem_statement,
        sample_testcases=req.testcases,
        language=req.language or "cpp",
        max_retries=req.max_retries
    )
    if req.session_id:
        lang_tag = (req.language or "cpp").lower()
        summary = f"**Kế hoạch giải ({lang_tag.upper()}):**\n{result['plan']}\n\n**Mã nguồn {lang_tag.upper()}:**\n```{lang_tag}\n{result['code']}\n```"
        memory_store.add_message(req.session_id, "assistant", summary, metadata={"pipeline": result})
    return result


@app.post("/api/agent/extract_problem_image")
async def extract_problem_image(file: UploadFile = File(...), user: Dict[str, Any] = Depends(ai_access_required)):
    allowed_types = {"image/png", "image/jpeg", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ ảnh PNG, JPEG, WebP hoặc GIF.")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Ảnh rỗng hoặc không đọc được.")
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Ảnh không được lớn hơn 10 MB.")

    prompt = """Đọc ảnh đề bài lập trình này và chép lại thành văn bản có cấu trúc.
Giữ nguyên công thức, ký hiệu, số liệu và tên biến quan trọng.
Trả về đúng các phần nếu có: Tên bài, Mô tả, Input, Output, Constraints, Examples.
Không giải bài, không thêm lời bình, không dùng markdown code fence."""
    message = {
        "role": "user",
        "content": prompt,
        "images": [base64.b64encode(image_bytes).decode("ascii")],
    }
    try:
        extracted_text = await vision_llm_client.chat([message])
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI không đọc được ảnh: {exc}")
    if not extracted_text.strip():
        raise HTTPException(status_code=502, detail="AI không trích xuất được nội dung từ ảnh.")
    return {"success": True, "filename": file.filename or "problem-image", "text": extracted_text.strip()}

@app.post("/api/agent/solve_stream")
async def agent_solve_stream(req: AgentSolveRequest, user: Dict[str, Any] = Depends(ai_access_required)):
    async def event_generator():
        async for event in code_agent.solve_with_pipeline_stream(
            problem_statement=req.problem_statement,
            sample_testcases=req.testcases,
            language=req.language or "cpp",
            max_retries=req.max_retries
        ):
            yield f"data: {json.dumps(event)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/agent/convert_code")
async def agent_convert_code(req: CodeConvertRequest, user: Dict[str, Any] = Depends(ai_access_required)):
    from_lang = req.from_language.lower()
    to_lang = req.to_language.lower()
    
    system_prompt = PromptEngine.get_system_prompt(to_lang)
    to_display = PromptEngine.LANG_DISPLAY.get(to_lang, to_lang.upper())
    from_display = PromptEngine.LANG_DISPLAY.get(from_lang, from_lang.upper())
    
    prompt = f"""{PromptEngine._lang_header(to_lang)}

Hãy chuyển đổi mã nguồn sau từ {from_display} sang {to_display} cho bài toán lập trình thi đấu (Competitive Programming):

--- MÃ NGUỒN GỐC ({from_display}) ---
```{from_lang}
{req.source_code}
```

--- ĐỀ BÀI (NẾU CÓ) ---
{req.problem_statement if req.problem_statement else "Chuyển đổi giữ nguyên logic thuật toán và tối ưu tốc độ I/O."}

YÊU CẦU:
1. Viết 100% bằng {to_display} tối ưu, chuẩn I/O nhanh.
2. Đặt mã nguồn trong khối ```{to_lang} ... ```.
"""
    try:
        response = await llm_client.chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ])
        converted_code = CodeEvaluator.extract_code(response, language=to_lang)
        if not converted_code and to_lang != "cpp":
            import re
            m = re.search(r'```(?:[a-zA-Z0-9_+]*)\s*([\s\S]*?)```', response)
            converted_code = m.group(1).strip() if m else response.strip()
    except Exception as e:
        return {"success": False, "error": f"Lỗi gọi AI: {str(e)}"}

    # Run sandbox if testcases provided
    test_results = None
    if req.testcases:
        test_results = test_runner.run_tests(converted_code, req.testcases, language=to_lang)

    return {
        "success": True,
        "from_language": from_lang,
        "to_language": to_lang,
        "converted_code": converted_code,
        "test_results": test_results
    }

@app.post("/api/compile_and_run")
async def compile_and_run(req: CompileRunRequest):
    req.source_code = decrypt_code_payload(req.source_code)
    # Sentinel Pre-Execution Code Sanitizer
    is_safe, violations = sentinel_bot.skill_code_sandbox_sanitizer(req.source_code, req.language or "cpp")
    if not is_safe:
        raise HTTPException(status_code=400, detail=f"Mã nguồn bị Sentinel Defense Bot từ chối: {'; '.join(violations)}")
    try:
        result = judge_pool.judge(
            source_code=req.source_code,
            tests=req.testcases,
            language=req.language or "cpp",
            timeout=req.timeout_seconds
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if req.session_id:
        memory_store.log_submission(
            session_id=req.session_id,
            code=req.source_code,
            verdict=result.get("overall_verdict", "UNKNOWN"),
            exec_time=result.get("total_execution_time_ms", 0),
            mem_kb=result.get("max_memory_kb", 0),
            compiler_output=result.get("compiler_output", "")
        )
    return result


@app.get("/api/rag/documents")
async def get_rag_documents():
    return rag_store.get_all_documents_metadata()

@app.get("/api/rag/search")
async def search_rag_documents(q: str = "", top_k: int = 6):
    query = (q or "").strip()
    if not query:
        return []
    hits = rag_store.search(query, top_k=max(1, min(top_k, 12)))
    return [
        {
            "source": d["source"],
            "section": d["section"],
            "preview": (d["content"] or "")[:400],
            "content": d["content"],
        }
        for d in hits
    ]

@app.get("/api/rag/documents/{filename}")
async def get_rag_document(filename: str):
    content = rag_store.get_document_text(filename)
    if content is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu RAG.")
    return {"filename": Path(filename).name, "content": content}

@app.post("/api/rag/upload")
async def upload_rag_doc(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Thiếu tên file.")
    safe_name = Path(file.filename).name
    Path(rag_store.knowledge_dir).mkdir(parents=True, exist_ok=True)
    target_path = Path(rag_store.knowledge_dir) / safe_name
    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    rag_store.reload_index()
    return {"success": True, "filename": safe_name, "total_indexed": len(rag_store.documents)}

@app.get("/api/problems")
async def get_problems(user: Dict[str, Any] = Depends(current_user)):
    return memory_store.list_solved_problems(user["id"])

@app.post("/api/problems")
async def save_problem(req: ProblemSaveRequest, user: Dict[str, Any] = Depends(current_user)):
    req.solution_code = decrypt_code_payload(req.solution_code)
    pid = memory_store.save_problem(
        title=req.title,
        category=req.category,
        complexity_time=req.complexity_time,
        complexity_space=req.complexity_space,
        code=req.solution_code,
        notes=req.notes or "",
        verdict=req.verdict or "AC",
        user_id=user["id"]
    )
    return {"success": True, "id": pid}

@app.post("/api/user-code")
async def save_user_code(req: UserCodeSaveRequest, user: Dict[str, Any] = Depends(current_user)):
    pid = memory_store.save_problem(
        title=f"{req.title} [{req.language.upper()}]", category="My Code",
        complexity_time="", complexity_space="", code=req.source_code,
        notes="Code lưu từ IDE", verdict="SAVED", user_id=user["id"]
    )
    return {"success": True, "id": pid}

@app.get("/api/problem-bank")
async def list_problem_bank(
    q: Optional[str] = None,
    chapter: Optional[int] = None,
    difficulty: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    json_path = Path("data/python_300_kids/python_300_full_bank.json")
    if not json_path.exists():
        return {"total": 0, "problems": [], "page": page, "limit": limit}
    
    with open(json_path, "r", encoding="utf-8") as f:
        problems = json.load(f)
        
    # Exclude hidden problems
    hidden_codes = set()
    try:
        with db_manager.get_connection() as conn:
            rows = conn.execute("SELECT code FROM competition_problems WHERE is_hidden = 1").fetchall()
            hidden_codes = {r["code"].upper() for r in rows if r["code"]}
    except Exception:
        pass

    filtered = [p for p in problems if p.get("code", "").upper() not in hidden_codes]
    if q:
        q_low = q.lower().strip()
        filtered = [p for p in filtered if q_low in p.get("title", "").lower() or q_low in p.get("code", "").lower() or q_low in p.get("chapter_title", "").lower()]
    if chapter:
        filtered = [p for p in filtered if p.get("chapter_num") == chapter]
        
    total = len(filtered)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    page_items = filtered[start_idx:end_idx]
    
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if total > 0 else 1,
        "problems": [
            {
                "num": p.get("num"),
                "code": p.get("code"),
                "title": p.get("title"),
                "chapter_num": p.get("chapter_num"),
                "chapter_title": p.get("chapter_title"),
                "test_count": p.get("test_count", len(p.get("tests", []))),
                "sample_input": p.get("sample_input", ""),
                "sample_output": p.get("sample_output", "")
            }
            for p in page_items
        ]
    }

@app.get("/api/problem-bank/{code}")
async def get_problem_bank_detail(code: str):
    code_upper = code.upper().strip()
    
    # Check if problem is hidden in database
    try:
        with db_manager.get_connection() as conn:
            h_row = conn.execute("SELECT is_hidden FROM competition_problems WHERE UPPER(code) = ? LIMIT 1", (code_upper,)).fetchone()
            if h_row and h_row["is_hidden"]:
                raise HTTPException(status_code=403, detail="Bài tập này hiện đang tạm ẩn bởi Quản trị viên.")
    except HTTPException:
        raise
    except Exception:
        pass

    json_path = Path("data/python_300_kids/python_300_full_bank.json")
    if not json_path.exists():
        raise HTTPException(status_code=404, detail="Kho bài tập chưa được khởi tạo.")
    
    with open(json_path, "r", encoding="utf-8") as f:
        problems = json.load(f)
        
    for p in problems:
        if p.get("code", "").upper() == code_upper or str(p.get("num", "")) == code.strip():
            return {
                "num": p.get("num"),
                "code": p.get("code"),
                "title": p.get("title"),
                "chapter_num": p.get("chapter_num"),
                "chapter_title": p.get("chapter_title"),
                "statement": p.get("statement"),
                "explanation": p.get("explanation"),
                "algorithm": p.get("algorithm", ""),
                "tests": p.get("tests", []),
                "test_count": len(p.get("tests", [])),
                "solution_code": p.get("solution_code", ""),
                "time_limit": 1.0,
                "memory_limit": 256,
                "languages": ["python", "cpp", "c", "java", "go", "rust", "javascript", "typescript", "csharp", "pascal"]
            }
            
    raise HTTPException(status_code=404, detail=f"Không tìm thấy bài tập '{code}'.")

@app.post("/api/problem-bank/{code}/submit")
async def submit_problem_bank(code: str, req: ProblemBankSubmissionRequest, user: Dict[str, Any] = Depends(current_user)):
    code_upper = code.upper().strip()
    json_path = Path("data/python_300_kids/python_300_full_bank.json")
    if not json_path.exists():
        raise HTTPException(status_code=404, detail="Kho bài tập chưa được khởi tạo.")
    
    with open(json_path, "r", encoding="utf-8") as f:
        problems = json.load(f)
        
    target_prob = next((p for p in problems if p.get("code", "").upper() == code_upper or str(p.get("num", "")) == code.strip()), None)
    if not target_prob:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy bài tập '{code}'.")
        
    req.source_code = decrypt_code_payload(req.source_code)
    if not req.source_code.strip():
        raise HTTPException(status_code=400, detail="Mã nguồn không được để trống.")
        
    lang_input = req.language.lower().strip()
    lang_alias_map = {
        "py": "python", "python3": "python",
        "c++": "cpp", "g++": "cpp",
        "gcc": "c",
        "js": "javascript", "nodejs": "javascript",
        "ts": "typescript",
        "cs": "csharp", "dotnet": "csharp",
        "pas": "pascal", "freepascal": "pascal",
        "golang": "go", "rs": "rust"
    }
    req.language = lang_alias_map.get(lang_input, lang_input)
    allowed_languages = {"cpp", "c", "python", "java", "rust", "go", "javascript", "typescript", "csharp", "pascal"}
    if req.language not in allowed_languages:
        raise HTTPException(status_code=400, detail=f"Ngôn ngữ '{lang_input}' không được hỗ trợ. Các ngôn ngữ được hỗ trợ: C++, C, Python, Java, Go, Rust, JavaScript, TypeScript, C#, Pascal.")
        
    # Sentinel Pre-Execution Code Sanitizer
    is_safe, violations = sentinel_bot.skill_code_sandbox_sanitizer(req.source_code, req.language)
    if not is_safe:
        raise HTTPException(status_code=400, detail=f"Mã nguồn bị Sentinel Defense Bot từ chối: {'; '.join(violations)}")
        
    tests = target_prob.get("tests", [])
    try:
        result = judge_pool.judge(req.source_code, req.language, tests, timeout=2)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
        
    score = round((result["passed_tests"] / result["total_tests"]) * 100, 2) if result["total_tests"] else 0
    submission_id = memory_store.log_submission(
        None, req.source_code, result["overall_verdict"], result.get("total_execution_time_ms", 0),
        result.get("max_memory_kb", 0), result.get("compiler_output", ""), user_id=user["id"],
        competition_id=None, language=req.language, score=score,
        passed_tests=result["passed_tests"], total_tests=result["total_tests"]
    )
    return {
        "submission_id": submission_id,
        "problem_code": target_prob.get("code"),
        "problem_title": target_prob.get("title"),
        "verdict": result["overall_verdict"],
        "score": score,
        "passed_tests": result["passed_tests"],
        "total_tests": result["total_tests"],
        "execution_time_ms": result.get("total_execution_time_ms", 0),
        "details": result.get("test_results", [])
    }

@app.get("/api/generate_edge_cases")
async def get_edge_cases(case_type: str = "array"):
    if case_type == "graph":
        return EdgeCaseGenerator.generate_graph_edge_cases()
    return EdgeCaseGenerator.generate_array_edge_cases()

@app.get("/api/security/events")
async def get_security_events(limit: int = 50):
    with db_manager.get_connection() as conn:
        rows = conn.execute(
            "SELECT ip, method, path, user_agent, status_code, reason, created_at FROM security_events ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(row) for row in rows]

@app.get("/api/security/blocked-ips")
async def get_blocked_ips():
    return memory_store.get_blocked_ips()

@app.post("/api/upload/avatar")
async def upload_avatar(file: UploadFile = File(...), user: Dict[str, Any] = Depends(current_user)):
    content = await file.read()
    url = StorageService.upload_avatar(content, file.filename, user["username"])
    if not url:
        raise HTTPException(status_code=400, detail="Tệp ảnh không hợp lệ hoặc bị từ chối bảo mật.")
    return {"success": True, "url": url}

@app.post("/api/upload/problem-image")
async def upload_problem_image(problem_slug: str = Form(...), file: UploadFile = File(...), user: Dict[str, Any] = Depends(admin_required)):
    content = await file.read()
    url = StorageService.upload_problem_image(content, file.filename, problem_slug)
    if not url:
        raise HTTPException(status_code=400, detail="Tệp ảnh đề bài không hợp lệ.")
    return {"success": True, "url": url}

@app.post("/api/upload/ai-attachment")
async def upload_ai_attachment(session_id: str = Form(...), file: UploadFile = File(...), user: Dict[str, Any] = Depends(current_user)):
    content = await file.read()
    url = StorageService.upload_ai_attachment(content, file.filename, session_id)
    if not url:
        raise HTTPException(status_code=400, detail="Tệp ảnh đính kèm AI không hợp lệ.")
    return {"success": True, "url": url}

# Mount static uploads & media directory
uploads_dir = Path("data/uploads")
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory="data/uploads"), name="uploads")

media_dir = Path("data/media")
media_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory="data/media"), name="media")

# =============================================================================
# PAYMENT API — VietQR Checkout & Membership Upgrade
# =============================================================================
class PaymentConfirmRequest(BaseModel):
    plan: str                       # 'pro' | 'enterprise'
    ref_code: str                   # Transfer memo from user
    sender_name: Optional[str] = "" # Họ tên người chuyển khoản theo tài khoản ngân hàng

@app.post("/api/payment/confirm")
async def payment_confirm(req: PaymentConfirmRequest, user: Dict[str, Any] = Depends(current_user)):
    """Record a completed VietQR payment, upgrade user membership, and notify Dev & SuperAdmin."""
    try:
        result = memory_store.confirm_payment(
            user_id=user["id"],
            plan=req.plan,
            ref_code=req.ref_code.strip(),
            sender_name=(req.sender_name or "").strip(),
        )
        # Generate HMAC-SHA256 tamper-proof signature for transaction verification
        tx_signature = create_hmac_sha256(
            f"{user['id']}:{req.plan}:{req.ref_code.strip()}:{result.get('payment_id', 0)}"
        )
        result["hmac_sha256_signature"] = tx_signature
        result["signature_algorithm"] = "HMAC-SHA256"
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/notifications")
async def get_admin_notifications_api(user: Dict[str, Any] = Depends(superadmin_required)):
    """Return all system notifications for Dev and SuperAdmin."""
    notifications = memory_store.get_admin_notifications(limit=100)
    unread_count = sum(1 for n in notifications if not n.get("is_read"))
    return {"notifications": notifications, "unread_count": unread_count}

@app.post("/api/admin/notifications/{notification_id}/read")
async def mark_admin_notification_read_api(notification_id: int, user: Dict[str, Any] = Depends(superadmin_required)):
    """Mark a notification as read."""
    memory_store.mark_notification_read(notification_id)
    return {"success": True}

class PaymentRejectRequest(BaseModel):
    reason: Optional[str] = "Thông tin chuyển khoản không trùng khớp hoặc chưa nhận được tiền"

@app.get("/api/admin/payment-requests")
async def list_payment_requests_api(limit: int = 100, user: Dict[str, Any] = Depends(superadmin_required)):
    """SUPERADMIN & DEV ONLY: Danh sách các yêu cầu thanh toán / chuyển gói cần duyệt."""
    requests_list = memory_store.list_payment_requests(limit=min(limit, 200))
    return {"payment_requests": requests_list}

@app.post("/api/admin/payment-requests/{payment_id}/approve")
async def approve_payment_request_api(payment_id: int, user: Dict[str, Any] = Depends(superadmin_required)):
    """SUPERADMIN & DEV ONLY: Duyệt gói nâng cấp cho người mua."""
    try:
        res = memory_store.approve_payment_request(payment_id=payment_id, approved_by_user_id=user["id"])
        sentinel_bot._log_sentinel_action(
            action_type="PAYMENT_PACKAGE_APPROVED",
            target_user_id=res.get("user_id"),
            reason=f"Approved plan [{res.get('plan', '').upper()}] for @{res.get('username')}",
            details=f"Approved by @{user.get('username')} (ID #{user.get('id')})"
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/admin/payment-requests/{payment_id}/reject")
async def reject_payment_request_api(payment_id: int, req: Optional[PaymentRejectRequest] = Body(default=None), user: Dict[str, Any] = Depends(superadmin_required)):
    """SUPERADMIN & DEV ONLY: Từ chối gói nâng cấp."""
    try:
        reason = req.reason if (req and req.reason) else "Không khớp giao dịch ngân hàng"
        res = memory_store.reject_payment_request(payment_id=payment_id, rejected_by_user_id=user["id"], reason=reason)
        sentinel_bot._log_sentinel_action(
            action_type="PAYMENT_PACKAGE_REJECTED",
            reason=f"Rejected payment #{payment_id}: {reason}",
            details=f"Rejected by @{user.get('username')}"
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/payment/history")
async def payment_history(user: Dict[str, Any] = Depends(current_user)):
    """Return current user's payment history."""
    return {"payments": memory_store.get_user_payments(user["id"])}

@app.get("/api/payment/can-create-community")
async def can_create_community_check(user: Dict[str, Any] = Depends(current_user)):
    allowed = memory_store.can_create_community(user["id"])
    return {"allowed": allowed, "role": user.get("role", "user")}

# =============================================================================
# COMMUNITY API
# =============================================================================
class CommunityCreateRequest(BaseModel):
    name: str
    description: str
    privacy_mode: str = "public"   # 'public' | 'private'

class JoinRequestActionRequest(BaseModel):
    status: str   # 'approved' | 'rejected'

@app.get("/api/communities")
async def list_communities(user: Dict[str, Any] = Depends(current_user)):
    """List communities visible to the current user."""
    communities = memory_store.list_communities(
        viewer_user_id=user["id"],
        viewer_role=user.get("role", "user"),
    )
    return {"communities": communities}

@app.post("/api/communities")
async def create_community(req: CommunityCreateRequest, user: Dict[str, Any] = Depends(current_user)):
    """Create a new community. Requires Pro/Enterprise/Admin/Dev role."""
    try:
        community = memory_store.create_community(
            name=req.name.strip(),
            description=req.description.strip(),
            privacy_mode=req.privacy_mode,
            created_by=user["id"],
        )
        return {"success": True, "community": community}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/communities/{community_id}")
async def get_community(community_id: int, user: Dict[str, Any] = Depends(current_user)):
    community = memory_store.get_community(community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community không tồn tại.")
    # Check access to private communities
    role = user.get("role", "user")
    if community["privacy_mode"] == "private" and role not in memory_store.PRIVILEGED_ROLES:
        from backend.database.db import MemoryStore as _MS
        with db_manager.get_connection() as conn:
            is_member = conn.execute(
                "SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ?",
                (community_id, user["id"]),
            ).fetchone()
        if not is_member:
            raise HTTPException(status_code=403, detail="Community riêng tư. Bạn cần tham gia trước.")
    return {"community": community}

@app.post("/api/communities/{community_id}/join")
async def join_community(community_id: int, user: Dict[str, Any] = Depends(current_user)):
    """Join a public community directly, or submit a join request for a private one."""
    try:
        result = memory_store.join_community(community_id=community_id, user_id=user["id"])
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/communities/{community_id}/members")
async def list_community_members(community_id: int, user: Dict[str, Any] = Depends(current_user)):
    try:
        members = memory_store.list_community_members(
            community_id=community_id,
            viewer_user_id=user["id"],
            viewer_role=user.get("role", "user"),
        )
        return {"members": members}
    except (PermissionError, ValueError) as e:
        raise HTTPException(status_code=403, detail=str(e))

@app.get("/api/communities/{community_id}/requests")
async def list_join_requests(community_id: int, user: Dict[str, Any] = Depends(current_user)):
    """List pending join requests for a private community (owner/admin/dev only)."""
    try:
        requests = memory_store.list_join_requests(
            community_id=community_id,
            reviewer_user_id=user["id"],
            reviewer_role=user.get("role", "user"),
        )
        return {"requests": requests}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

@app.post("/api/communities/requests/{request_id}/process")
async def process_join_request(request_id: int, req: JoinRequestActionRequest, user: Dict[str, Any] = Depends(current_user)):
    """Approve or reject a community join request."""
    try:
        memory_store.process_join_request(
            request_id=request_id,
            status=req.status,
            reviewer_user_id=user["id"],
            reviewer_role=user.get("role", "user"),
        )
        return {"success": True, "status": req.status}
    except (PermissionError, ValueError) as e:
        raise HTTPException(status_code=403, detail=str(e))

@app.delete("/api/communities/{community_id}")
async def delete_community(community_id: int, user: Dict[str, Any] = Depends(current_user)):
    """Delete a community (owner or privileged roles only)."""
    try:
        memory_store.delete_community(
            community_id=community_id,
            requester_user_id=user["id"],
            requester_role=user.get("role", "user"),
        )
        return {"success": True}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

# Custom 404 handler
frontend_dir = Path("frontend")
frontend_dir.mkdir(exist_ok=True)

@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404 and not request.url.path.startswith("/api/"):
        page_404 = frontend_dir / "404.html"
        if page_404.exists():
            return FileResponse(str(page_404), status_code=404)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

# Root route serves SaaS Landing page (landing.html)
@app.get("/")
async def root():
    return FileResponse("frontend/landing.html")

# Mount frontend static files
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
