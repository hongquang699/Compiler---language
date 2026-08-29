import json
import re
import yaml
from datetime import datetime
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel, Field

from backend.core.dependencies import (
    db_manager,
    memory_store,
    judge_pool,
    clueoj_loader,
    llm_client,
    current_user,
    optional_user,
    admin_required,
    decrypt_code_payload
)
from backend.services.cache_service import global_cache
from security.sentinel_bot import sentinel_bot

router = APIRouter(tags=["Competitions & Contests"])

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

class ClarificationCreateRequest(BaseModel):
    problem_code: Optional[str] = "GENERAL"
    question: str

class ClarificationReplyRequest(BaseModel):
    answer: str
    is_public: bool = True

# ── PUBLIC & CONTESTANT ENDPOINTS ─────────────────────────────────────────
@router.get("/api/standings")
async def get_global_standings():
    cached = global_cache.get("global_standings")
    if cached:
        return cached
    data = {"standings": memory_store.list_global_standings()}
    global_cache.set("global_standings", data, ttl=5)
    return data

@router.get("/api/competitions")
async def list_competitions(user: Optional[Dict[str, Any]] = Depends(optional_user)):
    user_id = user["id"] if user else None
    include_drafts = user.get("is_admin", False) if user else False
    return memory_store.list_competitions(user_id=user_id, include_drafts=include_drafts)

@router.get("/api/competitions/{competition_id}/ranking")
async def get_competition_ranking(competition_id: int, user: Optional[Dict[str, Any]] = Depends(optional_user)):
    user_id = user["id"] if user else None
    is_admin = user.get("is_admin", False) if user else False
    competition = memory_store.get_competition(competition_id, user_id=user_id)
    if not competition or (competition["status"] == "draft" and not is_admin):
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc thi.")
    return {"competition_id": competition_id, "ranking": memory_store.list_competition_ranking(competition_id)}

@router.get("/api/competitions/{competition_id}/submissions")
async def get_competition_submissions(competition_id: int, user: Optional[Dict[str, Any]] = Depends(optional_user)):
    user_id = user["id"] if user else None
    is_admin = user.get("is_admin", False) if user else False
    competition = memory_store.get_competition(competition_id, user_id=user_id)
    if not competition or (competition["status"] == "draft" and not is_admin):
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc thi.")
    return {"competition_id": competition_id, "submissions": memory_store.list_competition_submissions(competition_id)}

@router.get("/api/competitions/{competition_id}")
async def get_competition(competition_id: int, user: Optional[Dict[str, Any]] = Depends(optional_user)):
    user_id = user["id"] if user else None
    is_admin = user.get("is_admin", False) if user else False
    competition = memory_store.get_competition(competition_id, user_id=user_id, include_tests=is_admin)
    if not competition or (competition["status"] == "draft" and not is_admin):
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc thi.")
    return competition

@router.post("/api/competitions/{competition_id}/join")
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

