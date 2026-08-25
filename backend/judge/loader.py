from pathlib import Path
from typing import Any
import yaml

from backend.judge.models import JudgeProblem, JudgeTestCase


class ClueOJProblemLoader:
    """Loads init.yml / init.yaml and its input/output files from a ClueOJ problem folder."""

    def load(self, problem_dir: str) -> JudgeProblem:
        root = Path(problem_dir).expanduser().resolve()
        if not root.is_dir():
            raise ValueError(f"Problem directory does not exist: {problem_dir}")
            
        config_path = root / "init.yml"
        if not config_path.is_file():
            config_path = root / "init.yaml"
        if not config_path.is_file():
            config_path = root / "problem.yml"
        if not config_path.is_file():
            config_path = root / "problem.yaml"
            
        if not config_path.is_file():
            raise ValueError(f"ClueOJ problem must contain init.yml or init.yaml inside {problem_dir}")
            
        config = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
        cases = []
        sample_in = ""
        sample_out = ""

        for idx, item in enumerate(config.get("test_cases", [])):
            input_name = self._safe_name(item.get("in"))
            output_name = self._safe_name(item.get("out"))
            input_path = root / input_name
            output_path = root / output_name

            if not input_path.is_file() or not output_path.is_file():
                raise ValueError(f"Missing test files in ClueOJ problem: {input_name}, {output_name}")

            in_content = input_path.read_text(encoding="utf-8")
            out_content = output_path.read_text(encoding="utf-8")
            points = float(item.get("points", 50))

            if idx == 0:
                sample_in = in_content
                sample_out = out_content

            cases.append(JudgeTestCase(
                input_data=in_content,
                output_data=out_content,
                points=points
            ))

        total_points = sum(case.points for case in cases) or 100

        return JudgeProblem(
            code=root.name.upper(),
            title=f"ClueOJ - {root.name.upper()}",
            points=total_points,
            time_limit=float(config.get("time_limit", 2.0)),
            memory_limit=int(config.get("memory_limit", 256)),
            tests=cases
        )

    @staticmethod
    def _safe_name(value: Any) -> str:
        name = str(value or "").strip()
        path = Path(name)
        if not name or path.is_absolute() or path.name != name:
            raise ValueError("Test files must stay inside the problem directory.")
        return name
