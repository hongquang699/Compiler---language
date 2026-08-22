from typing import List, Dict, Any, Optional
from pathlib import Path
from backend.rag.embedding import HybridEmbeddingEngine
from backend.rag.loader import DocumentLoader

_PROJECT_ROOT = Path(__file__).resolve().parents[2]


class KnowledgeStore:
    def __init__(self, knowledge_dir: str = "data/knowledge_base", ollama_endpoint: str = "http://127.0.0.1:11434"):
        kb = Path(knowledge_dir)
        if not kb.is_absolute():
            kb = _PROJECT_ROOT / knowledge_dir
        self.knowledge_dir = str(kb)
        self.engine = HybridEmbeddingEngine(ollama_endpoint=ollama_endpoint)
        self.documents: List[Dict[str, Any]] = []
        self.doc_sparse_vectors: List[Dict[str, float]] = []
        self.reload_index()

    def reload_index(self):
        """Indexes all documents from the knowledge directory."""
        self.documents = DocumentLoader.load_directory(self.knowledge_dir)
        raw_texts = [d["content"] for d in self.documents]
        self.engine.compute_bm25_features(raw_texts)
        self.doc_sparse_vectors = [self.engine.get_sparse_vector(t) for t in raw_texts]

    def add_document(self, filename: str, content: str):
        """Saves a new knowledge document or template and rebuilds the index."""
        p = Path(self.knowledge_dir) / filename
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)
        self.reload_index()

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Performs semantic and keyword ranking over indexed templates and notes."""
        if not self.documents:
            return []

        query_vec = self.engine.get_sparse_vector(query)
        scores = []
        for idx, doc_vec in enumerate(self.doc_sparse_vectors):
            sim = self.engine.sparse_cosine_similarity(query_vec, doc_vec)
            if sim > 0.01:
                scores.append((sim, self.documents[idx]))

        scores.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scores[:top_k]]

    def get_all_documents_metadata(self) -> List[Dict[str, Any]]:
        """Grouped by source file so the Templates UI can list and open documents."""
        grouped: Dict[str, Dict[str, Any]] = {}
        for d in self.documents:
            src = d["source"]
            if src not in grouped:
                preview = (d["content"] or "").strip().replace("\n", " ")
                grouped[src] = {
                    "name": src,
                    "filename": src,
                    "source": src,
                    "sections": 0,
                    "preview": (preview[:180] + "…") if len(preview) > 180 else preview,
                    "section_titles": [],
                }
            grouped[src]["sections"] += 1
            title = d.get("section") or ""
            if title and title not in grouped[src]["section_titles"]:
                grouped[src]["section_titles"].append(title)
        return list(grouped.values())

    def _safe_file_path(self, filename: str) -> Optional[Path]:
        if not filename:
            return None
        safe_name = Path(filename).name
        if safe_name != filename.replace("\\", "/").split("/")[-1]:
            return None
        path = (Path(self.knowledge_dir) / safe_name).resolve()
        root = Path(self.knowledge_dir).resolve()
        try:
            path.relative_to(root)
        except ValueError:
            return None
        return path if path.is_file() else None

    def get_document_text(self, filename: str) -> Optional[str]:
        path = self._safe_file_path(filename)
        if path is None:
            return None
        return path.read_text(encoding="utf-8")
