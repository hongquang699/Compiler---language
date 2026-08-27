// ==========================================================================
// LOCAL CP STUDIO — STANDALONE ADMIN PROBLEMS & AI TESTCASES JS
// ==========================================================================

const API_BASE = window.location.origin;

function getAuthToken() {
    return localStorage.getItem("local_cp_token") || localStorage.getItem("token") || sessionStorage.getItem("local_cp_token") || "";
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
        showLoginModal("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
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
        alertBox.className = "admin-alert-bar";
        document.querySelector(".page-content")?.prepend(alertBox);
    }
    alertBox.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${message}`;
    alertBox.style.display = "flex";
    alertBox.hidden = false;
    setTimeout(() => { alertBox.style.display = "none"; alertBox.hidden = true; }, 5000);
}

function showLoginModal(errorMsg = "") {
    document.getElementById("admin-login-overlay")?.classList.add("open");
    const msgEl = document.getElementById("admin-login-msg");
    if (msgEl) {
        if (errorMsg) {
            msgEl.textContent = errorMsg;
            msgEl.hidden = false;
        } else {
            msgEl.hidden = true;
        }
    }
}

function hideLoginModal() {
    document.getElementById("admin-login-overlay")?.classList.remove("open");
}

// ── AUTH CHECK ─────────────────────────────────────────────────────────────
async function checkAuthAndLoad() {
    const token = getAuthToken();
    if (!token) {
        showLoginModal();
        return;
    }
    try {
        const res = await request("/api/auth/me");
        if (!res.ok) {
            showLoginModal("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
            return;
        }
        const resData = await res.json();
        const user = resData.user || resData;
        if (!user || !user.username) {
            showLoginModal("Không thể tải thông tin tài khoản. Vui lòng đăng nhập lại.");
            return;
        }

        const role = (user.role || (user.is_admin ? "admin" : "user")).toLowerCase();
        const isAuthorized = user.is_admin || ["admin", "superadmin", "dev"].includes(role);
        if (!isAuthorized) {
            showLoginModal(`Tài khoản '${user.username}' không có quyền Quản trị (yêu cầu ADMIN, SUPERADMIN hoặc DEV).`);
            return;
        }

        currentUser = user;
        hideLoginModal();
        const userDisp = document.getElementById("user-display");
        if (userDisp) {
            userDisp.innerHTML = `<i class="fa-solid fa-user-shield"></i> ${escapeHtml(user.username)} (${role.toUpperCase()})`;
        }
        const storageLink = document.getElementById("nav-storage-link");
        if (storageLink) {
            storageLink.style.display = (role === "dev") ? "inline-flex" : "none";
        }
        loadProblems();
    } catch (e) {
        showLoginModal("Lỗi kết nối máy chủ: " + e.message);
    }
}

document.getElementById("admin-login-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const login = document.getElementById("admin-login-user").value.trim();
    const pass = document.getElementById("admin-login-pass").value;
    const msg = document.getElementById("admin-login-msg");
    const submitBtn = e.target.querySelector("button[type='submit']");
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xác thực...';
    }
    if (msg) msg.hidden = true;

    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: login, login: login, password: pass, remember: true })
        });
        const data = await res.json();
        if (res.ok && data.token) {
            localStorage.setItem("local_cp_token", data.token);
            localStorage.setItem("token", data.token);
            if (msg) msg.hidden = true;
            await checkAuthAndLoad();
        } else {
            let errMsg = "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.";
            if (typeof data.detail === "string") errMsg = data.detail;
            else if (data.message) errMsg = data.message;
            if (msg) {
                msg.textContent = errMsg;
                msg.hidden = false;
            }
        }
    } catch (err) {
        if (msg) {
            msg.textContent = "Lỗi kết nối máy chủ: " + err.message;
            msg.hidden = false;
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Đăng nhập';
        }
    }
});

// ── PROBLEMS BANK CRUD ──────────────────────────────────────────────────────
let allProblems = [];
let currentProblem = null;
let selectedProbIds = new Set();

async function loadProblems() {
    const res = await request("/api/admin/problems");
    if (!res.ok) return;
    allProblems = await res.json();
    populateProblemContestFilter();
    renderProblems();
}

function populateProblemContestFilter() {
    const sel = document.getElementById("problem-contest-filter");
    if (!sel) return;
    const currentVal = sel.value || "all";
    const contests = new Map();
    allProblems.forEach(p => {
        if (p.contest_title) {
            contests.set(p.competition_id || p.contest_title, p.contest_title);
        }
    });
    let html = '<option value="all">Tất cả Cuộc thi / Kho</option>';
    contests.forEach((title, id) => {
        html += `<option value="${id}">${escapeHtml(title)}</option>`;
    });
    sel.innerHTML = html;
    sel.value = currentVal;
}

function renderProblems() {
    const q = (document.getElementById("problem-search")?.value || "").trim().toLowerCase();
    const statusFilter = document.getElementById("problem-status-filter")?.value || "all";
    const contestFilter = document.getElementById("problem-contest-filter")?.value || "all";
    const tbody = document.getElementById("problems-tbody");
    if (!tbody) return;

    // Calculate metric stats
    const totalCount = allProblems.length;
    const hiddenCount = allProblems.filter(p => p.is_hidden).length;
    const activeCount = totalCount - hiddenCount;
    let totalTests = 0;
    allProblems.forEach(p => { totalTests += (p.test_count || 0); });

    const elTotal = document.getElementById("prob-stat-total");
    const elActive = document.getElementById("prob-stat-active");
    const elHidden = document.getElementById("prob-stat-hidden");
    const elTests = document.getElementById("prob-stat-tests");
    if (elTotal) elTotal.textContent = totalCount.toLocaleString("vi-VN");
    if (elActive) elActive.textContent = activeCount.toLocaleString("vi-VN");
    if (elHidden) elHidden.textContent = hiddenCount.toLocaleString("vi-VN");
    if (elTests) elTests.textContent = totalTests.toLocaleString("vi-VN");

    const filtered = allProblems.filter(p => {
        const isHidden = Boolean(p.is_hidden);
        if (statusFilter === "active" && isHidden) return false;
        if (statusFilter === "hidden" && !isHidden) return false;

        if (contestFilter !== "all") {
            if (String(p.competition_id) !== String(contestFilter) && String(p.contest_title) !== String(contestFilter)) {
                return false;
            }
        }

        if (q) {
            const title = (p.title || "").toLowerCase();
            const code = (p.code || "").toLowerCase();
            const contest = (p.contest_title || "").toLowerCase();
            if (!title.includes(q) && !code.includes(q) && !contest.includes(q)) return false;
        }
        return true;
    });

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:35px; color:var(--text-secondary);"><i class="fa-solid fa-magnifying-glass" style="font-size:1.4rem; color:#64748b; margin-bottom:8px; display:block;"></i> Không tìm thấy bài tập nào khớp với bộ lọc.</td></tr>';
        updateSelectedCount();
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const isHidden = Boolean(p.is_hidden);
        const isChecked = selectedProbIds.has(p.id);
        const statusBadge = isHidden 
            ? '<span style="display:inline-flex; align-items:center; gap:6px; background:rgba(245,158,11,0.14); color:#fbbf24; border:1px solid rgba(245,158,11,0.35); font-size:0.75rem; font-weight:700; padding:4px 10px; border-radius:20px;"><i class="fa-solid fa-eye-slash" style="font-size:0.7rem;"></i> TẠM ẨN</span>'
            : '<span style="display:inline-flex; align-items:center; gap:6px; background:rgba(52,211,153,0.14); color:#34d399; border:1px solid rgba(52,211,153,0.35); font-size:0.75rem; font-weight:700; padding:4px 10px; border-radius:20px; box-shadow:0 0 10px rgba(52,211,153,0.15);"><i class="fa-solid fa-circle" style="font-size:0.45rem; color:#34d399;"></i> HIỂN THỊ</span>';

        const toggleBtnIcon = isHidden ? "fa-solid fa-eye" : "fa-solid fa-eye-slash";
        const toggleBtnTitle = isHidden ? "Mở hiển thị bài tập cho thí sinh" : "Tạm ẩn bài tập không cho thí sinh thấy";
        const toggleBtnStyle = isHidden ? "color:#34d399; border-color:rgba(52,211,153,0.35); background:rgba(52,211,153,0.08);" : "color:#fbbf24; border-color:rgba(245,158,11,0.35); background:rgba(245,158,11,0.08);";

        return `
            <tr style="${isHidden ? 'opacity:0.8; background:rgba(245,158,11,0.02);' : ''}">
                <td style="text-align:center;">
                    <input type="checkbox" class="prob-row-cb" data-id="${p.id}" ${isChecked ? 'checked' : ''} onchange="toggleProbSelect(${p.id}, this.checked)" style="cursor:pointer; transform:scale(1.2);">
                </td>
                <td><span class="prob-code-badge">${escapeHtml(p.code || 'A')}</span></td>
                <td>
                    <div style="font-weight:700; color:#f8fafc; font-size:0.94rem; margin-bottom:3px; display:flex; align-items:center; gap:8px;">
                        ${escapeHtml(p.title || 'Không tiêu đề')}
                    </div>
                    <div style="color:#94a3b8; font-size:0.78rem; line-height:1.4; max-width:480px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(p.statement || '').slice(0, 85)}...</div>
                </td>
                <td>
                    <span style="display:inline-flex; align-items:center; gap:6px; font-size:0.8rem; color:#cbd5e1; background:rgba(255,255,255,0.04); padding:4px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
                        <i class="fa-solid fa-flag-checkered" style="font-size:0.75rem; color:#38bdf8;"></i> ${escapeHtml(p.contest_title || 'Kho tự do')}
                    </span>
                </td>
                <td style="text-align:center;">${statusBadge}</td>
                <td style="text-align:center; font-family:var(--font-code); font-size:0.8rem;">
                    <span style="color:#38bdf8; font-weight:700; font-size:0.85rem;">${p.points ?? 100}p</span> · <span style="color:#94a3b8;">${p.time_limit ?? 1.0}s / ${p.memory_limit ?? 256}M</span>
                </td>
                <td style="text-align:center;">
                    <span style="background:rgba(168,85,247,0.12); color:#c084fc; border:1px solid rgba(168,85,247,0.3); font-weight:700; font-size:0.78rem; padding:3px 9px; border-radius:20px; font-family:var(--font-code);">
                        ${p.test_count ?? 0} tests
                    </span>
                </td>
                <td style="text-align:right; white-space:nowrap;">
                    <button class="btn-action-pill" style="${toggleBtnStyle}" onclick="toggleProblemVisibility(${p.id})" title="${toggleBtnTitle}"><i class="${toggleBtnIcon}"></i> ${isHidden ? 'Hiện' : 'Ẩn'}</button>
                    <button class="btn-action-pill" style="color:#38bdf8; border-color:rgba(56,189,248,0.35); background:rgba(56,189,248,0.08);" onclick="openViewTestCasesModal('${p.code || p.id}')" title="Xem chi tiết bộ Test Cases"><i class="fa-solid fa-vial-circle-check"></i> Tests (${p.test_count ?? 0})</button>
                    <button class="btn-action-pill" style="color:#cbd5e1;" onclick="openEditProblemModal(${p.id})" title="Chỉnh sửa Đề bài"><i class="fa-solid fa-pen"></i> Sửa</button>
                    <button class="btn-action-pill" style="color:#c084fc; border-color:rgba(168,85,247,0.35); background:rgba(168,85,247,0.08);" onclick="openTestModal(${p.id})" title="Quản lý / AI sinh Testcases"><i class="fa-solid fa-wand-magic-sparkles"></i> Sửa Tests</button>
                    <button class="btn-action-pill" style="color:#fb7185; border-color:rgba(251,113,133,0.35); background:rgba(251,113,133,0.08);" onclick="deleteProblem(${p.id})" title="Xóa Bài tập"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join("");

    updateSelectedCount();
}

