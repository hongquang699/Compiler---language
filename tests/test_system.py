import os
import sys
import unittest
import asyncio
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.tools.compiler import CppCompiler
from backend.tools.sandbox import ProcessSandbox
from backend.tools.tester import TestRunner
from backend.rag.store import KnowledgeStore
from backend.database.db import DatabaseManager, MemoryStore

class TestLocalAiSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.compiler = CppCompiler(temp_dir="data/test_sandbox")
        cls.sandbox = ProcessSandbox(timeout_seconds=1.5, memory_limit_mb=128)
        cls.runner = TestRunner(compiler=cls.compiler, sandbox=cls.sandbox)
        cls.rag = KnowledgeStore(knowledge_dir="data/knowledge_base")
        cls.db = DatabaseManager(db_path="data/test_memory.db")
        cls.memory = MemoryStore(cls.db)

    def test_01_compiler_and_sandbox_ac(self):
        code = """#include <iostream>
int main() {
    int a, b;
    if (std::cin >> a >> b) {
        std::cout << (a + b) << "\\n";
    }
    return 0;
}"""
        testcases = [
            {"input": "2 3", "expected": "5"},
            {"input": "100 200", "expected": "300"}
        ]
        res = self.runner.run_tests(code, testcases, language="cpp")
        self.assertTrue(res["success"])
        self.assertEqual(res["overall_verdict"], "AC")
        self.assertEqual(res["passed_tests"], 2)

    def test_02_python_sandbox_ac(self):
        py_code = """import sys
data = sys.stdin.read().split()
if data:
    a, b = map(int, data)
    print(a + b)
"""
        testcases = [
            {"input": "7 14", "expected": "21"},
            {"input": "99 1", "expected": "100"}
        ]
        res = self.runner.run_tests(py_code, testcases, language="python")
        self.assertTrue(res["success"])
        self.assertEqual(res["overall_verdict"], "AC")
        self.assertEqual(res["passed_tests"], 2)


    def test_02_wa_detection(self):
        code = """#include <iostream>
int main() {
    int a, b;
    std::cin >> a >> b;
    std::cout << (a - b) << "\\n"; // BUG: minus instead of plus
    return 0;
}"""
        testcases = [
            {"input": "5 3", "expected": "8"}
        ]
        res = self.runner.run_tests(code, testcases)
        self.assertFalse(res["success"])
        self.assertEqual(res["overall_verdict"], "WA")

    def test_03_tle_detection(self):
        code = """#include <iostream>
int main() {
    while (true) {} // Infinite loop
    return 0;
}"""
        testcases = [{"input": "", "expected": "anything"}]
        res = self.runner.run_tests(code, testcases, timeout=0.5)
        self.assertFalse(res["success"])
        self.assertEqual(res["overall_verdict"], "TLE")

    def test_04_compilation_error_detection(self):
        code = """int main() { invalid_syntax; }"""
        res = self.runner.run_tests(code, [{"input": "", "expected": ""}])
        self.assertFalse(res["success"])
        self.assertEqual(res["overall_verdict"], "CE")

    def test_05_rag_retrieval(self):
        results = self.rag.search("Dijkstra shortest path", top_k=1)
        self.assertTrue(len(results) > 0)
        self.assertIn("dijkstra", results[0]["source"].lower())

    def test_06_memory_persistence(self):
        import time
        sid = f"unit_test_session_{int(time.time() * 1000)}"
        self.memory.add_message(sid, "user", "Hello World")
        self.memory.add_message(sid, "assistant", "Answer")
        msgs = self.memory.get_messages(sid)
        self.assertEqual(len(msgs), 2)
        self.assertEqual(msgs[0]["content"], "Hello World")


if __name__ == "__main__":
    unittest.main()
