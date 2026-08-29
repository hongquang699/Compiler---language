import shutil
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File
from backend.core.dependencies import rag_store

router = APIRouter(prefix="/api/rag", tags=["RAG Knowledge Base"])

@router.get("/documents")
async def get_rag_documents():
    return rag_store.get_all_documents_metadata()

@router.get("/search")
async def search_rag_documents(q: str = "", top_k: int = 6):
    query = (q or "").strip()
    if not query:
        return []
    hits = rag_store.search(query, top_k=max(1, min(top_k, 12)))
    return [
        {
            "source": d["source"],
            "section": d["section"],
            "preview": (d["content"] or "")[:400],
            "content": d["content"],
        }
        for d in hits
    ]

@router.get("/documents/{filename}")
async def get_rag_document(filename: str):
    content = rag_store.get_document_text(filename)
    if content is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu RAG.")
    return {"filename": Path(filename).name, "content": content}

@router.post("/upload")
async def upload_rag_doc(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Thiếu tên file.")
    safe_name = Path(file.filename).name
    Path(rag_store.knowledge_dir).mkdir(parents=True, exist_ok=True)
    target_path = Path(rag_store.knowledge_dir) / safe_name
    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    rag_store.reload_index()
    return {"success": True, "filename": safe_name, "total_indexed": len(rag_store.documents)}
