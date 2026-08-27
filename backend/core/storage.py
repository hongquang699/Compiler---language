import os
import re
import shutil
import io
from pathlib import Path
from PIL import Image

# Thư mục lưu trữ tệp uploads của Compiler---language Studio
BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def slugify(text: str) -> str:
    """
    Chuyển đổi chữ tiếng Việt có dấu thành không dấu, viết liền không khoảng cách.
    Ví dụ: 'Bài toán Đồ thị Dijkstra' -> 'baitoandothidijkstra'
    """
    if not text:
        return "unnamed"
    text = text.lower()
    replacements = {
        '[áàảãạăắằẳẵặâấầẩẫậ]': 'a',
        '[éèẻẽẹêếềểễệ]': 'e',
        '[íìỉĩị]': 'i',
        '[óòỏõọôốồổỗộơớờởỡợ]': 'o',
        '[úùủũụưứừửữự]': 'u',
        '[ýỳỷỹỵ]': 'y',
        'đ': 'd'
    }
    for pattern, replacement in replacements.items():
        text = re.sub(pattern, replacement, text)
    # Loại bỏ các ký tự đặc biệt, giữ lại chữ cái và số
    text = re.sub(r'[^a-z0-9]', '', text)
    return text or "unnamed"

def is_valid_image(file_bytes: bytes, filename: str) -> bool:
    """
    Xác thực file ảnh tải lên bằng đuôi mở rộng và Magic Bytes (File Signature).
    """
    if not file_bytes:
        return False
        
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']:
        return False
        
    # Kiểm tra Magic Bytes
    if ext in ['.jpg', '.jpeg']:
        return file_bytes.startswith(b'\xff\xd8\xff')
    elif ext == '.png':
        return file_bytes.startswith(b'\x89PNG\r\n\x1a\n')
    elif ext == '.gif':
        return file_bytes.startswith(b'GIF87a') or file_bytes.startswith(b'GIF89a')
    elif ext == '.webp':
        return len(file_bytes) > 12 and file_bytes.startswith(b'RIFF') and b'WEBP' in file_bytes[8:12]
    elif ext == '.svg':
        try:
            content = file_bytes.decode('utf-8', errors='ignore').lower()
            return '<svg' in content or '<?xml' in content
        except Exception:
            return False
    return False

def convert_to_webp(file_bytes: bytes) -> bytes:
    """
    Chuyển đổi bytes ảnh sang định dạng WebP chất lượng cao (quality=80) để tối ưu bộ nhớ.
    """
    try:
        image = Image.open(io.BytesIO(file_bytes))
        # Chuyển đổi RGBA/Palette sang RGB nếu cần
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGBA")
        output_io = io.BytesIO()
        image.save(output_io, format="WEBP", quality=80)
        return output_io.getvalue()
    except Exception as e:
        try:
            print(f"[StorageService] WebP conversion fallback: {e}")
        except Exception:
            pass
        return file_bytes

def _clear_folder(rel_path_file: str) -> None:
    """
    Xóa sạch tất cả các file cũ có trong thư mục cha của rel_path_file
    để tránh đọng file thừa khi đổi ảnh.
    """
    full_path = UPLOAD_DIR / rel_path_file.replace('/', os.sep)
    folder_path = full_path.parent
    if folder_path.exists():
        for item in folder_path.iterdir():
            if item.is_file():
                try:
                    item.unlink()
                except Exception as e:
                    print(f"[StorageService] Lỗi xóa file cũ {item}: {e}")

class StorageService:
    """
    Storage Service Adapter dành cho Compiler---language Studio.
    Quản lý lưu trữ ảnh đại diện, ảnh sơ đồ bài toán ClueOJ và tệp đính kèm AI Code Agent.
    Đường dẫn trả về dạng '/static/uploads/...' giúp web server phục vụ trực tiếp.
    """
    
    @staticmethod
    def _save_local_file(file_bytes: bytes, rel_path: str) -> str:
        """
        Ghi bytes trực tiếp vào thư mục uploads cục bộ
        """
        try:
            full_path = UPLOAD_DIR / rel_path.replace('/', os.sep)
            full_path.parent.mkdir(parents=True, exist_ok=True)
            with open(full_path, 'wb') as f:
                f.write(file_bytes)
            return f"/static/uploads/{rel_path}"
        except Exception as e:
            print(f"[StorageService] Lỗi ghi tệp cục bộ {rel_path}: {e}")
            return None

    @staticmethod
    def upload_avatar(file_bytes: bytes, original_filename: str, username: str) -> str:
        """
        Lưu ảnh đại diện thí sinh/quản trị viên (Convert sang định dạng WebP tối ưu).
        """
        if not is_valid_image(file_bytes, original_filename):
            print(f"[SECURITY WARNING] Ảnh đại diện không hợp lệ: {original_filename}")
            return None
            
        slug = slugify(username)
        rel_path = f"avatars/{slug}/avatar.webp"
        _clear_folder(rel_path)
        webp_bytes = convert_to_webp(file_bytes)
        return StorageService._save_local_file(webp_bytes, rel_path)

    @staticmethod
    def upload_problem_image(file_bytes: bytes, original_filename: str, problem_slug: str) -> str:
        """
        Lưu ảnh sơ đồ/hình minh họa đề bài ClueOJ (Convert sang WebP).
        """
        if not is_valid_image(file_bytes, original_filename):
            print(f"[SECURITY WARNING] Ảnh bài tập không hợp lệ: {original_filename}")
            return None
            
        slug = slugify(problem_slug)
        ext = os.path.splitext(original_filename)[1].lower()
        clean_name = slugify(os.path.splitext(original_filename)[0])
        rel_path = f"problems/{slug}/{clean_name}.webp"
        
        webp_bytes = convert_to_webp(file_bytes)
        return StorageService._save_local_file(webp_bytes, rel_path)

    @staticmethod
    def upload_ai_attachment(file_bytes: bytes, original_filename: str, session_id: str) -> str:
        """
        Lưu tệp ảnh đề bài đính kèm cho trợ lý AI Code Agent phân tích.
        """
        if not is_valid_image(file_bytes, original_filename):
            print(f"[SECURITY WARNING] Ảnh đính kèm AI không hợp lệ: {original_filename}")
            return None
            
        slug = slugify(session_id)
        webp_bytes = convert_to_webp(file_bytes)
        filename_slug = slugify(os.path.splitext(original_filename)[0])
        rel_path = f"ai_attachments/{slug}/{filename_slug}.webp"
        return StorageService._save_local_file(webp_bytes, rel_path)

    @staticmethod
    def delete_by_url(public_url: str) -> bool:
        """
        Xóa file cục bộ dựa trên URL static tương đối
        """
        if not public_url or not public_url.startswith("/static/uploads/"):
            return False
        try:
            rel_path = public_url.replace("/static/uploads/", "")
            full_path = UPLOAD_DIR / rel_path.replace('/', os.sep)
            if full_path.exists():
                full_path.unlink()
                return True
        except Exception as e:
            print(f"[StorageService] Lỗi xóa tệp theo URL {public_url}: {e}")
        return False
