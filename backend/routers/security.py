from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

from backend.core.dependencies import (
    db_manager,
    memory_store,
    optional_user,
    admin_required,
    superadmin_required,
    dev_required
)
from security.sentinel_bot import sentinel_bot
from security.anti_cheat import anti_cheat_engine

router = APIRouter(tags=["Security & Sentinel"])

class BlockIpRequest(BaseModel):
    ip: str
    reason: str = "admin_blocked"
    minutes: int = 10

class SentinelModeRequest(BaseModel):
    mode: str

class SentinelSkillExecuteRequest(BaseModel):
    skill_name: str
    target: Optional[str] = None
    params: Optional[Dict[str, Any]] = None

class AntiCheatScanRequest(BaseModel):
    threshold: Optional[float] = 60.0

class AntiCheatVerdictRequest(BaseModel):
    report_id: int
    verdict: str
    details: Optional[str] = ""

class DevManualBanRequest(BaseModel):
    user_id: Optional[int] = None
    ip: Optional[str] = None
    reason: str = "Dev Manual Ban"
    minutes: int = 1440

class DevManualUnbanRequest(BaseModel):
    user_id: Optional[int] = None
    ip: Optional[str] = None

class DevToggleBotRequest(BaseModel):
    active: bool

class ClientTamperReportRequest(BaseModel):
    type: str
    details: str
    url: Optional[str] = ""
    timestamp: Optional[str] = ""

# ── IP BLOCK & SECURITY EVENTS ────────────────────────────────────────────
@router.post("/api/admin/block-ip")
async def admin_block_ip(req: BlockIpRequest, user: Dict[str, Any] = Depends(superadmin_required)):
    ip = req.ip.strip()
    if not ip or len(ip) > 64:
        raise HTTPException(status_code=400, detail="Địa chỉ IP không hợp lệ.")
    minutes = max(5, min(req.minutes, 60))
    if ip in {"127.0.0.1", "::1", "localhost"}:
        raise HTTPException(status_code=400, detail="Không thể chặn IP localhost/dev.")
    memory_store.block_ip(ip, req.reason.strip() or "admin_blocked", minutes=minutes)
    sentinel_bot._log_sentinel_action("IP_BLOCK", target_ip=ip, reason=req.reason.strip() or "admin_blocked", details=f"Blocked {minutes}m by {user.get('username')}")
    return {"success": True, "ip": ip, "blocked_minutes": minutes}

@router.get("/api/admin/security/blocked-ips")
async def admin_list_blocked_ips(user: Dict[str, Any] = Depends(superadmin_required)):
    return {"blocked_ips": memory_store.list_blocked_ips()}

@router.delete("/api/admin/security/blocked-ips/{ip:path}")
async def admin_unblock_ip(ip: str, user: Dict[str, Any] = Depends(superadmin_required)):
    success = memory_store.unblock_ip(ip)
    return {"success": success, "message": f"Đã mở chặn IP {ip}." if success else "Không tìm thấy IP trong danh sách chặn."}

@router.get("/api/admin/security/events")
async def admin_security_events(limit: int = 100, user: Dict[str, Any] = Depends(superadmin_required)):
    return {"events": memory_store.get_security_events(limit=min(limit, 500))}

# ── SENTINEL DEFENSE BOT ──────────────────────────────────────────────────
@router.get("/api/admin/security/sentinel/status")
async def admin_sentinel_status(user: Dict[str, Any] = Depends(admin_required)):
    return sentinel_bot.skill_get_security_telemetry()

@router.post("/api/admin/security/sentinel/mode")
async def admin_set_sentinel_mode(req: SentinelModeRequest, user: Dict[str, Any] = Depends(superadmin_required)):
    mode = req.mode.lower().strip()
    if mode not in {"autonomous", "monitoring", "strict"}:
        raise HTTPException(status_code=400, detail="Chế độ không hợp lệ. Chỉ chấp nhận: autonomous, monitoring, strict")
    sentinel_bot.mode = mode
    return {"success": True, "mode": mode, "message": f"Đã chuyển Sentinel Bot sang chế độ {mode.upper()}."}

