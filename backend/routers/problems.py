import os
import json
import io
import zipfile
import re
from pathlib import Path
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.core.dependencies import (
    db_manager,
    memory_store,
    judge_pool,
    llm_client,
    current_user,
    admin_required,
    decrypt_code_payload
)
from backend.core.auth_helper import get_current_user_profile
from backend.tools.compiler import MultiLangCompiler
from backend.tools.sandbox import ProcessSandbox
from security.sentinel_bot import sentinel_bot

router = APIRouter(tags=["Problems & Problem Bank"])

class ProblemSaveRequest(BaseModel):
    title: str
    category: str
    complexity_time: str
    complexity_space: str
    solution_code: str
    notes: Optional[str] = ""
    verdict: Optional[str] = "AC"

class UserCodeSaveRequest(BaseModel):
    title: str
    language: str = "cpp"
    source_code: str

class ProblemBankSubmissionRequest(BaseModel):
    source_code: str
    language: str = "python"

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
    action: str

class AdminProblemTestsUpdateRequest(BaseModel):
    tests: List[Dict[str, Any]] = Field(default_factory=list)

class AIGenerateTestsFromCodeRequest(BaseModel):
    statement: Optional[str] = ""
    solution_code: str
    language: str = "cpp"
    count: int = 5

class ProblemAdvancedUpdateRequest(BaseModel):
    checker_type: Optional[str] = "token"
    checker_code: Optional[str] = ""
    tags: Optional[str] = ""
    difficulty: Optional[str] = "Easy"
    editorial: Optional[str] = ""
    subtasks_json: Optional[str] = "[]"

class CommentCreateRequest(BaseModel):
    content: str
    post_id: Optional[int] = None
    problem_code: Optional[str] = None
    parent_id: Optional[int] = None

# ── USER SAVED PROBLEMS ───────────────────────────────────────────────────
@router.get("/api/problems")
async def get_problems(user: Dict[str, Any] = Depends(current_user)):
    return memory_store.list_solved_problems(user["id"])

@router.post("/api/problems")
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

@router.post("/api/user-code")
async def save_user_code(req: UserCodeSaveRequest, user: Dict[str, Any] = Depends(current_user)):
    pid = memory_store.save_problem(
        title=f"{req.title} [{req.language.upper()}]", category="My Code",
        complexity_time="", complexity_space="", code=req.source_code,
        notes="Code lưu từ IDE", verdict="SAVED", user_id=user["id"]
    )
    return {"success": True, "id": pid}

# ── PROBLEM BANK ──────────────────────────────────────────────────────────
@router.get("/api/problem-bank")
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

@router.get("/api/problem-bank/{code}")
async def get_problem_bank_detail(code: str):
    code_upper = code.upper().strip()
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

@router.post("/api/problem-bank/{code}/submit")
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

# ── PROBLEM COMMENTS ──────────────────────────────────────────────────────
@router.get("/api/problems/{problem_code}/comments")
async def list_problem_comments_api(problem_code: str, request: Request):
    user_id = None
    try:
        u = await get_current_user_profile(request)
        if u:
            user_id = u.get("id")
    except Exception:
        pass
    comments = memory_store.list_problem_comments(problem_code, viewer_user_id=user_id)
    return {"comments": comments}

@router.post("/api/problems/{problem_code}/comments")
async def add_problem_comment_api(problem_code: str, req: CommentCreateRequest, user: Dict[str, Any] = Depends(current_user)):
    try:
        comment = memory_store.create_comment(
            author_id=user["id"],
            content=req.content,
            problem_code=problem_code,
            parent_id=req.parent_id
        )
        return {"success": True, "comment": comment}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ── ADMIN PROBLEM BANK & ADVANCED CHECKERS ────────────────────────────────
@router.get("/api/admin/problems")
async def admin_list_problems(user: Dict[str, Any] = Depends(admin_required)):
    return memory_store.list_all_problems()