window.toggleProbSelect = function(id, isChecked) {
    if (isChecked) selectedProbIds.add(id);
    else selectedProbIds.delete(id);
    updateSelectedCount();
};

document.getElementById("prob-master-cb")?.addEventListener("change", function() {
    const checked = this.checked;
    document.querySelectorAll(".prob-row-cb").forEach(cb => {
        cb.checked = checked;
        const id = parseInt(cb.getAttribute("data-id"));
        if (checked) selectedProbIds.add(id);
        else selectedProbIds.delete(id);
    });
    updateSelectedCount();
});

function updateSelectedCount() {
    const el = document.getElementById("prob-selected-count-badge");
    if (el) el.innerHTML = `Chọn: <strong style="color:#38bdf8;">${selectedProbIds.size}</strong> bài`;
}

window.toggleProblemVisibility = async function(probId) {
    try {
        const res = await request(`/api/admin/problems/${probId}/toggle-visibility`, { method: "POST" });
        if (!res.ok) throw new Error("Không thể thay đổi trạng thái ẩn/hiện.");
        const data = await res.json();
        
        // Update local object
        const found = allProblems.find(p => p.id === probId);
        if (found) found.is_hidden = data.data.is_hidden;
        
        renderProblems();
        showAlert(`✓ ${data.message}`, "success");
    } catch (err) {
        showAlert(`Lỗi: ${err.message}`, "danger");
    }
};

