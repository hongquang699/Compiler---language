import json
import base64
import re
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.core.dependencies import (
    memory_store,
    rag_store,
    test_runner,
    judge_pool,
    llm_client,
    vision_llm_client,
    code_agent,
    current_user,
    ai_access_required,
    decrypt_code_payload
)
from backend.ai.prompt_engine import PromptEngine
from backend.ai.evaluator import CodeEvaluator
from backend.tools.generator import EdgeCaseGenerator
from security.sentinel_bot import sentinel_bot

router = APIRouter(tags=["AI & Agent"])

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

# ── SESSIONS ──────────────────────────────────────────────────────────────
@router.get("/api/sessions")
async def list_sessions(user: Dict[str, Any] = Depends(current_user)):
    return memory_store.list_sessions(user["id"])

@router.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str, user: Dict[str, Any] = Depends(current_user)):
    memory_store.delete_session(session_id, user["id"])
    return {"success": True}

@router.get("/api/sessions/{session_id}/messages")
async def get_session_messages(session_id: str, user: Dict[str, Any] = Depends(current_user)):
    return memory_store.get_messages(session_id, limit=30, user_id=user["id"])

# ── CHAT & AGENT PIPELINE ─────────────────────────────────────────────────
@router.post("/api/chat")
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

@router.post("/api/agent/solve")
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

@router.post("/api/agent/solve_stream")
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

@router.post("/api/agent/extract_problem_image")
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

@router.post("/api/agent/convert_code")
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
            m = re.search(r'```(?:[a-zA-Z0-9_+]*)\s*([\s\S]*?)```', response)
            converted_code = m.group(1).strip() if m else response.strip()
    except Exception as e:
        return {"success": False, "error": f"Lỗi gọi AI: {str(e)}"}

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

@router.post("/api/compile_and_run")
async def compile_and_run(req: CompileRunRequest):
    req.source_code = decrypt_code_payload(req.source_code)
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

@router.get("/api/generate_edge_cases")
async def get_edge_cases(case_type: str = "array"):
    if case_type == "graph":
        return EdgeCaseGenerator.generate_graph_edge_cases()
    return EdgeCaseGenerator.generate_array_edge_cases()
