// ==========================================================================
// LOCAL CP STUDIO — STANDALONE ADMIN PROBLEMS & AI TESTCASES JS
// ==========================================================================

const API_BASE = window.location.origin;

function getAuthToken() {
    return localStorage.getItem("local_cp_token") || localStorage.getItem("token") || "";
}

async function request(path, options = {}) {
    const token = getAuthToken();
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (response.status === 401) {
        document.getElementById("admin-login-overlay")?.classList.add("open");
    }
    return response;
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, match => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[match]);
}

function showAlert(message, type = "info") {
    let alertBox = document.getElementById("admin-alert");
    if (!alertBox) {
        alertBox = document.createElement("div");
        alertBox.id = "admin-alert";
        alertBox.className = "admin-alert";
        document.querySelector(".admin-content")?.prepend(alertBox);
    }
    alertBox.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${message}`;
    alertBox.hidden = false;
    setTimeout(() => { alertBox.hidden = true; }, 5000);
}

// ── AUTH CHECK ─────────────────────────────────────────────────────────────
async function checkAuthAndLoad() {
    const token = getAuthToken();
    if (!token) {
        document.getElementById("admin-login-overlay")?.classList.add("open");
        return;
    }
    try {
        const res = await request("/api/user/profile");
        if (!res.ok) {
            document.getElementById("admin-login-overlay")?.classList.add("open");
            return;
        }
        const user = await res.json();
        const role = (user.role || (user.is_admin ? "admin" : "user")).toLowerCase();
        if (!user.is_admin && !["admin", "superadmin", "dev"].includes(role)) {
            alert("Bạn không có quyền truy cập trang Quản trị Bài tập.");
            window.location.href = "index.html";
            return;
        }
        document.getElementById("user-display").innerHTML = `<i class="fa-solid fa-user-shield"></i> ${escapeHtml(user.username)} (${role.toUpperCase()})`;
        document.getElementById("admin-login-overlay")?.classList.remove("open");
        loadProblems();
    } catch (e) {
        document.getElementById("admin-login-overlay")?.classList.add("open");
    }
}

document.getElementById("admin-login-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const login = document.getElementById("admin-login-user").value.trim();
    const pass = document.getElementById("admin-login-pass").value;
    const msg = document.getElementById("admin-login-msg");
    
    msg.hidden = true;
    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password: pass })
    });
    const data = await res.json();
    if (res.ok && data.token) {
        localStorage.setItem("local_cp_token", data.token);
        localStorage.setItem("token", data.token);
        document.getElementById("admin-login-overlay")?.classList.remove("open");
        checkAuthAndLoad();
    } else {
        msg.textContent = data.detail || "Đăng nhập không thành công.";
        msg.hidden = false;
    }
});

// ── PROBLEMS BANK CRUD ──────────────────────────────────────────────────────
let allProblems = [];
let currentProblem = null;
let latestAITests = [];

async function loadProblems() {
    const res = await request("/api/admin/problems");
    if (!res.ok) return;
    allProblems = await res.json();
    renderProblems();
}

function renderProblems() {
    const q = (document.getElementById("problem-search")?.value || "").trim().toLowerCase();
    const tbody = document.getElementById("problems-tbody");
    if (!tbody) return;
    
    const filtered = allProblems.filter(p => 
        (p.title || "").toLowerCase().includes(q) || 
        (p.code || "").toLowerCase().includes(q) ||
        (p.contest_title || "").toLowerCase().includes(q)
    );
    
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-secondary);">Không tìm thấy bài tập nào.</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(p => `
        <tr>
            <td><strong style="color:var(--accent-cyan); font-family:var(--font-code); font-size:1.05rem;">${escapeHtml(p.code || 'A')}</strong></td>
            <td>
                <div style="font-weight:700; color:var(--text-bright); font-size:0.95rem;">${escapeHtml(p.title || 'Không tiêu đề')}</div>
                <small style="color:var(--text-secondary);">${escapeHtml((p.statement || '').slice(0, 85))}...</small>
            </td>
            <td><span style="font-size:0.8rem; color:var(--text-secondary);"><i class="fa-solid fa-flag-checkered" style="color:var(--accent-cyan);"></i> ${escapeHtml(p.contest_title || 'Kho tự do')}</span></td>
            <td style="text-align:center;"><span class="badge user" style="color:var(--accent-cyan); font-weight:700;">${p.points ?? 100}p</span></td>
            <td style="text-align:center; font-family:var(--font-code); font-size:0.8rem; color:var(--text-secondary);">${p.time_limit ?? 1.0}s / ${p.memory_limit ?? 256}MB</td>
            <td style="text-align:center;"><span class="badge admin" style="font-weight:700;">${p.test_count ?? 0} tests</span></td>
            <td style="text-align:right; white-space:nowrap;">
                <button class="btn-icon" onclick="openEditProblemModal(${p.id})" title="Chỉnh sửa Đề bài"><i class="fa-solid fa-pen"></i> Sửa</button>
                <button class="btn-icon" style="border-color:rgba(168,85,247,0.4); color:#c084fc;" onclick="openTestModal(${p.id})" title="Quản lý Testcases"><i class="fa-solid fa-vial"></i> Tests</button>
                <button class="btn-icon danger" onclick="deleteProblem(${p.id})" title="Xóa Bài tập"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join("");
}

