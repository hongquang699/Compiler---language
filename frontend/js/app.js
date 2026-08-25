// ==========================================================================
// LOCAL CP IDE — USACO GUIDE & VS CODE EDITION
// Monaco Editor Integration + Multi-Case Test Suite + Code Agent Pipeline
// ==========================================================================

// Safe wrapper for marked.parse — falls back to plain text if marked.js didn't load
function safeParse(md) {
    if (typeof marked !== 'undefined' && marked.parse) {
        return marked.parse(md);
    }
    // Fallback: escape HTML and convert newlines to <br>
    return md.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>");
}
const SECRET_PAYLOAD_KEY = "local_cp_secret_v5";

function encryptCodePayload(code) {
    if (!code) return "";
    try {
        const encoder = new TextEncoder();
        const codeBytes = encoder.encode(code);
        const keyBytes = encoder.encode(SECRET_PAYLOAD_KEY);
        const encryptedBytes = new Uint8Array(codeBytes.length);
        for (let i = 0; i < codeBytes.length; i++) {
            encryptedBytes[i] = codeBytes[i] ^ keyBytes[i % keyBytes.length];
        }
        let binaryStr = "";
        for (let i = 0; i < encryptedBytes.length; i++) {
            binaryStr += String.fromCharCode(encryptedBytes[i]);
        }
        return "ENC::" + btoa(binaryStr);
    } catch (e) {
        return code;
    }
}

const state = {
    currentSessionId: "session_" + Date.now(),
    currentLang: "cpp",
    currentSolutionLang: "cpp",
    lastAgentResult: null,
    activeCaseIndex: 0,
    testCases: [
        {
            input: "5\n10 20 30 40 50",
            expected: "150",
            actual: "",
            error: "",
            verdict: "",
            timeMs: 0
        }
    ],
    auth: { token: localStorage.getItem("local_cp_token"), user: null }
};

function authFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (state.auth.token) headers.set("Authorization", `Bearer ${state.auth.token}`);
    return fetch(url, { ...options, headers });
}

const CODE_TEMPLATES = {
    cpp: `#include <bits/stdc++.h>

using namespace std;

int main() {
    ios_base::sync_with_stdio(0);
    cin.tie(0); cout.tie(0);
    return 0;
}`,
    python: `import sys

def main():
    input = sys.stdin.readline
    line = sys.stdin.read().split()
    if not line:
        return
    n = int(line[0])
    a = [int(x) for x in line[1:n+1]]
    print(sum(a))

if __name__ == '__main__':
    main()`,
    java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line != null && !line.trim().isEmpty()) {
            int n = Integer.parseInt(line.trim());
            String[] parts = br.readLine().trim().split("\\\\s+");
            long sum = 0;
            for (int i = 0; i < n; i++) {
                sum += Long.parseLong(parts[i]);
            }
            System.out.println(sum);
        }
    }
}`,
    c: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        long long sum = 0;
        for (int i = 0; i < n; ++i) {
            int val;
            scanf("%d", &val);
            sum += val;
        }
        printf("%lld\\n", sum);
    }
    return 0;
}`,
    rust: `use std::io::{self, BufRead};

fn main() {
    let stdin = io::stdin();
    let mut lines = stdin.lock().lines();
    if let Some(Ok(line)) = lines.next() {
        if let Ok(n) = line.trim().parse::<usize>() {
            if let Some(Ok(arr_line)) = lines.next() {
                let sum: i64 = arr_line
                    .split_whitespace()
                    .take(n)
                    .filter_map(|s| s.parse::<i64>().ok())
                    .sum();
                println!("{}", sum);
            }
        }
    }
}`,
    go: `package main

import (
	"bufio"
	"fmt"
	"os"
)

func main() {
	in := bufio.NewReader(os.Stdin)
	var n int
	if _, err := fmt.Fscan(in, &n); err == nil {
		var sum int64 = 0
		for i := 0; i < n; i++ {
			var val int64
			fmt.Fscan(in, &val)
			sum += val
		}
		fmt.Println(sum)
	}
}`
};

const MONACO_LANG_MAP = {
    cpp: "cpp",
    c: "c",
    java: "java",
    python: "python",
    rust: "rust",
    go: "go"
};

const LANG_FILE_INFO = {
    cpp:    { name: "main.cpp", solName: "solution.cpp", display: "C++17", tag: "C++17 (g++)" },
    python: { name: "main.py",  solName: "solution.py",  display: "Python 3", tag: "Python 3.12" },
    java:   { name: "Main.java",solName: "Main.java",    display: "Java 17", tag: "Java 17" },
    c:      { name: "main.c",   solName: "solution.c",   display: "C11", tag: "C11 (gcc)" },
    rust:   { name: "main.rs",  solName: "solution.rs",  display: "Rust", tag: "Rust 2021" },
    go:     { name: "main.go",  solName: "solution.go",  display: "Go", tag: "Go 1.21" },
};

// Monaco Instances
let playgroundEditor = null;
let solutionEditor = null;

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initMonaco();
    initUSACOTestSuite();
    checkSystemHealth();
    initAgentModule();
    initChatModule();
    initRagModule();
    initVaultModule();
    initAuthModule();
    initAdminModule();
    initPlaygroundSave();
    initThemeModule();
});

