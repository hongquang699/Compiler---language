from pathlib import Path
from typing import Any

import yaml

from backend.judge.models import JudgeProblem, JudgeTestCase


class ClueOJProblemLoader:
    """Loads init.yml and its input/output files from a ClueOJ problem folder."""

    def load(self, problem_dir: str) -> JudgeProblem:
        root = Path(problem_dir).expanduser().resolve()
        if not root.is_dir():
            raise ValueError("Problem directory does not exist.")
        config_path = root / "init.yml"
        if not config_path.is_file():
            raise ValueError("ClueOJ problem must contain init.yml.")
        config = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
        cases = []
        for item in config.get("test_cases", []):
            input_name = self._safe_name(item.get("in"))
            output_name = self._safe_name(item.get("out"))
            input_path, output_path = root / input_name, root / output_name
            if not input_path.is_file() or not output_path.is_file():
                raise ValueError(f"Missing test files: {input_name}, {output_name}")
            cases.append(JudgeTestCase(
                input_path.read_text(encoding="utf-8"),
                output_path.read_text(encoding="utf-8"),
                float(item.get("points", 0)),
            ))
        return JudgeProblem(
            code=root.name.upper(), title=root.name,
            points=sum(case.points for case in cases) or 100,
            time_limit=float(config.get("time_limit", 2)),
            memory_limit=int(config.get("memory_limit", 256)), tests=cases,
        )

    @staticmethod
    def _safe_name(value: Any) -> str:
        name = str(value or "")
        path = Path(name)
        if not name or path.is_absolute() or path.name != name:
            raise ValueError("Test files must stay inside the problem directory.")
        return name
