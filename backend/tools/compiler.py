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
        "go": {"name": "Go (golang)", "ext": ".go", "compiled": True},
        "javascript": {"name": "JavaScript (Node.js)", "ext": ".js", "compiled": False},
        "typescript": {"name": "TypeScript (Node/TS)", "ext": ".ts", "compiled": False},
        "csharp": {"name": "C# (.NET)", "ext": ".cs", "compiled": True},
        "pascal": {"name": "Pascal (FPC)", "ext": ".pas", "compiled": True},
    }

    def __init__(self, temp_dir: str = "data/sandbox", gpp_path: str = "g++", gcc_path: str = "gcc", standard: str = "c++17", flags: Optional[list] = None):
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.gpp_path = gpp_path
        self.gcc_path = gcc_path
        self.standard = standard
        self.flags = flags or ["-O2", "-pipe", "-Wall", "-Wextra", "-Wno-unused-result"]
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

        # Test JavaScript (Node.js)
        try:
            r = subprocess.run(["node", "--version"], capture_output=True, timeout=2)
            available["javascript"] = (r.returncode == 0)
        except Exception:
            available["javascript"] = False

        # Test Pascal
        try:
            r = subprocess.run(["fpc", "-iW"], capture_output=True, timeout=2)
            available["pascal"] = (r.returncode == 0)
        except Exception:
            available["pascal"] = False

        return available

    def prepare_and_compile(self, source_code: str, language: str = "cpp", custom_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Prepares and compiles source code for execution.
        Returns command args to execute the sandbox process.
        """
        lang = language.lower().strip()
        # Aliases
        if lang in ["py", "python3"]: lang = "python"
        elif lang in ["c++", "g++"]: lang = "cpp"
        elif lang in ["gcc"]: lang = "c"
        elif lang in ["js", "nodejs"]: lang = "javascript"
        elif lang in ["ts"]: lang = "typescript"
        elif lang in ["cs", "dotnet"]: lang = "csharp"
        elif lang in ["pas", "freepascal"]: lang = "pascal"
        elif lang in ["golang"]: lang = "go"
        elif lang in ["rs"]: lang = "rust"

        if lang not in self.SUPPORTED_LANGS:
            lang = "cpp"

        tag = custom_name or f"sol_{int(time.time() * 1000)}"
        source_ext = self.SUPPORTED_LANGS[lang]["ext"]
        
        if lang == "java":
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
        if lang == "python":
            return {
                "success": True,
                "language": "python",
                "executable_cmd": [self.python_path, "-u", str(source_file.resolve())],
                "compiler_output": "Ready (Python 3 runtime).",
                "compile_time_ms": 0.0
            }

        # JavaScript (Node.js)
        elif lang == "javascript":
            return {
                "success": True,
                "language": "javascript",
                "executable_cmd": ["node", str(source_file.resolve())],
                "compiler_output": "Ready (Node.js runtime).",
                "compile_time_ms": 0.0
            }

        # TypeScript
        elif lang == "typescript":
            return {
                "success": True,
                "language": "typescript",
                "executable_cmd": ["npx", "ts-node", str(source_file.resolve())],
                "compiler_output": "Ready (TypeScript runtime).",
                "compile_time_ms": 0.0
            }

        # C++ (Compiled)
        elif lang == "cpp":
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

        # Pascal (Compiled)
        elif lang == "pascal":
            cmd = ["fpc", "-O2", f"-FE{str(self.temp_dir.resolve())}", str(source_file)]
            return self._run_compiler_cmd(cmd, exe_cmd, "pascal", start_time)

        # C# (Compiled)
        elif lang == "csharp":
            cmd = ["csc", f"/out:{str(exe_file)}", str(source_file)]
            return self._run_compiler_cmd(cmd, exe_cmd, "csharp", start_time)

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


class DynamicTestGenerator:
    """
    On-The-Fly Randomized Dynamic Test Generator for CP Anti-Cheat & Anti-Hardcoding:
    Generates fresh, unpredictable random inputs at judging time and computes expected output
    using the problem's reference solution. Prevents contestants from hardcoding static test cases.
    """
    @staticmethod
    def run_reference_solution(sol_code: str, input_str: str) -> Optional[str]:
        if not sol_code:
            return None
        import re, io
        cleaned = re.sub(r'turtle\.\w+\(.*?\)', '', sol_code)
        cleaned = re.sub(r'plt\.\w+\(.*?\)', '', cleaned)
        cleaned = re.sub(r'cv2\.\w+\(.*?\)', '', cleaned)
        cleaned = re.sub(r'time\.sleep\(.*?\)', '', cleaned)
        
        input_lines = input_str.strip().split('\n')
        input_idx = 0
        
        def safe_input(prompt=''):
            nonlocal input_idx
            if input_idx < len(input_lines):
                val = input_lines[input_idx]
                input_idx += 1
                return val
            raise EOFError("No more input")

        stdout_capture = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = stdout_capture
        
        safe_env = {
            '__name__': '__main__',
            'input': safe_input,
            'sys': sys,
            'math': __import__('math'),
            'random': __import__('random'),
            're': re,
            'json': __import__('json'),
            'collections': __import__('collections'),
            'itertools': __import__('itertools'),
            'functools': __import__('functools'),
            'datetime': __import__('datetime')
        }

        try:
            exec(compile(cleaned, '<solution>', 'exec'), safe_env)
            out = stdout_capture.getvalue().strip()
            return out
        except Exception:
            return None
        finally:
            sys.stdout = old_stdout

    @classmethod
    def generate_random_inputs(cls, sample_in: str, count: int = 10) -> List[str]:
        import random
        tokens = sample_in.strip().split() if sample_in else []
        random_inputs = []

        is_two_ints = len(tokens) == 2 and all(t.lstrip('-').replace('.','',1).isdigit() for t in tokens)
        is_single_int = len(tokens) == 1 and tokens[0].lstrip('-').isdigit()
        is_int_list = len(tokens) > 2 and all(t.lstrip('-').isdigit() for t in tokens)
        is_float = len(tokens) == 1 and '.' in tokens[0] and tokens[0].lstrip('-').replace('.','',1).isdigit()

        for _ in range(count):
            if is_two_ints:
                range_choice = random.choice([(1, 100), (-500, 500), (1000, 100000), (-10000, 10000)])
                a = random.randint(range_choice[0], range_choice[1])
                b = random.randint(range_choice[0], range_choice[1])
                random_inputs.append(f"{a} {b}")
            elif is_single_int:
                range_choice = random.choice([(0, 50), (51, 1000), (1001, 50000), (-500, -1)])
                n = random.randint(range_choice[0], range_choice[1])
                random_inputs.append(f"{n}")
            elif is_int_list:
                sz = random.randint(4, 16)
                lst = [random.randint(-500, 500) for _ in range(sz)]
                random_inputs.append(" ".join(map(str, lst)))
            elif is_float:
                fl = round(random.uniform(-1000.0, 1000.0), 2)
                random_inputs.append(f"{fl}")
            else:
                word_bank = [
                    "vietnam", "algorithm", "developer", "competitive", "matrix", "binary",
                    "dynamic", "array", "string", "character", "hanoi", "python", "studio",
                    "challenge", "solution", "runtime", "execution", "random", "testcase"
                ]
                w_count = random.randint(2, 5)
                random_inputs.append(" ".join(random.sample(word_bank, w_count)))

        return random_inputs

    @classmethod
    def get_dynamic_test_suite(cls, static_tests: List[Dict[str, Any]], sol_code: str = "", dynamic_count: int = 10) -> List[Dict[str, Any]]:
        """Combines static benchmark tests with dynamic on-the-fly random tests."""
        if not sol_code or not static_tests:
            return static_tests

        sample_in = str(static_tests[0].get("input", "")).strip()
        fresh_inputs = cls.generate_random_inputs(sample_in, count=dynamic_count)

        dynamic_tests = []
        for inp in fresh_inputs:
            expected = cls.run_reference_solution(sol_code, inp)
            if expected is not None and expected != "":
                dynamic_tests.append({
                    "input": inp + "\n",
                    "expected": expected + "\n",
                    "points": 2,
                    "is_dynamic": True
                })

        if dynamic_tests:
            return list(static_tests) + dynamic_tests
        return static_tests