function initAdminModule() {
    const adminModelSelector = document.getElementById("admin-model-selector");
    const applyButton = document.getElementById("admin-apply-model-btn");
    const resetButton = document.getElementById("admin-reset-btn");
    const exportButton = document.getElementById("admin-export-btn");
    const membersTableBody = document.getElementById("admin-members-table-body");
    const detailBox = document.getElementById("admin-member-detail");
    const memberSearch = document.getElementById("admin-member-search");
    let members = [];

    if (!adminModelSelector || !applyButton || !resetButton || !membersTableBody) return;

    const refreshAdminDashboard = async () => {
        if (!state.auth.user || !state.auth.user.is_admin) return;
        try {
            const [overviewRes, membersRes] = await Promise.all([
                authFetch("/api/admin/overview"),
                authFetch("/api/admin/members")
            ]);
            if (!overviewRes.ok || !membersRes.ok) throw new Error("Không thể tải dữ liệu quản trị.");
            const overview = await overviewRes.json();
            const membersPayload = await membersRes.json();

            document.getElementById("admin-total-members").textContent = overview.total_members ?? 0;
            document.getElementById("admin-total-admins").textContent = overview.admin_count ?? 0;
            document.getElementById("admin-total-sessions").textContent = overview.total_sessions ?? 0;
            document.getElementById("admin-total-saved").textContent = overview.total_saved_problems ?? 0;
            adminModelSelector.value = overview.current_model || adminModelSelector.value;

            members = membersPayload.members || [];

            const renderMembers = () => {
                const query = (memberSearch?.value || "").trim().toLocaleLowerCase();
                const filteredMembers = members.filter(member => [
                    member.username,
                    member.email,
                    member.ips,
                    member.role,
                    member.is_admin ? "admin" : "user"
                ].some(value => String(value || "").toLocaleLowerCase().includes(query)));

                membersTableBody.innerHTML = "";
                for (const member of filteredMembers) {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td style="padding:0.75rem; border-bottom:1px solid rgba(148,163,184,.2);">${member.username}</td>
                    <td style="padding:0.75rem; border-bottom:1px solid rgba(148,163,184,.2);">${member.is_admin ? "Admin" : "User"}</td>
                    <td style="padding:0.75rem; border-bottom:1px solid rgba(148,163,184,.2);">${member.ips || "Chưa ghi nhận"}</td>
                    <td style="padding:0.75rem; border-bottom:1px solid rgba(148,163,184,.2);">${member.session_count ?? 0}</td>
                    <td style="padding:0.75rem; border-bottom:1px solid rgba(148,163,184,.2);">${member.solved_count ?? 0}</td>
                    <td style="padding:0.75rem; border-bottom:1px solid rgba(148,163,184,.2);">${new Date(member.created_at).toLocaleString("vi-VN")}</td>
                    <td style="padding:0.75rem; border-bottom:1px solid rgba(148,163,184,.2);"><button class="btn-ide btn-ide-secondary btn-xs" data-member-id="${member.id}">Xem</button></td>
                `;
                row.querySelector("button").addEventListener("click", async () => {
                    const res = await authFetch(`/api/admin/members/${member.id}`);
                    if (!res.ok) return;
                    const data = await res.json();
                    const sessionsHtml = (data.sessions || []).map(s => `<li><strong>${s.title}</strong><br><small>${new Date(s.updated_at).toLocaleString("vi-VN")}</small></li>`).join("") || "<li>Không có session</li>";
                    const solvedHtml = (data.solved_problems || []).map(p => `<li><strong>${p.title}</strong> (${p.verdict})</li>`).join("") || "<li>Không có bài đã lưu</li>";
                    const ipsHtml = (data.ips || []).map(item => `
                        <li style="display:flex; justify-content:space-between; gap:0.5rem; align-items:center;">
                            <span><strong>${item.ip}</strong><br><small>Lần cuối: ${new Date(item.last_seen).toLocaleString("vi-VN")}</small></span>
                            <button class="btn-ide btn-ide-danger btn-xs" data-block-ip="${item.ip}">Chặn</button>
                        </li>
                    `).join("") || "<li>Chưa ghi nhận IP</li>";
                    detailBox.innerHTML = `
                        <h3>${data.user.username}</h3>
                        <p><strong>Role:</strong> ${data.user.role}</p>
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1rem;">
                            <div class="glass-panel" style="padding:1rem; border-radius: 14px;">
                                <h4>Địa chỉ IP</h4>
                                <ul>${ipsHtml}</ul>
                            </div>
                            <div class="glass-panel" style="padding:1rem; border-radius: 14px;">
                                <h4>Sessions</h4>
                                <ul>${sessionsHtml}</ul>
                            </div>
                            <div class="glass-panel" style="padding:1rem; border-radius: 14px;">
                                <h4>Saved problems</h4>
                                <ul>${solvedHtml}</ul>
                            </div>
                        </div>
                    `;
                    detailBox.querySelectorAll("[data-block-ip]").forEach(button => {
                        button.addEventListener("click", async () => {
                            const ip = button.dataset.blockIp;
                            const res = await authFetch("/api/admin/block-ip", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ ip, reason: `admin_blocked_${data.user.username}`, minutes: 10 })
                            });
                            const result = await res.json();
                            if (!res.ok) {
                                alert(result.detail || "Không thể chặn IP.");
                                return;
                            }
                            button.disabled = true;
                            button.textContent = "Đã chặn";
                        });
                    });
                });
                membersTableBody.appendChild(row);
                }
            };

            renderMembers();
            if (memberSearch && !memberSearch.dataset.bound) {
                memberSearch.addEventListener("input", renderMembers);
                memberSearch.dataset.bound = "true";
            }
        } catch (err) {
            detailBox.innerHTML = `<p class="auth-error" style="display:block;">${err.message}</p>`;
        }
    };

    window.refreshAdminDashboard = refreshAdminDashboard;

    applyButton.addEventListener("click", async () => {
        if (!state.auth.user || !state.auth.user.is_admin) {
            alert("Bạn không có quyền cập nhật model AI.");
            return;
        }
        const model = adminModelSelector.value;
        const res = await authFetch("/api/admin/settings/model", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model })
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.detail || "Không thể cập nhật model AI.");
            return;
        }
        alert(`Đã cập nhật model AI thành ${data.current_model}.`);
        await refreshAdminDashboard();
    });

    exportButton.addEventListener("click", async () => {
        const res = await authFetch("/api/admin/export-members");
        if (!res.ok) {
            const data = await res.json();
            alert(data.detail || "Không thể tải dữ liệu member.");
            return;
        }
        const blob = await res.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `members-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(downloadUrl);
    });

    resetButton.addEventListener("click", async () => {
        if (!state.auth.user || !state.auth.user.is_admin) {
            alert("Bạn không có quyền reset máy chủ.");
            return;
        }
        const confirmed = confirm("Bạn có chắc muốn reset dữ liệu hệ thống? Mọi session và saved code của người dùng sẽ bị xóa, nhưng tài khoản admin sẽ được giữ lại.");
        if (!confirmed) return;
        const res = await authFetch("/api/admin/reset", { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
            alert(data.detail || "Không thể reset máy chủ.");
            return;
        }
        alert(data.message || "Reset thành công.");
        await refreshAdminDashboard();
    });

    document.querySelector("[data-tab='admin-tab']")?.addEventListener("click", async () => {
        if (state.auth.user?.is_admin) {
            await refreshAdminDashboard();
        }
    });

    if (state.auth.user?.is_admin) {
        refreshAdminDashboard();
    }
}

function initCompetitionModuleLegacy() { return; }
/* Legacy contest implementation moved to competition.js.
    const list = document.getElementById("competition-list");
    const detail = document.getElementById("competition-detail");
    const form = document.getElementById("competition-form");
    const adminList = document.getElementById("admin-competition-list");
    if (!list || !detail) return;

    const showDetail = async id => {
        const response = await authFetch(`/api/competitions/${id}`);
        const competition = await response.json();
        if (!response.ok) { alert(competition.detail || "Không thể tải cuộc thi."); return; }
        detail.classList.remove("hidden");
        let problem = (competition.problems || [])[0] || {
            id: competition.id, code: "A", title: competition.title,
            statement: competition.statement, test_count: competition.test_count,
            sample_input: "1 2 3", sample_output: "3"
        };
        const renderProblem = () => `<div class="problem-page-head">
                <button class="btn-ide btn-ide-secondary btn-xs" data-back-to-contest><i class="fa-solid fa-arrow-left"></i> Danh sách bài</button>
                <span class="panel-subtitle">${escapeHtml(competition.title)}</span>
            </div>
            <div class="problem-page-grid">
                <article class="problem-statement-panel">
                    <div class="problem-status-label">TRẠNG THÁI</div>
                    <h2>${escapeHtml(problem.code)}. ${escapeHtml(problem.title)}</h2>
                    <div class="problem-divider"></div>
                    <div class="problem-copy">${safeParse(problem.statement || "")}</div>
                    <section class="problem-section"><h3>Dữ liệu vào Specification</h3><p>Đọc dữ liệu từ <code>stdin</code> theo mô tả đề bài.</p></section>
                    <section class="problem-section"><h3>Dữ liệu ra Specification</h3><p>In kết quả ra <code>stdout</code>.</p></section>
                    <section class="problem-section"><h3>Sample Input</h3><pre>${escapeHtml(problem.sample_input || "")}</pre></section>
                    <section class="problem-section"><h3>Sample Output</h3><pre>${escapeHtml(problem.sample_output || "")}</pre></section>
                    <section class="problem-clarifications"><div class="problem-status-label">LÀM RÕ</div><h3>Giải đáp thắc mắc trong cuộc thi</h3><p>Chưa có lời làm rõ nào được đưa ra ở thời điểm này.</p></section>
                </article>
                <aside class="problem-sidebar">
                    <div class="problem-status-label">THÔNG TIN</div><h3>Thông tin bài tập</h3>
                    ${competition.joined ? `<form class="competition-submit problem-submit" data-submit-competition="${competition.id}">
                        <button class="problem-submit-button" type="submit"><i class="fa-solid fa-paper-plane"></i> Gửi bài giải</button>
                        <div class="problem-info-grid"><div><small>ĐIỂM</small><strong>100</strong></div><div><small>GIỚI HẠN<br>THỜI GIAN</small><strong>2.0s</strong></div><div><small>GIỚI HẠN BỘ<br>NHỚ</small><strong>256 MB</strong></div><div><small>I/O</small><strong>stdin -&gt; stdout</strong></div></div>
                        <select name="language"><option value="cpp">C++17</option><option value="python">Python 3</option><option value="java">Java 17</option><option value="c">C11</option><option value="rust">Rust</option><option value="go">Go</option></select>
                        <textarea name="source_code" placeholder="Dán mã nguồn của bạn..." required></textarea>
                        <span class="panel-subtitle" data-submit-result></span>
                    </form>` : `<button class="problem-submit-button" data-join-competition="${competition.id}"><i class="fa-solid fa-flag-checkered"></i> Tham gia cuộc thi</button>`}
                    <button class="problem-side-link" data-scroll-ranking><i class="fa-solid fa-list-ol"></i> Bảng xếp hạng</button>
                    <div class="problem-language-box"><small>NGÔN NGỮ CHO PHÉP</small><p>C, C++, Java, Pascal, Python, Text</p></div>
                    <div class="competition-ranking" data-ranking-id="${competition.id}"><strong>Bảng xếp hạng</strong><div>Đang tải...</div></div>
                </aside>
            </div>`;
        const renderContest = () => `<div class="contest-overview-head"><button class="btn-ide btn-ide-secondary btn-xs" data-close-detail><i class="fa-solid fa-arrow-left"></i> Tất cả cuộc thi</button><div><div class="problem-status-label">CUỘC THI</div><h2>${escapeHtml(competition.title)}</h2><p class="panel-subtitle">${competition.starts_at ? `Bắt đầu: ${new Date(competition.starts_at).toLocaleString("vi-VN")}` : "Chưa đặt giờ bắt đầu"} · ${competition.ends_at ? `Kết thúc: ${new Date(competition.ends_at).toLocaleString("vi-VN")}` : "Không giới hạn giờ kết thúc"}</p></div></div>
            <p class="competition-statement">${escapeHtml(competition.statement)}</p>
            <div class="contest-problem-list"><div class="problem-list-heading"><strong>Các bài tập</strong><span>${competition.test_count ?? 0} test ẩn · ${competition.participant_count ?? 0} người tham gia</span></div>
                    ${(competition.problems || [problem]).map(item => `<button class="contest-problem-card" data-open-problem-id="${item.id}"><span class="problem-code">${escapeHtml(item.code || "A")}</span><span><strong>${escapeHtml(item.title)}</strong><small>${item.test_count ?? competition.test_count ?? 0} test · ${item.points ?? 100} điểm</small></span><i class="fa-solid fa-chevron-right"></i></button>`).join("")}
            </div>`;
        detail.innerHTML = renderContest();
        detail.querySelectorAll("[data-open-problem-id]").forEach(button => button.addEventListener("click", () => { problem = (competition.problems || [problem]).find(item => String(item.id) === button.dataset.openProblemId) || problem; detail.innerHTML = renderProblem(); bindProblem(); }));
        detail.querySelector("[data-close-detail]").addEventListener("click", () => { detail.classList.add("hidden"); list.classList.remove("hidden"); });
        const bindProblem = () => {
            detail.querySelector("[data-back-to-contest]")?.addEventListener("click", () => { detail.innerHTML = renderContest(); detail.querySelectorAll("[data-open-problem-id]").forEach(button => button.addEventListener("click", () => { problem = (competition.problems || [problem]).find(item => String(item.id) === button.dataset.openProblemId) || problem; detail.innerHTML = renderProblem(); bindProblem(); })); });
            detail.querySelector("[data-scroll-ranking]")?.addEventListener("click", () => detail.querySelector("[data-ranking-id]")?.scrollIntoView({ behavior: "smooth" }));
            detail.querySelector("[data-join-competition]")?.addEventListener("click", async event => {
                const joinResponse = await authFetch(`/api/competitions/${event.currentTarget.dataset.joinCompetition}/join`, { method: "POST", headers: { Origin: window.location.origin } });
                const result = await joinResponse.json(); if (!joinResponse.ok) { alert(result.detail || "Không thể tham gia."); return; }
                state.auth.user.competition_joined = true; updateAuthUI(); await showDetail(id);
            });
            bindSubmit();
        };
        const bindSubmit = () => detail.querySelector("[data-submit-competition]")?.addEventListener("submit", async event => {
            event.preventDefault(); const formData = new FormData(event.currentTarget); const resultBox = event.currentTarget.querySelector("[data-submit-result]"); resultBox.textContent = "Đang chấm...";
            const submitResponse = await authFetch(`/api/competitions/${id}/submit`, { method: "POST", headers: { "Content-Type": "application/json", Origin: window.location.origin }, body: JSON.stringify({ source_code: formData.get("source_code"), language: formData.get("language"), problem_id: problem.id }) });
            const result = await submitResponse.json(); resultBox.textContent = submitResponse.ok ? `${result.verdict} · ${result.score} điểm · ${result.passed_tests}/${result.total_tests} test` : (result.detail || "Không thể nộp bài.");
            if (submitResponse.ok) loadRanking();
        });
        const loadRanking = async () => {
            const rankingResponse = await authFetch(`/api/competitions/${id}/ranking`); const rankingData = await rankingResponse.json(); const ranking = detail.querySelector("[data-ranking-id]");
            if (ranking && rankingResponse.ok) ranking.innerHTML = `<strong>Bảng xếp hạng</strong>${rankingData.ranking.length ? `<ol>${rankingData.ranking.map(item => `<li>${escapeHtml(item.username)} <span>(${item.score} điểm · ${item.submission_count} lần nộp)</span></li>`).join("")}</ol>` : `<div>Chưa có người tham gia.</div>`}`;
        };
        bindProblem();
        loadRanking();
        
            ${competition.joined ? `<span class="badge-pill">Đã tham gia · AI đã khóa</span>
                <form class="competition-submit" data-submit-competition="${competition.id}">
                    <div class="competition-submit-header"><strong>Nộp bài</strong><select name="language"><option value="cpp">C++17</option><option value="python">Python 3</option><option value="java">Java 17</option><option value="c">C11</option><option value="rust">Rust</option><option value="go">Go</option></select></div>
                    <textarea name="source_code" placeholder="Dán mã nguồn của bạn..." required></textarea>
                    <button class="btn-ide btn-ide-run btn-sm" type="submit"><i class="fa-solid fa-paper-plane"></i> Nộp bài</button>
                    <span class="panel-subtitle" data-submit-result></span>
                </form>` : `<button class="btn-ide btn-ide-run btn-sm" data-join-competition="${competition.id}"><i class="fa-solid fa-flag-checkered"></i> Tham gia cuộc thi</button>`}`;
            return;
            
        const rankingResponse = await authFetch(`/api/competitions/${competition.id}/ranking`);
        const rankingData = await rankingResponse.json();
        const ranking = detail.querySelector("[data-ranking-id]");
        if (rankingResponse.ok) ranking.innerHTML = `<strong>Bảng xếp hạng</strong>${rankingData.ranking.length ? `<ol>${rankingData.ranking.map(item => `<li>${escapeHtml(item.username)} <span>(${item.score} điểm · ${item.submission_count} lần nộp)</span></li>`).join("")}</ol>` : `<div>Chưa có người tham gia.</div>`}`;
        detail.querySelector("[data-submit-competition]")?.addEventListener("submit", async event => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const resultBox = event.currentTarget.querySelector("[data-submit-result]");
            resultBox.textContent = "Đang chấm...";
            const submitResponse = await authFetch(`/api/competitions/${id}/submit`, {
                method: "POST", headers: { "Content-Type": "application/json", Origin: window.location.origin },
                body: JSON.stringify({ source_code: formData.get("source_code"), language: formData.get("language") })
            });
            const result = await submitResponse.json();
            resultBox.textContent = submitResponse.ok ? `${result.verdict} · ${result.score} điểm · ${result.passed_tests}/${result.total_tests} test` : (result.detail || "Không thể nộp bài.");
            if (submitResponse.ok) {
                const updatedRanking = await authFetch(`/api/competitions/${id}/ranking`);
                const updatedData = await updatedRanking.json();
                if (updatedRanking.ok) ranking.innerHTML = `<strong>Bảng xếp hạng</strong><ol>${updatedData.ranking.map(item => `<li>${escapeHtml(item.username)} <span>(${item.score} điểm · ${item.submission_count} lần nộp)</span></li>`).join("")}</ol>`;
            }
        });
        detail.querySelector("[data-join-competition]")?.addEventListener("click", async event => {
            const joinResponse = await authFetch(`/api/competitions/${event.currentTarget.dataset.joinCompetition}/join`, { method: "POST", headers: { Origin: window.location.origin } });
            const result = await joinResponse.json();
            if (!joinResponse.ok) { alert(result.detail || "Không thể tham gia."); return; }
            alert("Đã tham gia. AI Agent và Assistant đã được khóa.");
            state.auth.user.competition_joined = true;
            updateAuthUI();
            await loadCompetitions();
            await showDetail(id);
        });
    };

    const loadCompetitions = async () => {
        if (!state.auth.user) {
            list.innerHTML = `<div class="empty-state">Đăng nhập để xem và tham gia cuộc thi.</div>`;
            return;
        }
        const response = await authFetch("/api/competitions");
        const competitions = await response.json();
        list.innerHTML = competitions.length ? competitions.map(competition => `<button class="competition-card" data-competition-id="${competition.id}"><span class="competition-card-icon"><i class="fa-solid fa-trophy"></i></span><span class="competition-card-copy"><strong>${escapeHtml(competition.title)}</strong><small>${competition.status === "published" ? "Đang diễn ra" : competition.status} · ${competition.test_count} test · ${competition.participant_count} người</small></span><i class="fa-solid fa-arrow-right"></i></button>`).join("") : `<div class="empty-state">Chưa có cuộc thi được mở.</div>`;
        list.querySelectorAll("[data-competition-id]").forEach(card => card.addEventListener("click", () => showDetail(card.dataset.competitionId)));
    };
    window.loadCompetitions = loadCompetitions;

    const loadAdminCompetitions = async () => {
        if (!adminList || !state.auth.user?.is_admin) return;
        const response = await authFetch("/api/admin/competitions");
        const competitions = await response.json();
        adminList.innerHTML = competitions.map(competition => `<button class="competition-admin-item" data-edit-competition="${competition.id}"><strong>${escapeHtml(competition.title)}</strong><span>${competition.status} · ${competition.test_count} tests</span></button>`).join("") || `<p class="panel-subtitle">Chưa có cuộc thi.</p>`;
        adminList.querySelectorAll("[data-edit-competition]").forEach(button => button.addEventListener("click", async () => {
            const response = await authFetch(`/api/competitions/${button.dataset.editCompetition}`);
            const competition = await response.json();
            document.getElementById("competition-edit-id").value = competition.id;
            document.getElementById("competition-title").value = competition.title;
            document.getElementById("competition-status").value = competition.status;
            document.getElementById("competition-starts-at").value = competition.starts_at ? competition.starts_at.slice(0, 16) : "";
            document.getElementById("competition-ends-at").value = competition.ends_at ? competition.ends_at.slice(0, 16) : "";
            document.getElementById("competition-statement").value = competition.statement;
            document.getElementById("competition-tests").value = JSON.stringify(competition.tests || [], null, 2);
            document.getElementById("competition-problems").value = JSON.stringify(competition.problems || [], null, 2);
            const delBtn = document.getElementById("competition-delete-btn");
            if (delBtn) delBtn.style.display = "inline-flex";
        }));
    };
    window.loadAdminCompetitions = loadAdminCompetitions;

    document.getElementById("competition-new-btn")?.addEventListener("click", () => {
        form.reset();
        document.getElementById("competition-edit-id").value = "";
        document.getElementById("competition-tests").value = "[]";
        document.getElementById("competition-problems").value = "[]";
        const delBtn = document.getElementById("competition-delete-btn");
        if (delBtn) delBtn.style.display = "none";
    });
    document.getElementById("competition-delete-btn")?.addEventListener("click", async () => {
        const id = document.getElementById("competition-edit-id").value;
        if (!id) return;
        if (!confirm("Bạn có chắc chắn muốn xóa cuộc thi này? Toàn bộ bài tập và bài nộp liên quan sẽ bị xóa!")) return;
        const response = await authFetch(`/api/admin/competitions/${id}`, { method: "DELETE" });
        if (response.ok) {
            form.reset();
            document.getElementById("competition-edit-id").value = "";
            document.getElementById("competition-delete-btn").style.display = "none";
            document.getElementById("competition-admin-message").textContent = "Đã xóa cuộc thi thành công.";
            loadAdminCompetitions();
        } else {
            const result = await response.json();
            alert(result.detail || "Không thể xóa cuộc thi.");
        }
    });
    form?.addEventListener("submit", async event => {
        event.preventDefault();
        let tests, problems;
        try { tests = JSON.parse(document.getElementById("competition-tests").value || "[]"); problems = JSON.parse(document.getElementById("competition-problems").value || "[]"); } catch { alert("Test hoặc problem JSON không hợp lệ."); return; }
        const id = document.getElementById("competition-edit-id").value;
        const response = await authFetch(id ? `/api/admin/competitions/${id}` : "/api/admin/competitions", { method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json", Origin: window.location.origin }, body: JSON.stringify({ title: document.getElementById("competition-title").value, statement: document.getElementById("competition-statement").value, status: document.getElementById("competition-status").value, starts_at: document.getElementById("competition-starts-at").value || null, ends_at: document.getElementById("competition-ends-at").value || null, tests, problems }) });
        const result = await response.json();
        document.getElementById("competition-admin-message").textContent = response.ok ? "Đã lưu cuộc thi." : (result.detail || "Không thể lưu cuộc thi.");
        if (response.ok) loadAdminCompetitions();
    });
    document.getElementById("competition-generate-tests")?.addEventListener("click", async () => {
        const response = await authFetch("/api/admin/competitions/generate-tests", { method: "POST", headers: { "Content-Type": "application/json", Origin: window.location.origin }, body: JSON.stringify({ prompt: document.getElementById("competition-statement").value, count: 5 }) });
        const result = await response.json();
        if (!response.ok) { alert(result.detail || "AI không tạo được test."); return; }
        document.getElementById("competition-tests").value = JSON.stringify(result.tests, null, 2);
    });
    document.querySelector("[data-tab='competition-tab']")?.addEventListener("click", loadCompetitions);
    document.querySelector("[data-tab='admin-tab']")?.addEventListener("click", loadAdminCompetitions);
}

*/
function initThemeModule() {
    const selector = document.getElementById("theme-selector");
    const savedTheme = localStorage.getItem("cp_theme") || localStorage.getItem("local_cp_theme") || "system";
    if (selector) selector.value = savedTheme;
    applyTheme(savedTheme);
    if (selector) {
        selector.addEventListener("change", () => {
            const theme = selector.value;
            localStorage.setItem("cp_theme", theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme);
            localStorage.setItem("local_cp_theme", theme);
            applyTheme(theme);
        });
    }
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if (selector && selector.value === "system") applyTheme("system");
    });
}

function applyTheme(theme) {
    const isLight = theme === "light" || (theme === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
    const themeName = isLight ? "light" : "dark";
    document.documentElement.dataset.theme = themeName;
    document.documentElement.setAttribute("data-theme", themeName);
    document.documentElement.dataset.themePreference = theme;
    if (window.monaco) monaco.editor.setTheme(isLight ? "cp-light" : "cp-aurora");
}

function initPlaygroundSave() {
    const saveButton = document.getElementById("save-playground-btn");
    if (!saveButton) return;
    saveButton.addEventListener("click", async () => {
        if (!state.auth.user) {
            document.getElementById("auth-modal").classList.remove("hidden");
            alert("Hãy đăng nhập để lưu code.");
            return;
        }
        const sourceCode = playgroundEditor ? playgroundEditor.getValue() : "";
        const title = prompt("Tên file hoặc bài toán:", "Code của tôi");
        if (!title || !sourceCode.trim()) return;
        const language = document.getElementById("playground-lang-selector").value || "cpp";
        const response = await authFetch("/api/user-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, language, source_code: sourceCode })
        });
        if (!response.ok) {
            alert("Không thể lưu code. Vui lòng đăng nhập lại.");
            return;
        }
        alert("Đã lưu code vào Vault cá nhân.");
        loadVaultProblems();
    });
}

function initAuthModule() {
    const modal = document.getElementById("auth-modal");
    const form = document.getElementById("auth-form");
    const title = document.getElementById("auth-title");
    const submit = document.getElementById("auth-submit-btn");
    let mode = "login";
    const setMode = nextMode => {
        mode = nextMode;
        title.textContent = mode === "login" ? "Đăng nhập" : "Đăng ký";
        submit.innerHTML = `<span>${title.textContent}</span><i class="fa-solid fa-arrow-right"></i>`;
        const emailField = document.getElementById("auth-email-field");
        const codeField = document.getElementById("auth-code-field");
        if (emailField) emailField.classList.toggle("hidden", mode !== "register");
        if (codeField) codeField.classList.toggle("hidden", mode !== "register");
        const emailInput = document.getElementById("auth-email");
        const codeInput = document.getElementById("auth-code");
        if (emailInput) emailInput.required = mode === "register";
        if (codeInput) codeInput.required = mode === "register";
        document.getElementById("auth-username").autocomplete = mode === "login" ? "username" : "username";
        document.querySelectorAll(".auth-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.authMode === mode));
        document.getElementById("auth-error").classList.add("hidden");
    };

    document.getElementById("send-code-btn")?.addEventListener("click", async () => {
        const email = document.getElementById("auth-email").value.trim();
        const error = document.getElementById("auth-error");
        error.classList.add("hidden");
        if (!email || !email.includes("@")) {
            error.textContent = "Vui lòng nhập Email hợp lệ để nhận mã OTP.";
            error.classList.remove("hidden");
            return;
        }
        const sendBtn = document.getElementById("send-code-btn");
        sendBtn.disabled = true;
        sendBtn.textContent = "Đang gửi...";
        try {
            const res = await fetch("/api/auth/send-verification-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (!res.ok) {
                error.textContent = data.detail || "Không thể gửi mã xác thực.";
                error.classList.remove("hidden");
                sendBtn.disabled = false;
                sendBtn.textContent = "Lấy mã OTP";
                return;
            }
            if (data.demo_code) {
                document.getElementById("auth-code").value = data.demo_code;
                alert(`[XÁC THỰC EMAIL]\nMã OTP 6 số của bạn là: ${data.demo_code}\n(Hệ thống đã tự điền vào ô mã xác thực)`);
            } else {
                alert(data.message || "Mã xác thực đã được gửi tới email.");
            }
            let countdown = 60;
            sendBtn.textContent = `Gửi lại (${countdown}s)`;
            const timer = setInterval(() => {
                countdown--;
                if (countdown <= 0) {
                    clearInterval(timer);
                    sendBtn.disabled = false;
                    sendBtn.textContent = "Lấy mã OTP";
                } else {
                    sendBtn.textContent = `Gửi lại (${countdown}s)`;
                }
            }, 1000);
        } catch {
            error.textContent = "Không thể kết nối máy chủ gửi OTP.";
            error.classList.remove("hidden");
            sendBtn.disabled = false;
            sendBtn.textContent = "Lấy mã OTP";
        }
    });

    document.getElementById("auth-password-toggle").addEventListener("click", event => {
        const password = document.getElementById("auth-password");
        const icon = event.currentTarget.querySelector("i");
        const visible = password.type === "text";
        password.type = visible ? "password" : "text";
        icon.className = visible ? "fa-solid fa-eye" : "fa-solid fa-eye-slash";
        event.currentTarget.title = visible ? "Hiện mật khẩu" : "Ẩn mật khẩu";
    });
    document.getElementById("auth-open-btn").addEventListener("click", () => modal.classList.remove("hidden"));
    document.getElementById("auth-close-btn").addEventListener("click", () => modal.classList.add("hidden"));
    document.querySelectorAll(".auth-tab").forEach(tab => tab.addEventListener("click", () => setMode(tab.dataset.authMode)));
    document.getElementById("auth-logout-btn").addEventListener("click", async () => {
        if (state.auth.token) await authFetch("/api/auth/logout", { method: "POST" });
        state.auth = { token: null, user: null };
        localStorage.removeItem("local_cp_token");
        updateAuthUI();
        document.getElementById("chat-history-list").innerHTML = "";
    });
    form.addEventListener("submit", async event => {
        event.preventDefault();
        const error = document.getElementById("auth-error");
        error.classList.add("hidden");
        try {
            const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
                username: document.getElementById("auth-username").value,
                email: document.getElementById("auth-email").value,
                password: document.getElementById("auth-password").value,
                verification_code: document.getElementById("auth-code") ? document.getElementById("auth-code").value : "",
                remember: document.getElementById("auth-remember").checked
            }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Không thể xác thực.");
            state.auth = { token: data.token, user: data.user };
            localStorage.setItem("local_cp_token", data.token);
            updateAuthUI();
            modal.classList.add("hidden");
            loadChatSessions();
            loadVaultProblems();
        } catch (err) {
            error.textContent = err.message;
            error.classList.remove("hidden");
        }
    });
    if (state.auth.token) authFetch("/api/auth/me").then(res => res.ok ? res.json() : Promise.reject()).then(user => { state.auth.user = user; updateAuthUI(); }).catch(() => { state.auth = { token: null, user: null }; localStorage.removeItem("local_cp_token"); });
    updateAuthUI();
}

function updateAuthUI() {
    const loggedIn = Boolean(state.auth.user);
    const isAdmin = Boolean(state.auth.user && state.auth.user.is_admin);
    document.getElementById("auth-open-btn").classList.toggle("hidden", loggedIn);
    document.getElementById("account-name").classList.toggle("hidden", !loggedIn);
    document.getElementById("account-name").textContent = loggedIn ? state.auth.user.username : "";
    document.getElementById("auth-logout-btn").classList.toggle("hidden", !loggedIn);
    const adminNavBtn = document.getElementById("admin-nav-btn");
    if (adminNavBtn) adminNavBtn.classList.toggle("hidden", !isAdmin);
    document.querySelector("#admin-tab")?.classList.toggle("hidden", !isAdmin);
    document.getElementById("header-model-picker")?.classList.toggle("hidden", !isAdmin);
    const aiLocked = Boolean(loggedIn && state.auth.user.competition_joined && !isAdmin);
    ["agent-tab", "chat-tab"].forEach(tabId => {
        const tab = document.querySelector(`[data-tab="${tabId}"]`);
        if (tab) {
            tab.classList.toggle("ai-locked", aiLocked);
            tab.title = aiLocked ? "Đã khóa sau khi tham gia cuộc thi" : "";
        }
    });
    document.getElementById("competition-ai-status")?.replaceChildren(document.createTextNode(aiLocked ? "AI đã khóa" : "AI đang mở"));
    if (isAdmin && typeof window.refreshAdminDashboard === "function") {
        window.refreshAdminDashboard();
    }
    if (typeof window.loadCompetitions === "function") window.loadCompetitions();
    if (isAdmin && typeof window.loadAdminCompetitions === "function") window.loadAdminCompetitions();
}

// 1. Monaco Editor Initialization
function initMonaco() {
    if (window.require) {
        require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
        require(['vs/editor/editor.main'], function () {
            monaco.editor.defineTheme("cp-aurora", {
                base: "vs-dark",
                inherit: true,
                rules: [
                    { token: "comment", foreground: "64748b", fontStyle: "italic" },
                    { token: "keyword", foreground: "22d3ee" },
                    { token: "string", foreground: "86efac" },
                    { token: "number", foreground: "fbbf24" },
                    { token: "type", foreground: "a78bfa" },
                    { token: "identifier", foreground: "e2e8f0" }
                ],
                colors: {
                    "editor.background": "#0b1220",
                    "editor.foreground": "#e2e8f0",
                    "editorLineNumber.foreground": "#475569",
                    "editorLineNumber.activeForeground": "#94a3b8",
                    "editor.selectionBackground": "#164e6388",
                    "editor.lineHighlightBackground": "#1e293b55",
                    "editorCursor.foreground": "#22d3ee",
                    "editorGutter.background": "#0b1220",
                    "editorWidget.background": "#101a30",
                    "editorSuggestWidget.background": "#101a30",
                    "editorSuggestWidget.border": "#1e3a5f"
                }
            });
            monaco.editor.defineTheme("cp-light", {
                base: "vs",
                inherit: true,
                rules: [
                    { token: "comment", foreground: "64748b", fontStyle: "italic" },
                    { token: "keyword", foreground: "0369a1" },
                    { token: "string", foreground: "047857" },
                    { token: "number", foreground: "a16207" },
                    { token: "type", foreground: "6d28d9" }
                ],
                colors: {
                    "editor.background": "#ffffff",
                    "editor.foreground": "#173042",
                    "editorLineNumber.foreground": "#94a3b8",
                    "editorLineNumber.activeForeground": "#475569",
                    "editor.selectionBackground": "#bae6fd",
                    "editor.lineHighlightBackground": "#f1f5f9",
                    "editorCursor.foreground": "#087f9b",
                    "editorGutter.background": "#ffffff",
                    "editorWidget.background": "#ffffff",
                    "editorSuggestWidget.background": "#ffffff",
                    "editorSuggestWidget.border": "#cbd5e1"
                }
            });
            monaco.editor.setTheme(document.documentElement.dataset.theme === "light" ? "cp-light" : "cp-aurora");

            // 1. Playground Editor
            const pgHost = document.getElementById("monaco-playground-editor");
            if (pgHost) {
                playgroundEditor = monaco.editor.create(pgHost, {
                    value: CODE_TEMPLATES.cpp,
                    language: "cpp",
                    theme: "cp-aurora",
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    fontLigatures: true,
                    automaticLayout: true,
                    tabSize: 4,
                    insertSpaces: true,
                    lineNumbers: "on",
                    renderLineHighlight: "all",
                    cursorBlinking: "smooth",
                    smoothScrolling: true,
                    padding: { top: 8 },
                    minimap: { enabled: false }
                });

                playgroundEditor.onDidChangeCursorPosition((e) => {
                    const cursorEl = document.getElementById("pg-status-cursor");
                    if (cursorEl) {
                        cursorEl.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
                    }
                });

                // Ctrl+Enter hotkey to run
                playgroundEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                    document.getElementById("run-sandbox-btn").click();
                });
            }

            // 2. Solution Viewer Editor (Agent tab)
            const solHost = document.getElementById("monaco-solution-editor");
            if (solHost) {
                solutionEditor = monaco.editor.create(solHost, {
                    value: "// Mã nguồn sẽ xuất hiện tại đây sau khi AI giải toán...",
                    language: "cpp",
                    theme: "cp-aurora",
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    fontLigatures: true,
                    automaticLayout: true,
                    tabSize: 4,
                    readOnly: false,
                    lineNumbers: "on",
                    renderLineHighlight: "all",
                    cursorBlinking: "smooth",
                    minimap: { enabled: false }
                });
            }

            // 3. Register IntelliSense & Code Suggestions for all languages
            registerMonacoSnippetsAndCompletions();
        });
    }
}

