// ==========================================================================
// LOCAL CP STUDIO — STANDALONE ADMIN GITHUB BACKUP & AUTO PUSH JS
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
            alert("Bạn không có quyền truy cập trang Sao lưu GitHub.");
            window.location.href = "index.html";
            return;
        }
        document.getElementById("user-display").innerHTML = `<i class="fa-solid fa-user-shield"></i> ${escapeHtml(user.username)} (${role.toUpperCase()})`;
        document.getElementById("admin-login-overlay")?.classList.remove("open");
        loadGitHubData();
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

// ── GITHUB DATA & CONFIG ───────────────────────────────────────────────────
async function loadGitHubData() {
    try {
        const [configRes, statusRes] = await Promise.all([
            request("/api/admin/github"),
            request("/api/admin/github/status")
        ]);
        
        if (configRes.ok) {
            const cfg = await configRes.json();
            document.getElementById("github-auto-push").checked = !!cfg.github_auto_push;
            document.getElementById("github-push-trigger-count").value = cfg.github_push_trigger_count ?? 0;
            document.getElementById("backup-time-1").value = cfg.backup_time_1 || "02:00";
            document.getElementById("backup-time-2").value = cfg.backup_time_2 || "14:00";
            document.getElementById("backup-time-3").value = cfg.backup_time_3 || "20:00";
            document.getElementById("custom-commit-prefix").value = cfg.custom_commit_prefix || "Auto CP Studio Sync";
            
            if (cfg.github_repo_url) {
                document.getElementById("github-repo-url").textContent = cfg.github_repo_url;
            }
        }

        if (statusRes.ok) {
            const st = await statusRes.json();
            document.getElementById("git-stat-branch").textContent = st.branch || "main";
            document.getElementById("git-stat-uncommitted").textContent = `${st.uncommitted_count || 0} file(s)`;
            
            if (st.origin_url) {
                document.getElementById("github-repo-url").textContent = st.origin_url;
            }

            const lastPush = st.last_push_time ? new Date(st.last_push_time).toLocaleString("vi-VN") : "Chưa thực hiện";
            document.getElementById("git-stat-lastpush").textContent = lastPush;

            renderHistory(st.history || []);
        }
    } catch (err) {
        console.error("Lỗi khi tải dữ liệu GitHub:", err);
    }
}

function renderHistory(history) {
    const tbody = document.getElementById("github-history-tbody");
    if (!tbody) return;
    
    if (!history || !history.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--text-secondary);">Chưa có lịch sử push. Hãy nhấn "Push ngay" để thực hiện lần sao lưu đầu tiên!</td></tr>';
        return;
    }

    tbody.innerHTML = history.map(h => {
        let statusBadge = `<span style="color:#22c55e; font-weight:700;"><i class="fa-solid fa-circle-check"></i> THÀNH CÔNG</span>`;
        if (h.status === "FAILED") {
            statusBadge = `<span style="color:#ef4444; font-weight:700;"><i class="fa-solid fa-circle-xmark"></i> THẤT BẠI</span>`;
        } else if (h.status === "NO_CHANGES") {
            statusBadge = `<span style="color:#3b82f6; font-weight:700;"><i class="fa-solid fa-minus"></i> KHÔNG THAY ĐỔI</span>`;
        }
        return `
            <tr>
                <td style="font-family:var(--font-code); font-size:0.8rem; color:var(--text-secondary);">${escapeHtml(h.timestamp)}</td>
                <td style="font-weight:600; color:var(--text-bright);">${escapeHtml(h.message)}</td>
                <td style="text-align:center;">${statusBadge}</td>
                <td style="font-family:var(--font-code); font-size:0.75rem; color:var(--text-secondary); max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(h.detail || h.output || '')}">
                    ${escapeHtml(h.detail || h.output || 'OK')}
                </td>
            </tr>
        `;
    }).join("");
}

// SAVE CONFIG FORM
document.getElementById("github-backup-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const payload = {
        auto_push: document.getElementById("github-auto-push").checked,
        trigger_count: parseInt(document.getElementById("github-push-trigger-count").value || "0"),
        backup_time_1: document.getElementById("backup-time-1").value || "02:00",
        backup_time_2: document.getElementById("backup-time-2").value || "14:00",
        backup_time_3: document.getElementById("backup-time-3").value || "20:00",
        custom_commit_prefix: document.getElementById("custom-commit-prefix").value.trim()
    };

    const res = await request("/api/admin/github", {
        method: "PUT",
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        showAlert("Đã lưu lịch và cấu hình sao lưu GitHub thành công!", "info");
        loadGitHubData();
    } else {
        const j = await res.json();
        showAlert(j.detail || "Không thể lưu cấu hình GitHub.", "danger");
    }
});

// INSTANT PUSH BUTTON
document.getElementById("btn-push-now")?.addEventListener("click", async () => {
    const btn = document.getElementById("btn-push-now");
    const prefix = document.getElementById("custom-commit-prefix").value.trim() || "Backup CP Studio";
    const customMsg = prompt("Nhập lời nhắn Commit (Message) cho lần Push này:", `${prefix} - ${new Date().toLocaleString('vi-VN')}`);
    if (customMsg === null) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang Push mã nguồn lên GitHub...';

    try {
        const res = await request("/api/admin/github/push", {
            method: "POST",
            body: JSON.stringify({ commit_message: customMsg.trim() || undefined })
        });
        const data = await res.json();
        if (data.success) {
            showAlert(data.message || "Đã push mã nguồn lên GitHub thành công!", "info");
        } else {
            showAlert(data.message || "Push thất bại. Vui lòng kiểm tra Git Credentials / SSH.", "danger");
        }
    } catch (err) {
        showAlert("Có lỗi xảy ra khi push mã nguồn.", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Push ngay';
        loadGitHubData();
    }
});

// TEST CONNECTION BUTTON
document.getElementById("btn-test-conn")?.addEventListener("click", async () => {
    const btn = document.getElementById("btn-test-conn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang test...';

    try {
        const res = await request("/api/admin/github/test-connection", { method: "POST" });
        const data = await res.json();
        if (data.success) {
            alert(`✅ ${data.message}`);
        } else {
            alert(`❌ ${data.message}`);
        }
    } catch {
        alert("Lỗi kết nối kiểm tra remote.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-network-wired"></i> Kiểm tra Kết nối Remote';
    }
});

document.getElementById("btn-refresh-history")?.addEventListener("click", loadGitHubData);

// BOOT
checkAuthAndLoad();
