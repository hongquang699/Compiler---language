import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any, Dict, Optional, Union

# Global Master Cryptographic Salt / Secret Key (can be overridden by environment variable)
MASTER_CRYPTO_SECRET: str = os.getenv("CLUEOJ_CRYPTO_SECRET", "clueoj_sentinel_master_hmac_key_2026_secure_sha256_salt")


def compute_sha256(data: Union[str, bytes]) -> str:
    """Tính mã băm SHA-256 chuẩn (Hex Digest) của chuỗi văn bản hoặc dữ liệu nhị phân."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def compute_file_sha256(filepath: str, chunk_size: int = 65536) -> str:
    """Tính mã băm SHA-256 dạng luồng (Streaming SHA-256) cho tập tin lớn (Backup .zip, Database, Media)."""
    if not os.path.isfile(filepath):
        return ""
    hasher = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            while chunk := f.read(chunk_size):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception:
        return ""


def create_hmac_sha256(message: str, secret_key: Optional[str] = None) -> str:
    """Tạo chữ ký số HMAC-SHA-256 kết hợp khóa bí mật (Secret Key) để chống giả mạo gói tin."""
    key = (secret_key or MASTER_CRYPTO_SECRET).encode("utf-8")
    msg_bytes = message.encode("utf-8")
    return hmac.new(key, msg_bytes, hashlib.sha256).hexdigest()


def verify_hmac_sha256(message: str, signature: str, secret_key: Optional[str] = None) -> bool:
    """Xác thực chữ ký số HMAC-SHA-256 bằng phép so sánh chuỗi đẳng thời gian (Constant-Time Compare) chống Timing Attack."""
    if not message or not signature:
        return False
    expected_sig = create_hmac_sha256(message, secret_key)
    return hmac.compare_digest(expected_sig.lower(), signature.strip().lower())


def generate_signed_payload(payload: Dict[str, Any], secret_key: Optional[str] = None, expires_in: int = 86400) -> str:
    """
    Tạo Token định dạng HMAC-SHA256 (tương tự chuẩn HS256 JWT):
    Gồm 3 phần phân cách bởi dấu chấm: base64(header).base64(payload).hmac_signature
    Đảm bảo payload không thể bị chỉnh sửa trái phép từ phía người dùng.
    """
    header = {"alg": "HS256", "typ": "CLUEOJ-TOKEN"}
    data = {
        **payload,
        "iat": int(time.time()),
        "exp": int(time.time()) + expires_in
    }
    
    header_b64 = base64.urlsafe_b64encode(json.dumps(header, separators=(",", ":")).encode("utf-8")).decode("utf-8").rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(data, separators=(",", ":")).encode("utf-8")).decode("utf-8").rstrip("=")
    
    msg_to_sign = f"{header_b64}.{payload_b64}"
    sig = create_hmac_sha256(msg_to_sign, secret_key)
    return f"{msg_to_sign}.{sig}"


def verify_and_decode_signed_payload(token: str, secret_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Giải mã và kiểm tra tính toàn vẹn của Token HMAC-SHA256.
    Trả về payload nếu chữ ký hợp lệ và chưa hết hạn; ngược lại trả về None.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        
        header_b64, payload_b64, signature = parts
        msg_to_verify = f"{header_b64}.{payload_b64}"
        
        if not verify_hmac_sha256(msg_to_verify, signature, secret_key):
            return None
        
        # Add padding back if necessary
        padded_payload = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload_json = base64.urlsafe_b64decode(padded_payload.encode("utf-8")).decode("utf-8")
        payload = json.loads(payload_json)
        
        # Check expiration
        if "exp" in payload and time.time() > payload["exp"]:
            return None
        
        return payload
    except Exception:
        return None