// Register Comprehensive CP Code Suggestions / IntelliSense for Monaco
function registerMonacoSnippetsAndCompletions() {
    if (!window.monaco) return;

    // Helper to build provider
    const createSnippetProvider = (snippets) => ({
        provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn
            };
            return {
                suggestions: snippets.map(s => ({
                    label: s.label,
                    kind: s.kind || monaco.languages.CompletionItemKind.Snippet,
                    insertText: s.insertText,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: s.doc || s.label,
                    detail: s.detail || "CP Snippet / Template",
                    range: range
                }))
            };
        }
    });

    // ── C++ (cpp) Snippets ────────────────────────────────────────────────
    monaco.languages.registerCompletionItemProvider('cpp', createSnippetProvider([
        {
            label: 'cptemplate',
            detail: 'Full Competitive Programming Template',
            doc: 'Complete CP boilerplate with fast I/O and solve()',
            insertText: '#include <bits/stdc++.h>\nusing namespace std;\n\n#define fast_io ios_base::sync_with_stdio(false); cin.tie(NULL)\nusing ll = long long;\nconst int MOD = 1e9 + 7;\n\nvoid solve() {\n    ${1:// Your code here}\n}\n\nint main() {\n    fast_io;\n    int t = 1;\n    // cin >> t;\n    while (t--) solve();\n    return 0;\n}'
        },
        {
            label: 'fast_io',
            detail: 'Fast I/O Optimization',
            doc: 'ios_base::sync_with_stdio(false); cin.tie(NULL);',
            insertText: 'ios_base::sync_with_stdio(false); cin.tie(NULL);'
        },
        {
            label: 'dsu',
            detail: 'Disjoint Set Union (DSU / Union-Find)',
            doc: 'DSU with path compression & union by size',
            insertText: 'struct DSU {\n    vector<int> parent, sz;\n    DSU(int n) {\n        parent.resize(n + 1);\n        iota(parent.begin(), parent.end(), 0);\n        sz.assign(n + 1, 1);\n    }\n    int find(int i) {\n        if (parent[i] == i) return i;\n        return parent[i] = find(parent[i]);\n    }\n    bool unite(int i, int j) {\n        int root_i = find(i), root_j = find(j);\n        if (root_i != root_j) {\n            if (sz[root_i] < sz[root_j]) swap(root_i, root_j);\n            parent[root_j] = root_i;\n            sz[root_i] += sz[root_j];\n            return true;\n        }\n        return false;\n    }\n};'
        },
        {
            label: 'segtree',
            detail: 'Segment Tree (Point Update, Range Query)',
            doc: 'Segment tree with O(log N) point update & range sum query',
            insertText: 'struct SegTree {\n    int n;\n    vector<long long> tree;\n    SegTree(int n) : n(n), tree(4 * n, 0) {}\n    void update(int node, int start, int end, int idx, long long val) {\n        if (start == end) {\n            tree[node] = val;\n            return;\n        }\n        int mid = (start + end) / 2;\n        if (idx <= mid) update(2 * node, start, mid, idx, val);\n        else update(2 * node + 1, mid + 1, end, idx, val);\n        tree[node] = tree[2 * node] + tree[2 * node + 1];\n    }\n    long long query(int node, int start, int end, int l, int r) {\n        if (r < start || end < l) return 0;\n        if (l <= start && end <= r) return tree[node];\n        int mid = (start + end) / 2;\n        return query(2 * node, start, mid, l, r) + query(2 * node + 1, mid + 1, end, l, r);\n    }\n};'
        },
        {
            label: 'fenwick',
            detail: 'Binary Indexed Tree (Fenwick Tree)',
            doc: 'Fenwick Tree for 1D Range Sum with Point Updates',
            insertText: 'struct FenwickTree {\n    int n;\n    vector<long long> bit;\n    FenwickTree(int n) : n(n), bit(n + 1, 0) {}\n    void add(int idx, long long delta) {\n        for (; idx <= n; idx += idx & -idx) bit[idx] += delta;\n    }\n    long long query(int idx) {\n        long long sum = 0;\n        for (; idx > 0; idx -= idx & -idx) sum += bit[idx];\n        return sum;\n    }\n    long long query(int l, int r) { return query(r) - query(l - 1); }\n};'
        },
        {
            label: 'binpow',
            detail: 'Binary Exponentiation (a^b % m)',
            doc: 'Computes (a^b) % m in O(log b)',
            insertText: 'long long binpow(long long a, long long b, long long m = 1e9 + 7) {\n    long long res = 1;\n    a %= m;\n    while (b > 0) {\n        if (b & 1) res = (res * a) % m;\n        a = (a * a) % m;\n        b >>= 1;\n    }\n    return res;\n}'
        },
        {
            label: 'sieve',
            detail: 'Sieve of Eratosthenes',
            doc: 'Computes primes up to N in O(N log log N)',
            insertText: 'vector<int> sieve(int n) {\n    vector<bool> is_prime(n + 1, true);\n    is_prime[0] = is_prime[1] = false;\n    for (int p = 2; p * p <= n; p++) {\n        if (is_prime[p]) {\n            for (int i = p * p; i <= n; i += p) is_prime[i] = false;\n        }\n    }\n    vector<int> primes;\n    for (int p = 2; p <= n; p++) if (is_prime[p]) primes.push_back(p);\n    return primes;\n}'
        },
        {
            label: 'dijkstra',
            detail: 'Dijkstra Shortest Path Algorithm',
            doc: 'Dijkstra algorithm using min-priority_queue',
            insertText: 'vector<long long> dijkstra(int start, int n, const vector<vector<pair<int, int>>>& adj) {\n    vector<long long> dist(n + 1, 1e18);\n    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> pq;\n    dist[start] = 0;\n    pq.push({0, start});\n    while (!pq.empty()) {\n        auto [d, u] = pq.top(); pq.pop();\n        if (d > dist[u]) continue;\n        for (auto [v, w] : adj[u]) {\n            if (dist[u] + w < dist[v]) {\n                dist[v] = dist[u] + w;\n                pq.push({dist[v], v});\n            }\n        }\n    }\n    return dist;\n}'
        },
        {
            label: 'forloop',
            detail: 'Standard For Loop',
            insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ++${1:i}) {\n    ${3}\n}'
        },
        {
            label: 'vector2d',
            detail: '2D Dynamic Vector Matrix',
            insertText: 'vector<vector<${1:int}>> ${2:grid}(${3:n}, vector<${1:int}>(${4:m}, ${5:0}));'
        }
    ]));

    // ── Python (python) Snippets ──────────────────────────────────────────
    monaco.languages.registerCompletionItemProvider('python', createSnippetProvider([
        {
            label: 'cptemplate',
            detail: 'Python CP Boilerplate with Fast I/O',
            doc: 'Standard fast I/O template for Competitive Programming in Python',
            insertText: 'import sys\nimport math\nfrom collections import defaultdict, deque, Counter\nimport heapq\nimport bisect\n\ndef solve():\n    input = sys.stdin.readline\n    ${1:# Your code here}\n\nif __name__ == "__main__":\n    solve()'
        },
        {
            label: 'fast_io',
            detail: 'Fast I/O & Recursion Limit',
            doc: 'sys.stdin.readline with setrecursionlimit(300000)',
            insertText: 'import sys\ninput = sys.stdin.readline\nsys.setrecursionlimit(300000)'
        },
        {
            label: 'dsu',
            detail: 'Disjoint Set Union (Python UnionFind)',
            doc: 'Python DSU with path compression and union by rank',
            insertText: 'class DSU:\n    def __init__(self, n):\n        self.parent = list(range(n + 1))\n        self.size = [1] * (n + 1)\n\n    def find(self, i):\n        if self.parent[i] == i:\n            return i\n        self.parent[i] = self.find(self.parent[i])\n        return self.parent[i]\n\n    def unite(self, i, j):\n        root_i, root_j = self.find(i), self.find(j)\n        if root_i != root_j:\n            if self.size[root_i] < self.size[root_j]:\n                root_i, root_j = root_j, root_i\n            self.parent[root_j] = root_i\n            self.size[root_i] += self.size[root_j]\n            return True\n        return False'
        },
        {
            label: 'segtree',
            detail: 'Segment Tree in Python',
            doc: 'Point update and range sum query segment tree',
            insertText: 'class SegmentTree:\n    def __init__(self, n):\n        self.n = n\n        self.tree = [0] * (4 * n)\n\n    def update(self, node, start, end, idx, val):\n        if start == end:\n            self.tree[node] = val\n            return\n        mid = (start + end) // 2\n        if idx <= mid:\n            self.update(2 * node, start, mid, idx, val)\n        else:\n            self.update(2 * node + 1, mid + 1, end, idx, val)\n        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]\n\n    def query(self, node, start, end, l, r):\n        if r < start or end < l:\n            return 0\n        if l <= start and end <= r:\n            return self.tree[node]\n        mid = (start + end) // 2\n        return self.query(2 * node, start, mid, l, r) + self.query(2 * node + 1, mid + 1, end, l, r)'
        },
        {
            label: 'dijkstra',
            detail: 'Dijkstra in Python (heapq)',
            doc: 'Shortest path using Python heapq',
            insertText: 'import heapq\n\ndef dijkstra(start, n, adj):\n    dist = [float("inf")] * (n + 1)\n    dist[start] = 0\n    pq = [(0, start)]\n    while pq:\n        d, u = heapq.heappop(pq)\n        if d > dist[u]:\n            continue\n        for v, w in adj[u]:\n            if dist[u] + w < dist[v]:\n                dist[v] = dist[u] + w\n                heapq.heappush(pq, (dist[v], v))\n    return dist'
        },
        {
            label: 'sieve',
            detail: 'Sieve of Eratosthenes',
            insertText: 'def sieve(n):\n    is_prime = [True] * (n + 1)\n    is_prime[0] = is_prime[1] = False\n    for p in range(2, int(n**0.5) + 1):\n        if is_prime[p]:\n            for i in range(p * p, n + 1, p):\n                is_prime[i] = False\n    return [p for p in range(2, n + 1) if is_prime[p]]'
        }
    ]));

    // ── Java (java) Snippets ──────────────────────────────────────────────
    monaco.languages.registerCompletionItemProvider('java', createSnippetProvider([
        {
            label: 'cptemplate',
            detail: 'Java FastScanner & Main Template',
            doc: 'Full competitive programming boilerplate for Java with FastScanner',
            insertText: 'import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    static class FastScanner {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        StringTokenizer st = new StringTokenizer("");\n        String next() {\n            while (!st.hasMoreTokens()) {\n                try { st = new StringTokenizer(br.readLine()); }\n                catch (IOException e) { e.printStackTrace(); }\n            }\n            return st.nextToken();\n        }\n        int nextInt() { return Integer.parseInt(next()); }\n        long nextLong() { return Long.parseLong(next()); }\n        double nextDouble() { return Double.parseDouble(next()); }\n    }\n\n    public static void main(String[] args) {\n        FastScanner in = new FastScanner();\n        PrintWriter out = new PrintWriter(System.out);\n        ${1:// Your code here}\n        out.flush();\n    }\n}'
        },
        {
            label: 'dsu',
            detail: 'Java DSU Class',
            insertText: 'static class DSU {\n    int[] parent, size;\n    DSU(int n) {\n        parent = new int[n + 1];\n        size = new int[n + 1];\n        for (int i = 0; i <= n; i++) { parent[i] = i; size[i] = 1; }\n    }\n    int find(int i) {\n        if (parent[i] == i) return i;\n        return parent[i] = find(parent[i]);\n    }\n    boolean unite(int i, int j) {\n        int rootI = find(i), rootJ = find(j);\n        if (rootI != rootJ) {\n            if (size[rootI] < size[rootJ]) { int t = rootI; rootI = rootJ; rootJ = t; }\n            parent[rootJ] = rootI;\n            size[rootI] += size[rootJ];\n            return true;\n        }\n        return false;\n    }\n}'
        }
    ]));

    // ── Rust (rust) Snippets ──────────────────────────────────────────────
    monaco.languages.registerCompletionItemProvider('rust', createSnippetProvider([
        {
            label: 'cptemplate',
            detail: 'Rust Fast I/O Template',
            doc: 'Competitive programming template in Rust using BufRead',
            insertText: 'use std::io::{self, BufRead};\n\nfn main() {\n    let stdin = io::stdin();\n    let mut lines = stdin.lock().lines();\n    ${1:// Your code here}\n}'
        }
    ]));

    // ── Go (go) Snippets ──────────────────────────────────────────────────
    monaco.languages.registerCompletionItemProvider('go', createSnippetProvider([
        {
            label: 'cptemplate',
            detail: 'Go Fast I/O Template',
            doc: 'Go CP template with bufio.NewReader and bufio.NewWriter',
            insertText: 'package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n)\n\nfunc main() {\n\tin := bufio.NewReader(os.Stdin)\n\tout := bufio.NewWriter(os.Stdout)\n\tdefer out.Flush()\n\n\t${1:// Your code here}\n}'
        }
    ]));

    // ── C (c) Snippets ────────────────────────────────────────────────────
    monaco.languages.registerCompletionItemProvider('c', createSnippetProvider([
        {
            label: 'cptemplate',
            detail: 'C Language CP Template',
            insertText: '#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <math.h>\n\nint main() {\n    ${1:// Your code here}\n    return 0;\n}'
        }
    ]));
}


