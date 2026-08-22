from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Lock
from datetime import datetime, timezone
from typing import Any, Dict, List

from backend.judge.scoring import score_result
from backend.judge.registry import JudgeRegistry
from backend.tools.compiler import MultiLangCompiler
from backend.tools.sandbox import ProcessSandbox
from backend.tools.tester import TestRunner


class JudgePool:
    """Runs submissions across isolated local judge workers."""

    def __init__(self, template_runner: TestRunner, worker_count: int = 5):
        self.worker_count = worker_count
        self._configs = JudgeRegistry().load()
        if len(self._configs) != worker_count:
            raise RuntimeError(f"Cần đúng {worker_count} file cấu hình judge trong config/judges.")
        self._next_worker = 0
        self._lock = Lock()
        self._executor = ThreadPoolExecutor(max_workers=worker_count, thread_name_prefix="local-judge")
        self._workers = [self._create_worker(template_runner, index) for index in range(worker_count)]
        self._enabled = [bool(config.get("enabled", True)) for config in self._configs]
        self._started_at = [datetime.now(timezone.utc)] * worker_count
        self._last_job_at = [None] * worker_count
        self._active_jobs = [0] * worker_count
        self._completed_jobs = [0] * worker_count
        self._failed_jobs = [0] * worker_count

    def _create_worker(self, template_runner: TestRunner, index: int) -> TestRunner:
        base = template_runner.compiler
        worker_dir = Path(self._configs[index].get("sandbox_dir", Path(base.temp_dir) / f"judge-{index + 1:02d}"))
        compiler = MultiLangCompiler(
            temp_dir=str(worker_dir), gpp_path=base.gpp_path, gcc_path=base.gcc_path,
            standard=base.standard, flags=list(base.flags),
        )
        sandbox = ProcessSandbox(
            timeout_seconds=template_runner.sandbox.timeout_seconds,
            memory_limit_mb=template_runner.sandbox.memory_limit_mb,
            max_output_length=template_runner.sandbox.max_output_length,
        )
        return TestRunner(compiler=compiler, sandbox=sandbox)

    def _select_worker(self) -> int:
        with self._lock:
            for offset in range(self.worker_count):
                index = (self._next_worker + offset) % self.worker_count
                if self._enabled[index]:
                    self._next_worker = (index + 1) % self.worker_count
                    self._last_job_at[index] = datetime.now(timezone.utc)
                    self._active_jobs[index] += 1
                    return index
        raise RuntimeError("Không còn máy chấm nào đang bật.")

    def judge(self, source_code: str, language: str, tests: List[Dict[str, Any]], timeout: float = 2) -> Dict[str, Any]:
        worker_index = self._select_worker()
        future = self._executor.submit(self._run, worker_index, source_code, language, tests, timeout)
        result = future.result()
        result["judge_id"] = f"local-judge-{worker_index + 1:02d}"
        return result

    def _run(self, worker_index: int, source_code: str, language: str, tests: List[Dict[str, Any]], timeout: float) -> Dict[str, Any]:
        result = self._workers[worker_index].run_tests(source_code, tests, language=language, timeout=timeout)
        with self._lock:
            self._active_jobs[worker_index] -= 1
            if result.get("overall_verdict") == "AC":
                self._completed_jobs[worker_index] += 1
            else:
                self._failed_jobs[worker_index] += 1
        return score_result(result, tests)

    def status(self) -> List[Dict[str, Any]]:
        return [{
            "id": self._configs[index]["id"],
            "name": self._configs[index]["name"],
            "status": "online" if self._enabled[index] else "offline",
            "enabled": self._enabled[index],
            "started_at": self._started_at[index].isoformat(),
            "last_job_at": self._last_job_at[index].isoformat() if self._last_job_at[index] else None,
            "active_jobs": self._active_jobs[index],
            "completed_jobs": self._completed_jobs[index],
            "failed_jobs": self._failed_jobs[index],
            "compiler": worker.compiler.gpp_path,
            "languages": ["python", "cpp", "c", "java", "rust", "go"],
            "timeout_seconds": worker.sandbox.timeout_seconds,
            "memory_limit_mb": worker.sandbox.memory_limit_mb,
            "sandbox_path": worker.compiler.temp_dir,
        } for index, worker in enumerate(self._workers)]

    def toggle(self, judge_id: str, enabled: bool) -> Dict[str, Any]:
        try:
            index = int(judge_id.rsplit("-", 1)[-1]) - 1
        except ValueError:
            raise ValueError("Judge ID không hợp lệ.")
        if index < 0 or index >= self.worker_count:
            raise ValueError("Không tìm thấy máy chấm.")
        with self._lock:
            if not enabled and sum(self._enabled) == 1 and self._enabled[index]:
                raise ValueError("Phải giữ ít nhất một máy chấm đang bật.")
            self._enabled[index] = enabled
        return self.status()[index]
