import os
import json
import base64
import time
from typing import Dict, Any, Optional, List
from fastapi import Request, Header, HTTPException, Depends
from pydantic import BaseModel, Field

from backend.core.config import settings
from backend.core.auth_helper import get_current_user_profile, ROLE_HIERARCHY
from backend.database.db import DatabaseManager, MemoryStore
from backend.rag.store import KnowledgeStore
from backend.tools.compiler import CppCompiler, MultiLangCompiler
from backend.tools.sandbox import ProcessSandbox
from backend.tools.tester import TestRunner
from backend.tools.clueoj_loader import ClueOJProblemLoader
from backend.judge.registry import JudgeRegistry
from backend.judge.pool import JudgePool
from backend.judge.service import JudgeService
from backend.judge.engine import dmoj_judge_engine
from backend.judge.balancer.balancer import load_balancer
from backend.judge.bridge.protocol import bridge_events
from backend.rag.store import KnowledgeStore
from backend.ai.llm_client import LocalLLMClient
from backend.ai.agent import CppCodeAgent
from security.sentinel_bot import sentinel_bot
from security.anti_cheat import anti_cheat_engine

# ── SINGLETON SUBSYSTEMS ──────────────────────────────────────────────────
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

verification_codes: Dict[str, Dict[str, Any]] = {}

# ── AUTHENTICATION & ACCESS CONTROL HELPERS ───────────────────────────────
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
