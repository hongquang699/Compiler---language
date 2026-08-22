from dataclasses import dataclass, field
from typing import List


@dataclass
class JudgeTestCase:
    input: str
    expected: str
    points: float = 0


@dataclass
class JudgeProblem:
    code: str
    title: str
    statement: str = ""
    points: float = 100
    time_limit: float = 2
    memory_limit: int = 256
    tests: List[JudgeTestCase] = field(default_factory=list)