document.getElementById("problem-search")?.addEventListener("input", renderProblems);

async function populateContestSelect(selectedId = null) {
    const sel = document.getElementById("edit-prob-contest");
    if (!sel) return;
    const res = await request("/api/admin/competitions");
    if (!res.ok) return;
    const contests = await res.json();
    sel.innerHTML = (contests || []).map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${escapeHtml(c.title)}</option>`).join("");
}

window.openCreateProblemModal = async function() {
    document.getElementById("problem-edit-form").reset();
    document.getElementById("edit-prob-id").value = "";
    document.getElementById("edit-prob-code").value = "A";
    document.getElementById("edit-prob-points").value = "100";
    document.getElementById("edit-prob-tl").value = "1.0";
    document.getElementById("edit-prob-ml").value = "256";
    document.getElementById("problem-modal-title").textContent = "Tạo Bài tập mới trong Kho";
    await populateContestSelect();
    document.getElementById("problem-modal-overlay").classList.add("open");
};

document.getElementById("btn-create-prob")?.addEventListener("click", openCreateProblemModal);

window.openEditProblemModal = async function(probId) {
    const res = await request(`/api/admin/problems/${probId}`);
    if (!res.ok) { showAlert("Không thể tải thông tin bài tập.", "danger"); return; }
    const p = await res.json();
    document.getElementById("edit-prob-id").value = p.id;
    document.getElementById("edit-prob-code").value = p.code || "A";
    document.getElementById("edit-prob-title").value = p.title || "";
    document.getElementById("edit-prob-points").value = p.points ?? 100;
    document.getElementById("edit-prob-tl").value = p.time_limit ?? 1.0;
    document.getElementById("edit-prob-ml").value = p.memory_limit ?? 256;
    document.getElementById("edit-prob-statement").value = p.statement || "";
    document.getElementById("problem-modal-title").textContent = `Chỉnh sửa Bài tập: ${p.title}`;
    await populateContestSelect(p.competition_id);
    document.getElementById("problem-modal-overlay").classList.add("open");
};

window.closeProblemModal = function() {
    document.getElementById("problem-modal-overlay").classList.remove("open");
};

document.getElementById("problem-edit-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const id = document.getElementById("edit-prob-id").value;
    const body = {
        code: document.getElementById("edit-prob-code").value.trim(),
        title: document.getElementById("edit-prob-title").value.trim(),
        points: parseInt(document.getElementById("edit-prob-points").value || "100"),
        time_limit: parseFloat(document.getElementById("edit-prob-tl").value || "1.0"),
        memory_limit: parseInt(document.getElementById("edit-prob-ml").value || "256"),
        statement: document.getElementById("edit-prob-statement").value,
        competition_id: parseInt(document.getElementById("edit-prob-contest").value || "1")
    };
    const res = await request(id ? `/api/admin/problems/${id}` : "/api/admin/problems", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(body)
    });
    if (res.ok) {
        showAlert(id ? "Đã cập nhật bài tập thành công!" : "Đã tạo bài tập mới thành công!", "info");
        closeProblemModal();
        loadProblems();
    } else {
        const j = await res.json();
        showAlert(j.detail || "Không thể lưu bài tập.", "danger");
    }
});

window.deleteProblem = async function(probId) {
    if (!confirm("XÁC NHẬN: Bạn có chắc chắn muốn xóa bài tập này cùng toàn bộ testcases?")) return;
    const res = await request(`/api/admin/problems/${probId}`, { method: "DELETE" });
    if (res.ok) {
        showAlert("Đã xóa bài tập thành công!", "info");
        loadProblems();
    } else {
        const j = await res.json();
        showAlert(j.detail || "Không thể xóa bài tập.", "danger");
    }
};

// ── TESTCASES MANAGER ───────────────────────────────────────────────────────
window.openTestModal = async function(probId) {
    const res = await request(`/api/admin/problems/${probId}`);
    if (!res.ok) { showAlert("Không thể tải bài tập.", "danger"); return; }
    currentProblem = await res.json();
    document.getElementById("test-mgr-prob-id").value = currentProblem.id;
    document.getElementById("test-modal-title").textContent = `Quản lý Testcases: [${currentProblem.code}] ${currentProblem.title}`;
    
    const container = document.getElementById("testcases-list-container");
    container.innerHTML = "";
    const tests = currentProblem.tests || [];
    if (!tests.length) {
        addManualTestCase("", "", 100);
    } else {
        tests.forEach((t, i) => addManualTestCase(t.input || "", t.expected || "", t.points || (100 / tests.length | 0)));
    }
    updateTestCountBadge();
    document.getElementById("test-modal-overlay").classList.add("open");
};

window.closeTestModal = function() {
    document.getElementById("test-modal-overlay").classList.remove("open");
};

window.addManualTestCase = function(inp = "", exp = "", pts = 10) {
    const container = document.getElementById("testcases-list-container");
    const idx = container.children.length + 1;
    const div = document.createElement("div");
    div.className = "test-card-item";
    div.style.cssText = "background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:10px; padding:12px; position:relative;";
    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="color:var(--accent-cyan); font-size:0.85rem; font-family:var(--font-code);">Test #${idx}</strong>
            <div style="display:flex; align-items:center; gap:8px;">
                <label style="font-size:0.75rem; color:var(--text-secondary); margin:0;">Điểm:</label>
                <input type="number" class="test-points-input" value="${pts}" style="width:60px; padding:4px 6px; font-size:0.78rem; text-align:center; border-radius:6px; background:rgba(0,0,0,0.3); border:1px solid var(--border-color); color:var(--text-bright);">
                <button type="button" class="btn-icon danger" onclick="this.closest('.test-card-item').remove(); updateTestCountBadge();" style="padding:3px 7px;"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
                <label style="font-size:0.72rem; color:var(--text-secondary); display:block; margin-bottom:4px; font-weight:600;">INPUT (Đầu vào)</label>
                <textarea class="test-input-area" placeholder="1 2..." style="width:100%; min-height:70px; font-family:var(--font-code); font-size:0.78rem; background:#040814; color:#f1f5f9; box-sizing:border-box; border-radius:6px; border:1px solid var(--border-color); padding:6px 8px;">${escapeHtml(inp)}</textarea>
            </div>
            <div>
                <label style="font-size:0.72rem; color:var(--text-secondary); display:block; margin-bottom:4px; font-weight:600;">EXPECTED OUTPUT (Đầu ra mong muốn)</label>
                <textarea class="test-expected-area" placeholder="3..." style="width:100%; min-height:70px; font-family:var(--font-code); font-size:0.78rem; background:#040814; color:#f1f5f9; box-sizing:border-box; border-radius:6px; border:1px solid var(--border-color); padding:6px 8px;">${escapeHtml(exp)}</textarea>
            </div>
        </div>
    `;
    container.appendChild(div);
    updateTestCountBadge();
};