@router.post("/api/admin/security/sentinel/execute-skill")
async def admin_execute_sentinel_skill(req: SentinelSkillExecuteRequest, user: Dict[str, Any] = Depends(superadmin_required)):
    skill = req.skill_name.strip()
    target = req.target or ""
    
    if skill == "session_killswitch":
        if not target:
            raise HTTPException(status_code=400, detail="Thiếu target IP hoặc User ID để killswitch.")
        uid = int(target) if target.isdigit() else None
        ip = target if not target.isdigit() else None
        ok = sentinel_bot.skill_session_killswitch(user_id=uid, ip=ip, reason="Admin Manual Execution")
        return {"success": ok, "message": f"Đã thực hiện Session Killswitch cho target '{target}'."}
    
    elif skill == "reset_threat_score":
        if not target:
            raise HTTPException(status_code=400, detail="Thiếu target IP để reset.")
        if target in sentinel_bot.threat_cache:
            del sentinel_bot.threat_cache[target]
        ok = memory_store.reset_threat_score(target)
        return {"success": ok, "message": f"Đã xóa điểm nguy cơ cho IP '{target}'."}
    
    elif skill == "anti_cheat_scan":
        comp_id = int(target) if target.isdigit() else None
        if not comp_id:
            raise HTTPException(status_code=400, detail="Thiếu ID cuộc thi cần quét.")
        reports = anti_cheat_engine.scan_competition_cheating(comp_id, db_manager)
        return {"success": True, "reports_count": len(reports), "reports": reports}
    
    elif skill == "emergency_lockdown":
        sentinel_bot.mode = "strict"
        return {"success": True, "mode": "strict", "message": "Đã kích hoạt chế độ Phòng thủ Nghiêm ngặt (Strict Lockdown Mode)."}
    
    else:
        raise HTTPException(status_code=400, detail=f"Kỹ năng '{skill}' không được hỗ trợ hoặc không khả dụng.")

@router.get("/api/admin/security/sentinel/actions")
async def admin_list_sentinel_actions(limit: int = 100, user: Dict[str, Any] = Depends(superadmin_required)):
    return {"actions": memory_store.list_sentinel_actions(limit=min(limit, 200))}

@router.get("/api/admin/security/honeypot/logs")
async def admin_list_honeypot_logs(limit: int = 100, user: Dict[str, Any] = Depends(superadmin_required)):
    return {"logs": memory_store.list_honeypot_logs(limit=min(limit, 200))}

@router.get("/api/admin/security/threat-scores")
async def admin_get_threat_scores(limit: int = 50, user: Dict[str, Any] = Depends(superadmin_required)):
    return {"threat_scores": memory_store.get_threat_scores(limit=min(limit, 100))}

@router.delete("/api/admin/security/threat-scores/{ip:path}")
async def admin_delete_threat_score(ip: str, user: Dict[str, Any] = Depends(superadmin_required)):
    if ip in sentinel_bot.threat_cache:
        del sentinel_bot.threat_cache[ip]
    success = memory_store.reset_threat_score(ip)
    return {"success": success, "message": f"Đã xóa điểm nguy cơ IP {ip}." if success else "Không tìm thấy IP."}

# ── ANTI-CHEAT INSPECTION ─────────────────────────────────────────────────
@router.get("/api/admin/security/anti-cheat/reports")
async def admin_list_anti_cheat_reports(competition_id: Optional[int] = None, limit: int = 100, user: Dict[str, Any] = Depends(admin_required)):
    return {"reports": memory_store.list_anti_cheat_reports(competition_id=competition_id, limit=limit)}

@router.post("/api/admin/security/anti-cheat/scan/{competition_id}")
async def admin_scan_contest_anti_cheat(competition_id: int, req: AntiCheatScanRequest, user: Dict[str, Any] = Depends(admin_required)):
    contest = memory_store.get_competition(competition_id)
    if not contest:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc thi.")
    threshold = max(20.0, min(req.threshold or 60.0, 100.0))
    reports = anti_cheat_engine.scan_competition_cheating(competition_id, db_manager, threshold=threshold)
    return {
        "success": True,
        "competition_id": competition_id,
        "threshold": threshold,
        "flagged_count": len(reports),
        "reports": reports
    }

@router.post("/api/admin/security/anti-cheat/verdict")
async def admin_set_anti_cheat_verdict(req: AntiCheatVerdictRequest, user: Dict[str, Any] = Depends(admin_required)):
    valid_verdicts = {"CLEAN", "SUSPICIOUS", "FLAGGED", "PLAGIARISM_FLAGGED", "DISQUALIFIED"}
    verdict = req.verdict.upper().strip()
    if verdict not in valid_verdicts:
        raise HTTPException(status_code=400, detail=f"Verdict không hợp lệ. Cho phép: {', '.join(valid_verdicts)}")
    ok = memory_store.update_anti_cheat_verdict(req.report_id, verdict, req.details or "")
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo gian lận.")
    return {"success": True, "report_id": req.report_id, "verdict": verdict}

