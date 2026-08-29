import time
import re
import asyncio
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request, Header
from pydantic import BaseModel

from backend.core.dependencies import (
    db_manager,
    memory_store,
    current_user,
    bearer_token,
    verification_codes
)
from backend.core.email_helper import send_otp_email, generate_otp

router = APIRouter(tags=["Auth & User"])

class SendCodeRequest(BaseModel):
    email: str

class AuthRequest(BaseModel):
    username: Optional[str] = None
    login: Optional[str] = None
    password: str
    email: Optional[str] = None
    verification_code: Optional[str] = None
    remember: bool = False

class UpdateProfileRequest(BaseModel):
    fullname: Optional[str] = None
    bio: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    editor_theme: Optional[str] = None
    avatar_path: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/api/auth/send-verification-code")
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

@router.post("/api/auth/register")
async def register(req: AuthRequest):
    username = (req.username or "").strip()
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

@router.post("/api/auth/login")
async def login(req: AuthRequest):
    login_value = (req.username or req.login or req.email or "").strip()
    user = memory_store.authenticate_user(login_value, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Tên tài khoản hoặc mật khẩu không đúng.")
    user["competition_joined"] = memory_store.has_competition_participation(user["id"])
    return {"user": user, "token": memory_store.create_auth_token(user["id"], remember=req.remember)}

@router.get("/api/auth/me")
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

@router.post("/api/auth/logout")
async def logout(authorization: Optional[str] = Header(default=None)):
    token = bearer_token(authorization)
    memory_store.revoke_auth_token(token)
    return {"success": True}

@router.get("/api/user/ai-quota")
async def get_user_ai_quota_endpoint(user: Dict[str, Any] = Depends(current_user)):
    quota = memory_store.get_user_ai_quota(user["id"])
    return {"quota": quota, "user_id": user["id"], "username": user.get("username", "")}

@router.get("/api/user/profile")
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
        token = bearer_token(authorization) if authorization else None
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

@router.post("/api/user/profile")
async def update_my_profile(req: UpdateProfileRequest, authorization: Optional[str] = Header(default=None)):
    token = bearer_token(authorization) if authorization else None
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

@router.get("/api/user/submissions")
async def get_my_submissions(limit: int = 50, authorization: Optional[str] = Header(default=None)):
    token = bearer_token(authorization) if authorization else None
    user = memory_store.get_user_by_token(token) if token else None
    if not user:
        with memory_store.db.get_connection() as conn:
            u_row = conn.execute("SELECT id FROM users ORDER BY is_admin DESC, id ASC LIMIT 1").fetchone()
            user = {"id": u_row["id"]} if u_row else None
    
    if not user:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để xem lịch sử bài nộp.")
    
    return memory_store.list_user_submissions(user["id"], limit=limit)

@router.get("/api/user/submissions/{submission_id}")
async def get_my_submission_detail(submission_id: int, authorization: Optional[str] = Header(default=None)):
    sub = memory_store.get_submission_detail(submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài nộp.")
    return sub
