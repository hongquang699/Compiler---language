import asyncio
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.core.config import settings
from backend.core.dependencies import (
    compiler,
    sandbox,
    test_runner,
    judge_service,
    judge_pool,
    clueoj_loader,
    rag_store,
    llm_client,
    vision_llm_client,
    code_agent,
    sentinel_bot,
    anti_cheat_engine,
    db_manager,
    memory_store,
    SECRET_PAYLOAD_KEY,
    decrypt_code_payload,
    verification_codes,
    current_user,
    optional_user,
    bearer_token,
    get_user_level,
    admin_required,
    superadmin_required,
    dev_required,
    ai_access_required
)
from backend.services.github_service import start_auto_push_scheduler
from backend.services.cache_service import global_cache
from security.middleware import SecurityMiddleware

# Import modular routers
from backend.routers import (
    auth,
    admin,
    problems,
    contests,
    community,
    ai,
    rag,
    payments,
    security,
    upload
)

app = FastAPI(
    title="Compiler---language (Decoupled Modular Architecture)",
    version="2.0.0",
    description="High-performance, modularized competitive programming and AI studio."
)

@app.on_event("startup")
async def start_background_services():
    start_auto_push_scheduler()
    asyncio.create_task(sentinel_bot.start_background_scanner(interval_seconds=10))

# ── 7-LAYER SECURITY & CORS MIDDLEWARE ─────────────────────────────────────
app.add_middleware(
    SecurityMiddleware,
    requests_per_minute=120,
    max_request_size=10 * 1024 * 1024,
    block_minutes=10,
    db_path=settings.memory_settings.get("db_path", "data/memory.db"),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "X-RateLimit-Limit"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset", "Retry-After"],
)

# ── MOUNT MODULAR ROUTERS ──────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(problems.router)
app.include_router(contests.router)
app.include_router(community.router)
app.include_router(ai.router)
app.include_router(rag.router)
app.include_router(payments.router)
app.include_router(security.router)
app.include_router(upload.router)

# ── SYSTEM HEALTH ──────────────────────────────────────────────────────────
@app.get("/api/health")
async def get_health():
    cached = global_cache.get("system_health")
    if cached:
        return cached

    llm_health = await llm_client.check_health()
    available_langs = compiler.detect_available_languages()
    comp_res = compiler.prepare_and_compile("int main(){return 0;}", language="cpp", custom_name="health_check")
    compiler_ok = comp_res["success"]

    data = {
        "status": "online",
        "llm": llm_health,
        "compiler": {
            "status": "ready" if compiler_ok else "error",
            "gpp_path": compiler.gpp_path,
            "standard": "c++17",
            "error": comp_res.get("compiler_output") if not compiler_ok else None
        },
        "languages": available_langs,
        "rag": {
            "indexed_documents": len(rag_store.documents),
            "directory": rag_store.knowledge_dir
        }
    }
    global_cache.set("system_health", data, ttl=3)
    return data

# ── STATIC DIRECTORIES & UPLOADS ───────────────────────────────────────────
uploads_dir = Path("data/uploads")
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory="data/uploads"), name="uploads")

media_dir = Path("data/media")
media_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory="data/media"), name="media")

# ── CUSTOM 404 & FRONTEND MOUNT ───────────────────────────────────────────
frontend_dir = Path("frontend")
frontend_dir.mkdir(exist_ok=True)

@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404 and not request.url.path.startswith("/api/"):
        page_404 = frontend_dir / "404.html"
        if page_404.exists():
            return FileResponse(str(page_404), status_code=404)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

@app.get("/")
async def root():
    return FileResponse("frontend/landing.html")

app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
