"""Controlled, opt-in GitHub backup service.

Authentication is delegated to Git Credential Manager or SSH; tokens are never
placed in a command line, remote URL, or response log.
"""
from __future__ import annotations

import json
import subprocess
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CONFIG_FILE = PROJECT_ROOT / "data" / "system_config.json"
_push_lock = threading.Lock()
_scheduler_started = False


def _load_config() -> dict[str, Any]:
    try:
        with CONFIG_FILE.open("r", encoding="utf-8") as handle:
            value = json.load(handle)
            return value if isinstance(value, dict) else {}
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {}


def _save_config(values: dict[str, Any]) -> None:
    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    config = _load_config()
    config.update(values)
    temporary = CONFIG_FILE.with_suffix(".tmp")
    with temporary.open("w", encoding="utf-8") as handle:
        json.dump(config, handle, ensure_ascii=False, indent=2)
    temporary.replace(CONFIG_FILE)


def _run_git(*args: str, timeout: int = 60) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["git", "-c", "safe.directory=*", *args], cwd=PROJECT_ROOT, capture_output=True, text=True, encoding="utf-8", timeout=timeout, check=False)


def _output(result: subprocess.CompletedProcess[str]) -> str:
    return (result.stdout or result.stderr or "OK").strip()


def _branch() -> str:
    result = _run_git("branch", "--show-current", timeout=15)
    return result.stdout.strip() if result.returncode == 0 else ""


def _origin_url() -> str:
    result = _run_git("remote", "get-url", "origin", timeout=15)
    return result.stdout.strip() if result.returncode == 0 else ""


def _add_push_history(entry: dict[str, Any]) -> None:
    config = _load_config()
    history = config.get("github_push_history", [])
    history.insert(0, entry)
    _save_config({"github_push_history": history[:30]})


def get_git_status() -> dict[str, Any]:
    branch = _branch() or "main"
    origin = _origin_url()
    status_proc = _run_git("status", "--porcelain", timeout=15)
    uncommitted_count = len([line for line in status_proc.stdout.splitlines() if line.strip()]) if status_proc.returncode == 0 else 0
    log_proc = _run_git("log", "-1", "--pretty=format:%h - %s (%cr)", timeout=15)
    last_commit = log_proc.stdout.strip() if log_proc.returncode == 0 else "N/A"
    config = _load_config()
    history = config.get("github_push_history", [])
    return {
        "branch": branch,
        "origin_url": origin,
        "uncommitted_count": uncommitted_count,
        "last_commit": last_commit,
        "last_push_time": config.get("last_github_push_time", ""),
        "history": history[:20]
    }


def test_connection() -> dict[str, Any]:
    origin = _origin_url()
    if not origin:
        return {"success": False, "message": "Chưa cấu hình Git Remote origin."}
    proc = _run_git("ls-remote", "--exit-code", "origin", "HEAD", timeout=20)
    if proc.returncode == 0:
        return {"success": True, "message": f"Kết nối thành công tới GitHub ({origin})"}
    return {"success": False, "message": f"Không kết nối được GitHub: {_output(proc)}"}


