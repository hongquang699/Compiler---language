from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
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

    def compare_outputs(
        self,
        actual: str,
        expected: str,
        checker_type: str = "token",
        checker_code: Optional[str] = None,
        test_input: str = ""
    ) -> bool:
        """
        Compares actual vs expected output based on checker_type:
        - 'exact': exact byte/character match
        - 'token': whitespace/newline insensitive token-by-token comparison (default)
        - 'float_tol': float comparison with 1e-6 relative and absolute tolerance
        - 'custom_script': executes custom Python checker script
        """
        if checker_type == "exact":
            return actual == expected

        norm_act = self.normalize_output(actual)
        norm_exp = self.normalize_output(expected)
        if norm_act == norm_exp:
            return True

        if checker_type == "custom_script" and checker_code:
            try:
                local_scope: Dict[str, Any] = {}
                global_scope = {
                    "test_input": test_input,
                    "expected_output": expected,
                    "user_output": actual,
                }
                exec(checker_code, global_scope, local_scope)
                check_fn = local_scope.get("check") or global_scope.get("check")
                if callable(check_fn):
                    return bool(check_fn(test_input, expected, actual))
            except Exception:
                return False

        # Token by token comparison
        act_tokens = norm_act.split()
        exp_tokens = norm_exp.split()
        if len(act_tokens) != len(exp_tokens):
            return False

        tolerance = 1e-6
        for a, e in zip(act_tokens, exp_tokens):
            if a == e:
                continue
            # Try float comparison
            try:
                fa = float(a)
                fe = float(e)
                if abs(fa - fe) > tolerance and abs(fa - fe) / (abs(fe) + 1e-9) > tolerance:
                    return False
            except ValueError:
                return False
        return True

    def run_tests(
        self,
        source_code: str,
        testcases: List[Dict[str, str]],
        language: str = "cpp",
        timeout: Optional[float] = None,
        checker_type: str = "token",
        checker_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Compiles/prepares code for the specified language and runs tests in parallel with custom checker support.
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

        def eval_single_testcase(item):
            i, tc = item
            inp = tc.get("input", "")
            exp = tc.get("expected", "")
            exec_res = self.sandbox.execute(exe_cmd, stdin_data=inp, timeout=timeout)
            verdict = exec_res["verdict"]
            actual_out = exec_res["stdout"]
            err_out = exec_res["stderr"]
            t_ms = exec_res["execution_time_ms"]
            m_kb = exec_res["memory_used_kb"]

            if verdict == "OK":
                if exp:
                    if self.compare_outputs(actual_out, exp, checker_type=checker_type, checker_code=checker_code, test_input=inp):
                        verdict = "AC"
                    else:
                        verdict = "WA"
                else:
                    verdict = "AC"

            return i, {
                "test_id": i,
                "input": inp,
                "expected": exp,
                "actual": actual_out,
                "error": err_out,
                "verdict": verdict,
                "status_detail": exec_res["status_detail"],
                "execution_time_ms": t_ms,
                "memory_used_kb": m_kb
            }

        items = list(enumerate(testcases, 1))
        results_dict = {}

        if len(testcases) > 1:
            max_workers = min(8, len(testcases))
            with ThreadPoolExecutor(max_workers=max_workers) as pool:
                futures = [pool.submit(eval_single_testcase, item) for item in items]
                for f in as_completed(futures):
                    idx, res = f.result()
                    results_dict[idx] = res
        else:
            for item in items:
                idx, res = eval_single_testcase(item)
                results_dict[idx] = res

        results = [results_dict[i] for i in range(1, len(testcases) + 1)]
        overall_verdict = "AC"
        passed_count = 0
        total_time_ms = 0.0
        max_mem_kb = 0.0

        for r in results:
            v = r["verdict"]
            if v == "AC":
                passed_count += 1
            elif overall_verdict == "AC":
                overall_verdict = v
            total_time_ms += r["execution_time_ms"]
            max_mem_kb = max(max_mem_kb, r["memory_used_kb"])

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