# ── DEV MONITORING ────────────────────────────────────────────────────────
@router.get("/api/dev/anticheat-monitor/stats")
async def dev_anticheat_stats(user: Dict[str, Any] = Depends(dev_required)):
    return sentinel_bot.skill_get_dev_anticheat_stats()

@router.get("/api/dev/web-monitor/telemetry")
async def dev_web_telemetry(user: Dict[str, Any] = Depends(dev_required)):
    return sentinel_bot.skill_get_dev_web_telemetry()

@router.post("/api/dev/web-monitor/trigger-scan")
async def dev_trigger_system_scan(user: Dict[str, Any] = Depends(dev_required)):
    sentinel_bot._run_threat_scan_cycle()
    return {"success": True, "message": "Đã thực thi chu kỳ quét an ninh toàn diện và trừng phạt tự động các đối tượng nguy cơ."}

@router.post("/api/dev/web-monitor/ban-user")
async def dev_manual_ban(req: DevManualBanRequest, user: Dict[str, Any] = Depends(dev_required)):
    if req.user_id:
        if sentinel_bot.is_dev_exempt(user_id=req.user_id):
            raise HTTPException(status_code=400, detail="Không thể ban tài khoản DEV (Dev Immunity Rule).")
        memory_store.lock_user(req.user_id, locked=True)
        sentinel_bot.skill_session_killswitch(user_id=req.user_id, reason=req.reason)
    if req.ip:
        memory_store.block_ip(req.ip, req.reason, minutes=req.minutes)
        sentinel_bot.skill_session_killswitch(ip=req.ip, reason=req.reason)
    
    sentinel_bot._log_sentinel_action("DEV_MANUAL_BAN", target_ip=req.ip, target_user_id=req.user_id, reason=req.reason)
    return {"success": True, "message": "Đã thi hành lệnh cấm và khóa tài khoản thành công."}

@router.post("/api/dev/web-monitor/unban")
async def dev_manual_unban(req: DevManualUnbanRequest, user: Dict[str, Any] = Depends(dev_required)):
    memory_store.unban_user_and_ip(user_id=req.user_id, ip=req.ip)
    if req.ip and req.ip in sentinel_bot.threat_cache:
        del sentinel_bot.threat_cache[req.ip]
    sentinel_bot._log_sentinel_action("DEV_MANUAL_UNBAN", target_ip=req.ip, target_user_id=req.user_id, reason="Dev Unban Action")
    return {"success": True, "message": "Đã mở khóa và xóa lệnh cấm thành công."}

@router.post("/api/dev/web-monitor/toggle-bot")
async def dev_toggle_sentinel_bot(req: DevToggleBotRequest, user: Dict[str, Any] = Depends(dev_required)):
    sentinel_bot.active = req.active
    action_type = "BOT_24_7_DEFENSE_ENABLED" if req.active else "BOT_DEFENSE_PAUSED_BY_DEV"
    sentinel_bot._log_sentinel_action(action_type, reason="Dev Master Toggle Switch")
    return {
        "success": True, 
        "active": sentinel_bot.active, 
        "message": f"Bot giám sát đã được {'BẬT và đang chạy ngầm liên tục 24/7' if req.active else 'TẮT / TẠM DỪNG'}."
    }

@router.post("/api/security/report-tamper")
async def report_client_tampering(
    req: ClientTamperReportRequest,
    request: Request,
    user: Optional[Dict[str, Any]] = Depends(optional_user)
):
    client_ip = request.client.host if request.client else "unknown"
    sentinel_bot._log_sentinel_action(
        action_type="CLIENT_TAMPER_ALARM",
        target_ip=client_ip,
        target_user_id=user["id"] if user else None,
        reason=f"Client Anti-Tamper Alarm: {req.type}",
        details=f"{req.details} | URL: {req.url}"
    )
    if not user or str(user.get("role", "")).lower() != "dev":
        sentinel_bot.skill_evaluate_and_react(
            ip=client_ip,
            event_type="client_tampering",
            details=f"{req.type}: {req.details}",
            user=user
        )
    return {"status": "recorded", "action": "sentinel_defense_engaged"}
