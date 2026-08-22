import os
import yaml
from pathlib import Path
from typing import Dict, Any, List

class AppConfig:
    def __init__(self, config_path: str = "config.yaml"):
        self.config_path = Path(config_path)
        self.data: Dict[str, Any] = self._load()

    def _load(self) -> Dict[str, Any]:
        if not self.config_path.exists():
            return self._default_config()
        with open(self.config_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or self._default_config()

    def _default_config(self) -> Dict[str, Any]:
        return {
            "app": {"name": "Local C++ AI", "host": "127.0.0.1", "port": 8000, "debug": True},
            "llm": {
                "provider": "ollama",
                "endpoint": "http://127.0.0.1:11434",
                "model": "gemma4:latest",
                "temperature": 0.2,
                "max_tokens": 4096,
                "timeout_seconds": 120
            },
            "compiler": {
                "gpp_path": "g++",
                "standard": "c++17",
                "flags": ["-O2", "-Wall", "-Wextra", "-Wno-unused-result"],
                "temp_dir": "data/sandbox"
            },
            "sandbox": {
                "timeout_seconds": 2.0,
                "memory_limit_mb": 256,
                "max_output_length": 50000
            },
            "rag": {
                "enabled": True,
                "top_k": 3,
                "knowledge_dir": "data/knowledge_base",
                "embedding_mode": "hybrid"
            },
            "memory": {
                "db_path": "data/memory.db",
                "max_history_turns": 10
            }
        }

    @property
    def app_settings(self) -> Dict[str, Any]:
        return self.data.get("app", {})

    @property
    def llm_settings(self) -> Dict[str, Any]:
        return self.data.get("llm", {})

    @property
    def compiler_settings(self) -> Dict[str, Any]:
        return self.data.get("compiler", {})

    @property
    def sandbox_settings(self) -> Dict[str, Any]:
        return self.data.get("sandbox", {})

    @property
    def rag_settings(self) -> Dict[str, Any]:
        return self.data.get("rag", {})

    @property
    def memory_settings(self) -> Dict[str, Any]:
        return self.data.get("memory", {})

    def update_llm_model(self, new_model: str):
        self.data.setdefault("llm", {})["model"] = new_model
        with open(self.config_path, "w", encoding="utf-8") as f:
            yaml.dump(self.data, f, default_flow_style=False)

settings = AppConfig()
