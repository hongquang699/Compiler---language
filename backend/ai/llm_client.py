import json
import httpx
from typing import List, Dict, Any, AsyncGenerator, Optional

class LocalLLMClient:
    def __init__(self, endpoint: str = "http://127.0.0.1:11434", model: str = "gemma4:latest", timeout_seconds: int = 120):
        self.endpoint = endpoint.rstrip("/")
        self.model = model
        self.timeout = timeout_seconds

    async def check_health(self) -> Dict[str, Any]:
        """Checks if Ollama or local LLM server is reachable and lists available models."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.endpoint}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    return {
                        "status": "online",
                        "provider": "ollama",
                        "endpoint": self.endpoint,
                        "current_model": self.model,
                        "available_models": models
                    }
        except Exception as e:
            return {
                "status": "offline",
                "error": str(e),
                "endpoint": self.endpoint,
                "current_model": self.model,
                "available_models": []
            }
        return {"status": "offline", "endpoint": self.endpoint, "current_model": self.model, "available_models": []}

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.2) -> str:
        """Non-streaming generation request."""
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature
            }
        }
        if system_prompt:
            payload["system"] = system_prompt

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(f"{self.endpoint}/api/generate", json=payload)
            if res.status_code == 200:
                return res.json().get("response", "")
            else:
                raise RuntimeError(f"LLM request failed with code {res.status_code}: {res.text}")

    async def chat(self, messages: List[Dict[str, Any]], temperature: float = 0.2) -> str:
        """Chat completion request using Ollama /api/chat."""
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature
            }
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(f"{self.endpoint}/api/chat", json=payload)
            if res.status_code == 200:
                return res.json().get("message", {}).get("content", "")
            else:
                raise RuntimeError(f"Chat request failed ({res.status_code}): {res.text}")

    async def chat_stream(self, messages: List[Dict[str, str]], temperature: float = 0.2) -> AsyncGenerator[str, None]:
        """Streaming chat completion for real-time response rendering."""
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "options": {
                "temperature": temperature
            }
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream("POST", f"{self.endpoint}/api/chat", json=payload) as response:
                if response.status_code != 200:
                    yield f"Error: LLM returned status {response.status_code}"
                    return
                async for line in response.aiter_lines():
                    if line:
                        try:
                            chunk = json.loads(line)
                            content = chunk.get("message", {}).get("content", "")
                            if content:
                                yield content
                        except Exception:
                            continue