window.bulkActionProblems = async function(action) {
    if (selectedProbIds.size === 0) {
        showAlert("Vui lòng tích chọn ít nhất 1 bài tập để thực hiện thao tác.", "warning");
        return;
    }
    const actionText = action === "hide" ? "TẠM ẨN" : (action === "unhide" ? "HIỂN THỊ" : "XÓA VĨNH VIỄN");
    if (!confirm(`XÁC NHẬN: Bạn có chắc chắn muốn ${actionText} ${selectedProbIds.size} bài tập đã chọn?`)) return;

    try {
        const res = await request("/api/admin/problems/bulk-action", {
            method: "POST",
            body: JSON.stringify({
                problem_ids: Array.from(selectedProbIds),
                action: action
            })
        });
        if (!res.ok) throw new Error("Thao tác hàng loạt thất bại.");
        const data = await res.json();
        showAlert(`✓ Đã ${actionText.toLowerCase()} thành công ${data.affected} bài tập!`, "success");
        selectedProbIds.clear();
        document.getElementById("prob-master-cb").checked = false;
        loadProblems();
    } catch (err) {
        showAlert(`Lỗi: ${err.message}`, "danger");
    }
};

window.insertStatementTemplate = function(type) {
    const txtArea = document.getElementById("edit-prob-statement");
    if (!txtArea) return;
    let template = "";
    if (type === "io") {
        template = "\n\n### Đầu vào (Input)\n- Dòng 1: Ghi số nguyên `n`\n- Dòng 2: Ghi `n` số nguyên cách nhau bởi dấu cách\n\n### Đầu ra (Output)\n- In ra kết quả bài toán trên một dòng duy nhất.";
    } else if (type === "sample") {
        template = "\n\n### Ví dụ (Example)\n**Ví dụ 1:**\n```\nInput:\n5\n1 2 3 4 5\n\nOutput:\n15\n```\n*Giải thích: 1 + 2 + 3 + 4 + 5 = 15.*";
    } else if (type === "constraints") {
        template = "\n\n### Ràng buộc (Constraints)\n- $1 \\le n \\le 10^5$\n- $-10^9 \\le A_i \\le 10^9$\n- Giới hạn thời gian: `1.0s` | Bộ nhớ: `256MB`";
    }
    txtArea.value += template;
    txtArea.focus();
};

