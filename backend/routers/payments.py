from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel

from backend.core.dependencies import (
    memory_store,
    current_user,
    superadmin_required
)
from security.sentinel_bot import sentinel_bot
from security.crypto import create_hmac_sha256

router = APIRouter(tags=["Payments & VietQR"])

class PaymentConfirmRequest(BaseModel):
    plan: str
    ref_code: str
    sender_name: Optional[str] = ""

class PaymentRejectRequest(BaseModel):
    reason: Optional[str] = "Thông tin chuyển khoản không trùng khớp hoặc chưa nhận được tiền"

@router.post("/api/payment/confirm")
async def payment_confirm(req: PaymentConfirmRequest, user: Dict[str, Any] = Depends(current_user)):
    try:
        result = memory_store.confirm_payment(
            user_id=user["id"],
            plan=req.plan,
            ref_code=req.ref_code.strip(),
            sender_name=(req.sender_name or "").strip(),
        )
        tx_signature = create_hmac_sha256(
            f"{user['id']}:{req.plan}:{req.ref_code.strip()}:{result.get('payment_id', 0)}"
        )
        result["hmac_sha256_signature"] = tx_signature
        result["signature_algorithm"] = "HMAC-SHA256"
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/payment/history")
async def payment_history(user: Dict[str, Any] = Depends(current_user)):
    return {"payments": memory_store.get_user_payments(user["id"])}

@router.get("/api/payment/can-create-community")
async def can_create_community_check(user: Dict[str, Any] = Depends(current_user)):
    allowed = memory_store.can_create_community(user["id"])
    return {"allowed": allowed, "role": user.get("role", "user")}

# ── ADMIN PAYMENT MANAGEMENT ──────────────────────────────────────────────
@router.get("/api/admin/notifications")
async def get_admin_notifications_api(user: Dict[str, Any] = Depends(superadmin_required)):
    notifications = memory_store.get_admin_notifications(limit=100)
    unread_count = sum(1 for n in notifications if not n.get("is_read"))
    return {"notifications": notifications, "unread_count": unread_count}

@router.post("/api/admin/notifications/{notification_id}/read")
async def mark_admin_notification_read_api(notification_id: int, user: Dict[str, Any] = Depends(superadmin_required)):
    memory_store.mark_notification_read(notification_id)
    return {"success": True}

@router.get("/api/admin/payment-requests")
async def list_payment_requests_api(limit: int = 100, user: Dict[str, Any] = Depends(superadmin_required)):
    requests_list = memory_store.list_payment_requests(limit=min(limit, 200))
    return {"payment_requests": requests_list}

@router.post("/api/admin/payment-requests/{payment_id}/approve")
async def approve_payment_request_api(payment_id: int, user: Dict[str, Any] = Depends(superadmin_required)):
    try:
        res = memory_store.approve_payment_request(payment_id=payment_id, approved_by_user_id=user["id"])
        sentinel_bot._log_sentinel_action(
            action_type="PAYMENT_PACKAGE_APPROVED",
            target_user_id=res.get("user_id"),
            reason=f"Approved plan [{res.get('plan', '').upper()}] for @{res.get('username')}",
            details=f"Approved by @{user.get('username')} (ID #{user.get('id')})"
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/api/admin/payment-requests/{payment_id}/reject")
async def reject_payment_request_api(payment_id: int, req: Optional[PaymentRejectRequest] = Body(default=None), user: Dict[str, Any] = Depends(superadmin_required)):
    try:
        reason = req.reason if (req and req.reason) else "Không khớp giao dịch ngân hàng"
        res = memory_store.reject_payment_request(payment_id=payment_id, rejected_by_user_id=user["id"], reason=reason)
        sentinel_bot._log_sentinel_action(
            action_type="PAYMENT_PACKAGE_REJECTED",
            reason=f"Rejected payment #{payment_id}: {reason}",
            details=f"Rejected by @{user.get('username')}"
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
