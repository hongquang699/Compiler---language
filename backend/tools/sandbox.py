import subprocess
import time
import os
import psutil
from pathlib import Path
from typing import Dict, Any, Optional

class ProcessSandbox:
    def __init__(self, timeout_seconds: float = 2.0, memory_limit_mb: int = 256, max_output_length: int = 50000):
        self.timeout_seconds = timeout_seconds
        self.memory_limit_mb = memory_limit_mb
        self.max_output_length = max_output_length

    def execute(self, executable_path_or_cmd: Any, stdin_data: str = "", timeout: Optional[float] = None) -> Dict[str, Any]:
        """
        Executes a compiled binary or interpreter within a monitored sandbox.
        Supports binary path (str) or command list (List[str]).
        """
        limit_time = timeout or self.timeout_seconds
        
        if isinstance(executable_path_or_cmd, list):
            cmd = executable_path_or_cmd
        else:
            cmd = [str(executable_path_or_cmd)]

        if not cmd:
            return {
                "stdout": "",
                "stderr": "No executable command provided.",
                "returncode": -1,
                "execution_time_ms": 0,
                "memory_used_kb": 0,
                "verdict": "RTE",
                "status_detail": "Empty command"
            }

        start_time = time.perf_counter()
        peak_memory_kb = 0.0
        stdout_data = ""
        stderr_data = ""
        verdict = "OK"
        status_detail = "Normal execution"

        try:
            # Run process
            proc = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace"
            )


            # Monitor memory via psutil
            try:
                p_mon = psutil.Process(proc.pid)
                # Read stdout/stderr with timeout
                stdout_data, stderr_data = proc.communicate(input=stdin_data, timeout=limit_time)
                try:
                    mem_info = p_mon.memory_info()
                    peak_memory_kb = mem_info.rss / 1024
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.communicate()
                verdict = "TLE"
                status_detail = f"Time Limit Exceeded (> {limit_time}s)"
                execution_time = (time.perf_counter() - start_time) * 1000
                return {
                    "stdout": stdout_data[:self.max_output_length],
                    "stderr": stderr_data[:self.max_output_length],
                    "returncode": -1,
                    "execution_time_ms": round(execution_time, 2),
                    "memory_used_kb": round(peak_memory_kb, 2),
                    "verdict": verdict,
                    "status_detail": status_detail
                }

            execution_time = (time.perf_counter() - start_time) * 1000

            # Check returncode
            if proc.returncode != 0:
                verdict = "RTE"
                if proc.returncode == 3221225477 or proc.returncode == -11:
                    status_detail = "Segmentation Fault / Access Violation (SIGSEGV)"
                elif proc.returncode == 3221225620 or proc.returncode == -8:
                    status_detail = "Division by zero / Floating Point Exception (SIGFPE)"
                elif proc.returncode == 3221225725 or proc.returncode == -6:
                    status_detail = "Stack Overflow / Abort (SIGABRT)"
                else:
                    status_detail = f"Runtime Error (Exit Code: {proc.returncode})"

            # Memory limit check
            if peak_memory_kb / 1024 > self.memory_limit_mb:
                verdict = "MLE"
                status_detail = f"Memory Limit Exceeded (> {self.memory_limit_mb}MB)"

            # Truncate long outputs
            if len(stdout_data) > self.max_output_length:
                stdout_data = stdout_data[:self.max_output_length] + "\n...[Output Truncated]"

            return {
                "stdout": stdout_data,
                "stderr": stderr_data,
                "returncode": proc.returncode,
                "execution_time_ms": round(execution_time, 2),
                "memory_used_kb": round(peak_memory_kb, 2),
                "verdict": verdict,
                "status_detail": status_detail
            }

        except Exception as e:
            execution_time = (time.perf_counter() - start_time) * 1000
            return {
                "stdout": "",
                "stderr": f"Execution error: {str(e)}",
                "returncode": -1,
                "execution_time_ms": round(execution_time, 2),
                "memory_used_kb": 0,
                "verdict": "RTE",
                "status_detail": str(e)
            }
