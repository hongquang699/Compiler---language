export async function submitToJudge(sourceCode, language, testcases) {
    const response = await fetch("/api/compile_and_run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_code: sourceCode, language, testcases }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Judge error");
    return data;
}
