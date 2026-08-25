import time
from functools import wraps
from typing import Any, Dict, Optional, Union
from fastapi import Depends, HTTPException, Request
from fastapi.responses import JSONResponse

# Bảng phân cấp Quyền hạn (Role-Based Access Control - RBAC)
ROLE_HIERARCHY: Dict[str, int] = {
    "guest": 1,
    "user": 2,
    "member": 2,
    "contestant": 3,
    "uploader": 4,
    "translator": 5,
    "moderator": 6,
    "admin": 7,
    "superadmin": 8,
    "dev": 9
}

def api_response(success: bool, data: Any = None, message: str = "", status_code: int = 200) -> JSONResponse:
    """
    Format JSON response thống nhất cho toàn bộ API dự án LOCAL CP Studio.
    """
    return JSONResponse(
        status_code=status_code,
        content={
            "success": success,
            "data": data,
            "message": message
        }
    )

def get_current_user_profile(user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Kiểm tra thông tin người dùng hiện tại:
    - Nếu tài khoản bị khóa (is_locked=True), ném ngoại lệ 403.
    - Tự động chèn timestamp (?t=...) cho ảnh đại diện avatar để tránh cache trình duyệt.
    """
    if not user:
        return None
        
    if user.get("is_locked", False):
        raise HTTPException(
            status_code=403,
            detail="Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên."
        )
        
    user_copy = user.copy()
    avatar = user_copy.get("avatar_path")
    if avatar and ("http" in avatar or "/static/" in avatar) and "?t=" not in avatar:
        user_copy["avatar_path"] = f"{avatar}?t={int(time.time())}"
        
    return user_copy

def role_required(min_role: Union[str, int]):
    """
    Dependency / Decorator kiểm tra quyền hạn tối thiểu của người dùng (RBAC).
    min_role: Tên role (ví dụ: 'user'=2, 'contestant'=3, 'uploader'=4, 'translator'=5, 'moderator'=6, 'admin'=7, 'dev'=8)
              hoặc số cấp bậc int tối thiểu.
    """
    def role_dependency(user: Dict[str, Any]):
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Vui lòng đăng nhập để thực hiện chức năng này."
            )
            
        # Kiểm tra tài khoản bị khóa
        if user.get("is_locked", False):
            raise HTTPException(
                status_code=403,
                detail="Tài khoản của bạn đã bị khóa."
            )
            
        user_role = str(user.get("role", "user")).lower()
        user_level = ROLE_HIERARCHY.get(user_role, 7 if user.get("is_admin") else 2)
        
        if isinstance(min_role, int):
            required_level = min_role
        else:
            required_level = ROLE_HIERARCHY.get(str(min_role).lower(), 7)
            
        if user_level < required_level:
            raise HTTPException(
                status_code=403,
                detail="Bạn không đủ quyền truy cập tính năng này."
            )
        return get_current_user_profile(user)
        
    return role_dependency
