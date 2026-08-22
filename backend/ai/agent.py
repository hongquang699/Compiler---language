import time
from typing import List, Dict, Any, Optional, AsyncGenerator
from backend.ai.llm_client import LocalLLMClient
from backend.ai.prompt_engine import PromptEngine
from backend.ai.evaluator import CodeEvaluator, ProblemPlanner
from backend.rag.store import KnowledgeStore
from backend.tools.tester import TestRunner

class CppCodeAgent:
    def __init__(self, llm_client: LocalLLMClient, rag_store: KnowledgeStore, test_runner: TestRunner):
        self.llm = llm_client
        self.rag = rag_store
        self.runner = test_runner

    async def solve_with_pipeline(
        self,
        problem_statement: str,
        sample_testcases: Optional[List[Dict[str, str]]] = None,
        language: str = "cpp",
        max_retries: int = 2
    ) -> Dict[str, Any]:
        """
        Executes the Multi-Language Competitive Programming Agent Pipeline:
        RAG Retrieval -> Planning -> CodeGen -> Compile/Test Sandbox -> Auto-Debug Loop -> Final Output.
        """
        logs = []
        start_time = time.time()
        lang = language.lower()

        # Step 1: RAG Retrieval
        logs.append(f"🔍 [Bước 1] Tra cứu tài liệu & template thuật toán ({lang.upper()}) qua RAG...")
        rag_results = self.rag.search(f"{problem_statement} {lang}", top_k=2)
        rag_context = "\n\n".join([f"### {d['section']} ({d['source']}):\n{d['content']}" for d in rag_results])
        if rag_results:
            logs.append(f"  ➜ Đã tìm thấy {len(rag_results)} tài liệu tham khảo ({', '.join([d['source'] for d in rag_results])}).")
        else:
            logs.append("  ➜ Không có template đặc thù, sử dụng kiến thức chuẩn.")

        # Step 2: Planning
        logs.append(f"🧠 [Bước 2] Phân tích đề bài, ràng buộc dữ liệu & thiết kế thuật toán cho {lang.upper()}...")
        plan_prompt = PromptEngine.build_plan_prompt(problem_statement, rag_context, language=lang)
        system_prompt = PromptEngine.get_system_prompt(lang)
        plan_response = await self.llm.chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": plan_prompt}
        ])
        logs.append("  ➜ Đã hoàn thành bản thiết kế thuật toán.")

        # Step 3: Code Generation
        logs.append(f"⚡ [Bước 3] Sinh mã nguồn {lang.upper()} tối ưu...")
        codegen_prompt = PromptEngine.build_codegen_prompt(problem_statement, plan_response, rag_context, language=lang)
        code_response = await self.llm.chat([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": codegen_prompt}
        ])

        current_code = CodeEvaluator.extract_code(code_response, language=lang)

        # ── Language guard: if model returned wrong language (e.g. C++ when Python requested)
        if not current_code and lang != "cpp":
            logs.append(f"  ⚠️ AI sinh sai ngôn ngữ! Đang yêu cầu lại với ràng buộc chặt hơn ({lang.upper()})...")
            retry_prompt = PromptEngine.build_codegen_prompt(problem_statement, plan_response, rag_context, language=lang)
            retry_prompt = f"CẢNH BÁO: Lần trước bạn đã viết bằng C++ trong khi yêu cầu là {lang.upper()}. Hãy viết lại 100% bằng {lang.upper()}.\n\n" + retry_prompt
            code_response = await self.llm.chat([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": retry_prompt}
            ])
            current_code = CodeEvaluator.extract_code(code_response, language=lang)
            if not current_code:
                # Final fallback: grab any code block regardless of language tag
                import re
                m = re.search(r'```(?:[a-zA-Z0-9_+]*)\s*([\s\S]*?)```', code_response)
                current_code = m.group(1).strip() if m else code_response.strip()

        static_warnings = CodeEvaluator.static_analysis(current_code, language=lang)
        for w in static_warnings:
            logs.append(f"  ➜ {w}")

        # Step 4: Sandbox & Auto-Debugging Loop
        test_results = None
        tests = sample_testcases or []
        iteration = 0

        if tests:
            logs.append(f"🧪 [Bước 4] Chạy thử nghiệm trên {len(tests)} test cases trong Sandbox ({lang.upper()})...")
            while iteration <= max_retries:
                test_results = self.runner.run_tests(current_code, tests, language=lang)
                verdict = test_results.get("overall_verdict", "UNKNOWN")
                passed = test_results.get("passed_tests", 0)
                total = test_results.get("total_tests", len(tests))

                logs.append(f"  ➜ [Lần chạy {iteration + 1}] Kết quả: {verdict} ({passed}/{total} tests passed).")

                if verdict == "AC":
                    logs.append(f"  ✅ [ALL TESTS PASSED] Mã nguồn {lang.upper()} đã đạt chuẩn Accepted!")
                    break

                if iteration == max_retries:
                    logs.append("  ⚠️ Đạt giới hạn số lần sửa lỗi tự động.")
                    break

                # Self-Correction Loop
                iteration += 1
                logs.append(f"🔧 [Sửa lỗi tự động #{iteration}] Gửi báo cáo lỗi ({verdict}) cho AI phân tích và sửa...")
                failure_report = CodeEvaluator.format_failure_report(test_results)

                debug_prompt = PromptEngine.build_debug_prompt(problem_statement, current_code, failure_report, language=lang)
                fixed_response = await self.llm.chat([
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": debug_prompt}
                ])
                current_code = CodeEvaluator.extract_code(fixed_response, language=lang)
        else:
            # Syntax / compile check
            logs.append(f"🔨 [Bước 4] Kiểm tra cú pháp / biên dịch {lang.upper()}...")
            comp_res = self.runner.compiler.prepare_and_compile(current_code, language=lang)
            if comp_res["success"]:
                logs.append("  ✅ Kiểm tra cú pháp thành công!")
                test_results = {"overall_verdict": "AC", "success": True, "compiler_output": comp_res["compiler_output"]}
            else:
                logs.append("  ❌ Lỗi cú pháp/biên dịch. Đang tự động sửa...")
                debug_prompt = PromptEngine.build_debug_prompt(problem_statement, current_code, f"Compiler error: {comp_res['compiler_output']}", language=lang)
                fixed_response = await self.llm.chat([
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": debug_prompt}
                ])
                current_code = CodeEvaluator.extract_code(fixed_response, language=lang)
                comp_res2 = self.runner.compiler.prepare_and_compile(current_code, language=lang)
                test_results = {"overall_verdict": "AC" if comp_res2["success"] else "CE", "success": comp_res2["success"], "compiler_output": comp_res2["compiler_output"]}

        total_time = round(time.time() - start_time, 2)
        logs.append(f"🏁 Hoàn thành toàn bộ quy trình trong {total_time}s.")

        return {
            "success": test_results.get("success", False) if test_results else True,
            "final_verdict": test_results.get("overall_verdict", "DONE") if test_results else "DONE",
            "language": lang,
            "plan": plan_response,
            "code": current_code,
            "cpp_code": current_code, # compatibility
            "test_results": test_results,
            "rag_references": [d["source"] for d in rag_results],
            "pipeline_logs": logs,
            "total_time_seconds": total_time,
            "debug_iterations": iteration
        }

    async def solve_with_pipeline_stream(
        self,
        problem_statement: str,
        sample_testcases: Optional[List[Dict[str, str]]] = None,
        language: str = "cpp",
        max_retries: int = 2
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Streams real-time step events and logs to the frontend."""
        start_time = time.time()
        lang = language.lower()
        system_prompt = PromptEngine.get_system_prompt(lang)
        
        # Step 1: RAG
        yield {"type": "step", "step": "rag", "status": "active", "message": f"🔍 [Bước 1] Tra cứu tài liệu & template thuật toán ({lang.upper()}) qua RAG..."}
        rag_results = self.rag.search(f"{problem_statement} {lang}", top_k=2)
        rag_context = "\n\n".join([f"### {d['section']} ({d['source']}):\n{d['content']}" for d in rag_results])
        if rag_results:
            yield {"type": "log", "message": f"  ➜ Đã tìm thấy {len(rag_results)} tài liệu tham khảo ({', '.join([d['source'] for d in rag_results])})."}
        else:
            yield {"type": "log", "message": "  ➜ Không có template đặc thù, sử dụng kiến thức chuẩn."}
        yield {"type": "step", "step": "rag", "status": "done"}

        # Step 2: Planning
        yield {"type": "step", "step": "plan", "status": "active", "message": f"🧠 [Bước 2] Phân tích đề bài, ràng buộc dữ liệu & thiết kế thuật toán cho {lang.upper()}..."}
        plan_prompt = PromptEngine.build_plan_prompt(problem_statement, rag_context, language=lang)
        try:
            plan_response = await self.llm.chat([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": plan_prompt}
            ])
        except Exception as e:
            plan_response = f"Lỗi gọi LLM: {str(e)}"
        yield {"type": "log", "message": "  ➜ Đã hoàn thành bản thiết kế thuật toán."}
        yield {"type": "plan", "content": plan_response}
        yield {"type": "step", "step": "plan", "status": "done"}

        # Step 3: Code Generation
        yield {"type": "step", "step": "code", "status": "active", "message": f"⚡ [Bước 3] Sinh mã nguồn {lang.upper()} tối ưu..."}
        codegen_prompt = PromptEngine.build_codegen_prompt(problem_statement, plan_response, rag_context, language=lang)
        try:
            code_response = await self.llm.chat([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": codegen_prompt}
            ])
            current_code = CodeEvaluator.extract_code(code_response, language=lang)

            # Language guard: if model returned C++ when Python/Java requested
            if not current_code and lang != "cpp":
                yield {"type": "log", "message": f"  ⚠️ Phát hiện code không đúng định dạng {lang.upper()}! Đang yêu cầu AI sinh lại chuẩn..."}
                retry_prompt = f"CẢNH BÁO QUAN TRỌNG: Bạn PHẢI viết 100% bằng {lang.upper()}. TUYỆT ĐỐI KHÔNG VIẾT C++.\n\n" + codegen_prompt
                code_response = await self.llm.chat([
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": retry_prompt}
                ])
                current_code = CodeEvaluator.extract_code(code_response, language=lang)
                if not current_code:
                    import re
                    m = re.search(r'```(?:[a-zA-Z0-9_+]*)\s*([\s\S]*?)```', code_response)
                    current_code = m.group(1).strip() if m else code_response.strip()
        except Exception as e:
            current_code = f"# Error generating code: {str(e)}"

        static_warnings = CodeEvaluator.static_analysis(current_code, language=lang)
        for w in static_warnings:
            yield {"type": "log", "message": f"  ➜ {w}"}
        yield {"type": "code", "content": current_code, "language": lang}
        yield {"type": "step", "step": "code", "status": "done"}


        # Step 4: Sandbox & Debug Loop
        yield {"type": "step", "step": "test", "status": "active", "message": f"🧪 [Bước 4] Chạy thử nghiệm trong Sandbox ({lang.upper()})..."}
        test_results = None
        tests = sample_testcases or []
        iteration = 0

        if tests:
            while iteration <= max_retries:
                test_results = self.runner.run_tests(current_code, tests, language=lang)
                verdict = test_results.get("overall_verdict", "UNKNOWN")
                passed = test_results.get("passed_tests", 0)
                total = test_results.get("total_tests", len(tests))

                yield {"type": "log", "message": f"  ➜ [Lần chạy {iteration + 1}] Kết quả: {verdict} ({passed}/{total} tests passed)."}
                yield {"type": "test_results", "content": test_results, "verdict": verdict}

                if verdict == "AC":
                    yield {"type": "log", "message": f"  ✅ [ALL TESTS PASSED] Mã nguồn {lang.upper()} đã đạt chuẩn Accepted!"}
                    break

                if iteration == max_retries:
                    yield {"type": "log", "message": "  ⚠️ Đạt giới hạn số lần sửa lỗi tự động."}
                    break

                # Self-Correction Loop
                iteration += 1
                yield {"type": "step", "step": "fix", "status": "active", "message": f"🔧 [Sửa lỗi tự động #{iteration}] Gửi báo cáo lỗi ({verdict}) cho AI sửa..."}
                failure_report = CodeEvaluator.format_failure_report(test_results)
                debug_prompt = PromptEngine.build_debug_prompt(problem_statement, current_code, failure_report, language=lang)
                try:
                    fixed_response = await self.llm.chat([
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": debug_prompt}
                    ])
                    current_code = CodeEvaluator.extract_code(fixed_response, language=lang)
                    yield {"type": "code", "content": current_code, "language": lang}
                except Exception as e:
                    yield {"type": "log", "message": f"  ❌ Lỗi khi gọi AI debug: {str(e)}"}
                    break
        else:
            comp_res = self.runner.compiler.prepare_and_compile(current_code, language=lang)
            if comp_res["success"]:
                yield {"type": "log", "message": f"  ✅ Kiểm tra cú pháp {lang.upper()} thành công!"}
                test_results = {"overall_verdict": "AC", "success": True, "compiler_output": comp_res["compiler_output"]}
            else:
                yield {"type": "log", "message": "  ❌ Lỗi cú pháp/biên dịch. Đang tự động sửa..."}
                debug_prompt = PromptEngine.build_debug_prompt(problem_statement, current_code, f"Compiler error: {comp_res['compiler_output']}", language=lang)
                fixed_response = await self.llm.chat([
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": debug_prompt}
                ])
                current_code = CodeEvaluator.extract_code(fixed_response, language=lang)
                yield {"type": "code", "content": current_code, "language": lang}
                comp_res2 = self.runner.compiler.prepare_and_compile(current_code, language=lang)
                test_results = {"overall_verdict": "AC" if comp_res2["success"] else "CE", "success": comp_res2["success"], "compiler_output": comp_res2["compiler_output"]}


        yield {"type": "step", "step": "test", "status": "done"}
        yield {"type": "step", "step": "fix", "status": "done"}

        total_time = round(time.time() - start_time, 2)
        yield {"type": "log", "message": f"🏁 Hoàn thành toàn bộ quy trình trong {total_time}s."}
        yield {
            "type": "final",
            "success": test_results.get("success", False) if test_results else True,
            "final_verdict": test_results.get("overall_verdict", "DONE") if test_results else "DONE",
            "language": lang,
            "plan": plan_response,
            "code": current_code,
            "cpp_code": current_code,
            "test_results": test_results,
            "total_time_seconds": total_time,
            "debug_iterations": iteration
        }