document.getElementById("btn-add-manual-test")?.addEventListener("click", () => addManualTestCase("", "", 10));

function updateTestCountBadge() {
    const cnt = document.querySelectorAll(".test-card-item").length;
    const badge = document.getElementById("test-count-badge");
    if (badge) badge.textContent = `${cnt} test cases`;
}

document.getElementById("btn-save-all-tests")?.addEventListener("click", async () => {
    const probId = document.getElementById("test-mgr-prob-id").value;
    if (!probId) return;
    const cards = document.querySelectorAll(".test-card-item");
    const tests = [];
    cards.forEach(c => {
        const inp = c.querySelector(".test-input-area").value;
        const exp = c.querySelector(".test-expected-area").value;
        const pts = parseInt(c.querySelector(".test-points-input").value || "10");
        tests.push({ input: inp, expected: exp, points: pts });
    });
    
    const res = await request(`/api/admin/problems/${probId}/tests`, {
        method: "PUT",
        body: JSON.stringify({ tests })
    });
    
    if (res.ok) {
        showAlert(`Đã lưu thành công ${tests.length} test cases!`, "info");
        closeTestModal();
        loadProblems();
    } else {
        const j = await res.json();
        showAlert(j.detail || "Không thể lưu test cases.", "danger");
    }
});