document.getElementById("problem-search")?.addEventListener("input", renderProblems);
document.getElementById("problem-status-filter")?.addEventListener("change", renderProblems);
document.getElementById("problem-contest-filter")?.addEventListener("change", renderProblems);

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
    document.getElementById("edit-prob-hidden").checked = false;
    document.getElementById("problem-modal-title").innerHTML = '<i class="fa-solid fa-plus-circle"></i> Tạo Bài tập mới trong Kho';
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
    document.getElementById("edit-prob-hidden").checked = Boolean(p.is_hidden);
    document.getElementById("problem-modal-title").innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Chỉnh sửa Đề bài: [${escapeHtml(p.code)}] ${escapeHtml(p.title)}`;
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
        competition_id: parseInt(document.getElementById("edit-prob-contest").value || "1"),
        is_hidden: document.getElementById("edit-prob-hidden").checked
    };
    const res = await request(id ? `/api/admin/problems/${id}` : "/api/admin/problems", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(body)
    });
    if (res.ok) {
        showAlert(id ? "✓ Đã cập nhật đề bài thành công!" : "✓ Đã tạo bài tập mới thành công!", "success");
        closeProblemModal();
        loadProblems();
    } else {
        const j = await res.json();
        showAlert(j.detail || "Không thể lưu bài tập.", "danger");
    }
});

window.deleteProblem = async function(probId) {
    const found = allProblems.find(p => p.id === probId);
    const title = found ? `[${found.code}] ${found.title}` : `bài tập #${probId}`;
    if (!confirm(`XÁC NHẬN XÓA: Bạn có chắc chắn muốn xóa vĩnh viễn ${title} cùng toàn bộ test cases liên quan?`)) return;
    const res = await request(`/api/admin/problems/${probId}`, { method: "DELETE" });
    if (res.ok) {
        showAlert("✓ Đã xóa bài tập thành công!", "success");
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
    div.setAttribute("draggable", "true");
    div.style.cssText = "background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:10px; padding:12px; position:relative; cursor:move; transition: all 0.15s ease;";
    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-grip-vertical drag-handle" title="Kéo thả để sắp xếp lại vị trí"></i>
                <strong class="test-title-idx" style="color:var(--accent-cyan); font-size:0.85rem; font-family:var(--font-code);">Test #${idx}</strong>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <label style="font-size:0.75rem; color:var(--text-secondary); margin:0;">Điểm:</label>
                <input type="number" class="test-points-input" value="${pts}" style="width:60px; padding:4px 6px; font-size:0.78rem; text-align:center; border-radius:6px; background:rgba(0,0,0,0.3); border:1px solid var(--border-color); color:var(--text-bright);">
                <button type="button" class="btn-icon danger" onclick="this.closest('.test-card-item').remove(); updateTestCountBadge(); reindexTests();" style="padding:3px 7px;"><i class="fa-solid fa-trash"></i></button>
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

    div.addEventListener("dragstart", (e) => {
        div.classList.add("dragging");
        e.dataTransfer.setData("text/plain", "");
    });

    div.addEventListener("dragend", () => {
        div.classList.remove("dragging");
        reindexTests();
    });

    div.addEventListener("dragover", (e) => {
        e.preventDefault();
        const dragging = container.querySelector(".dragging");
        if (!dragging || dragging === div) return;
        const bounding = div.getBoundingClientRect();
        const offset = e.clientY - bounding.top - (bounding.height / 2);
        if (offset < 0) {
            container.insertBefore(dragging, div);
        } else {
            container.insertBefore(dragging, div.nextSibling);
        }
    });

    container.appendChild(div);
    updateTestCountBadge();
};

