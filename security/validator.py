from pathlib import Path
from typing import Iterable, Optional


DEFAULT_ALLOWED_EXTENSIONS = {
    ".cpp",
    ".c",
    ".cc",
    ".h",
    ".hpp",
    ".py",
    ".java",
    ".rs",
    ".go",
    ".md",
    ".txt",
}


def sanitize_path(raw_path: str, base_dir: str | Path) -> Path:
    base = Path(base_dir).resolve()
    candidate = Path(raw_path)

    if candidate.is_absolute():
        raise ValueError("Absolute paths are not allowed.")

    resolved = (base / candidate).resolve()

    if base not in resolved.parents and resolved != base:
        raise ValueError(f"Path traversal detected: {raw_path}")

    return resolved


def validate_uploaded_file(
    filename: str,
    allowed_extensions: Optional[Iterable[str]] = None,
    max_size_bytes: int = 5 * 1024 * 1024,
    file_size_bytes: Optional[int] = None,
) -> None:
    extensions = set(allowed_extensions or DEFAULT_ALLOWED_EXTENSIONS)
    suffix = Path(filename).suffix.lower()

    if suffix not in extensions:
        raise ValueError(f"File extension not allowed: {filename}")

    if file_size_bytes is not None and file_size_bytes > max_size_bytes:
        raise ValueError(
            f"File too large: {file_size_bytes} bytes exceeds {max_size_bytes} bytes."
        )
