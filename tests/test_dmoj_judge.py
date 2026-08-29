import unittest
from backend.judge.graders.standard import StandardGrader
from backend.judge.graders.exact import ExactGrader
from backend.judge.graders.floats import FloatGrader
from backend.judge.graders.custom import CustomScriptGrader
from backend.judge.contest_format.icpc import ICPCContestFormat
from backend.judge.contest_format.ioi import IOIContestFormat
from backend.judge.contest_format.vnoj import VNOJContestFormat

class TestDMOJJudgeEngine(unittest.TestCase):
    def test_graders(self):
        # 1. Standard Token Grader
        self.assertTrue(StandardGrader.check("", "1 2  3\n", "1\n2 3"))
        self.assertFalse(StandardGrader.check("", "1 2 3", "1 2 4"))

        # 2. Exact Grader
        self.assertTrue(ExactGrader.check("", "hello\n", "hello\n"))
        self.assertFalse(ExactGrader.check("", "hello \n", "hello\n"))

        # 3. Float Grader
        fg = FloatGrader(tolerance=1e-6)
        self.assertTrue(fg.check("", "3.1415926", "3.1415927"))
        self.assertFalse(fg.check("", "3.14", "3.15"))

        # 4. Custom Python Grader
        custom_code = "def check(inp, exp, out): return len(out.strip()) == 5"
        self.assertTrue(CustomScriptGrader.check("", "", "abcde", custom_code))
        self.assertFalse(CustomScriptGrader.check("", "", "abc", custom_code))

    def test_contest_formats(self):
        # ICPC
        subs = [
            {"problem_code": "A", "verdict": "WA", "time_min": 10},
            {"problem_code": "A", "verdict": "AC", "time_min": 15},
            {"problem_code": "B", "verdict": "AC", "time_min": 25}
        ]
        icpc_res = ICPCContestFormat.calculate_ranking(subs)
        self.assertEqual(icpc_res["solved"], 2)
        # Problem A: 15 + 20 = 35. Problem B: 25. Total penalty = 60
        self.assertEqual(icpc_res["penalty"], 60)

        # IOI Subtasks
        test_results = [{"verdict": "AC"}, {"verdict": "AC"}, {"verdict": "WA"}]
        subtasks = [
            {"subtask": 1, "points": 40, "test_indices": [1, 2]},
            {"subtask": 2, "points": 60, "test_indices": [3]}
        ]
        ioi_res = IOIContestFormat.calculate_subtask_score(test_results, subtasks)
        self.assertEqual(ioi_res["points"], 40.0)

        # VNOJ Format
        vnoj_subs = [
            {"problem_code": "A", "score": 100.0, "time_min": 12},
            {"problem_code": "B", "score": 50.0, "time_min": 30}
        ]
        vnoj_res = VNOJContestFormat.calculate_participation(vnoj_subs)
        self.assertEqual(vnoj_res["score"], 150.0)

if __name__ == "__main__":
    unittest.main()
