import unittest
import hashlib
from fastapi.testclient import TestClient
from backend.main import app, memory_store, db_manager

class TestAdminProblemBankAndAI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.admin_username = "admin_test_pb"
        self.admin_email = "admin_pb@test.com"
        with db_manager.get_connection() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO users (id, username, email, password_hash, role, is_admin) VALUES (999, ?, ?, 'hash', 'admin', 1)",
                (self.admin_username, self.admin_email)
            )
            conn.commit()
        self.token = memory_store.create_auth_token(999)
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_delete_competition(self):
        cid = memory_store.create_competition(
            title="Contest to delete",
            statement="Statement",
            status="draft",
            starts_at=None,
            ends_at=None,
            tests=[{"input": "1", "expected": "2"}],
            created_by=999,
            problems=[{"code": "A", "title": "Prob A", "statement": "Stmt", "tests": [{"input": "1", "expected": "1"}]}]
        )
        res = self.client.delete(f"/api/admin/competitions/{cid}", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))
        self.assertIsNone(memory_store.get_competition(cid))

    def test_problems_crud_and_tests(self):
        # 1. Create problem
        res = self.client.post("/api/admin/problems", json={
            "title": "A Plus B Bank",
            "statement": "Calculate a + b",
            "points": 100,
            "time_limit": 1.0,
            "memory_limit": 256,
            "code": "A",
            "tests": [
                {"input": "1 2\n", "expected": "3\n", "points": 50},
                {"input": "10 20\n", "expected": "30\n", "points": 50}
            ]
        }, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        pid = res.json()["id"]

        # 2. Get problem detail
        res = self.client.get(f"/api/admin/problems/{pid}", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        pdata = res.json()
        self.assertEqual(pdata["title"], "A Plus B Bank")
        self.assertEqual(len(pdata["tests"]), 2)

        # 3. Update problem
        res = self.client.put(f"/api/admin/problems/{pid}", json={
            "title": "A Plus B Bank Updated",
            "statement": "Updated statement",
            "points": 150,
            "time_limit": 2.0,
            "memory_limit": 512,
            "code": "B"
        }, headers=self.headers)
        self.assertEqual(res.status_code, 200)

        # 4. Update testcases directly
        res = self.client.put(f"/api/admin/problems/{pid}/tests", json={
            "tests": [
                {"input": "5 5\n", "expected": "10\n", "points": 100}
            ]
        }, headers=self.headers)
        self.assertEqual(res.status_code, 200)

        # Verify updated tests
        res = self.client.get(f"/api/admin/problems/{pid}", headers=self.headers)
        self.assertEqual(len(res.json()["tests"]), 1)
        self.assertEqual(res.json()["tests"][0]["input"].strip(), "5 5")

        # 5. Delete problem
        res = self.client.delete(f"/api/admin/problems/{pid}", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(memory_store.get_problem(pid))

    def test_ai_generate_tests_from_code(self):
        python_code = """
import sys
lines = sys.stdin.read().split()
if lines:
    print(int(lines[0]) + int(lines[1]))
"""
        res = self.client.post("/api/admin/ai/generate-tests-from-code", json={
            "statement": "Tính tổng 2 số nguyên a và b",
            "solution_code": python_code,
            "language": "python",
            "count": 3
        }, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertTrue(len(data.get("tests", [])) > 0)
        for t in data["tests"]:
            self.assertIn("input", t)
            self.assertIn("expected", t)
            self.assertIn("points", t)

if __name__ == "__main__":
    unittest.main()
