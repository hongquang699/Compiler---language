from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

from backend.judge.scoring import score_result
from backend.tools.compiler import MultiLangCompiler
from backend.tools.sandbox import ProcessSandbox
from backend.tools.tester import TestRunner


@dataclass
class JudgeWorker:
    worker_id: str
    name: str
    runner: TestRunner
    enabled: bool = True
    started_at: str = ""
    last_job_at: str = ""
    active_jobs: int = 0
    completed_jobs: int = 0
    failed_jobs: int = 0

    def judge(self, source_code: str, language: str, tests: List[Dict[str, Any]], timeout: float) -> Dict[str, Any]:
        result = self.runner.run_tests(source_code, tests, language=language, timeout=timeout)
        self.completed_jobs += result.get("overall_verdict") == "AC"
        self.failed_jobs += result.get("overall_verdict") != "AC"
        return score_result(result, tests)

    @property
    def sandbox_path(self) -> str:
        return str(Path(self.runner.compiler.temp_dir).resolve())