// 2. Navigation Controller
function initNavigation() {
    const tabs = document.querySelectorAll(".nav-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", event => {
            if ((tab.dataset.tab === "agent-tab" || tab.dataset.tab === "chat-tab") && state.auth.user?.competition_joined && !state.auth.user?.is_admin) {
                event.preventDefault();
                alert("Bạn đã tham gia cuộc thi nên AI Agent và Assistant đã bị khóa.");
                return;
            }
            tabs.forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

            tab.classList.add("active");
            const target = document.getElementById(tab.dataset.tab);
            if (target) target.classList.add("active");

            // Trigger Monaco layout refresh on tab display
            setTimeout(() => {
                if (playgroundEditor) playgroundEditor.layout();
                if (solutionEditor) solutionEditor.layout();
            }, 50);

            if (tab.dataset.tab === "rag-tab") loadRagDocuments();
            if (tab.dataset.tab === "vault-tab") loadVaultProblems();
            if (tab.dataset.tab === "chat-tab") loadChatSessions();
            if (tab.dataset.tab === "competition-tab") window.loadCompetitions?.();
        });
    });

    const requestedTab = window.location.hash.slice(1);
    if (requestedTab) {
        const requestedNav = document.querySelector(`.nav-tab[data-tab="${requestedTab}"]`);
        const requestedContent = document.getElementById(requestedTab);
        if (requestedNav && requestedContent) {
            tabs.forEach(tab => tab.classList.toggle("active", tab === requestedNav));
            document.querySelectorAll(".tab-content").forEach(content => content.classList.toggle("active", content === requestedContent));
            if (requestedTab === "rag-tab") loadRagDocuments();
            if (requestedTab === "vault-tab") loadVaultProblems();
            if (requestedTab === "chat-tab") loadChatSessions();
            if (requestedTab === "competition-tab") window.loadCompetitions?.();
        }
    }

    // Support footer and internal navigation links with data-tab
    document.querySelectorAll(".global-site-footer a[data-tab]").forEach(link => {
        link.addEventListener("click", e => {
            const targetNav = document.querySelector(`.nav-tab[data-tab="${link.dataset.tab}"]`);
            if (targetNav) {
                targetNav.click();
            }
        });
    });

    window.addEventListener("hashchange", () => {
        const hash = window.location.hash.slice(1);
        if (hash) {
            const nav = document.querySelector(`.nav-tab[data-tab="${hash}"]`);
            if (nav) nav.click();
        }
    });

    // Agent Solution Sub-tabs
    const solTabs = document.querySelectorAll(".sol-tab");
    solTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            solTabs.forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".sol-content").forEach(c => c.classList.remove("active"));
            tab.classList.add("active");
            const el = document.getElementById(tab.dataset.target);
            if (el) el.classList.add("active");
            if (solutionEditor) solutionEditor.layout();
        });
    });
}

