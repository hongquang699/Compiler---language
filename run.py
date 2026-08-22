import os
import sys
import uvicorn
import webbrowser
import threading
import time

def open_browser():
    time.sleep(1.2)
    url = "http://127.0.0.1:8000"
    print(f"\n🚀 Đang mở trình duyệt tại: {url}\n")
    webbrowser.open(url)

if __name__ == "__main__":
    print("=" * 65)
    print("   LOCAL C++ AI - COMPETITIVE PROGRAMMING & LOGIC ENGINE")
    print("=" * 65)
    print("• Backend Server: http://127.0.0.1:8000")
    print("• Compiler: g++ (C++17/20, -O2)")
    print("• Local LLM Engine: Ollama (gemma4:latest / custom / gemma4:31b)")
    print("• RAG Knowledge Base: Enabled (data/knowledge_base)")
    print("• Memory Database: Enabled (data/memory.db)")
    print("=" * 65)

    threading.Thread(target=open_browser, daemon=True).start()
    
    # Run uvicorn server
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=False)
