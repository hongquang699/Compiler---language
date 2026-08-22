from dataclasses import asdict

from backend.judge.loader import ClueOJProblemLoader as _ClueOJProblemLoader


class ClueOJProblemLoader(_ClueOJProblemLoader):
	def load(self, problem_dir):
		return asdict(super().load(problem_dir))


__all__ = ["ClueOJProblemLoader"]