window.reindexTests = function() {
    const container = document.getElementById("testcases-list-container");
    if (!container) return;
    Array.from(container.children).forEach((item, idx) => {
        const titleEl = item.querySelector(".test-title-idx");
        if (titleEl) titleEl.textContent = `Test #${idx + 1}`;
    });
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

// ── MOUSE DRAG & WHEEL SCROLL ENGINE (Di nút chuột kéo trang lên/xuống) ──
(function initGlobalDragScroll() {
    let isDragging = false;
    let startY = 0;
    let initialScrollY = 0;
    let activeContainer = null;
    let startContainerY = 0;
    let startContainerScrollY = 0;

    document.addEventListener("mousedown", (e) => {
        if (e.target.closest("button, a, input, select, textarea, .btn-icon, .test-card-item")) return;

        const tableWrap = e.target.closest(".admin-table-wrap, .detail-modal, pre");
        if (tableWrap) {
            activeContainer = tableWrap;
            isDragging = true;
            startContainerY = e.clientY;
            startContainerScrollY = tableWrap.scrollTop;
            tableWrap.style.cursor = "grabbing";
            return;
        }

        isDragging = true;
        activeContainer = null;
        startY = e.clientY;
        initialScrollY = window.scrollY;
        document.body.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        e.preventDefault();

        if (activeContainer) {
            const dy = e.clientY - startContainerY;
            activeContainer.scrollTop = startContainerScrollY - dy;
        } else {
            const dy = e.clientY - startY;
            window.scrollTo(0, initialScrollY - dy);
        }
    });

    const stopDrag = () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = "";
            if (activeContainer) {
                activeContainer.style.cursor = "";
                activeContainer = null;
            }
        }
    };

    document.addEventListener("mouseup", stopDrag);
    document.addEventListener("mouseleave", stopDrag);
})();

