import unittest
import json
import io
import zipfile
from backend.database.db import DatabaseManager, MemoryStore
from backend.tools.compiler import MultiLangCompiler
from backend.tools.sandbox import ProcessSandbox
from backend.tools.tester import TestRunner
from backend.judge.scoring import score_result

class TestVNOJFeatures(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import os
        cls.test_db_path = "data/test_vnoj.db"
        if os.path.exists(cls.test_db_path):
            os.remove(cls.test_db_path)
        cls.db_manager = DatabaseManager(cls.test_db_path)
        cls.memory_store = MemoryStore(cls.db_manager)
        cls.compiler = MultiLangCompiler()
        cls.sandbox = ProcessSandbox()
        cls.runner = TestRunner(cls.compiler, cls.sandbox)

    @classmethod
    def tearDownClass(cls):
        import os
        if os.path.exists(cls.test_db_path):
            try:
                os.remove(cls.test_db_path)
            except Exception:
                pass

    def test_custom_checkers(self):
        # 1. Exact Match
        self.assertTrue(self.runner.compare_outputs("123\n", "123\n", checker_type="exact"))
        self.assertFalse(self.runner.compare_outputs("123 \n", "123\n", checker_type="exact"))

        # 2. Token Comparison (default)
        self.assertTrue(self.runner.compare_outputs("1  2 \n 3", "1 2 3", checker_type="token"))
        self.assertFalse(self.runner.compare_outputs("1 2 4", "1 2 3", checker_type="token"))

        # 3. Float Tolerance
        self.assertTrue(self.runner.compare_outputs("3.1415926", "3.1415927", checker_type="float_tol"))
        self.assertFalse(self.runner.compare_outputs("3.14", "3.15", checker_type="float_tol"))

        # 4. Custom Python Script Checker
        custom_checker = """
def check(test_input, expected_output, user_output):
    return int(user_output.strip()) % 2 == 0
"""
        self.assertTrue(self.runner.compare_outputs("4", "2", checker_type="custom_script", checker_code=custom_checker))
        self.assertFalse(self.runner.compare_outputs("5", "2", checker_type="custom_script", checker_code=custom_checker))

    def test_subtask_scoring(self):
        tests = [
            {"input": "1", "expected": "1", "points": 10},
            {"input": "2", "expected": "2", "points": 20},
            {"input": "3", "expected": "3", "points": 70},
        ]
        subtasks = [
            {"subtask": 1, "points": 30, "description": "Subtask 1", "test_indices": [1, 2]},
            {"subtask": 2, "points": 70, "description": "Subtask 2", "test_indices": [3]},
        ]
        
        # All passed
        mock_res_all_ac = {
            "overall_verdict": "AC",
            "passed_tests": 3,
            "total_tests": 3,
            "test_results": [
                {"verdict": "AC"},
                {"verdict": "AC"},
                {"verdict": "AC"},
            ]
        }
        scored = score_result(mock_res_all_ac, tests, subtasks=subtasks)
        self.assertEqual(scored["points"], 100.0)
        self.assertEqual(len(scored["subtask_results"]), 2)
        self.assertTrue(scored["subtask_results"][0]["passed"])
        self.assertTrue(scored["subtask_results"][1]["passed"])

        # Subtask 2 failed
        mock_res_partial = {
            "overall_verdict": "WA",
            "passed_tests": 2,
            "total_tests": 3,
            "test_results": [
                {"verdict": "AC"},
                {"verdict": "AC"},
                {"verdict": "WA"},
            ]
        }
        scored_partial = score_result(mock_res_partial, tests, subtasks=subtasks)
        self.assertEqual(scored_partial["points"], 30.0)
        self.assertTrue(scored_partial["subtask_results"][0]["passed"])
        self.assertFalse(scored_partial["subtask_results"][1]["passed"])

    def test_forum_and_reactions(self):
        # Create user
        user = self.memory_store.create_user("vnoj_tester", "tester@vnoj.local", "password123")
        user_id = user["id"]

        # Create forum post
        post = self.memory_store.create_forum_post(
            title="Giai thuat DP on Trees",
            content="Bai viet huong dan giai thuat...",
            author_id=user_id,
            category="tutorial",
            tags="dp, tree"
        )
        self.assertIsNotNone(post)
        self.assertEqual(post["category"], "tutorial")

        # React (Upvote)
        react_res = self.memory_store.toggle_reaction(user_id, "post", post["id"], "up")
        self.assertEqual(react_res["upvotes"], 1)
        self.assertEqual(react_res["user_reaction"], "up")

        # Comment
        comment = self.memory_store.create_comment(
            author_id=user_id,
            content="Bai viet rat huu ich!",
            post_id=post["id"]
        )
        self.assertEqual(comment["content"], "Bai viet rat huu ich!")

        # List comments
        comments = self.memory_store.list_post_comments(post["id"], viewer_user_id=user_id)
        self.assertEqual(len(comments), 1)

    def test_clarifications_and_freeze(self):
        user = self.memory_store.create_user("contestant_1", "c1@vnoj.local", "pwd")
        admin = self.memory_store.create_user("admin_org", "admin@vnoj.local", "pwd")
        self.memory_store.update_user_role(admin["id"], "admin")

        # Contest
        comp_id = self.memory_store.create_competition(
            title="VNOI Warmup 2026",
            statement="Descr",
            status="published",
            starts_at="2026-08-01",
            ends_at="2026-08-30",
            tests=[],
            created_by=admin["id"]
        )

        # Clarification question
        clar = self.memory_store.create_clarification(comp_id, user["id"], "De bai co tinh so am khong?", "A")
        self.assertEqual(clar["question"], "De bai co tinh so am khong?")

        # Admin reply
        reply = self.memory_store.reply_clarification(clar["id"], "Khong, chi tinh cac so nguyen duong.", admin["id"], is_public=True)
        self.assertEqual(reply["answer"], "Khong, chi tinh cac so nguyen duong.")
        self.assertEqual(reply["is_public"], 1)

        # Freeze contest
        self.memory_store.freeze_contest(comp_id, is_frozen=1)
        with self.db_manager.get_connection() as conn:
            row = conn.execute("SELECT is_frozen FROM competitions WHERE id = ?", (comp_id,)).fetchone()
            self.assertEqual(row["is_frozen"], 1)

    def test_zip_export_import_and_rejudge(self):
        admin = self.memory_store.create_user("admin_zip", "adminz@vnoj.local", "pwd")
        user = self.memory_store.create_user("contestant_zip", "cz@vnoj.local", "pwd")

        # Create problem
        prob_id = self.memory_store.create_bank_problem(
            title="Tong hai so A+B",
            statement="Nhap 2 so A va B, in ra tong.",
            points=100,
            time_limit=1.0,
            memory_limit=256,
            code="SUMAB",
            tests=[{"input": "1 2\n", "expected": "3\n", "points": 50}, {"input": "10 20\n", "expected": "30\n", "points": 50}]
        )
        self.assertIsNotNone(prob_id)

        # Export to zip simulation
        prob = self.memory_store.get_problem(prob_id)
        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as z:
            for idx, t in enumerate(prob.get("tests", []), 1):
                z.writestr(f"test_{idx:02d}.in", t["input"])
                z.writestr(f"test_{idx:02d}.out", t["expected"])
        zip_buf.seek(0)
        self.assertGreater(len(zip_buf.getvalue()), 0)

        # Log submission
        sub_id = self.memory_store.log_submission(
            None,
            "a, b = map(int, input().split())\nprint(a + b)",
            "AC",
            10.0,
            1024,
            "",
            user_id=user["id"],
            language="python",
            score=100.0,
            passed_tests=2,
            total_tests=2
        )
        with self.db_manager.get_connection() as conn:
            conn.execute("UPDATE submissions SET problem_code = 'SUMAB' WHERE id = ?", (sub_id,))
            conn.commit()

        # Rejudge
        subs = self.memory_store.get_submissions_for_rejudge(problem_id=prob_id)
        self.assertEqual(len(subs), 1)

        self.memory_store.update_rejudged_submission(
            submission_id=subs[0]["id"],
            verdict="AC",
            score=100.0,
            passed_tests=2,
            total_tests=2,
            exec_time=15,
            mem_kb=1024,
            compiler_output="",
            subtask_results=[]
        )

        with self.db_manager.get_connection() as conn:
            row = conn.execute("SELECT rejudged_count, score, verdict FROM submissions WHERE id = ?", (subs[0]["id"],)).fetchone()
            self.assertEqual(row["rejudged_count"], 1)
            self.assertEqual(row["score"], 100.0)
            self.assertEqual(row["verdict"], "AC")

    def test_problem_comments_and_pin_lock(self):
        user = self.memory_store.create_user("coder_cmt", "coder@vnoj.local", "pwd")
        admin = self.memory_store.create_user("admin_mod", "mod@vnoj.local", "pwd")
        self.memory_store.update_user_role(admin["id"], "admin")

        # Comment on problem
        cmt = self.memory_store.create_comment(
            author_id=user["id"],
            content="Bai nay co the dung Two Pointers O(N) rat nhanh.",
            problem_code="SUMAB"
        )
        self.assertEqual(cmt["problem_code"], "SUMAB")

        prob_comments = self.memory_store.list_problem_comments("SUMAB", viewer_user_id=user["id"])
        self.assertEqual(len(prob_comments), 1)

        # Pin & Lock forum post
        post = self.memory_store.create_forum_post("Thong bao ky thi", "Noi dung...", admin["id"], category="announcement")
        self.memory_store.toggle_post_pin(post["id"], is_pinned=1)
        self.memory_store.toggle_post_lock(post["id"], is_locked=1)

        post_updated = self.memory_store.get_forum_post(post["id"])
        self.assertEqual(post_updated["is_pinned"], 1)
        self.assertEqual(post_updated["is_locked"], 1)

if __name__ == "__main__":
    unittest.main()
