import time
from typing import Dict, Any, List, Optional

from backend.tools.compiler import MultiLangCompiler
from backend.tools.sandbox import ProcessSandbox
from backend.judge.verdicts import Verdict, SubmissionStatus
from backend.judge.graders.standard import StandardGrader
from backend.judge.graders.exact import ExactGrader
from backend.judge.graders.floats import FloatGrader
from backend.judge.graders.custom import CustomScriptGrader
from backend.judge.bridge.protocol import bridge_events, PacketType
from backend.judge.balancer.balancer import load_balancer

class DMOJJudgeEngine:
    """
    Full-featured DMOJ-compliant Judge Engine supporting:
    - Multi-language compilation (C++, C, Python, Java, Go, Rust, Pascal, JS, TS, C#)
    - Short-Circuit execution (stops batch on first failure)
    - Subtask weighting and evaluation
    - Custom Checkers (Standard Token, Exact Byte, Floats with 1e-6 tolerance, Custom Python script)
    - Memory, Time & Return Code inspection
    - Bridge event dispatching
    """
    def __init__(self, compiler: Optional[MultiLangCompiler] = None, sandbox: Optional[ProcessSandbox] = None):
        self.compiler = compiler or MultiLangCompiler()
        self.sandbox = sandbox or ProcessSandbox()
        self.graders = {
            "token": StandardGrader(),
            "exact": ExactGrader(),
            "float_tol": FloatGrader(tolerance=1e-6),
            "custom_script": CustomScriptGrader()
        }

    def judge_submission(
        self,
        submission_id: Optional[int],
        source_code: str,
        language: str,
        tests: List[Dict[str, Any]],
        time_limit: float = 2.0,
        memory_limit_mb: int = 256,
        checker_type: str = "token",
        checker_code: Optional[str] = None,
        subtasks: Optional[List[Dict[str, Any]]] = None,
        short_circuit: bool = False
    ) -> Dict[str, Any]:
        node = load_balancer.select_best_node()
        node_id = node.node_id if node else "judge-local-01"
        load_balancer.record_job_start(node_id)
        start_time = time.time()

        bridge_events.emit(PacketType.GRADING_BEGIN, {
            "submission_id": submission_id,
            "language": language,
            "total_tests": len(tests)
        })

        # 1. Compilation
        comp_res = self.compiler.prepare_and_compile(source_code, language=language)
        if not comp_res["success"]:
            verdict = Verdict.CE
            err_msg = comp_res.get("compiler_output", "Compile Error")
            bridge_events.emit(PacketType.COMPILE_ERROR, {
                "submission_id": submission_id,
                "error": err_msg
            })
            bridge_events.emit(PacketType.GRADING_END, {
                "submission_id": submission_id,
                "verdict": verdict,
                "points": 0.0
            })
            load_balancer.record_job_done(node_id, success=False)
            return {
                "overall_verdict": verdict,
                "passed_tests": 0,
                "total_tests": len(tests),
                "points": 0.0,
                "compiler_output": err_msg,
                "total_execution_time_ms": 0,
                "max_memory_kb": 0,
                "test_results": []
            }

        executable = comp_res.get("executable_cmd") or comp_res.get("executable_path_or_cmd")
        test_results: List[Dict[str, Any]] = []
        total_time_ms = 0.0
        max_mem_kb = 0
        passed_count = 0
        overall_verdict = Verdict.AC
        is_short_circuited = False

        # 2. Test Cases Execution
        for idx, t in enumerate(tests, 1):
            if is_short_circuited:
                test_results.append({
                    "test_index": idx,
                    "verdict": Verdict.SC,
                    "execution_time_ms": 0,
                    "memory_kb": 0,
                    "points": 0,
                    "message": "Short-circuited"
                })
                continue

            t_input = str(t.get("input", ""))
            t_expected = str(t.get("expected", ""))
            t_pts = float(t.get("points", 10))

            exec_res = self.sandbox.execute(executable, stdin_data=t_input, timeout=time_limit)
            exec_time = exec_res.get("execution_time_ms", 0.0)
            mem_used = exec_res.get("memory_used_kb", 0)
            total_time_ms += exec_time
            max_mem_kb = max(max_mem_kb, mem_used)

            # Evaluate verdict
            if exec_res.get("verdict") == "TLE" or exec_res.get("timed_out"):
                v = Verdict.TLE
            elif exec_res.get("verdict") == "MLE":
                v = Verdict.MLE
            elif exec_res.get("return_code", 0) != 0:
                v = Verdict.RTE
            else:
                user_out = exec_res.get("stdout", "")
                passed = False
                if checker_type == "custom_script" and checker_code:
                    passed = CustomScriptGrader.check(t_input, t_expected, user_out, checker_code)
                elif checker_type == "exact":
                    passed = ExactGrader.check(t_input, t_expected, user_out)
                elif checker_type == "float_tol":
                    passed = FloatGrader().check(t_input, t_expected, user_out)
                else:
                    passed = StandardGrader.check(t_input, t_expected, user_out)

                v = Verdict.AC if passed else Verdict.WA

            if v == Verdict.AC:
                passed_count += 1
            else:
                if overall_verdict == Verdict.AC:
                    overall_verdict = v
                if short_circuit:
                    is_short_circuited = True

            test_item = {
                "test_index": idx,
                "verdict": v,
                "execution_time_ms": exec_time,
                "memory_kb": mem_used,
                "points": t_pts if v == Verdict.AC else 0.0,
                "actual_output_preview": exec_res.get("stdout", "")[:100],
                "error": exec_res.get("stderr", "")
            }
            test_results.append(test_item)

            bridge_events.emit(PacketType.TEST_CASE_STATUS, {
                "submission_id": submission_id,
                "test_index": idx,
                "verdict": v,
                "execution_time_ms": exec_time
            })

        # 3. Subtasks Evaluation
        subtask_results = []
        if subtasks:
            from backend.judge.contest_format.ioi import IOIContestFormat
            subtask_score_info = IOIContestFormat.calculate_subtask_score(test_results, subtasks)
            earned_points = subtask_score_info["points"]
            subtask_results = subtask_score_info["subtask_results"]
        else:
            earned_points = sum(t["points"] for t in test_results)

        bridge_events.emit(PacketType.GRADING_END, {
            "submission_id": submission_id,
            "verdict": overall_verdict,
            "points": earned_points,
            "passed_tests": passed_count,
            "total_tests": len(tests)
        })

        load_balancer.record_job_done(node_id, success=True, exec_time_ms=(time.time() - start_time) * 1000)

        return {
            "overall_verdict": overall_verdict,
            "passed_tests": passed_count,
            "total_tests": len(tests),
            "points": earned_points,
            "subtask_results": subtask_results,
            "total_execution_time_ms": round(total_time_ms, 2),
            "max_memory_kb": max_mem_kb,
            "compiler_output": comp_res.get("compiler_output", ""),
            "test_results": test_results
        }

dmoj_judge_engine = DMOJJudgeEngine()
