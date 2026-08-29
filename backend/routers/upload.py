from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form

from backend.core.dependencies import (
    current_user,
    admin_required
)
from backend.core.storage import StorageService

router = APIRouter(prefix="/api/upload", tags=["Upload & Media"])

@router.post("/avatar")
async def upload_avatar(file: UploadFile = File(...), user: Dict[str, Any] = Depends(current_user)):
    content = await file.read()
    url = StorageService.upload_avatar(content, file.filename, user["username"])
    if not url:
        raise HTTPException(status_code=400, detail="Tệp ảnh không hợp lệ hoặc bị từ chối bảo mật.")
    return {"success": True, "url": url}

@router.post("/problem-image")
async def upload_problem_image(problem_slug: str = Form(...), file: UploadFile = File(...), user: Dict[str, Any] = Depends(admin_required)):
    content = await file.read()
    url = StorageService.upload_problem_image(content, file.filename, problem_slug)
    if not url:
        raise HTTPException(status_code=400, detail="Tệp ảnh đề bài không hợp lệ.")
    return {"success": True, "url": url}

@router.post("/ai-attachment")
async def upload_ai_attachment(session_id: str = Form(...), file: UploadFile = File(...), user: Dict[str, Any] = Depends(current_user)):
    content = await file.read()
    url = StorageService.upload_ai_attachment(content, file.filename, session_id)
    if not url:
        raise HTTPException(status_code=400, detail="Tệp ảnh đính kèm AI không hợp lệ.")
    return {"success": True, "url": url}
