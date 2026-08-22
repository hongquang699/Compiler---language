import os
import json
import shutil
import base64
import re
import yaml
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Header, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel, Field

from backend.core.config import settings
from backend.database.db import DatabaseManager, MemoryStore
from backend.rag.store import KnowledgeStore
from backend.tools.compiler import CppCompiler
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


app = FastAPI(title="Local C++ Coding AI", version="1.0.0")

app.add_middleware(
    SecurityMiddleware,
    requests_per_minute=100,
    max_request_size=10 * 1024 * 1024,
    block_minutes=10,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize subsystems
db_manager = DatabaseManager(settings.memory_settings.get("db_path", "data/memory.db"))
memory_store = MemoryStore(db_manager)

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

class ProblemSaveRequest(BaseModel):
    title: str
    category: str
    complexity_time: str
    complexity_space: str
    solution_code: str
    notes: Optional[str] = ""
    verdict: Optional[str] = "AC"

class AuthRequest(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    remember: bool = False

class UserCodeSaveRequest(BaseModel):
    title: str
    language: str = "cpp"
    source_code: str

class CompetitionRequest(BaseModel):
    title: str
    statement: str
    status: str = "draft"
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

def current_user(request: Request, authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để sử dụng tính năng lưu code.")
    user = memory_store.get_user_by_token(authorization[7:].strip())
    if not user:
        raise HTTPException(status_code=401, detail="Phiên đăng nhập không hợp lệ.")
    client_ip = request.client.host if request.client else "unknown"
    memory_store.record_user_ip(user["id"], client_ip)
    user["competition_joined"] = memory_store.has_competition_participation(user["id"])
    return user

def bearer_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Phiên đăng nhập không hợp lệ.")
    return authorization[7:].strip()


def admin_required(user: Dict[str, Any] = Depends(current_user)):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Tài khoản này không có quyền truy cập quản trị.")
    return user

def ai_access_required(user: Dict[str, Any] = Depends(current_user)):
    if not user.get("is_admin") and memory_store.has_competition_participation(user["id"]):
        raise HTTPException(status_code=403, detail="Bạn đã tham gia cuộc thi nên AI Agent và Assistant đã bị khóa.")
    return user

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
    try:
        user = memory_store.create_user(username, email, req.password)
    except Exception as exc:
        if "UNIQUE" in str(exc).upper():
            raise HTTPException(status_code=409, detail="Tên tài khoản đã tồn tại.")
        raise
    user["competition_joined"] = False
    return {"user": user, "token": memory_store.create_auth_token(user["id"], remember=req.remember)}

@app.post("/api/auth/login")
async def login(req: AuthRequest):
    login_value = (req.username or "").strip()
    user = memory_store.authenticate_user(login_value, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Tên tài khoản hoặc mật khẩu không đúng.")
    user["competition_joined"] = memory_store.has_competition_participation(user["id"])
    return {"user": user, "token": memory_store.create_auth_token(user["id"], remember=req.remember)}

@app.get("/api/auth/me")
async def get_me(user: Dict[str, Any] = Depends(current_user)):
    return user

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

@app.post("/api/admin/judges/{judge_id}/toggle")
async def admin_toggle_judge(judge_id: str, enabled: bool, user: Dict[str, Any] = Depends(admin_required)):
    try:
        judge = judge_pool.toggle(judge_id, enabled)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"success": True, "judge": judge}

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
async def admin_monitoring_health_check(user: Dict[str, Any] = Depends(admin_required)):
    judges = judge_pool.status()
    return {"success": True, "message": "Đã kiểm tra toàn bộ máy chấm.", "judges": judges, "checked_at": datetime.now().isoformat()}


@app.get("/api/admin/members/{user_id}")
async def admin_member_detail(user_id: int, user: Dict[str, Any] = Depends(admin_required)):
    detail = memory_store.get_member_detail(user_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    return detail


@app.get("/api/admin/export-members")
async def admin_export_members(user: Dict[str, Any] = Depends(admin_required)):
    return {
        "exported_at": __import__("datetime").datetime.now().isoformat(),
        "members": memory_store.export_members(),
    }


@app.post("/api/admin/block-ip")
async def admin_block_ip(req: BlockIpRequest, user: Dict[str, Any] = Depends(admin_required)):
    ip = req.ip.strip()
    if not ip or len(ip) > 64:
        raise HTTPException(status_code=400, detail="Địa chỉ IP không hợp lệ.")
    minutes = max(5, min(req.minutes, 60))
    if ip in {"127.0.0.1", "::1", "localhost"}:
        raise HTTPException(status_code=400, detail="Không thể chặn IP localhost/dev.")
    memory_store.block_ip(ip, req.reason.strip() or "admin_blocked", minutes=minutes)
    return {"success": True, "ip": ip, "blocked_minutes": minutes}


@app.post("/api/admin/settings/model")
async def admin_switch_model(req: ModelSwitchRequest, user: Dict[str, Any] = Depends(admin_required)):
    settings.update_llm_model(req.model)
    llm_client.model = req.model
    return {"success": True, "current_model": req.model}


@app.post("/api/admin/reset")
async def admin_reset_system(user: Dict[str, Any] = Depends(admin_required)):
    memory_store.reset_server_state()
    default_model = settings.llm_settings.get("model", "gemma4:latest")
    llm_client.model = default_model
    return {"success": True, "message": "Hệ thống đã được reset thành công.", "current_model": default_model}

@app.get("/api/competitions")
async def list_competitions(user: Dict[str, Any] = Depends(current_user)):
    return memory_store.list_competitions(user_id=user["id"], include_drafts=user.get("is_admin", False))

@app.get("/api/competitions/{competition_id}/ranking")
async def get_competition_ranking(competition_id: int, user: Dict[str, Any] = Depends(current_user)):
    competition = memory_store.get_competition(competition_id, user_id=user["id"])
    if not competition or (competition["status"] == "draft" and not user.get("is_admin")):
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc thi.")
    return {"competition_id": competition_id, "ranking": memory_store.list_competition_ranking(competition_id)}

@app.get("/api/competitions/{competition_id}")
async def get_competition(competition_id: int, user: Dict[str, Any] = Depends(current_user)):
    competition = memory_store.get_competition(competition_id, user_id=user["id"], include_tests=user.get("is_admin", False))
    if not competition or (competition["status"] == "draft" and not user.get("is_admin")):
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
    if not req.source_code.strip():
        raise HTTPException(status_code=400, detail="Mã nguồn không được để trống.")
    allowed_languages = {"cpp", "c", "python", "java", "rust", "go"}
    if req.language not in allowed_languages:
        raise HTTPException(status_code=400, detail="Ngôn ngữ không được hỗ trợ.")
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

# Mount frontend static files
frontend_dir = Path("frontend")
frontend_dir.mkdir(exist_ok=True)
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