// 3. USACO Guide Multi-Case Test Suite
function initUSACOTestSuite() {
    const caseTabsContainer = document.getElementById("test-case-tabs");
    const addCaseBtn = document.getElementById("pg-add-test-btn");
    const inputArea = document.getElementById("current-case-input");
    const expectedArea = document.getElementById("current-case-expected");
    const copyInputBtn = document.getElementById("copy-case-input");

    function renderCaseTabs() {
        caseTabsContainer.innerHTML = state.testCases.map((tc, idx) => {
            const verdictCls = tc.verdict ? tc.verdict : "";
            const activeCls = idx === state.activeCaseIndex ? "active" : "";
            const label = tc.verdict ? `Case ${idx + 1} (${tc.verdict})` : `Case ${idx + 1}`;
            return `<button class="case-tab ${activeCls} ${verdictCls}" data-index="${idx}">${label}</button>`;
        }).join("");

        caseTabsContainer.querySelectorAll(".case-tab").forEach(btn => {
            btn.addEventListener("click", () => {
                saveCurrentCase();
                state.activeCaseIndex = parseInt(btn.dataset.index);
                renderCaseTabs();
                loadActiveCase();
            });
        });
    }

    function saveCurrentCase() {
        const cur = state.testCases[state.activeCaseIndex];
        if (cur) {
            cur.input = inputArea.value;
            cur.expected = expectedArea.value;
        }
    }

    function loadActiveCase() {
        const cur = state.testCases[state.activeCaseIndex] || { input: "", expected: "", actual: "", error: "", verdict: "" };
        inputArea.value = cur.input;
        expectedArea.value = cur.expected;

        const actualPre = document.getElementById("current-case-actual");
        const verdictPill = document.getElementById("current-case-verdict");
        const diagBox = document.getElementById("compiler-log-panel");
        const diagContent = document.getElementById("compiler-log-content");

        if (cur.actual || cur.verdict) {
            actualPre.innerHTML = escapeHtml(cur.actual || "(Không có output)");
            verdictPill.textContent = `${cur.verdict || "DONE"} (${cur.timeMs || 0}ms)`;
            verdictPill.className = `verdict-pill-badge ${cur.verdict || "AC"}`;
        } else {
            actualPre.innerHTML = `<span class="placeholder-text">Nhấn "Chạy Code" để thực thi test case này.</span>`;
            verdictPill.className = "verdict-pill-badge hidden";
        }

        if (cur.error) {
            diagBox.classList.remove("hidden");
            diagContent.textContent = cur.error;
        } else {
            diagBox.classList.add("hidden");
        }
    }

    inputArea.addEventListener("input", saveCurrentCase);
    expectedArea.addEventListener("input", saveCurrentCase);

    addCaseBtn.addEventListener("click", () => {
        saveCurrentCase();
        state.testCases.push({
            input: "",
            expected: "",
            actual: "",
            error: "",
            verdict: "",
            timeMs: 0
        });
        state.activeCaseIndex = state.testCases.length - 1;
        renderCaseTabs();
        loadActiveCase();
    });

    if (copyInputBtn) {
        copyInputBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(inputArea.value);
        });
    }

    // Edge Cases Generator button
    document.getElementById("gen-edge-cases-btn").addEventListener("click", async () => {
        const res = await fetch("/api/generate_edge_cases?case_type=array");
        const edges = await res.json();
        saveCurrentCase();
        edges.forEach((eg) => {
            state.testCases.push({
                input: `${eg.data.length}\n${eg.data.join(" ")}`,
                expected: "",
                actual: "",
                error: "",
                verdict: "",
                timeMs: 0
            });
        });
        renderCaseTabs();
        loadActiveCase();
    });

    // Run Sandbox Code on ALL Test Cases
    document.getElementById("run-sandbox-btn").addEventListener("click", async () => {
        saveCurrentCase();
        const code = playgroundEditor ? playgroundEditor.getValue() : "";
        const selectedLang = document.getElementById("playground-lang-selector").value || state.currentLang;
        const runBtn = document.getElementById("run-sandbox-btn");

        const formattedTests = state.testCases.map(tc => ({
            input: tc.input,
            expected: tc.expected
        }));

        runBtn.disabled = true;
        runBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang Chạy...</span>`;

        try {
            const res = await fetch("/api/compile_and_run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source_code: encryptCodePayload(code),
                    testcases: formattedTests,
                    language: selectedLang,
                    timeout_seconds: 2.0,
                    session_id: state.currentSessionId
                })
            });
            const data = await res.json();

            const diagBox = document.getElementById("compiler-log-panel");
            const diagContent = document.getElementById("compiler-log-content");

            if (data.overall_verdict === "CE") {
                diagBox.classList.remove("hidden");
                diagContent.textContent = data.compiler_output || "Lỗi biên dịch.";
                state.testCases.forEach(tc => { tc.verdict = "CE"; tc.actual = ""; });
            } else {
                diagBox.classList.add("hidden");
                (data.test_results || []).forEach((r, i) => {
                    if (state.testCases[i]) {
                        state.testCases[i].actual = r.actual;
                        state.testCases[i].verdict = r.verdict;
                        state.testCases[i].error = r.error || (r.status_detail !== 'Normal execution' ? r.status_detail : '');
                        state.testCases[i].timeMs = r.execution_time_ms;
                    }
                });
            }

            renderCaseTabs();
            loadActiveCase();
        } catch (err) {
            alert("Lỗi kết nối: " + err.message);
        } finally {
            runBtn.disabled = false;
            runBtn.innerHTML = `<i class="fa-solid fa-play"></i> <span>Chạy Code</span> <kbd>Ctrl+↵</kbd>`;
        }
    });

    renderCaseTabs();
    loadActiveCase();
}

// 4. Global Language Sync Controller
function initLanguageSync() {
    const globalLangSel = document.getElementById("global-lang-selector");
    const agentLangSel = document.getElementById("agent-lang-selector");
    const pgLangSel = document.getElementById("playground-lang-selector");
    const solLangSel = document.getElementById("sol-lang-selector");

    window.updateGlobalLang = (lang) => {
        state.currentLang = lang;
        if (globalLangSel) globalLangSel.value = lang;
        if (agentLangSel) agentLangSel.value = lang;
        if (pgLangSel) pgLangSel.value = lang;
        if (solLangSel) solLangSel.value = lang;

        const info = LANG_FILE_INFO[lang] || { name: `main.${lang}`, solName: `solution.${lang}`, display: lang.toUpperCase(), tag: lang.toUpperCase() };

        // Update Headers & Filenames
        const pgFilename = document.getElementById("pg-tab-filename");
        if (pgFilename) pgFilename.textContent = info.name;
        const pgBreadcrumb = document.getElementById("pg-breadcrumb-file");
        if (pgBreadcrumb) pgBreadcrumb.textContent = info.name;
        const pgStatusLang = document.getElementById("pg-status-lang");
        if (pgStatusLang) pgStatusLang.textContent = info.tag;

        const solTabLabel = document.getElementById("sol-code-tab-label");
        if (solTabLabel) solTabLabel.textContent = `Mã Nguồn (${info.display})`;
        const stepCodeLabel = document.getElementById("step-code-label");
        if (stepCodeLabel) stepCodeLabel.textContent = `3. Sinh ${info.display}`;

        // Switch Monaco Language Model
        if (playgroundEditor && window.monaco) {
            const monacoLang = MONACO_LANG_MAP[lang] || "cpp";
            monaco.editor.setModelLanguage(playgroundEditor.getModel(), monacoLang);
            if (CODE_TEMPLATES[lang]) {
                playgroundEditor.setValue(CODE_TEMPLATES[lang]);
            }
        }
    };

    if (globalLangSel) globalLangSel.addEventListener("change", (e) => updateGlobalLang(e.target.value));
    if (agentLangSel) agentLangSel.addEventListener("change", (e) => updateGlobalLang(e.target.value));
    if (pgLangSel) pgLangSel.addEventListener("change", (e) => updateGlobalLang(e.target.value));
    if (solLangSel) solLangSel.addEventListener("change", (e) => updateGlobalLang(e.target.value));
}

// 5. Code Agent Module
function initAgentModule() {
    initLanguageSync();
    const startAgentBtn = document.getElementById("start-agent-btn");
    const loadSampleBtn = document.getElementById("load-sample-problem-btn");
    const problemImageInput = document.getElementById("problem-image-input");
    const addTcBtn = document.getElementById("add-testcase-btn");
    const problemInput = document.getElementById("problem-statement-input");
    const testcasesContainer = document.getElementById("testcases-container");
    const convertLangBtn = document.getElementById("convert-lang-btn");
    const sendToSandboxBtn = document.getElementById("send-to-sandbox-btn");
    const copyCodeBtn = document.getElementById("copy-code-btn");
    const saveToVaultBtn = document.getElementById("save-to-vault-btn");

    problemImageInput.addEventListener("change", async () => {
        const file = problemImageInput.files[0];
        if (!file) return;
        const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
        if (!allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024) {
            alert("Chọn ảnh PNG, JPEG, WebP hoặc GIF không quá 10 MB.");
            problemImageInput.value = "";
            return;
        }

        const label = document.querySelector("label[for='problem-image-input']");
        const originalLabel = label.innerHTML;
        label.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang đọc ảnh...`;
        label.style.pointerEvents = "none";
        try {
            const formData = new FormData();
            formData.append("file", file);
            const response = await fetch("/api/agent/extract_problem_image", { method: "POST", body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Không thể đọc ảnh đề bài.");
            problemInput.value = data.text;
            problemInput.dispatchEvent(new Event("input", { bubbles: true }));
        } catch (error) {
            alert(error.message);
        } finally {
            label.innerHTML = originalLabel;
            label.style.pointerEvents = "";
            problemImageInput.value = "";
        }
    });

    loadSampleBtn.addEventListener("click", () => {
        problemInput.value = `Bài toán: Dãy con tăng dài nhất (Longest Increasing Subsequence - LIS)
Cho dãy số nguyên A gồm N phần tử (1 <= N <= 200,000, |Ai| <= 10^9).
Hãy tìm độ dài của dãy con tăng thực sự dài nhất.

Input:
Dòng 1 chứa số nguyên N.
Dòng 2 chứa N số nguyên A1, A2, ..., AN.

Output:
In ra một số nguyên duy nhất là độ dài dãy con tăng dài nhất.

Constraints:
N <= 200,000; Yêu cầu độ phức tạp O(N log N).`;

        testcasesContainer.innerHTML = `
            <div class="agent-tc-card" data-index="0">
                <div class="tc-header-mini"><span>Test #1</span></div>
                <div class="tc-inputs-grid">
                    <div>
                        <label>Input:</label>
                        <textarea class="tc-input" rows="2">6\\n1 2 5 3 4 7</textarea>
                    </div>
                    <div>
                        <label>Expected:</label>
                        <textarea class="tc-expected" rows="2">5</textarea>
                    </div>
                </div>
            </div>
            <div class="agent-tc-card" data-index="1">
                <div class="tc-header-mini"><span>Test #2</span></div>
                <div class="tc-inputs-grid">
                    <div>
                        <label>Input:</label>
                        <textarea class="tc-input" rows="2">5\\n5 4 3 2 1</textarea>
                    </div>
                    <div>
                        <label>Expected:</label>
                        <textarea class="tc-expected" rows="2">1</textarea>
                    </div>
                </div>
            </div>
        `;
    });

    addTcBtn.addEventListener("click", () => {
        const count = testcasesContainer.querySelectorAll(".agent-tc-card").length + 1;
        const card = document.createElement("div");
        card.className = "agent-tc-card";
        card.innerHTML = `
            <div class="tc-header-mini">
                <span>Test #${count}</span>
                <button class="btn-mini" onclick="this.closest('.agent-tc-card').remove()"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="tc-inputs-grid">
                <div><label>Input:</label><textarea class="tc-input" rows="2"></textarea></div>
                <div><label>Expected:</label><textarea class="tc-expected" rows="2"></textarea></div>
            </div>
        `;
        testcasesContainer.appendChild(card);
    });

    startAgentBtn.addEventListener("click", async () => {
        const problem = problemInput.value.trim();
        if (!problem) {
            alert("Vui lòng nhập đề bài!");
            return;
        }

        const testcases = [];
        testcasesContainer.querySelectorAll(".agent-tc-card").forEach(card => {
            const inp = card.querySelector(".tc-input").value;
            const exp = card.querySelector(".tc-expected").value;
            if (inp.trim()) testcases.push({ input: inp, expected: exp });
        });

        const selectedLang = document.getElementById("agent-lang-selector").value || state.currentLang;
        const maxRetries = parseInt(document.getElementById("max-retries-input").value) || 2;
        const logsContainer = document.getElementById("pipeline-logs");
        const verdictTag = document.getElementById("agent-verdict-tag");

        document.querySelectorAll(".usaco-pipeline-tracker .pipe-step").forEach(b => b.className = "pipe-step");
        logsContainer.innerHTML = `<div>🚀 Khởi động AI Pipeline (${selectedLang.toUpperCase()})...</div>`;
        verdictTag.className = "pipe-verdict-tag hidden";
        startAgentBtn.disabled = true;
        startAgentBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>ĐANG GIẢI & TEST...</span>`;

        try {
            const response = await fetch("/api/agent/solve_stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    problem_statement: problem,
                    testcases: testcases,
                    language: selectedLang,
                    max_retries: maxRetries,
                    session_id: state.currentSessionId
                })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop();

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const rawData = line.slice(6).trim();
                    if (rawData === "[DONE]") continue;

                    try {
                        const evt = JSON.parse(rawData);
                        if (evt.type === "step") {
                            const badge = document.getElementById(`step-${evt.step}`);
                            if (badge) badge.className = `pipe-step ${evt.status}`;
                            if (evt.message) {
                                logsContainer.innerHTML += `<div>${evt.message}</div>`;
                                logsContainer.scrollTop = logsContainer.scrollHeight;
                            }
                        } else if (evt.type === "log") {
                            logsContainer.innerHTML += `<div>${evt.message}</div>`;
                            logsContainer.scrollTop = logsContainer.scrollHeight;
                        } else if (evt.type === "plan") {
                            document.getElementById("agent-plan-text").innerHTML = safeParse(evt.content || "");
                        } else if (evt.type === "code") {
                            if (solutionEditor) {
                                const monacoLang = MONACO_LANG_MAP[evt.language || selectedLang] || "cpp";
                                monaco.editor.setModelLanguage(solutionEditor.getModel(), monacoLang);
                                solutionEditor.setValue(evt.content);
                            }
                        } else if (evt.type === "test_results") {
                            renderTestsDetail(evt.content);
                            if (evt.verdict) {
                                verdictTag.textContent = evt.verdict;
                                verdictTag.className = `pipe-verdict-tag ${evt.verdict}`;
                            }
                        } else if (evt.type === "final") {
                            state.lastAgentResult = evt;
                            const verdict = evt.final_verdict || (evt.success ? "AC" : "WA");
                            verdictTag.textContent = verdict;
                            verdictTag.className = `pipe-verdict-tag ${verdict}`;
                        }
                    } catch (e) {}
                }
            }
        } catch (err) {
            logsContainer.innerHTML += `<div style="color:var(--accent-red)">❌ Lỗi: ${err.message}</div>`;
        } finally {
            startAgentBtn.disabled = false;
            startAgentBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> <span>Giải toán &amp; tự chấm</span>`;
        }
    });

    // AI Code Conversion across languages
    convertLangBtn.addEventListener("click", async () => {
        const currentCode = solutionEditor ? solutionEditor.getValue() : "";
        if (!currentCode || currentCode.startsWith("// Mã nguồn")) {
            alert("Chưa có mã nguồn để chuyển đổi!");
            return;
        }

        const targetLang = document.getElementById("sol-lang-selector").value || "python";
        const fromLang = state.currentSolutionLang || state.currentLang || "cpp";

        convertLangBtn.disabled = true;
        convertLangBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Chuyển đổi...`;

        try {
            const res = await fetch("/api/agent/convert_code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source_code: currentCode,
                    from_language: fromLang,
                    to_language: targetLang,
                    problem_statement: problemInput.value.trim(),
                    testcases: []
                })
            });
            const data = await res.json();
            if (data.success && data.converted_code) {
                if (solutionEditor) {
                    const monacoLang = MONACO_LANG_MAP[targetLang] || "cpp";
                    monaco.editor.setModelLanguage(solutionEditor.getModel(), monacoLang);
                    solutionEditor.setValue(data.converted_code);
                }
                state.currentSolutionLang = targetLang;
                updateGlobalLang(targetLang);
            }
        } catch (err) {
            alert("Lỗi: " + err.message);
        } finally {
            convertLangBtn.disabled = false;
            convertLangBtn.innerHTML = `<i class="fa-solid fa-repeat"></i> Chuyển Ngôn Ngữ`;
        }
    });

    sendToSandboxBtn.addEventListener("click", () => {
        const code = solutionEditor ? solutionEditor.getValue() : "";
        const curLang = state.currentSolutionLang || state.currentLang || "cpp";
        if (playgroundEditor) {
            const monacoLang = MONACO_LANG_MAP[curLang] || "cpp";
            monaco.editor.setModelLanguage(playgroundEditor.getModel(), monacoLang);
            playgroundEditor.setValue(code);
        }
        updateGlobalLang(curLang);
        window.location.href = "index.html#playground-tab";
    });

    copyCodeBtn.addEventListener("click", () => {
        const code = solutionEditor ? solutionEditor.getValue() : "";
        navigator.clipboard.writeText(code);
        alert("Đã sao chép mã nguồn vào clipboard!");
    });

    saveToVaultBtn.addEventListener("click", async () => {
        if (!solutionEditor) return;
        const code = solutionEditor.getValue();
        const title = prompt("Nhập tên bài toán để lưu vào Vault:", "Dãy con tăng dài nhất (LIS)");
        if (!title) return;

        if (!state.auth.user) {
            document.getElementById("auth-modal").classList.remove("hidden");
            alert("Hãy đăng nhập để lưu code vào Vault.");
            return;
        }
        await authFetch("/api/problems", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: `${title} [${(state.currentSolutionLang || 'cpp').toUpperCase()}]`,
                category: "Dynamic Programming",
                complexity_time: "O(N log N)",
                complexity_space: "O(N)",
                solution_code: code,
                notes: state.lastAgentResult ? state.lastAgentResult.plan : "",
                verdict: state.lastAgentResult ? state.lastAgentResult.final_verdict : "AC"
            })
        });
        alert("Đã lưu bài toán vào Solved Vault!");
    });
}

function renderTestsDetail(testResults) {
    const container = document.getElementById("agent-tests-detail");
    if (!testResults || !testResults.test_results || testResults.test_results.length === 0) {
        container.innerHTML = `<div>Chạy thành công. Không có test case mẫu.</div>`;
        return;
    }

    container.innerHTML = testResults.test_results.map(t => `
        <div class="test-result-card">
            <div class="test-result-header">
                <strong>Test #${t.test_id}</strong>
                <span class="verdict-pill-badge ${t.verdict}">${t.verdict} (${t.execution_time_ms} ms)</span>
            </div>
            <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:4px;">
                <strong>Input:</strong> <code>${escapeHtml(t.input.replace(/\\n/g, " "))}</code>
            </div>
            <div style="font-size:0.75rem; color:var(--text-secondary);">
                <strong>Expected:</strong> <code>${escapeHtml(t.expected)}</code> | <strong>Actual:</strong> <code>${escapeHtml(t.actual)}</code>
            </div>
        </div>
    `).join("");
}

// 6. Interactive Chat Module
function initChatModule() {
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("chat-send-btn");
    const messagesContainer = document.getElementById("chat-messages");
    const newChatBtn = document.getElementById("new-chat-btn");

    newChatBtn.addEventListener("click", () => {
        state.currentSessionId = "session_" + Date.now();
        messagesContainer.innerHTML = `
            <div class="chat-bubble assistant">
                <div class="bubble-header"><i class="fa-solid fa-robot"></i> CP Grandmaster AI</div>
                <div class="bubble-content">
                    Bắt đầu phiên hội thoại mới. Hãy gửi câu hỏi, thuật toán hoặc đoạn code cần phân tích!
                </div>
            </div>
        `;
        loadChatSessions();
    });

    const sendMessage = async () => {
        const text = chatInput.value.trim();
        if (!text) return;
        if (!state.auth.user) {
            document.getElementById("auth-modal").classList.remove("hidden");
            alert("Hãy đăng nhập để sử dụng Assistant và lưu lịch sử hội thoại.");
            return;
        }
        chatInput.value = "";

        const userBubble = document.createElement("div");
        userBubble.className = "chat-bubble user";
        userBubble.innerHTML = `<div class="bubble-content">${escapeHtml(text)}</div>`;
        messagesContainer.appendChild(userBubble);

        const aiBubble = document.createElement("div");
        aiBubble.className = "chat-bubble assistant";
        aiBubble.innerHTML = `
            <div class="bubble-header"><i class="fa-solid fa-robot"></i> CP Grandmaster AI</div>
            <div class="bubble-content"><i class="fa-solid fa-spinner fa-spin"></i> Đang suy luận...</div>
        `;
        messagesContainer.appendChild(aiBubble);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            const res = await authFetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    session_id: state.currentSessionId,
                    message: text,
                    include_rag: true,
                    stream: false
                })
            });
            const data = await res.json();
            aiBubble.querySelector(".bubble-content").innerHTML = safeParse(data.response);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (e) {
            aiBubble.querySelector(".bubble-content").innerHTML = `<span style="color:var(--accent-red)">Lỗi phản hồi: ${e.message}</span>`;
        }
    };

    sendBtn.addEventListener("click", sendMessage);
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

async function loadChatSessions() {
    const list = document.getElementById("chat-history-list");
    if (!state.auth.user) {
        list.innerHTML = `<div class="empty-state">Đăng nhập để xem lịch sử hội thoại.</div>`;
        return;
    }
    try {
        const res = await authFetch("/api/sessions");
        if (res.status === 401) {
            state.auth = { token: null, user: null };
            localStorage.removeItem("local_cp_token");
            updateAuthUI();
            list.innerHTML = `<div class="empty-state">Phiên đăng nhập đã hết hạn.</div>`;
            return;
        }
        const sessions = await res.json();
        list.innerHTML = sessions.map(s => `
            <div class="chat-session-item ${s.id === state.currentSessionId ? 'active' : ''}" onclick="switchSession('${s.id}')">
                <span>${escapeHtml(s.title || s.id)}</span>
                <i class="fa-solid fa-trash btn-mini" onclick="event.stopPropagation(); deleteSession('${s.id}')"></i>
            </div>
        `).join("");
    } catch (e) {}
}

window.switchSession = async (sid) => {
    if (!state.auth.user) return;
    state.currentSessionId = sid;
    loadChatSessions();
    const res = await authFetch(`/api/sessions/${sid}/messages`);
    const msgs = await res.json();
    const container = document.getElementById("chat-messages");
    container.innerHTML = "";
    msgs.forEach(m => {
        const b = document.createElement("div");
        b.className = `chat-bubble ${m.role}`;
        b.innerHTML = `
            <div class="bubble-header">${m.role === 'assistant' ? '<i class="fa-solid fa-robot"></i> CP AI' : 'Bạn'}</div>
            <div class="bubble-content">${safeParse(m.content)}</div>
        `;
        container.appendChild(b);
    });
};

window.deleteSession = async (sid) => {
    if (!state.auth.user) return;
    await authFetch(`/api/sessions/${sid}`, { method: "DELETE" });
    if (state.currentSessionId === sid) state.currentSessionId = "session_" + Date.now();
    loadChatSessions();
};

// 7. System Health Check
async function checkSystemHealth() {
    try {
        const res = await fetch("/api/health");
        const data = await res.json();

        const compBadge = document.getElementById("compiler-status-badge");
        if (data.compiler.status === "ready") {
            compBadge.innerHTML = `<span class="status-dot green"></span><span>g++ (${data.compiler.standard})</span>`;
        } else {
            compBadge.innerHTML = `<span class="status-dot red"></span><span>g++ Error</span>`;
        }

        const modelSelect = document.getElementById("model-selector");
        modelSelect.innerHTML = "";
        const availableModels = [...new Set([
            ...(data.llm.available_models || []),
            "gemma4:latest",
            "deepseek-v4-flash:cloud"
        ])];
        availableModels.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m;
            opt.textContent = m;
            if (m === data.llm.current_model) opt.selected = true;
            modelSelect.appendChild(opt);
        });
    } catch (e) {}
}

// 8. RAG & Vault Modules
function initRagModule() {
    document.getElementById("rag-upload-input").addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/rag/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) {
            alert(`Đã nạp file ${data.filename} vào RAG!`);
            loadRagDocuments();
        }
    });
}

async function loadRagDocuments() {
    const grid = document.getElementById("rag-docs-grid");
    const viewer = document.getElementById("rag-viewer");
    try {
        const res = await fetch("/api/rag/documents");
        const docs = await res.json();
        if (!docs.length) {
            grid.innerHTML = `<div class="empty-state">Chưa có template. Hãy nạp file .cpp / .py / .md.</div>`;
            viewer.innerHTML = `
                <div class="rag-viewer-empty">
                    <i class="fa-solid fa-book-open"></i>
                    <p>Chưa có tài liệu nào để hiển thị.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = docs.map(d => `
            <div class="rag-card" data-filename="${escapeHtml(d.filename || d.name)}" tabindex="0">
                <div class="rag-card-header">
                    <span><i class="fa-solid fa-file-lines"></i> ${escapeHtml(d.name)}</span>
                    <span class="badge-pill">${d.sections} mẫu</span>
                </div>
                <div class="rag-card-desc">Tài liệu thuật toán & template thi đấu cho AI tra cứu.</div>
            </div>
        `).join("");

        const cards = grid.querySelectorAll(".rag-card");
        cards.forEach(card => {
            const activate = async () => {
                const filename = card.dataset.filename;
                cards.forEach(c => c.classList.toggle("active", c === card));
                viewer.innerHTML = `
                    <div class="rag-viewer-empty">
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        <p>Đang tải nội dung tài liệu...</p>
                    </div>
                `;

                try {
                    const docRes = await fetch(`/api/rag/documents/${encodeURIComponent(filename)}`);
                    const docData = await docRes.json();
                    const content = docData && docData.content ? docData.content : "";
                    viewer.innerHTML = `
                        <div class="rag-viewer-header">
                            <div class="rag-viewer-title">${escapeHtml(docData.filename || filename)}</div>
                            <div class="rag-viewer-meta">Template / kiến thức AI</div>
                        </div>
                        <div class="rag-viewer-body">
                            <pre class="rag-code">${escapeHtml(content)}</pre>
                        </div>
                    `;
                } catch (error) {
                    viewer.innerHTML = `
                        <div class="rag-viewer-empty">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            <p>Không thể tải nội dung tài liệu.</p>
                        </div>
                    `;
                }
            };

            card.addEventListener("click", activate);
            card.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    activate();
                }
            });
        });

        const firstCard = cards[0];
        if (firstCard) firstCard.click();
    } catch (e) {
        viewer.innerHTML = `
            <div class="rag-viewer-empty">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>Không thể tải kho tài liệu RAG.</p>
            </div>
        `;
    }
}

function initVaultModule() {}

async function loadVaultProblems() {
    const grid = document.getElementById("vault-grid");
    if (!state.auth.user) {
        grid.innerHTML = `<div class="empty-state">Đăng nhập để xem Vault cá nhân.</div>`;
        return;
    }
    try {
        const res = await authFetch("/api/problems");
        const problems = await res.json();
        if (problems.length === 0) {
            grid.innerHTML = `<div class="empty-state">Chưa có bài toán nào trong Vault. Lưu từ tab AI Agent.</div>`;
            return;
        }
        grid.innerHTML = problems.map(p => `
            <div class="vault-card">
                <div class="vault-card-header">
                    <span>${escapeHtml(p.title)}</span>
                    <span class="verdict-pill-badge ${p.verdict || 'AC'}">${p.verdict || 'AC'}</span>
                </div>
                <div style="font-size:0.75rem; color:var(--text-secondary);">
                    <span>${p.category || 'General'}</span> | <span>${p.complexity_time || 'O(N log N)'}</span>
                </div>
            </div>
        `).join("");
    } catch (e) {}
}

function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
