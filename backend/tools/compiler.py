import os
import sys
import subprocess
import time
from pathlib import Path
from typing import Dict, Any, Optional, List

class MultiLangCompiler:
    """
    Unified Multi-Language Compiler and Execution Preparation Tool for Competitive Programming:
    - C++ (g++ -O2 -std=c++17)
    - C (gcc -O2)
    - Python 3 (python.exe -u)
    - Java (javac / java Main)
    - Rust (rustc -O)
    - Go (go build)
    """

    SUPPORTED_LANGS = {
        "cpp": {"name": "C++ (g++)", "ext": ".cpp", "compiled": True},
        "c": {"name": "C (gcc)", "ext": ".c", "compiled": True},
        "python": {"name": "Python 3", "ext": ".py", "compiled": False},
        "java": {"name": "Java (OpenJDK)", "ext": ".java", "compiled": True},
        "rust": {"name": "Rust (rustc)", "ext": ".rs", "compiled": True},
        "go": {"name": "Go (go)", "ext": ".go", "compiled": True},
    }

    def __init__(self, temp_dir: str = "data/sandbox", gpp_path: str = "g++", gcc_path: str = "gcc", standard: str = "c++17", flags: Optional[list] = None):
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.gpp_path = gpp_path
        self.gcc_path = gcc_path
        self.standard = standard
        self.flags = flags or ["-O2", "-Wall", "-Wextra", "-Wno-unused-result"]
        self.python_path = sys.executable


    def detect_available_languages(self) -> Dict[str, bool]:
        """Detects which compilers/interpreters are available on the host machine."""
        available = {"python": True}
        
        # Test C++
        try:
            r = subprocess.run([self.gpp_path, "--version"], capture_output=True, timeout=2)
            available["cpp"] = (r.returncode == 0)
        except Exception:
            available["cpp"] = False

        # Test C
        try:
            r = subprocess.run([self.gcc_path, "--version"], capture_output=True, timeout=2)
            available["c"] = (r.returncode == 0)
        except Exception:
            available["c"] = False

        # Test Java
        try:
            r = subprocess.run(["javac", "-version"], capture_output=True, timeout=2)
            available["java"] = (r.returncode == 0)
        except Exception:
            available["java"] = False

        # Test Rust
        try:
            r = subprocess.run(["rustc", "--version"], capture_output=True, timeout=2)
            available["rust"] = (r.returncode == 0)
        except Exception:
            available["rust"] = False

        # Test Go
        try:
            r = subprocess.run(["go", "version"], capture_output=True, timeout=2)
            available["go"] = (r.returncode == 0)
        except Exception:
            available["go"] = False

        return available

    def prepare_and_compile(self, source_code: str, language: str = "cpp", custom_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Prepares and compiles source code for execution.
        Returns command args to execute the sandbox process.
        """
        lang = language.lower()
        if lang not in self.SUPPORTED_LANGS:
            lang = "cpp"

        tag = custom_name or f"sol_{int(time.time() * 1000)}"
        source_ext = self.SUPPORTED_LANGS[lang]["ext"]
        
        if lang == "java":
            # For Java, class name should be Main
            source_file = self.temp_dir / "Main.java"
            exe_cmd = ["java", "-cp", str(self.temp_dir.resolve()), "Main"]
        else:
            source_file = self.temp_dir / f"{tag}{source_ext}"
            exe_file = self.temp_dir / f"{tag}.exe"
            exe_cmd = [str(exe_file.resolve())]

        with open(source_file, "w", encoding="utf-8") as f:
            f.write(source_code)

        start_time = time.time()

        # Python (Interpreted)
        if lang in ["python", "py"]:
            return {
                "success": True,
                "language": "python",
                "executable_cmd": [self.python_path, "-u", str(source_file.resolve())],
                "compiler_output": "Ready (Python 3 runtime).",
                "compile_time_ms": 0.0
            }

        # C++ (Compiled)
        elif lang in ["cpp", "c++"]:
            cmd = [self.gpp_path, "-std=c++17", "-O2", "-Wall", "-Wextra", "-Wno-unused-result", str(source_file), "-o", str(exe_file)]
            return self._run_compiler_cmd(cmd, exe_cmd, "cpp", start_time)

        # C (Compiled)
        elif lang == "c":
            cmd = [self.gcc_path, "-O2", "-Wall", str(source_file), "-o", str(exe_file)]
            return self._run_compiler_cmd(cmd, exe_cmd, "c", start_time)

        # Java (Compiled)
        elif lang == "java":
            cmd = ["javac", "-encoding", "utf-8", str(source_file)]
            return self._run_compiler_cmd(cmd, exe_cmd, "java", start_time)

        # Rust (Compiled)
        elif lang == "rust":
            cmd = ["rustc", "-O", str(source_file), "-o", str(exe_file)]
            return self._run_compiler_cmd(cmd, exe_cmd, "rust", start_time)

        # Go (Compiled)
        elif lang == "go":
            cmd = ["go", "build", "-o", str(exe_file), str(source_file)]
            return self._run_compiler_cmd(cmd, exe_cmd, "go", start_time)

        return {
            "success": False,
            "language": lang,
            "executable_cmd": [],
            "compiler_output": f"Unsupported language: {lang}",
            "compile_time_ms": 0.0
        }

    def _run_compiler_cmd(self, cmd: List[str], exe_cmd: List[str], lang: str, start_time: float) -> Dict[str, Any]:
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=30
            )
            compile_time = (time.time() - start_time) * 1000

            if result.returncode == 0:
                return {
                    "success": True,
                    "language": lang,
                    "executable_cmd": exe_cmd,
                    "compiler_output": result.stderr.strip() if result.stderr else "Compilation successful.",
                    "compile_time_ms": round(compile_time, 2)
                }
            else:
                return {
                    "success": False,
                    "language": lang,
                    "executable_cmd": [],
                    "compiler_output": result.stderr.strip() or result.stdout.strip() or "Compilation failed.",
                    "compile_time_ms": round(compile_time, 2)
                }
        except Exception as e:
            return {
                "success": False,
                "language": lang,
                "executable_cmd": [],
                "compiler_output": f"Compiler error: {str(e)}",
                "compile_time_ms": 0.0
            }

# Backward compatibility alias
CppCompiler = MultiLangCompiler