def git_push(commit_message: str | None = None) -> dict[str, Any]:
    """Commit staged source/config changes then push the active branch to origin."""
    with _push_lock:
        branch, origin = _branch(), _origin_url()
        if not branch:
            res = {"success": False, "message": "Repository đang ở detached HEAD; không thể push.", "output": ""}
            _add_push_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "message": commit_message or "Manual push", "status": "FAILED", "detail": res["message"]})
            return res
        if not origin:
            res = {"success": False, "message": "Chưa cấu hình remote 'origin'.", "output": ""}
            _add_push_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "message": commit_message or "Manual push", "status": "FAILED", "detail": res["message"]})
            return res
        message = commit_message or f"Backup CP Studio - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        logs: list[str] = []
        add = _run_git("add", "--ignore-removal", "--", "backend", "frontend", "config", "security", "tests", "config.yaml", "requirements.txt", "README.md", "run.py", "package.json", "package-lock.json", timeout=30)
        logs.append(f"[git add] {_output(add)}")
        if add.returncode:
            res = {"success": False, "message": "git add thất bại.", "output": "\n".join(logs)}
            _add_push_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "message": message, "status": "FAILED", "detail": res["message"]})
            return res
        staged = _run_git("diff", "--cached", "--quiet", timeout=15)
        if staged.returncode == 0:
            _save_config({"last_github_push_time": datetime.now().isoformat(), "change_counter": 0})
            res = {"success": True, "message": "Không có thay đổi mã nguồn mới để push.", "output": "\n".join(logs)}
            _add_push_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "message": message, "status": "NO_CHANGES", "detail": res["message"]})
            return res
        if staged.returncode != 1:
            logs.append(f"[git diff] {_output(staged)}")
            res = {"success": False, "message": "Không thể kiểm tra các thay đổi đã stage.", "output": "\n".join(logs)}
            _add_push_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "message": message, "status": "FAILED", "detail": res["message"]})
            return res
        commit = _run_git("-c", "user.name=Local CP Backup", "-c", "user.email=backup@localhost", "commit", "-m", message, timeout=30)
        logs.append(f"[git commit] {_output(commit)}")
        if commit.returncode:
            res = {"success": False, "message": "git commit thất bại.", "output": "\n".join(logs)}
            _add_push_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "message": message, "status": "FAILED", "detail": res["message"]})
            return res
        push = _run_git("push", "origin", branch, timeout=90)
        logs.append(f"[git push] {_output(push)}")
        if push.returncode:
            res = {"success": False, "message": "git push thất bại. Kiểm tra quyền GitHub hoặc SSH/Credential Manager.", "output": "\n".join(logs)}
            _add_push_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "message": message, "status": "FAILED", "detail": res["message"]})
            return res
        _save_config({"last_github_push_time": datetime.now().isoformat(), "change_counter": 0})
        res = {"success": True, "message": "Đã push thành công mã nguồn lên GitHub!", "output": "\n".join(logs)}
        _add_push_history({"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "message": message, "status": "SUCCESS", "detail": res["message"]})
        return res


def increment_change_counter() -> None:
    """Count a database change and trigger a background backup at its limit."""
    with _push_lock:
        config = _load_config()
        if not config.get("github_auto_push", False):
            return
        limit = max(0, int(config.get("github_push_trigger_count", 0) or 0))
        if not limit:
            return
        count = int(config.get("change_counter", 0) or 0) + 1
        _save_config({"change_counter": count})
        if count < limit:
            return
    threading.Thread(target=git_push, args=(f"Tự động push sau {count} thay đổi dữ liệu",), daemon=True).start()


def _valid_time(value: str) -> bool:
    try:
        datetime.strptime(value, "%H:%M")
        return True
    except (TypeError, ValueError):
        return False


def start_auto_push_scheduler() -> None:
    """Start the one-per-process scheduler for up to three HH:MM backup times."""
    global _scheduler_started
    if _scheduler_started:
        return
    _scheduler_started = True
    def schedule_loop() -> None:
        while True:
            config = _load_config()
            if config.get("github_auto_push", False):
                now, date, clock = datetime.now(), datetime.now().strftime("%Y-%m-%d"), datetime.now().strftime("%H:%M")
                for index in range(1, 4):
                    backup_time = str(config.get(f"backup_time_{index}", ""))
                    if backup_time == clock and _valid_time(backup_time) and config.get(f"last_backup_date_{index}") != date:
                        result = git_push(f"Tự động push theo khung giờ ({backup_time})")
                        if result["success"]:
                            _save_config({f"last_backup_date_{index}": date})
            time.sleep(60)
    threading.Thread(target=schedule_loop, name="github-auto-push", daemon=True).start()


def get_github_config() -> dict[str, Any]:
    config = _load_config()
    return {
        "github_auto_push": bool(config.get("github_auto_push", False)),
        "github_push_trigger_count": int(config.get("github_push_trigger_count", 0) or 0),
        "backup_time_1": config.get("backup_time_1", "02:00"),
        "backup_time_2": config.get("backup_time_2", "14:00"),
        "backup_time_3": config.get("backup_time_3", "20:00"),
        "push_on_event": bool(config.get("push_on_event", True)),
        "custom_commit_prefix": config.get("custom_commit_prefix", "Auto CP Studio Sync"),
        "github_repo_url": _origin_url(),
        "last_github_push_time": config.get("last_github_push_time", "")
    }


def save_github_config(auto_push: bool, backup_time_1: str, backup_time_2: str, backup_time_3: str, trigger_count: int = 0, push_on_event: bool = True, custom_commit_prefix: str = "") -> dict[str, Any]:
    times = (backup_time_1, backup_time_2, backup_time_3)
    if any(not _valid_time(value) for value in times):
        raise ValueError("Thời gian backup phải theo định dạng HH:MM.")
    _save_config({
        "github_auto_push": auto_push,
        "github_push_trigger_count": max(0, trigger_count),
        "backup_time_1": backup_time_1,
        "backup_time_2": backup_time_2,
        "backup_time_3": backup_time_3,
        "push_on_event": push_on_event,
        "custom_commit_prefix": custom_commit_prefix or "Auto CP Studio Sync"
    })
    return get_github_config()

