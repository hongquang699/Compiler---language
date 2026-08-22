import { submitToJudge } from "./api.js";
import { judgeState } from "./state.js";
import { renderResults, renderSummary } from "./render.js";

const testsInput = document.getElementById("tests");
const sourceInput = document.getElementById("source");
const languageInput = document.getElementById("language");
const judgeButton = document.getElementById("judge");
const summary = document.getElementById("summary");
const results = document.getElementById("results");

judgeButton.addEventListener("click", async () => {
    try {
        judgeState.tests = JSON.parse(testsInput.value);
    } catch {
        summary.textContent = "JSON test không hợp lệ";
        return;
    }
    judgeState.source = sourceInput.value;
    judgeState.language = languageInput.value;
    if (!Array.isArray(judgeState.tests) || !judgeState.tests.length || !judgeState.source.trim()) {
        summary.textContent = "Cần có test cases và source code";
        return;
    }
    judgeState.busy = true;
    judgeButton.disabled = true;
    summary.textContent = "Đang biên dịch và chấm...";
    results.innerHTML = "";
    try {
        const result = await submitToJudge(judgeState.source, judgeState.language, judgeState.tests);
        renderSummary(summary, result);
        renderResults(results, result);
    } catch (error) {
        summary.textContent = `Không thể kết nối máy chấm: ${error.message}`;
    } finally {
        judgeState.busy = false;
        judgeButton.disabled = false;
    }
});