// ── TEST CASES INSPECTOR MODAL CONTROLLER ─────────────────────────────────
let inspectorCurrentProblem = null;
let inspectorAllTests = [];

window.openViewTestCasesModal = async function(problemRef) {
    const modal = document.getElementById("view-testcases-modal-overlay");
    if (!modal) return;

    // Reset UI
    document.getElementById("tc-inspector-code").textContent = String(problemRef).toUpperCase();
    document.getElementById("tc-inspector-prob-title").textContent = "Đang tải dữ liệu...";
    document.getElementById("tc-inspector-total-badge").textContent = "...";
    document.getElementById("tc-inspector-showing-count").textContent = "...";
    document.getElementById("tc-inspector-cards-container").innerHTML = `
        <div style="text-align:center; padding: 50px 20px; color: var(--text-secondary);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.8rem; color: #38bdf8; margin-bottom: 12px; display: block;"></i>
            Đang nạp bộ test cases từ máy chủ...
        </div>
    `;
    modal.classList.add("open");

    try {
        const res = await request(`/api/admin/problems/${encodeURIComponent(problemRef)}/tests`);
        if (!res.ok) throw new Error("Không thể tải test cases.");
        const data = await res.json();
        inspectorCurrentProblem = data;
        inspectorAllTests = data.tests || [];

        document.getElementById("tc-inspector-code").textContent = data.code || problemRef;
        document.getElementById("tc-inspector-prob-title").textContent = data.title || "";
        document.getElementById("tc-inspector-total-badge").textContent = `${inspectorAllTests.length} Test Cases`;
        
        renderInspectorTestCards();
    } catch (err) {
        document.getElementById("tc-inspector-cards-container").innerHTML = `
            <div style="text-align:center; padding: 40px 20px; color: #f87171;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.8rem; margin-bottom: 10px; display: block;"></i>
                ${escapeHtml(err.message || "Lỗi nạp test cases")}
            </div>
        `;
    }
};

window.closeTestCasesInspectorModal = function() {
    document.getElementById("view-testcases-modal-overlay")?.classList.remove("open");
};

