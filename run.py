import os
import sys
import uvicorn
import webbrowser
import threading
import time
import socket

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def open_browser():
    time.sleep(1.2)
    url = "http://127.0.0.1:8000"
    try:
        print(f"\n[SERVER] Dang mo trinh duyet tai: {url}\n")
    except Exception:
        pass
    webbrowser.open(url)

if __name__ == "__main__":
    local_ip = get_local_ip()
    print("=" * 65)
    print("   COMPILER---LANGUAGE - MULTI-LANGUAGE CP & LOGIC ENGINE")
    print("=" * 65)
    print("• Host Address: 0.0.0.0 (Public LAN Server)")
    print(f"• Local Machine: http://127.0.0.1:8000")
    print(f"• LAN Network IP: http://{local_ip}:8000 (Các máy khác cùng WiFi/LAN có thể vào)")
    print("• Compiler: g++ (C++17/20, -O2)")
    print("• ClueOJ Judge Engine: Enabled (5 Worker Nodes)")
    print("=" * 65)

    threading.Thread(target=open_browser, daemon=True).start()
    
    # Run uvicorn server on 0.0.0.0
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)
