export function renderSummary(target, result) {
    target.textContent = `${result.overall_verdict} · ${result.passed_tests}/${result.total_tests} test · ${result.total_execution_time_ms ?? 0} ms`;
}

export function renderResults(target, result) {
    target.innerHTML = (result.test_results || []).map(test => `
        <div class="test-result ${test.verdict === "AC" ? "ok" : ""}">
            <strong>Test ${test.test_id}: ${test.verdict}</strong>
            <small>${test.status_detail || ""}</small>
        </div>`).join("");
}
