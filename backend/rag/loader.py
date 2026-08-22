import os
from pathlib import Path
from typing import List, Dict, Any

class DocumentLoader:
    @staticmethod
    def load_markdown_or_code(file_path: Path) -> List[Dict[str, Any]]:
        """Loads a markdown or source file and chunks by headers / logical sections."""
        chunks = []
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            title = file_path.stem.replace("_", " ").title()
            # Split by markdown headers if present
            lines = content.splitlines()
            current_section = title
            current_content = []

            for line in lines:
                if line.startswith("#"):
                    if current_content:
                        chunks.append({
                            "source": file_path.name,
                            "section": current_section,
                            "content": "\n".join(current_content).strip()
                        })
                        current_content = []
                    current_section = line.lstrip("#").strip()
                current_content.append(line)

            if current_content:
                chunks.append({
                    "source": file_path.name,
                    "section": current_section,
                    "content": "\n".join(current_content).strip()
                })

        except Exception as e:
            print(f"Error loading {file_path}: {e}")
        return chunks

    @staticmethod
    def load_directory(dir_path: str = "data/knowledge_base") -> List[Dict[str, Any]]:
        p = Path(dir_path)
        if not p.exists():
            p.mkdir(parents=True, exist_ok=True)
            return []

        all_chunks = []
        allowed = {".md", ".cpp", ".hpp", ".txt", ".h", ".py", ".java", ".rs", ".go", ".c"}
        for file in p.glob("**/*"):
            if file.is_file() and file.suffix.lower() in allowed:
                all_chunks.extend(DocumentLoader.load_markdown_or_code(file))
        return all_chunks