function renderInspectorTestCards() {
    const container = document.getElementById("tc-inspector-cards-container");
    if (!container) return;

    const q = (document.getElementById("tc-inspector-search")?.value || "").trim().toLowerCase();
    const filter = document.getElementById("tc-inspector-filter")?.value || "all";

    const filtered = inspectorAllTests.filter((t, idx) => {
        const isSample = idx < 2 || t.is_sample;
        if (filter === "samples" && !isSample) return false;
        if (filter === "hidden" && isSample) return false;

        if (q) {
            const inp = String(t.input || "").toLowerCase();
            const exp = String(t.expected || "").toLowerCase();
            const idxStr = String(idx + 1);
            if (!inp.includes(q) && !exp.includes(q) && !idxStr.includes(q)) return false;
        }
        return true;
    });

    const showingEl = document.getElementById("tc-inspector-showing-count");
    if (showingEl) showingEl.textContent = filtered.length;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px 20px; color: var(--text-secondary);">
                <i class="fa-solid fa-magnifying-glass" style="font-size: 1.5rem; margin-bottom: 10px; display: block; color: #64748b;"></i>
                Không tìm thấy test case nào khớp với từ khóa tìm kiếm.
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map((t, i) => {
        const originalIdx = inspectorAllTests.indexOf(t) + 1;
        const isSample = originalIdx <= 2 || t.is_sample;
        const badgeColor = isSample ? "#34d399" : "#a78bfa";
        const badgeBg = isSample ? "rgba(52,211,153,0.15)" : "rgba(167,139,250,0.15)";
        const badgeBorder = isSample ? "rgba(52,211,153,0.3)" : "rgba(167,139,250,0.3)";
        const badgeText = isSample ? "TEST MẪU (SAMPLE)" : `TEST ẨN #${originalIdx}`;

        return `
            <div class="test-card-item" style="background: rgba(15,23,42,0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.25);">
                <!-- Card Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-family: var(--font-code); font-weight: 800; color: #f8fafc; font-size: 0.95rem;">Test #${originalIdx}</span>
                        <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 6px; font-weight: 700; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
                            ${badgeText}
                        </span>
                        <span style="font-size: 0.75rem; color: #fbbf24; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.25); padding: 2px 8px; border-radius: 6px; font-weight: 600;">
                            ${t.points || 3} pts
                        </span>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button type="button" class="btn-icon" onclick="copySingleTestInput('${escapeHtml(encodeURIComponent(t.input || ''))}')" style="padding: 3px 8px; font-size: 0.75rem;" title="Sao chép Input">
                            <i class="fa-solid fa-copy"></i> Copy In
                        </button>
                        <button type="button" class="btn-icon" onclick="copySingleTestExpected('${escapeHtml(encodeURIComponent(t.expected || ''))}')" style="padding: 3px 8px; font-size: 0.75rem;" title="Sao chép Expected Output">
                            <i class="fa-solid fa-copy"></i> Copy Out
                        </button>
                    </div>
                </div>

                <!-- Input & Output Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; display: flex; justify-content: space-between;">
                            <span><i class="fa-solid fa-arrow-right-to-bracket" style="color: #38bdf8;"></i> Input Data</span>
                            <span style="font-family: var(--font-code); color: #64748b;">${(t.input || '').length} chars</span>
                        </div>
                        <pre style="margin: 0; background: #030712; color: #38bdf8; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px 12px; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.8rem; max-height: 140px; overflow: auto; white-space: pre-wrap; word-break: break-all;">${escapeHtml(t.input || '(Trống)')}</pre>
                    </div>
                    <div>
                        <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; display: flex; justify-content: space-between;">
                            <span><i class="fa-solid fa-arrow-right-from-bracket" style="color: #34d399;"></i> Expected Output</span>
                            <span style="font-family: var(--font-code); color: #64748b;">${(t.expected || '').length} chars</span>
                        </div>
                        <pre style="margin: 0; background: #030712; color: #34d399; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px 12px; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.8rem; max-height: 140px; overflow: auto; white-space: pre-wrap; word-break: break-all;">${escapeHtml(t.expected || '(Trống)')}</pre>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

window.copyAllTestCasesJSON = function() {
    if (!inspectorAllTests.length) {
        showAlert("Không có test case nào để sao chép.", "warning");
        return;
    }
    const jsonStr = JSON.stringify(inspectorAllTests, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
        showAlert(`✓ Đã sao chép toàn bộ ${inspectorAllTests.length} test cases (JSON) vào clipboard!`, "success");
    }).catch(() => {
        showAlert("Không thể truy cập Clipboard.", "danger");
    });
};

window.copySingleTestInput = function(encodedInp) {
    const raw = decodeURIComponent(encodedInp);
    navigator.clipboard.writeText(raw).then(() => {
        showAlert("✓ Đã sao chép Input!", "success");
    });
};

window.copySingleTestExpected = function(encodedExp) {
    const raw = decodeURIComponent(encodedExp);
    navigator.clipboard.writeText(raw).then(() => {
        showAlert("✓ Đã sao chép Expected Output!", "success");
    });
};

document.getElementById("tc-inspector-search")?.addEventListener("input", renderInspectorTestCards);
document.getElementById("tc-inspector-filter")?.addEventListener("change", renderInspectorTestCards);

// BOOT
checkAuthAndLoad();
