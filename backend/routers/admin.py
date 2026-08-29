import os
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.core.config import settings
from backend.core.dependencies import (
    db_manager,
    memory_store,
    judge_pool,
    llm_client,
    admin_required,
    superadmin_required,
    dev_required
)
from backend.services.github_service import (
    get_github_config,
    git_push,
    save_github_config,
    get_git_status,
    test_connection
)
from security.sentinel_bot import sentinel_bot
from security.crypto import compute_file_sha256

router = APIRouter(prefix="/api/admin", tags=["Admin Management"])

class UpdateUserRoleRequest(BaseModel):
    role: str

class LockUserRequest(BaseModel):
    locked: bool

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

class ModelSwitchRequest(BaseModel):
    model: str

@router.get("/overview")
async def admin_overview(user: Dict[str, Any] = Depends(admin_required)):
    data = memory_store.get_overview()
    data["current_model"] = settings.llm_settings.get("model", llm_client.model)
    return data

@router.get("/members")
async def admin_members(user: Dict[str, Any] = Depends(admin_required)):
    return {"members": memory_store.list_members()}

@router.get("/members/{user_id}")
async def admin_member_detail(user_id: int, user: Dict[str, Any] = Depends(admin_required)):
    detail = memory_store.get_member_detail(user_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    return detail

@router.put("/members/{user_id}/role")
async def admin_update_user_role(user_id: int, req: UpdateUserRoleRequest, user: Dict[str, Any] = Depends(superadmin_required)):
    role = req.role.lower().strip()
    valid_roles = ["user", "contestant", "moderator", "admin", "superadmin", "dev"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Quyền không hợp lệ. Chỉ chấp nhận: {', '.join(valid_roles)}")
    if user_id == user["id"] and role not in ["admin", "superadmin", "dev"]:
        raise HTTPException(status_code=400, detail="Bạn không thể tự gỡ quyền Quản trị của chính tài khoản mình.")
    
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

@router.put("/members/{user_id}/lock")
async def admin_lock_user(user_id: int, req: LockUserRequest, user: Dict[str, Any] = Depends(superadmin_required)):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Bạn không thể tự khóa tài khoản của mình.")
    success = memory_store.lock_user(user_id, req.locked)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    action = "khóa" if req.locked else "mở khóa"
    return {"success": True, "message": f"Đã {action} tài khoản thành công.", "user_id": user_id, "is_locked": req.locked}

@router.delete("/members/{user_id}")
async def admin_delete_user(user_id: int, user: Dict[str, Any] = Depends(dev_required)):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Bạn không thể xóa tài khoản của chính mình.")
    success = memory_store.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    return {"success": True, "message": "Đã xóa tài khoản thành công.", "user_id": user_id}

@router.get("/export-members")
async def admin_export_members(user: Dict[str, Any] = Depends(superadmin_required)):
    return {
        "exported_at": datetime.now().isoformat(),
        "members": memory_store.export_members(),
    }

@router.get("/judges")
async def admin_judges(user: Dict[str, Any] = Depends(admin_required)):
    return {
        "judges": judge_pool.status(),
        "checked_at": datetime.now().isoformat(),
    }

@router.get("/submissions")
async def admin_list_submissions(limit: int = 100, user: Dict[str, Any] = Depends(admin_required)):
    return memory_store.list_all_submissions(limit=limit)

@router.post("/judges/{judge_id}/toggle")
async def admin_toggle_judge(judge_id: str, enabled: bool, user: Dict[str, Any] = Depends(dev_required)):
    try:
        judge = judge_pool.toggle(judge_id, enabled)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"success": True, "judge": judge}

@router.post("/judges/{judge_id}/benchmark")
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

@router.get("/monitoring")
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

@router.post("/monitoring/health-check")
async def admin_monitoring_health_check(user: Dict[str, Any] = Depends(dev_required)):
    judges = judge_pool.status()
    return {"success": True, "message": "Đã kiểm tra toàn bộ máy chấm.", "judges": judges, "checked_at": datetime.now().isoformat()}

# ── STORAGE & BACKUP ──────────────────────────────────────────────────────
@router.get("/storage/stats")
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

@router.post("/storage/backup")
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

@router.get("/storage/backups/{filename}/download")
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

@router.delete("/storage/backups/{filename}")
async def admin_delete_backup(filename: str, user: Dict[str, Any] = Depends(dev_required)):
    safe_name = Path(filename).name
    filepath = Path("backups") / safe_name
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp sao lưu.")
    filepath.unlink()
    return {"success": True, "message": f"Đã xóa bản sao lưu {safe_name}"}

# ── GITHUB INTEGRATION ────────────────────────────────────────────────────
@router.get("/github")
async def admin_get_github_config(user: Dict[str, Any] = Depends(dev_required)):
    return get_github_config()

@router.get("/github/status")
async def admin_get_github_status(user: Dict[str, Any] = Depends(dev_required)):
    return get_git_status()

@router.post("/github/test-connection")
async def admin_github_test_connection(user: Dict[str, Any] = Depends(dev_required)):
    return test_connection()

@router.put("/github")
async def admin_save_github_config(req: GitHubConfigRequest, user: Dict[str, Any] = Depends(dev_required)):
    try:
        config = save_github_config(req.auto_push, req.backup_time_1, req.backup_time_2, req.backup_time_3, req.trigger_count, req.push_on_event, req.custom_commit_prefix or "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"success": True, "config": config}

@router.post("/github/push")
async def admin_github_push(req: GitHubPushRequest, user: Dict[str, Any] = Depends(dev_required)):
    result = git_push(req.commit_message)
    return result

@router.post("/settings/model")
async def admin_switch_model(req: ModelSwitchRequest, user: Dict[str, Any] = Depends(dev_required)):
    settings.update_llm_model(req.model)
    llm_client.model = req.model
    sentinel_bot._log_sentinel_action("MODEL_SWITCH", reason=f"Model switched to {req.model}", details=f"Action by Dev {user.get('username')}")
    return {"success": True, "current_model": req.model}

@router.post("/reset")
async def admin_reset_system(user: Dict[str, Any] = Depends(dev_required)):
    memory_store.reset_server_state()
    default_model = settings.llm_settings.get("model", "gemma4:latest")
    llm_client.model = default_model
    sentinel_bot._log_sentinel_action("SYSTEM_RESET", reason="System factory reset", details=f"Action by Dev {user.get('username')}")
    return {"success": True, "message": "Hệ thống đã được reset thành công.", "current_model": default_model}