@router.get("/api/admin/problems/{problem_id}")
async def admin_get_problem(problem_id: int, user: Dict[str, Any] = Depends(admin_required)):
    problem = memory_store.get_problem(problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập.")
    return problem

@router.post("/api/admin/problems")
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

@router.put("/api/admin/problems/{problem_id}")
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

@router.post("/api/admin/problems/{problem_id}/toggle-visibility")
async def admin_toggle_problem_visibility(problem_id: int, req: AdminProblemVisibilityRequest = AdminProblemVisibilityRequest(), user: Dict[str, Any] = Depends(admin_required)):
    res = memory_store.toggle_problem_visibility(problem_id, is_hidden=req.is_hidden)
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập.")
    status_str = "ẨN" if res["is_hidden"] else "HIỂN THỊ"
    return {"success": True, "data": res, "message": f"Đã chuyển trạng thái bài [{res['code']}] sang {status_str}."}

@router.post("/api/admin/problems/bulk-action")
async def admin_bulk_problems_action(req: AdminProblemBulkActionRequest, user: Dict[str, Any] = Depends(admin_required)):
    if req.action not in ["hide", "unhide", "delete"]:
        raise HTTPException(status_code=400, detail="Hành động không hợp lệ ('hide', 'unhide', 'delete').")
    res = memory_store.bulk_problems_action(req.problem_ids, req.action)
    return res

@router.delete("/api/admin/problems/{problem_id}")
async def admin_delete_problem(problem_id: int, user: Dict[str, Any] = Depends(admin_required)):
    deleted = memory_store.delete_problem(problem_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập cần xóa.")
    return {"success": True, "id": problem_id, "message": "Đã xóa bài tập thành công."}

@router.put("/api/admin/problems/{problem_id}/tests")
async def admin_update_problem_tests(problem_id: int, req: AdminProblemTestsUpdateRequest, user: Dict[str, Any] = Depends(admin_required)):
    updated = memory_store.update_problem_tests(problem_id, req.tests)
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập để cập nhật test cases.")
    return {"success": True, "id": problem_id, "count": len(req.tests)}

@router.get("/api/admin/problems/{problem_ref}/tests")
async def admin_get_problem_tests(problem_ref: str, user: Dict[str, Any] = Depends(admin_required)):
    ref_str = str(problem_ref).strip()
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

@router.post("/api/admin/ai/generate-tests-from-code")
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

@router.post("/api/admin/problems/{problem_id}/advanced")
async def update_problem_advanced_api(problem_id: int, req: ProblemAdvancedUpdateRequest, user: Dict[str, Any] = Depends(admin_required)):
    updated = memory_store.update_problem_advanced(
        problem_id=problem_id,
        checker_type=req.checker_type,
        checker_code=req.checker_code,
        tags=req.tags,
        difficulty=req.difficulty,
        editorial=req.editorial,
        subtasks_json=req.subtasks_json
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập để cấu hình nâng cao.")
    return {"success": True, "id": problem_id, "message": "Đã lưu cấu hình nâng cao thành công."}

@router.post("/api/admin/problems/{problem_id}/upload-tests-zip")
async def upload_problem_tests_zip(problem_id: int, file: UploadFile = File(...), user: Dict[str, Any] = Depends(admin_required)):
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Vui lòng tải lên file định dạng .zip.")
    content = await file.read()
    try:
        extracted_tests = []
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            namelist = z.namelist()
            inputs: Dict[str, str] = {}
            outputs: Dict[str, str] = {}
            for name in namelist:
                if name.endswith("/") or "__MACOSX" in name:
                    continue
                p = Path(name)
                ext = p.suffix.lower()
                stem = p.stem.lower()
                if ext in (".in", ".inp") or "input" in stem or ("test" in stem and ext in (".txt", "")):
                    try:
                        inputs[stem] = z.read(name).decode("utf-8", errors="replace")
                    except Exception:
                        pass
                elif ext in (".out", ".ans", ".sol") or "output" in stem or "answer" in stem:
                    try:
                        outputs[stem] = z.read(name).decode("utf-8", errors="replace")
                    except Exception:
                        pass
                elif ext == ".txt":
                    if "in" in stem:
                        inputs[stem] = z.read(name).decode("utf-8", errors="replace")
                    elif "out" in stem:
                        outputs[stem] = z.read(name).decode("utf-8", errors="replace")

            all_stems = sorted(list(inputs.keys()))
            for s in all_stems:
                inp_text = inputs[s]
                out_stem = s.replace("input", "output").replace("in", "out").replace("inp", "out")
                out_text = outputs.get(out_stem) or outputs.get(s) or ""
                extracted_tests.append({
                    "input": inp_text,
                    "expected": out_text,
                    "points": 10
                })

            if not any(t["expected"] for t in extracted_tests) and outputs:
                sorted_outs = sorted(list(outputs.values()))
                for i, out_t in enumerate(sorted_outs):
                    if i < len(extracted_tests):
                        extracted_tests[i]["expected"] = out_t

        if not extracted_tests:
            raise HTTPException(status_code=400, detail="Không tìm thấy test cases hợp lệ (.in/.out) trong file ZIP.")

        memory_store.update_problem_tests(problem_id, extracted_tests)
        return {
            "success": True,
            "id": problem_id,
            "total_tests_imported": len(extracted_tests),
            "message": f"Đã nạp thành công {len(extracted_tests)} test cases từ file ZIP."
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Lỗi giải nén ZIP: {str(exc)}")

@router.get("/api/admin/problems/{problem_id}/export-tests-zip")
async def export_problem_tests_zip(problem_id: int, user: Dict[str, Any] = Depends(admin_required)):
    prob = memory_store.get_problem(problem_id)
    if not prob:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập.")
    tests = prob.get("tests", [])
    if not tests:
        raise HTTPException(status_code=400, detail="Bài tập này chưa có bộ test case.")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as z:
        for idx, t in enumerate(tests, 1):
            inp = t.get("input", "")
            exp = t.get("expected", "")
            z.writestr(f"test_{idx:02d}.in", inp)
            z.writestr(f"test_{idx:02d}.out", exp)
    zip_buffer.seek(0)

    filename = f"tests_problem_{prob.get('code', problem_id)}.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/api/admin/problems/{problem_id}/rejudge")
async def rejudge_problem_submissions(problem_id: int, user: Dict[str, Any] = Depends(admin_required)):
    prob = memory_store.get_problem(problem_id)
    if not prob:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập.")
    tests = prob.get("tests", [])
    if not tests:
        raise HTTPException(status_code=400, detail="Bài tập chưa có test case để chấm lại.")

    checker_type = prob.get("checker_type", "token")
    checker_code = prob.get("checker_code", "")
    subtasks = []
    if prob.get("subtasks_json"):
        try:
            subtasks = json.loads(prob["subtasks_json"])
        except Exception:
            pass

    submissions = memory_store.get_submissions_for_rejudge(problem_id=problem_id)
    rejudged_count = 0

    for sub in submissions:
        source_code = sub.get("code", "")
        lang = sub.get("language", "cpp")
        if not source_code:
            continue
        try:
            res = judge_pool.judge(
                source_code=source_code,
                language=lang,
                tests=tests,
                timeout=2,
                checker_type=checker_type,
                checker_code=checker_code,
                subtasks=subtasks
            )
            score = res.get("points", 0.0)
            verdict = res.get("overall_verdict", "UNKNOWN")
            memory_store.update_rejudged_submission(
                submission_id=sub["id"],
                verdict=verdict,
                score=score,
                passed_tests=res.get("passed_tests", 0),
                total_tests=res.get("total_tests", len(tests)),
                exec_time=int(res.get("total_execution_time_ms", 0)),
                mem_kb=int(res.get("max_memory_kb", 0)),
                compiler_output=res.get("compiler_output", ""),
                subtask_results=res.get("subtask_results")
            )
            rejudged_count += 1
        except Exception:
            pass

    return {
        "success": True,
        "problem_id": problem_id,
        "total_submissions_rejudged": rejudged_count,
        "message": f"Đã chấm lại toàn bộ {rejudged_count} bài nộp thành công."
    }
