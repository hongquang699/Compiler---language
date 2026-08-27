import html
import re
from pathlib import Path
from typing import Iterable, Optional, Set


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
    ".webp",
    ".png",
    ".jpg",
    ".jpeg",
}

# Honeypot decoy paths that indicate scanning / hacking behavior
HONEYPOT_PATHS: Set[str] = {
    "/wp-admin",
    "/wp-login.php",
    "/wp-content",
    "/xmlrpc.php",
    "/.env",
    "/.env.local",
    "/.env.production",
    "/.git/config",
    "/.git/HEAD",
    "/config.json",
    "/actuator",
    "/actuator/health",
    "/actuator/env",
    "/phpmyadmin",
    "/pma",
    "/shell.php",
    "/eval",
    "/debug/pprof",
    "/debug/vars",
    "/api/v1/system/exec",
    "/.aws/credentials",
    "/.ssh/id_rsa",
    "/server-status",
}

# SQL Injection patterns
SQLI_PATTERNS = [
    r"(\bunion\s+(all\s+)?select\b)",
    r"(\bselect\b.+\bfrom\b.+\bwhere\b)",
    r"(\binsert\s+into\b.+\bvalues\b)",
    r"(\bdrop\s+table\b)",
    r"(\bdelete\s+from\b)",
    r"(\bupdate\b.+\bset\b)",
    r"(\b(or|and)\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+)",
    r"(\b(or|and)\s+['\"][a-z0-9]+['\"]\s*=\s*['\"][a-z0-9]+)",
    r"(--\s*$|/\*.*?\*/|;\s*--)",
    r"(\binformation_schema\b)",
    r"(\binto\s+(outfile|dumpfile)\b)",
    r"(\b(sleep|benchmark)\s*\(\s*\d+\s*\))",
    r"(\bxp_cmdshell\b)",
]
SQLI_REGEX = re.compile("|".join(SQLI_PATTERNS), re.IGNORECASE)

# XSS patterns
XSS_PATTERNS = [
    r"<\s*script[^>]*>.*?",
    r"javascript\s*:\s*.*?",
    r"on(load|error|click|mouseover|submit|keydown|focus|blur|change)\s*=",
    r"<\s*iframe[^>]*>",
    r"<\s*object[^>]*>",
    r"<\s*embed[^>]*>",
    r"<\s*svg[^>]*on\w+\s*=",
    r"document\s*\.\s*(cookie|location|domain)",
    r"eval\s*\(\s*.*?\s*\)",
    r"window\s*\[\s*['\"](location|eval)['\"]\s*\]",
]
XSS_REGEX = re.compile("|".join(XSS_PATTERNS), re.IGNORECASE)

# NoSQL injection patterns
NOSQLI_PATTERNS = [
    r"\$(where|regex|gt|gte|lt|lte|ne|nin|in|or|and)\b",
]
NOSQLI_REGEX = re.compile("|".join(NOSQLI_PATTERNS), re.IGNORECASE)

# Dangerous command injection patterns
CMD_INJECTION_PATTERNS = [
    r"(\|\s*(bash|sh|zsh|cmd|powershell))",
    r"(;\s*(rm\s+-rf|del\s+/f|format\s+[a-z]:))",
    r"(powershell\s+-enc(odedcommand)?)",
    r"(curl\s+-[oO]\s+https?://.*?\|\s*sh)",
]
CMD_REGEX = re.compile("|".join(CMD_INJECTION_PATTERNS), re.IGNORECASE)

# SSRF (Server-Side Request Forgery) patterns in query parameters or payload URLs
SSRF_PATTERNS = [
    r"https?://(127\.0\.0\.1|localhost|0\.0\.0\.0|169\.254\.169\.254|metadata\.google\.internal)",
    r"https?://(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)",
    r"file:///",
    r"gopher://",
    r"dict://",
]
SSRF_REGEX = re.compile("|".join(SSRF_PATTERNS), re.IGNORECASE)

# SSTI (Server-Side Template Injection) patterns
SSTI_PATTERNS = [
    r"(\{\{.*?__(class|mro|subclasses|globals|builtins)__.*?\}\})",
    r"(\$\{.*?T\(java\..*?\).*?\})",
    r"(<\%.*?Runtime\.getRuntime.*?\%>)",
]
SSTI_REGEX = re.compile("|".join(SSTI_PATTERNS), re.IGNORECASE)

# LFI / RFI (Local / Remote File Inclusion) patterns
LFI_PATTERNS = [
    r"(\.\./\.\./|\.\.\\\.\.\\)",
    r"(/etc/(passwd|shadow|hosts|issue))",
    r"(c:[\\/]windows[\\/]system32)",
    r"(php://(filter|input|data))",
]
LFI_REGEX = re.compile("|".join(LFI_PATTERNS), re.IGNORECASE)


def detect_sqli(payload: str) -> bool:
    """Returns True if SQL injection payload is detected."""
    if not payload or not isinstance(payload, str):
        return False
    return bool(SQLI_REGEX.search(payload))


def detect_xss(payload: str) -> bool:
    """Returns True if XSS payload is detected."""
    if not payload or not isinstance(payload, str):
        return False
    return bool(XSS_REGEX.search(payload))


def detect_nosqli(payload: str) -> bool:
    """Returns True if NoSQL injection pattern is detected."""
    if not payload or not isinstance(payload, str):
        return False
    return bool(NOSQLI_REGEX.search(payload))


def detect_command_injection(payload: str) -> bool:
    """Returns True if OS command injection is detected."""
    if not payload or not isinstance(payload, str):
        return False
    return bool(CMD_REGEX.search(payload))


def detect_ssrf(payload: str) -> bool:
    """Returns True if SSRF pattern is detected."""
    if not payload or not isinstance(payload, str):
        return False
    return bool(SSRF_REGEX.search(payload))


def detect_ssti(payload: str) -> bool:
    """Returns True if SSTI pattern is detected."""
    if not payload or not isinstance(payload, str):
        return False
    return bool(SSTI_REGEX.search(payload))


def detect_lfi_rfi(payload: str) -> bool:
    """Returns True if LFI / RFI pattern is detected."""
    if not payload or not isinstance(payload, str):
        return False
    return bool(LFI_REGEX.search(payload))


def is_honeypot_path(path: str) -> bool:
    """Returns True if the requested path is an intentional Honeypot decoy trap."""
    if not path or not isinstance(path, str):
        return False
    normalized = path.strip().lower()
    return any(normalized == hp or normalized.startswith(hp + "/") or hp in normalized for hp in HONEYPOT_PATHS)


def sanitize_html(text: str) -> str:
    """Sanitizes user text by HTML escaping."""
    if not text or not isinstance(text, str):
        return ""
    return html.escape(text.strip())


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
    max_size_bytes: int = 10 * 1024 * 1024,
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
