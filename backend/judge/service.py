from typing import Any, Dict, List

from backend.judge.scoring import score_result
from backend.tools.tester import TestRunner


class JudgeService:
    def __init__(self, test_runner: TestRunner):
        self.test_runner = test_runner

    def judge(self, source_code: str, language: str, tests: List[Dict[str, Any]], timeout: float = 2) -> Dict[str, Any]:
        result = self.test_runner.run_tests(source_code, tests, language=language, timeout=timeout)
        return score_result(result, tests)
