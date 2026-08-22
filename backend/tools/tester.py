from typing import List, Dict, Any, Optional
from backend.tools.compiler import CppCompiler
from backend.tools.sandbox import ProcessSandbox

class TestRunner:
    def __init__(self, compiler: CppCompiler, sandbox: ProcessSandbox):
        self.compiler = compiler
        self.sandbox = sandbox

    def normalize_output(self, text: str) -> str:
        """Normalizes output by trimming trailing spaces per line and stripping overall whitespace."""
        if not text:
            return ""
        lines = [line.rstrip() for line in text.strip().splitlines()]
        return "\n".join(lines)

    def compare_outputs(self, actual: str, expected: str) -> bool:
        """Compares actual vs expected output with tolerance for floating point numbers or whitespace differences."""
        norm_act = self.normalize_output(actual)
        norm_exp = self.normalize_output(expected)
        if norm_act == norm_exp:
            return True

        # Try token by token comparison
        act_tokens = norm_act.split()
        exp_tokens = norm_exp.split()
        if len(act_tokens) != len(exp_tokens):
            return False

        for a, e in zip(act_tokens, exp_tokens):
            if a == e:
                continue
            # Try float comparison with 1e-6 precision
            try:
                fa = float(a)
                fe = float(e)
                if abs(fa - fe) > 1e-6 and abs(fa - fe) / (abs(fe) + 1e-9) > 1e-6:
                    return False
            except ValueError:
                return False
        return True

    def run_tests(self, source_code: str, testcases: List[Dict[str, str]], language: str = "cpp", timeout: Optional[float] = None) -> Dict[str, Any]:
        """
        Compiles/prepares code for the specified language (C++, Python 3, Java, Rust, Go, C) and runs tests.
        """
        # Step 1: Prepare/Compile
        comp_res = self.compiler.prepare_and_compile(source_code, language=language)
        if not comp_res["success"]:
            return {
                "overall_verdict": "CE", # Compilation / Syntax Error
                "success": False,
                "language": language,
                "compiler_output": comp_res["compiler_output"],
                "compile_time_ms": comp_res["compile_time_ms"],
                "passed_tests": 0,
                "total_tests": len(testcases),
                "test_results": []
            }

        exe_cmd = comp_res["executable_cmd"]
        results = []
        overall_verdict = "AC"
        passed_count = 0
        total_time_ms = 0.0
        max_mem_kb = 0.0

        for i, tc in enumerate(testcases, 1):
            inp = tc.get("input", "")
            exp = tc.get("expected", "")
            exec_res = self.sandbox.execute(exe_cmd, stdin_data=inp, timeout=timeout)


            verdict = exec_res["verdict"]
            actual_out = exec_res["stdout"]
            err_out = exec_res["stderr"]
            t_ms = exec_res["execution_time_ms"]
            m_kb = exec_res["memory_used_kb"]

            total_time_ms += t_ms
            max_mem_kb = max(max_mem_kb, m_kb)

            if verdict == "OK":
                if exp:
                    if self.compare_outputs(actual_out, exp):
                        verdict = "AC"
                        passed_count += 1
                    else:
                        verdict = "WA"
                else:
                    # If no expected output provided, we treat valid run as OK
                    verdict = "AC"
                    passed_count += 1
            else:
                pass # TLE, MLE, or RTE

            if verdict != "AC" and overall_verdict == "AC":
                overall_verdict = verdict

            results.append({
                "test_id": i,
                "input": inp,
                "expected": exp,
                "actual": actual_out,
                "error": err_out,
                "verdict": verdict,
                "status_detail": exec_res["status_detail"],
                "execution_time_ms": t_ms,
                "memory_used_kb": m_kb
            })

        return {
            "overall_verdict": overall_verdict,
            "success": (overall_verdict == "AC"),
            "compiler_output": comp_res["compiler_output"],
            "compile_time_ms": comp_res["compile_time_ms"],
            "passed_tests": passed_count,
            "total_tests": len(testcases),
            "total_execution_time_ms": round(total_time_ms, 2),
            "max_memory_kb": round(max_mem_kb, 2),
            "test_results": results
        }
