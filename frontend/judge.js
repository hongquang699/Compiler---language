const testsInput = document.getElementById('tests');
const sourceInput = document.getElementById('source');
const languageInput = document.getElementById('language');
const judgeButton = document.getElementById('judge');
const summary = document.getElementById('summary');
const results = document.getElementById('results');

judgeButton.addEventListener('click', async () => {
    let testcases;
    try { testcases = JSON.parse(testsInput.value); } catch { summary.textContent = 'JSON test không hợp lệ'; return; }
    if (!Array.isArray(testcases) || !testcases.length || !sourceInput.value.trim()) { summary.textContent = 'Cần có test cases và source code'; return; }
    judgeButton.disabled = true;
    summary.textContent = 'Đang biên dịch và chấm...';
    results.innerHTML = '';
    try {
        const response = await fetch('/api/compile_and_run', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_code: sourceInput.value, testcases, language: languageInput.value })
        });
        const data = await response.json();
        summary.textContent = response.ok ? `${data.overall_verdict} · ${data.passed_tests}/${data.total_tests} test · ${data.total_execution_time_ms ?? 0} ms` : (data.detail || 'Judge error');
        results.innerHTML = (data.test_results || []).map(test => `<div class="test-result ${test.verdict === 'AC' ? 'ok' : ''}"><strong>Test ${test.test_id}: ${test.verdict}</strong><small>${test.status_detail || ''}</small></div>`).join('');
    } catch (error) { summary.textContent = `Không thể kết nối máy chấm: ${error.message}`; }
    finally { judgeButton.disabled = false; }
});