// ── AI CODE-DRIVEN TEST GENERATOR ───────────────────────────────────────────
document.getElementById("btn-open-ai-gen")?.addEventListener("click", () => {
    document.getElementById("ai-generated-preview").style.display = "none";
    document.getElementById("ai-testgen-status").textContent = "";
    if (!document.getElementById("ai-solution-code").value.trim()) {
        document.getElementById("ai-solution-code").value = `#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    if (cin >> a >> b) {\n        cout << (a + b) << endl;\n    }\n    return 0;\n}`;
    }
    document.getElementById("ai-test-modal-overlay").classList.add("open");
});

window.closeAITestModal = function() {
    document.getElementById("ai-test-modal-overlay").classList.remove("open");
};

document.getElementById("btn-run-ai-testgen")?.addEventListener("click", async () => {
    const code = document.getElementById("ai-solution-code").value.trim();
    if (!code) {
        showAlert("Vui lòng dán mã nguồn giải thuật toán (Solution Code).", "danger");
        return;
    }
    const lang = document.getElementById("ai-test-lang").value;
    const count = parseInt(document.getElementById("ai-test-count").value || "5");
    const statement = currentProblem ? currentProblem.statement : "";
    
    const statusLbl = document.getElementById("ai-testgen-status");
    statusLbl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI đang phân tích logic & chạy Sandbox...';
    
    const res = await request("/api/admin/ai/generate-tests-from-code", {
        method: "POST",
        body: JSON.stringify({ statement, solution_code: code, language: lang, count })
    });
    
    const data = await res.json();
    if (!res.ok) {
        statusLbl.textContent = "";
        showAlert(data.detail || "Không thể sinh test bằng AI.", "danger");
        return;
    }
    
    latestAITests = data.tests || [];
    statusLbl.innerHTML = `<span style="color:#22c55e;"><i class="fa-solid fa-check"></i> Đã sinh ${latestAITests.length} tests thành công!</span>`;
    
    const tbody = document.getElementById("ai-tests-preview-tbody");
    tbody.innerHTML = latestAITests.map((t, idx) => `
        <tr>
            <td style="font-weight:700; color:var(--accent-cyan); font-family:var(--font-code);">${idx + 1}</td>
            <td><pre style="margin:0; font-family:var(--font-code); font-size:0.75rem; max-height:60px; overflow:auto;">${escapeHtml(t.input)}</pre></td>
            <td><pre style="margin:0; font-family:var(--font-code); font-size:0.75rem; max-height:60px; overflow:auto; color:#4ade80;">${escapeHtml(t.expected)}</pre></td>
            <td style="text-align:center; font-family:var(--font-code); font-size:0.75rem; color:var(--text-secondary);">${t.execution_time_ms ? t.execution_time_ms.toFixed(1) + 'ms' : '0ms'}</td>
        </tr>
    `).join("");
    
    document.getElementById("ai-generated-preview").style.display = "block";
});

document.getElementById("btn-apply-ai-tests")?.addEventListener("click", () => {
    if (!latestAITests.length) return;
    const container = document.getElementById("testcases-list-container");
    container.innerHTML = "";
    const ptsEach = (100 / latestAITests.length) | 0;
    latestAITests.forEach(t => addManualTestCase(t.input, t.expected, t.points || ptsEach));
    closeAITestModal();
    showAlert(`Đã nạp ${latestAITests.length} testcases vào form. Hãy nhấn 'Lưu Toàn Bộ Tests' để cập nhật vào cơ sở dữ liệu!`, "info");
});

// BOOT
checkAuthAndLoad();
