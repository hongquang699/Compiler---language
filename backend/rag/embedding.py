import math
import re
from typing import List, Dict, Any, Optional
import httpx

class HybridEmbeddingEngine:
    """
    Offline hybrid vector & BM25-like embedding engine.
    Supports local TF-IDF BM25 scoring + Ollama Embedding API when available.
    """
    def __init__(self, ollama_endpoint: str = "http://127.0.0.1:11434", embed_model: str = "nomic-embed-text"):
        self.ollama_endpoint = ollama_endpoint
        self.embed_model = embed_model
        self.vocab: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}
        self.doc_vectors: List[Dict[str, float]] = []

    def tokenize(self, text: str) -> List[str]:
        # Tokenize code identifiers, keywords, and natural language
        tokens = re.findall(r'[a-zA-Z0-9_#]+|[\(\)\[\]\{\}\<\>\+\-\*\/\=]+', text.lower())
        return tokens

    def compute_bm25_features(self, documents: List[str]):
        """Builds IDF dictionary across indexed documents."""
        N = len(documents)
        if N == 0:
            return

        df: Dict[str, int] = {}
        for doc in documents:
            tokens = set(self.tokenize(doc))
            for tok in tokens:
                df[tok] = df.get(tok, 0) + 1

        self.idf = {}
        for tok, count in df.items():
            self.idf[tok] = math.log(1 + (N - count + 0.5) / (count + 0.5))

    def get_sparse_vector(self, text: str) -> Dict[str, float]:
        tokens = self.tokenize(text)
        tf: Dict[str, int] = {}
        for tok in tokens:
            tf[tok] = tf.get(tok, 0) + 1

        length = len(tokens) or 1
        vec: Dict[str, float] = {}
        for tok, count in tf.items():
            idf_val = self.idf.get(tok, 1.0)
            # TF-IDF calculation
            vec[tok] = (count / length) * idf_val
        return vec

    def sparse_cosine_similarity(self, vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
        common_keys = set(vec1.keys()) & set(vec2.keys())
        if not common_keys:
            return 0.0

        dot_product = sum(vec1[k] * vec2[k] for k in common_keys)
        mag1 = math.sqrt(sum(v * v for v in vec1.values()))
        mag2 = math.sqrt(sum(v * v for v in vec2.values()))
        if mag1 == 0 or mag2 == 0:
            return 0.0
        return dot_product / (mag1 * mag2)

    async def get_dense_embedding_ollama(self, text: str) -> Optional[List[float]]:
        """Optional dense embedding via Ollama API if embedding model is available."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(
                    f"{self.ollama_endpoint}/api/embeddings",
                    json={"model": self.embed_model, "prompt": text}
                )
                if res.status_code == 200:
                    return res.json().get("embedding")
        except Exception:
            pass
        return None