@router.post("/api/competitions/{competition_id}/submit")
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
    checker_type = "token"
    checker_code = ""
    subtasks = None
    problem_code = None
    if req.problem_id is not None:
        problem = next((item for item in competition.get("problems", []) if item["id"] == req.problem_id), None)
        if not problem:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài tập.")
        tests = problem.get("tests", [])
        checker_type = problem.get("checker_type", "token")
        checker_code = problem.get("checker_code", "")
        problem_code = problem.get("code")
        if problem.get("subtasks_json"):
            try:
                subtasks = json.loads(problem["subtasks_json"])
            except Exception:
                pass
    try:
        result = judge_pool.judge(
            req.source_code,
            req.language,
            tests,
            timeout=2,
            checker_type=checker_type,
            checker_code=checker_code,
            subtasks=subtasks
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    score = result.get("points") if "points" in result else (round((result["passed_tests"] / result["total_tests"]) * 100, 2) if result["total_tests"] else 0)
    submission_id = memory_store.log_submission(
        None, req.source_code, result["overall_verdict"], result.get("total_execution_time_ms", 0),
        result.get("max_memory_kb", 0), result.get("compiler_output", ""), user_id=user["id"],
        competition_id=competition_id, language=req.language, score=score,
        passed_tests=result["passed_tests"], total_tests=result["total_tests"]
    )
    try:
        if problem_code:
            with db_manager.get_connection() as conn:
                conn.execute("UPDATE submissions SET problem_code = ? WHERE id = ?", (problem_code.upper(), submission_id))
                conn.commit()
    except Exception:
        pass
    return {"submission_id": submission_id, "verdict": result["overall_verdict"], "score": score,
            "passed_tests": result["passed_tests"], "total_tests": result["total_tests"],
            "execution_time_ms": result.get("total_execution_time_ms", 0)}

# ── CLARIFICATIONS & SCOREBOARD FREEZE ────────────────────────────────────
@router.get("/api/competitions/{competition_id}/clarifications")
async def get_contest_clarifications(competition_id: int, user: Dict[str, Any] = Depends(current_user)):
    is_admin = user.get("role") in memory_store.PRIVILEGED_ROLES
    clarifications = memory_store.list_clarifications(competition_id, viewer_user_id=user["id"], is_admin=is_admin)
    return {"clarifications": clarifications}

@router.post("/api/competitions/{competition_id}/clarifications")
async def create_contest_clarification(competition_id: int, req: ClarificationCreateRequest, user: Dict[str, Any] = Depends(current_user)):
    try:
        item = memory_store.create_clarification(
            competition_id=competition_id,
            user_id=user["id"],
            question=req.question,
            problem_code=req.problem_code or "GENERAL"
        )
        return {"success": True, "clarification": item}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/api/admin/competitions/{competition_id}/clarifications/{clarification_id}/reply")
async def reply_contest_clarification(competition_id: int, clarification_id: int, req: ClarificationReplyRequest, user: Dict[str, Any] = Depends(admin_required)):
    if not req.answer.strip():
        raise HTTPException(status_code=400, detail="Nội dung câu trả lời không được để trống.")
    updated = memory_store.reply_clarification(
        clarification_id=clarification_id,
        answer=req.answer,
        answered_by=user["id"],
        is_public=req.is_public
    )
    return {"success": True, "clarification": updated}

@router.delete("/api/admin/competitions/{competition_id}/clarifications/{clarification_id}")
async def delete_contest_clarification(competition_id: int, clarification_id: int, user: Dict[str, Any] = Depends(admin_required)):
    memory_store.delete_clarification(clarification_id)
    return {"success": True}

@router.post("/api/admin/competitions/{competition_id}/freeze")
async def toggle_contest_freeze(competition_id: int, is_frozen: Optional[int] = Body(default=1, embed=True), user: Dict[str, Any] = Depends(admin_required)):
    memory_store.freeze_contest(competition_id, is_frozen=is_frozen)
    status_str = "ĐÃ ĐÓNG BĂNG" if is_frozen else "ĐÃ MỞ KHÓA"
    return {"success": True, "is_frozen": bool(is_frozen), "message": f"Bảng xếp hạng {status_str}."}

# ── ADMIN CONTEST MANAGEMENT ──────────────────────────────────────────────
@router.get("/api/admin/competitions")
async def admin_list_competitions(user: Dict[str, Any] = Depends(admin_required)):
    return memory_store.list_competitions(include_drafts=True)

@router.post("/api/admin/competitions")
async def admin_create_competition(req: CompetitionRequest, user: Dict[str, Any] = Depends(admin_required)):
    if not req.title.strip() or not req.statement.strip():
        raise HTTPException(status_code=400, detail="Tên và đề bài cuộc thi không được để trống.")
    if req.status not in {"draft", "published", "closed"}:
        raise HTTPException(status_code=400, detail="Trạng thái cuộc thi không hợp lệ.")
    competition_id = memory_store.create_competition(
        req.title.strip(), req.statement.strip(), req.status, req.starts_at, req.ends_at, req.tests, user["id"], req.problems
    )
    return {"success": True, "id": competition_id}

@router.post("/api/admin/competitions/{competition_id}/import-clueoj")
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

@router.put("/api/admin/competitions/{competition_id}")
async def admin_update_competition(competition_id: int, req: CompetitionRequest, user: Dict[str, Any] = Depends(admin_required)):
    if req.status not in {"draft", "published", "closed"}:
        raise HTTPException(status_code=400, detail="Trạng thái cuộc thi không hợp lệ.")
    updated = memory_store.update_competition(
        competition_id, req.title.strip(), req.statement.strip(), req.status, req.starts_at, req.ends_at, req.tests, req.problems
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc thi.")
    return {"success": True, "id": competition_id}

@router.post("/api/admin/competitions/generate-tests")
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

@router.delete("/api/admin/competitions/{competition_id}")
async def admin_delete_competition(competition_id: int, user: Dict[str, Any] = Depends(admin_required)):
    deleted = memory_store.delete_competition(competition_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc thi cần xóa.")
    return {"success": True, "id": competition_id}
