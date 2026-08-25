// ==========================================================================
// LOCAL CP — ClueOJ Multi-Role Admin Console Engine v9.0
// ==========================================================================

const getToken = () => localStorage.getItem("local_cp_token") || "";
const headers = () => {
    const h = { "Content-Type": "application/json" };
    const t = getToken();
    if (t) h.Authorization = `Bearer ${t}`;
    return h;
};
const request = (url, options = {}) => fetch(url, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
const escapeHtml = v => String(v ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
const alertBox = document.getElementById("admin-alert");
const showAlert = (msg, type = "info") => {
    alertBox.textContent = msg;
    alertBox.style.borderLeft = type === "danger" ? "4px solid #f87171" : "4px solid var(--accent-cyan)";
    alertBox.hidden = false;
    setTimeout(() => { alertBox.hidden = true; }, 5000);
};

const views = {
    overview: "Tổng quan hệ thống",
    contests: "Quản lý Cuộc thi ClueOJ",
    problems: "Kho Bài tập & Quản lý Testcases",
    members: "Thành viên & Tài khoản",
    security: "Bảo mật & Kiểm soát IP",
    monitoring: "Giám sát Máy chấm",
    system: "Cấu hình & Hệ thống"
};

let currentUser = null;

function roleBadge(role, isAdmin) {
    const r = (role || "").toLowerCase();
    if (r === "dev") return '<span class="badge dev"><i class="fa-solid fa-code"></i> DEV</span>';
    if (r === "superadmin") return '<span class="badge superadmin"><i class="fa-solid fa-crown"></i> SUPERADMIN</span>';
    if (r === "admin" || isAdmin) return '<span class="badge admin"><i class="fa-solid fa-user-shield"></i> ADMIN</span>';
    return '<span class="badge user"><i class="fa-solid fa-user"></i> USER</span>';
}

function userLevel(user) {
    if (!user) return 1;
    const map = { guest: 1, user: 2, member: 2, contestant: 3, uploader: 4, translator: 5, moderator: 6, admin: 7, superadmin: 8, dev: 9 };
    const r = (user.role || "user").toLowerCase();
    return map[r] ?? (user.is_admin ? 7 : 2);
}

// ── ROLE PARTITIONING LAYOUT ENGINE ─────────────────────────────────────────
function applyRoleLayout(user) {
    const level = userLevel(user);
    const role = (user.role || (user.is_admin ? "admin" : "user")).toLowerCase();
    const banner = document.getElementById("role-banner");
    const bannerTitle = document.getElementById("role-banner-title");
    const bannerDesc = document.getElementById("role-banner-desc");
    const bannerTag = document.getElementById("role-banner-tag");
    const topbarKicker = document.getElementById("topbar-role-kicker");
    const sidebarKicker = document.getElementById("sidebar-kicker");

    banner.className = `role-banner ${role === 'dev' ? 'dev' : role === 'superadmin' ? 'superadmin' : 'admin'}`;

    if (level >= 9 || role === "dev") {
        // ── 1. DEV MASTER WORKSPACE ──
        sidebarKicker.textContent = "CLUEOJ DEV MASTER";
        topbarKicker.textContent = "DEV MASTER CONSOLE v9.0";
        bannerTitle.innerHTML = '💻 DEV MASTER WORKSPACE <span style="font-size:0.75rem; background:rgba(168,85,247,.3); padding:2px 8px; border-radius:6px; margin-left:6px; font-weight:700;">ROOT ACCESS</span>';
        bannerDesc.textContent = "Toàn quyền điều khiển: Giám sát 5 Máy chấm Judge, Cấu hình Mô hình AI, Nhật ký Bảo mật & Quản trị Hệ thống.";
        bannerTag.innerHTML = roleBadge("dev", true);

        showNavButtons(["overview", "contests", "problems", "github", "members", "security", "monitoring", "system"]);
        showElements(["card-stat-blocked", "card-role-breakdown", "card-ai-model-overview", "btn-quick-model-switch", "card-system-model-config", "card-github-backup", "reset-system"]);
        document.getElementById("members-panel-title").textContent = "Thành viên & Quản lý Toàn quyền";
        document.getElementById("members-panel-desc").textContent = "Phân quyền vai trò, Khóa/Mở khóa và Xóa tài khoản vĩnh viễn (Chế độ Dev Master).";
    } else if (level === 8 || role === "superadmin") {
        // ── 2. SUPERADMIN CONTROL CENTER ──
        sidebarKicker.textContent = "SUPERADMIN CONTROL";
        topbarKicker.textContent = "SUPERADMIN CONTROL CENTER";
        bannerTitle.innerHTML = '👑 SUPERADMIN CONTROL CENTER <span style="font-size:0.75rem; background:rgba(236,72,153,.3); padding:2px 8px; border-radius:6px; margin-left:6px; font-weight:700;">MANAGEMENT</span>';
        bannerDesc.textContent = "Không gian Tổng Quản trị: Quản lý Cuộc thi, Phân quyền Thí sinh, Khóa tài khoản & Kiểm soát An ninh IP.";
        bannerTag.innerHTML = roleBadge("superadmin", true);

        showNavButtons(["overview", "contests", "problems", "github", "members", "security", "system"]);
        showElements(["card-stat-blocked", "card-role-breakdown"]);
        hideElements(["btn-quick-model-switch", "card-system-model-config", "card-github-backup", "reset-system"]);
        document.getElementById("members-panel-title").textContent = "Quản lý Thành viên & Phân quyền";
        document.getElementById("members-panel-desc").textContent = "Đổi vai trò thành viên, Khóa/Mở khóa và quản lý địa chỉ IP thí sinh.";
    } else {
        // ── 3. ADMIN WORKSPACE ──
        sidebarKicker.textContent = "ADMIN WORKSPACE";
        topbarKicker.textContent = "CLUEOJ ADMIN WORKSPACE";
        bannerTitle.innerHTML = '🛡️ ADMIN WORKSPACE <span style="font-size:0.75rem; background:rgba(34,211,238,.25); padding:2px 8px; border-radius:6px; margin-left:6px; font-weight:700;">CONTEST &amp; PROBLEMS</span>';
        bannerDesc.textContent = "Không gian Ban Chuyên môn: Tạo Cuộc thi ClueOJ, Nạp bài tập (init.yml), AI sinh testcase & Theo dõi thí sinh.";
        bannerTag.innerHTML = roleBadge("admin", true);

        showNavButtons(["overview", "contests", "problems", "github", "members"]);
        document.getElementById("members-panel-title").textContent = "Danh sách Thí sinh";
        document.getElementById("members-panel-desc").textContent = "Xem danh sách thí sinh và số bài đã nộp (Chế độ Giám thị - Chỉ xem).";

        hideElements(["card-stat-blocked", "card-role-breakdown", "btn-quick-model-switch", "card-system-model-config", "card-github-backup", "reset-system"]);
    }
}

function showNavButtons(viewNames) {
    document.querySelectorAll(".admin-nav").forEach(btn => {
        const view = btn.dataset.view;
        btn.style.display = viewNames.includes(view) ? "flex" : "none";
    });
}

function showElements(ids) {
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ""; });
}

function hideElements(ids) {
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = "none"; });
}

// ── AUTHENTICATION & LOGIN ────────────────────────────────────────────────
async function checkAuthAndLoad() {
    const t = getToken();
    if (!t) {
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

        const level = userLevel(user);
        if (level < 7) {
            showLoginModal("Tài khoản '" + user.username + "' không có quyền Quản trị (yêu cầu Admin, SuperAdmin hoặc Dev).");
            return;
        }

        currentUser = user;
        hideLoginModal();
        document.getElementById("sidebar-username").textContent = user.username;
        document.getElementById("sidebar-role-badge").innerHTML = roleBadge(user.role, user.is_admin);
        document.getElementById("admin-user").innerHTML = `${roleBadge(user.role, user.is_admin)} &nbsp;<b>${escapeHtml(user.username)}</b>`;
        
        applyRoleLayout(user);
        if (level >= 9) await loadGitHubConfig();
        await loadOverview();
    } catch (err) {
        showLoginModal("Lỗi kết nối máy chủ: " + err.message);
    }
}

function showLoginModal(errorMsg = "") {
    document.getElementById("admin-login-overlay").classList.add("open");
    const msgEl = document.getElementById("admin-login-msg");
    if (errorMsg) {
        msgEl.textContent = errorMsg;
        msgEl.hidden = false;
    } else {
        msgEl.hidden = true;
    }
}

function hideLoginModal() {
    document.getElementById("admin-login-overlay").classList.remove("open");
}

async function loadGitHubConfig() {
    try {
        const [configRes, statusRes] = await Promise.all([
            request("/api/admin/github"),
            request("/api/admin/github/status")
        ]);

        if (configRes.ok) {
            const config = await configRes.json();
            const setVal = (id, val, isCheck = false) => {
                const el = document.getElementById(id);
                if (!el) return;
                if (isCheck) el.checked = !!val;
                else el.value = val ?? "";
            };
            setVal("github-auto-push", config.github_auto_push, true);
            setVal("console-github-auto-push", config.github_auto_push, true);
            setVal("github-trigger-count", config.github_push_trigger_count);
            setVal("console-github-trigger-count", config.github_push_trigger_count);
            setVal("github-time-1", config.backup_time_1);
            setVal("console-github-time-1", config.backup_time_1);
            setVal("github-time-2", config.backup_time_2);
            setVal("console-github-time-2", config.backup_time_2);
            setVal("github-time-3", config.backup_time_3);
            setVal("console-github-time-3", config.backup_time_3);
            setVal("console-custom-prefix", config.custom_commit_prefix || "Auto CP Studio Sync");

            const repoUrl = config.github_repo_url || "https://github.com/hongquang699/Compiler---language.git";
            const repoEl = document.getElementById("github-repo-status");
            if (repoEl) repoEl.textContent = repoUrl ? `Remote: ${repoUrl}` : "Chưa cấu hình remote origin.";
            const repoEl2 = document.getElementById("console-github-repo-url");
            if (repoEl2) repoEl2.textContent = repoUrl;
        }

        if (statusRes.ok) {
            const st = await statusRes.json();
            const branchEl = document.getElementById("console-git-branch");
            if (branchEl) branchEl.textContent = st.branch || "main";
            const uncommEl = document.getElementById("console-git-uncommitted");
            if (uncommEl) uncommEl.textContent = `${st.uncommitted_count || 0} file(s)`;
            const lastPushEl = document.getElementById("console-git-lastpush");
            if (lastPushEl) lastPushEl.textContent = st.last_push_time ? new Date(st.last_push_time).toLocaleString("vi-VN") : "Chưa thực hiện";

            renderConsoleHistory(st.history || []);
        }
    } catch (e) {
        console.error("Lỗi tải thông tin GitHub:", e);
    }
}

function renderConsoleHistory(history) {
    const tbody = document.getElementById("console-github-history-tbody");
    if (!tbody) return;
    if (!history || !history.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--text-secondary);">Chưa có lịch sử push. Nhấn "Push ngay" để sao lưu lần đầu!</td></tr>';
        return;
    }
    tbody.innerHTML = history.map(h => {
        let badge = `<span style="color:#22c55e; font-weight:700;"><i class="fa-solid fa-circle-check"></i> THÀNH CÔNG</span>`;
        if (h.status === "FAILED") badge = `<span style="color:#ef4444; font-weight:700;"><i class="fa-solid fa-circle-xmark"></i> THẤT BẠI</span>`;
        else if (h.status === "NO_CHANGES") badge = `<span style="color:#3b82f6; font-weight:700;"><i class="fa-solid fa-minus"></i> KHÔNG THAY ĐỔI</span>`;
        return `<tr>
            <td style="font-family:var(--font-code); font-size:0.8rem; color:var(--text-secondary);">${escapeHtml(h.timestamp)}</td>
            <td style="font-weight:600; color:var(--text-bright);">${escapeHtml(h.message)}</td>
            <td style="text-align:center;">${badge}</td>
            <td style="font-family:var(--font-code); font-size:0.75rem; color:var(--text-secondary); max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(h.detail || h.output || '')}">${escapeHtml(h.detail || h.output || 'OK')}</td>
        </tr>`;
    }).join("");
}

document.getElementById("admin-login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const login = document.getElementById("admin-login-user").value.trim();
    const password = document.getElementById("admin-login-pass").value;
    const msgEl = document.getElementById("admin-login-msg");
    const submitBtn = document.getElementById("admin-login-submit");

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xác thực...';

    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: login, login: login, password, remember: true })
        });
        const data = await res.json();
        if (res.ok && data.token) {
            localStorage.setItem("local_cp_token", data.token);
            msgEl.hidden = true;
            await checkAuthAndLoad();
        } else {
            let errMsg = "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.";
            if (typeof data.detail === "string") {
                errMsg = data.detail;
            } else if (Array.isArray(data.detail)) {
                errMsg = data.detail.map(d => d.msg || "Lỗi định dạng").join(", ");
            } else if (data.message) {
                errMsg = data.message;
            }
            msgEl.textContent = errMsg;
            msgEl.hidden = false;
        }
    } catch (err) {
        msgEl.textContent = "Lỗi kết nối máy chủ: " + err.message;
        msgEl.hidden = false;
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Đăng nhập vào Control Center';
    }
});

document.getElementById("admin-logout-btn")?.addEventListener("click", () => {
    if (confirm("Đăng xuất khỏi trang quản trị?")) {
        localStorage.removeItem("local_cp_token");
        currentUser = null;
        showLoginModal();
    }
});

// ── 1. OVERVIEW ────────────────────────────────────────────────────────────
async function loadOverview() {
    const res = await request("/api/admin/overview");
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById("stat-members").textContent = data.total_members ?? 0;
    document.getElementById("stat-admins").textContent = data.admin_count ?? 0;
    document.getElementById("stat-contests").textContent = data.total_contests ?? 0;
    document.getElementById("stat-submissions").textContent = data.total_submissions ?? 0;
    document.getElementById("stat-sessions").textContent = data.total_sessions ?? 0;
    document.getElementById("stat-blocked").textContent = data.total_blocked_ips ?? 0;
    document.getElementById("overview-model").textContent = data.current_model || "Chưa cấu hình";
    document.getElementById("model-select").value = data.current_model || "gemma4:latest";

    // Role breakdown
    const rc = data.role_counts || {};
    document.getElementById("role-breakdown").innerHTML = Object.entries(rc).map(([role, cnt]) =>
        `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 16px;background:var(--bg-input);border-radius:10px;border:1px solid var(--border-color);">
            ${roleBadge(role, false)}
            <strong style="font-size:1.4rem;font-family:var(--font-code);">${cnt}</strong>
        </div>`
    ).join("") || '<span style="color:var(--text-secondary);">Chưa có dữ liệu.</span>';

    await loadJudges();
}

// ── 2. JUDGES ──────────────────────────────────────────────────────────────
async function loadJudges() {
    const res = await request("/api/admin/judges");
    if (!res.ok) return;
    const data = await res.json();
    const isDev = userLevel(currentUser) >= 9;
    document.getElementById("judges-table").innerHTML = data.judges.map(judge => {
        const uptime = Math.max(0, Math.floor((Date.now() - new Date(judge.started_at).getTime()) / 1000));
        return `<tr>
            <td><strong>${escapeHtml(judge.name)}</strong><br><small style="opacity:.6;">${escapeHtml(judge.id)}</small></td>
            <td><span class="judge-status ${judge.status}"><i></i>${escapeHtml(judge.status)}</span></td>
            <td>${escapeHtml(judge.compiler)}</td>
            <td>${judge.languages.map(escapeHtml).join(", ")}</td>
            <td>${judge.timeout_seconds}s / ${judge.memory_limit_mb} MB</td>
            <td>
                <span class="judge-uptime">${Math.floor(uptime/3600)}h ${Math.floor(uptime/60)%60}m ${uptime%60}s</span>
                <small>${judge.last_job_at ? `Job: ${new Date(judge.last_job_at).toLocaleTimeString("vi-VN")}` : "Chưa có job"}</small>
                ${isDev ? `<button class="admin-button judge-toggle" data-judge-id="${judge.id}" data-enabled="${judge.enabled}" style="margin-top:4px;">${judge.enabled ? "Tắt Node" : "Bật Node"}</button>` : ""}
            </td>
        </tr>`;
    }).join("");

    document.querySelectorAll(".judge-toggle").forEach(btn => btn.addEventListener("click", async () => {
        btn.disabled = true;
        const enabled = btn.dataset.enabled !== "true";
        await request(`/api/admin/judges/${btn.dataset.judgeId}/toggle?enabled=${enabled}`, { method: "POST" });
        await loadJudges();
    }));
    document.getElementById("judges-checked").textContent = `Kiểm tra lúc ${new Date(data.checked_at).toLocaleString("vi-VN")}`;
}

// ── 3. MONITORING (DEV ONLY) ───────────────────────────────────────────────
async function loadMonitoring() {
    const res = await request("/api/admin/monitoring");
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById("monitor-service").textContent = data.service;
    document.getElementById("monitor-active").textContent = data.active_jobs;
    document.getElementById("monitor-completed").textContent = data.completed_jobs;
    document.getElementById("monitor-failed").textContent = data.failed_jobs;
    document.getElementById("monitoring-table").innerHTML = data.judges.map(judge => {
        const uptime = Math.max(0, Math.floor((Date.now() - new Date(judge.started_at).getTime()) / 1000));
        return `<tr>
            <td><strong>${escapeHtml(judge.name)}</strong></td>
            <td><span class="judge-status ${judge.status}"><i></i>${judge.status}</span></td>
            <td>${judge.active_jobs} đang chạy / ${judge.completed_jobs} xong / ${judge.failed_jobs} lỗi</td>
            <td>${Math.floor(uptime/3600)}h ${Math.floor(uptime/60)%60}m ${uptime%60}s</td>
            <td><button class="btn-icon" data-monitoring-toggle="${judge.id}" data-enabled="${judge.enabled}">${judge.enabled ? "⏹ Tắt Node" : "▶ Bật Node"}</button></td>
        </tr>`;
    }).join("");

    document.querySelectorAll("[data-monitoring-toggle]").forEach(btn => btn.addEventListener("click", async () => {
        btn.disabled = true;
        const enabled = btn.dataset.enabled !== "true";
        await request(`/api/admin/judges/${btn.dataset.monitoringToggle}/toggle?enabled=${enabled}`, { method: "POST" });
        await loadMonitoring();
    }));
    document.getElementById("monitoring-checked").textContent = `Kiểm tra lúc ${new Date(data.checked_at).toLocaleString("vi-VN")}`;
}

// ── 4. MEMBERS ─────────────────────────────────────────────────────────────
async function loadMembers() {
    const res = await request("/api/admin/members");
    const data = await res.json();
    const query = document.getElementById("member-search").value.toLowerCase();
    const level = userLevel(currentUser);
    document.getElementById("members-table").innerHTML = (data.members || [])
        .filter(m => `${m.username} ${m.email} ${m.ips} ${m.role}`.toLowerCase().includes(query))
        .map((m, idx) => {
            const curRole = (m.role || (m.is_admin ? "admin" : "user")).toLowerCase();
            const locked = m.is_locked;
            return `<tr ${locked ? 'style="opacity:.6;"' : ""}>
                <td style="color:var(--text-secondary);font-size:.78rem;">#${m.id}</td>
                <td>
                    <strong>${escapeHtml(m.username)}</strong>
                    ${locked ? '<span class="badge locked" style="margin-left:4px;"><i class="fa-solid fa-lock"></i> Locked</span>' : ""}
                </td>
                <td><code style="font-size:.78rem;">${escapeHtml(m.email || "—")}</code></td>
                <td>
                    ${level >= 8
                        ? `<select class="btn-icon role-select-box" data-user-role-select="${m.id}" data-username="${escapeHtml(m.username)}" style="font-size:.78rem;padding:2px 6px;font-weight:600;">
                            <option value="user" ${curRole==="user"?"selected":""}>👤 USER</option>
                            <option value="admin" ${curRole==="admin"?"selected":""}>🛡️ ADMIN</option>
                            <option value="superadmin" ${curRole==="superadmin"?"selected":""}>👑 SUPERADMIN</option>
                            <option value="dev" ${curRole==="dev"?"selected":""}>💻 DEV</option>
                          </select>`
                        : roleBadge(curRole, m.is_admin)}
                </td>
                <td>${locked
                    ? '<span style="color:#f87171;font-size:.78rem;font-weight:600;"><i class="fa-solid fa-lock"></i> Bị khóa</span>'
                    : '<span style="color:#4ade80;font-size:.78rem;"><i class="fa-solid fa-circle-check"></i> Hoạt động</span>'}</td>
                <td><code style="font-size:.75rem;">${escapeHtml(m.ips ? m.ips.split(",")[0].trim() : "—")}</code></td>
                <td>${m.session_count ?? 0}</td>
                <td style="font-size:.78rem;">${new Date(m.created_at).toLocaleDateString("vi-VN")}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-icon" data-detail="${m.id}"><i class="fa-solid fa-eye"></i> Xem</button>
                    ${level >= 8 ? `<button class="btn-icon warn" data-lock="${m.id}" data-locked="${locked}">${locked ? "🔓 Mở" : "🔒 Khóa"}</button>` : ""}
                    ${level >= 8 ? `<button class="btn-icon danger" data-block-ip="${m.ips ? m.ips.split(",")[0].trim() : ""}"><i class="fa-solid fa-ban"></i> Chặn IP</button>` : ""}
                    ${level >= 9 ? `<button class="btn-icon danger" data-delete="${m.id}" data-username="${escapeHtml(m.username)}"><i class="fa-solid fa-trash"></i> Xóa</button>` : ""}
                </td>
            </tr>`;
        }).join("");

    // Detail
    document.querySelectorAll("[data-detail]").forEach(btn => btn.addEventListener("click", () => openMemberDetail(btn.dataset.detail)));

    // Role change
    document.querySelectorAll("[data-user-role-select]").forEach(sel => sel.addEventListener("change", async () => {
        const uid = sel.dataset.userRoleSelect, uname = sel.dataset.username, role = sel.value;
        if (!confirm(`Chuyển quyền "${uname}" thành ${role.toUpperCase()}?`)) { loadMembers(); return; }
        const res = await request(`/api/admin/members/${uid}/role`, { method: "PUT", body: JSON.stringify({ role }) });
        const j = await res.json();
        showAlert(res.ok ? j.message : j.detail, res.ok ? "info" : "danger");
        loadMembers();
    }));

    // Lock/Unlock
    document.querySelectorAll("[data-lock]").forEach(btn => btn.addEventListener("click", async () => {
        const uid = btn.dataset.lock, locked = btn.dataset.locked === "true";
        if (!confirm(`${locked ? "Mở khóa" : "Khóa"} tài khoản này?`)) return;
        const res = await request(`/api/admin/members/${uid}/lock`, { method: "PUT", body: JSON.stringify({ locked: !locked }) });
        const j = await res.json();
        showAlert(res.ok ? j.message : j.detail, res.ok ? "info" : "danger");
        loadMembers();
    }));

    // Block IP
    document.querySelectorAll("[data-block-ip]").forEach(btn => btn.addEventListener("click", async () => {
        const ip = btn.dataset.blockIp;
        if (!ip) { showAlert("Không tìm thấy IP hợp lệ.", "danger"); return; }
        if (!confirm(`Chặn IP ${ip} trong 30 phút?`)) return;
        const res = await request("/api/admin/block-ip", { method: "POST", body: JSON.stringify({ ip, reason: "admin_manual_block", minutes: 30 }) });
        const j = await res.json();
        showAlert(res.ok ? `Đã chặn IP ${ip}.` : j.detail, res.ok ? "info" : "danger");
    }));

    // Delete
    document.querySelectorAll("[data-delete]").forEach(btn => btn.addEventListener("click", async () => {
        const uid = btn.dataset.delete, uname = btn.dataset.username;
        if (!confirm(`XÓA VĨNH VIỄN tài khoản "${uname}"? Hành động này không thể hoàn tác!`)) return;
        const res = await request(`/api/admin/members/${uid}`, { method: "DELETE" });
        const j = await res.json();
        showAlert(res.ok ? j.message : j.detail, res.ok ? "info" : "danger");
        loadMembers();
    }));
}

// ── MEMBER DETAIL MODAL ───────────────────────────────────────────────────
async function openMemberDetail(userId) {
    const res = await request(`/api/admin/members/${userId}`);
    if (!res.ok) { showAlert("Không thể tải chi tiết.", "danger"); return; }
    const { user, sessions, solved_problems, submissions, ips } = await res.json();

    document.getElementById("detail-title").innerHTML = `
        Chi tiết: <strong>${escapeHtml(user.username)}</strong>
        ${roleBadge(user.role, user.is_admin)}
        ${user.is_locked ? '<span class="badge locked"><i class="fa-solid fa-lock"></i> Locked</span>' : ""}
    `;
    document.getElementById("detail-body").innerHTML = `
        <div class="detail-section">
            <h4>Thông tin cơ bản</h4>
            <div class="detail-kv"><span>ID:</span><span>#${user.id}</span></div>
            <div class="detail-kv"><span>Username:</span><strong>${escapeHtml(user.username)}</strong></div>
            <div class="detail-kv"><span>Email:</span><span>${escapeHtml(user.email || "Chưa cung cấp")}</span></div>
            <div class="detail-kv"><span>Quyền:</span>${roleBadge(user.role, user.is_admin)}</div>
            <div class="detail-kv"><span>Trạng thái:</span>${user.is_locked ? '<span style="color:#f87171;"><i class="fa-solid fa-lock"></i> Đang bị khóa</span>' : '<span style="color:#4ade80;"><i class="fa-solid fa-circle-check"></i> Hoạt động bình thường</span>'}</div>
            <div class="detail-kv"><span>Ngày tạo:</span><span>${new Date(user.created_at).toLocaleString("vi-VN")}</span></div>
        </div>

        <div class="detail-section">
            <h4>Địa chỉ IP đã dùng (${ips.length})</h4>
            ${ips.length ? ips.map(i => `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span class="ip-badge">${escapeHtml(i.ip)}</span>
                    <small style="color:var(--text-secondary);">Lần cuối: ${new Date(i.last_seen).toLocaleString("vi-VN")}</small>
                </div>`).join("") : '<span style="color:var(--text-secondary);">Chưa có IP.</span>'}
        </div>

        <div class="detail-section">
            <h4>Phiên làm việc gần nhất (${sessions.length})</h4>
            ${sessions.length ? `<ul style="margin:0;padding-left:16px;font-size:.82rem;">
                ${sessions.slice(0,8).map(s => `<li>${escapeHtml(s.title)} <small style="opacity:.6;">— ${new Date(s.updated_at).toLocaleDateString("vi-VN")}</small></li>`).join("")}
            </ul>` : '<span style="color:var(--text-secondary);">Chưa có phiên làm việc.</span>'}
        </div>

        <div class="detail-section">
            <h4>Bài tập đã giải (${solved_problems.length})</h4>
            ${solved_problems.length ? `<ul style="margin:0;padding-left:16px;font-size:.82rem;">
                ${solved_problems.slice(0,8).map(s => `<li>${escapeHtml(s.title)} <small style="opacity:.6;">— ${s.verdict || "AC"}</small></li>`).join("")}
            </ul>` : '<span style="color:var(--text-secondary);">Chưa giải bài tập nào.</span>'}
        </div>

        ${submissions && submissions.length ? `<div class="detail-section">
            <h4>Submissions gần nhất (${submissions.length})</h4>
            <ul style="margin:0;padding-left:16px;font-size:.82rem;">
                ${submissions.slice(0,6).map(s => `<li>[Contest #${s.competition_id}] ${s.language} — ${s.passed_tests}/${s.total_tests} tests — ${s.score} điểm</li>`).join("")}
            </ul>
        </div>` : ""}
    `;
    document.getElementById("detail-overlay").classList.add("open");
}

document.getElementById("detail-close")?.addEventListener("click", () => {
    document.getElementById("detail-overlay").classList.remove("open");
});
document.getElementById("detail-overlay")?.addEventListener("click", e => {
    if (e.target === document.getElementById("detail-overlay"))
        document.getElementById("detail-overlay").classList.remove("open");
});

// ── 5. SECURITY (SUPERADMIN & DEV) ─────────────────────────────────────────
async function loadSecurity() {
    await Promise.all([loadBlockedIps(), loadSecurityEvents()]);
}

async function loadBlockedIps() {
    const res = await request("/api/admin/security/blocked-ips");
    if (!res.ok) { document.getElementById("blocked-ips-table").innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-secondary);">Không đủ quyền (yêu cầu SUPERADMIN+)</td></tr>`; return; }
    const { blocked_ips } = await res.json();
    document.getElementById("blocked-ips-table").innerHTML = blocked_ips.length
        ? blocked_ips.map(b => `<tr>
            <td><span class="ip-badge">${escapeHtml(b.ip)}</span></td>
            <td style="font-size:.78rem;">${escapeHtml(b.reason)}</td>
            <td style="font-size:.78rem;">${new Date(b.blocked_until).toLocaleString("vi-VN")}</td>
            <td><button class="btn-icon" data-unblock="${escapeHtml(b.ip)}"><i class="fa-solid fa-lock-open"></i> Mở chặn</button></td>
          </tr>`).join("")
        : `<tr><td colspan="4" style="text-align:center;color:var(--text-secondary);padding:12px;">Không có IP nào đang bị chặn.</td></tr>`;
    document.querySelectorAll("[data-unblock]").forEach(btn => btn.addEventListener("click", async () => {
        const ip = btn.dataset.unblock;
        if (!confirm(`Mở chặn IP ${ip}?`)) return;
        const res = await request(`/api/admin/security/blocked-ips/${encodeURIComponent(ip)}`, { method: "DELETE" });
        showAlert((await res.json()).message);
        loadBlockedIps();
    }));
}

async function loadSecurityEvents() {
    const res = await request("/api/admin/security/events?limit=50");
    if (!res.ok) { document.getElementById("security-events-table").innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);">Không đủ quyền</td></tr>`; return; }
    const { events } = await res.json();
    document.getElementById("security-events-table").innerHTML = events.length
        ? events.map(e => `<tr class="event-row ${e.status_code >= 400 ? "blocked" : ""}">
            <td style="font-size:.72rem;white-space:nowrap;">${new Date(e.created_at).toLocaleString("vi-VN")}</td>
            <td><span class="ip-badge">${escapeHtml(e.ip)}</span></td>
            <td><code style="font-size:.72rem;">${escapeHtml(e.method)}</code></td>
            <td style="font-size:.72rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(e.path)}</td>
            <td style="color:${e.status_code >= 400 ? "#f87171" : "#4ade80"};font-weight:700;font-family:var(--font-code);">${e.status_code}</td>
            <td style="font-size:.72rem;">${escapeHtml(e.reason || "—")}</td>
          </tr>`).join("")
        : `<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:12px;">Chưa có sự kiện bảo mật.</td></tr>`;
}

document.getElementById("block-ip-btn")?.addEventListener("click", async () => {
    const ip = document.getElementById("block-ip-input").value.trim();
    if (!ip) { showAlert("Vui lòng nhập địa chỉ IP.", "danger"); return; }
    if (!confirm(`Chặn IP ${ip} trong 60 phút?`)) return;
    const res = await request("/api/admin/block-ip", { method: "POST", body: JSON.stringify({ ip, reason: "admin_manual_block", minutes: 60 }) });
    const j = await res.json();
    showAlert(res.ok ? `Đã chặn IP ${ip} trong 60 phút.` : j.detail, res.ok ? "info" : "danger");
    document.getElementById("block-ip-input").value = "";
    loadBlockedIps();
});

// ── 6. CONTESTS ────────────────────────────────────────────────────────────
async function loadContests() {
    const res = await request("/api/admin/competitions");
    const data = await res.json();
    document.getElementById("contest-list").innerHTML = (data || []).map(item => `
        <div class="contest-item-row" style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <button class="contest-item" data-contest="${item.id}" style="flex:1;">
                <div>
                    <strong>${escapeHtml(item.title)}</strong><br>
                    <small>${item.status} &bull; ${item.test_count} tests &bull; ${item.participant_count ?? 0} thí sinh</small>
                </div>
                <i class="fa-solid fa-pen-to-square" style="color: var(--accent-cyan);"></i>
            </button>
            <button class="btn-icon danger" onclick="quickDeleteContest(${item.id}, '${escapeHtml(item.title.replace(/'/g, "\\'"))}')" title="Xóa cuộc thi" style="padding:10px 12px;"><i class="fa-solid fa-trash"></i></button>
        </div>
    `).join("") || '<p class="panel-subtitle">Chưa có cuộc thi nào được tạo.</p>';

    document.querySelectorAll("[data-contest]").forEach(btn => btn.addEventListener("click", async () => {
        const item = await (await request(`/api/competitions/${btn.dataset.contest}`)).json();
        document.getElementById("contest-id").value = item.id;
        document.getElementById("contest-title").value = item.title;
        document.getElementById("contest-status").value = item.status;
        document.getElementById("contest-start").value = item.starts_at ? item.starts_at.slice(0, 16) : "";
        document.getElementById("contest-end").value = item.ends_at ? item.ends_at.slice(0, 16) : "";
        document.getElementById("contest-statement").value = item.statement;
        document.getElementById("contest-problems").value = JSON.stringify(item.problems || [], null, 2);
        const delBtn = document.getElementById("delete-contest-btn");
        if (delBtn) delBtn.style.display = "inline-flex";
    }));
}

window.quickDeleteContest = async function(contestId, contestTitle) {
    if (!confirm(`XÁC NHẬN XÓA: Bạn có chắc chắn muốn xóa cuộc thi "${contestTitle}"? Toàn bộ bài tập và dữ liệu liên quan sẽ bị xóa vĩnh viễn!`)) return;
    const res = await request(`/api/admin/competitions/${contestId}`, { method: "DELETE" });
    if (res.ok) {
        showAlert("Đã xóa cuộc thi thành công!", "info");
        if (document.getElementById("contest-id").value == contestId) {
            document.getElementById("contest-form").reset();
            document.getElementById("contest-id").value = "";
            document.getElementById("contest-problems").value = "[]";
            document.getElementById("delete-contest-btn").style.display = "none";
        }
        loadContests();
        if (document.querySelector('.admin-view[data-view-panel="problems"]')?.classList.contains("active")) {
            loadProblemsBank();
        }
    } else {
        const j = await res.json();
        showAlert(j.detail || "Không thể xóa cuộc thi.", "danger");
    }
};

document.getElementById("delete-contest-btn")?.addEventListener("click", async () => {
    const id = document.getElementById("contest-id").value;
    if (!id) return;
    const title = document.getElementById("contest-title").value || "cuộc thi này";
    quickDeleteContest(id, title);
});

// ── 6.5 PROBLEM BANK & TEST MANAGER ─────────────────────────────────────────
let allBankProblems = [];
let currentEditingProblem = null;
let latestAITests = [];

async function loadProblemsBank() {
    const res = await request("/api/admin/problems");
    if (!res.ok) return;
    allBankProblems = await res.json();
    renderProblemsBank();
}

function renderProblemsBank() {
    const q = (document.getElementById("problem-bank-search")?.value || "").trim().toLowerCase();
    const tbody = document.getElementById("problems-bank-tbody");
    if (!tbody) return;
    const filtered = allBankProblems.filter(p => 
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
            <td><strong style="color:var(--accent-cyan); font-family:var(--font-code); font-size:1rem;">${escapeHtml(p.code || 'A')}</strong></td>
            <td>
                <div style="font-weight:700; color:var(--text-bright); font-size:0.92rem;">${escapeHtml(p.title || 'Không tiêu đề')}</div>
                <small style="color:var(--text-secondary);">${escapeHtml((p.statement || '').slice(0, 80))}...</small>
            </td>
            <td><span style="font-size:0.8rem; color:var(--text-secondary);"><i class="fa-solid fa-flag-checkered" style="font-size:0.75rem; color:var(--accent-cyan);"></i> ${escapeHtml(p.contest_title || 'Kho tự do')}</span></td>
            <td style="text-align:center;"><span class="badge user" style="color:var(--accent-cyan); font-weight:700;">${p.points ?? 100}p</span></td>
            <td style="text-align:center; font-family:var(--font-code); font-size:0.8rem; color:var(--text-secondary);">${p.time_limit ?? 1.0}s / ${p.memory_limit ?? 256}MB</td>
            <td style="text-align:center;"><span class="badge admin">${p.test_count ?? 0} tests</span></td>
            <td style="text-align:right; white-space:nowrap;">
                <button class="btn-icon" onclick="openEditProblemModal(${p.id})" title="Chỉnh sửa Đề bài"><i class="fa-solid fa-pen"></i> Sửa</button>
                <button class="btn-icon" style="border-color:rgba(168,85,247,0.4); color:#c084fc;" onclick="openTestModal(${p.id})" title="Quản lý Testcases"><i class="fa-solid fa-vial"></i> Tests</button>
                <button class="btn-icon danger" onclick="deleteProblem(${p.id})" title="Xóa Bài tập"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join("");
}

document.getElementById("problem-bank-search")?.addEventListener("input", renderProblemsBank);

async function populateContestSelect(selectedId = null) {
    const sel = document.getElementById("edit-prob-contest");
    if (!sel) return;
    const res = await request("/api/admin/competitions");
    if (!res.ok) return;
    const contests = await res.json();
    sel.innerHTML = (contests || []).map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${escapeHtml(c.title)}</option>`).join("");
}

window.openCreateBankProblemModal = async function() {
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

document.getElementById("btn-create-bank-problem")?.addEventListener("click", openCreateBankProblemModal);

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
        loadProblemsBank();
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
        loadProblemsBank();
    } else {
        const j = await res.json();
        showAlert(j.detail || "Không thể xóa bài tập.", "danger");
    }
};

// ── TESTCASES MANAGER ───────────────────────────────────────────────────────
window.openTestModal = async function(probId) {
    const res = await request(`/api/admin/problems/${probId}`);
    if (!res.ok) { showAlert("Không thể tải bài tập.", "danger"); return; }
    currentEditingProblem = await res.json();
    document.getElementById("test-mgr-prob-id").value = currentEditingProblem.id;
    document.getElementById("test-modal-title").textContent = `Quản lý Testcases: [${currentEditingProblem.code}] ${currentEditingProblem.title}`;
    
    const container = document.getElementById("testcases-list-container");
    container.innerHTML = "";
    const tests = currentEditingProblem.tests || [];
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
                <textarea class="test-input-area" placeholder="1 2..." style="width:100%; min-height:70px; font-family:var(--font-code); font-size:0.78rem; background:#070d1e; color:#f1f5f9; box-sizing:border-box; border-radius:6px; border:1px solid var(--border-color); padding:6px 8px;">${escapeHtml(inp)}</textarea>
            </div>
            <div>
                <label style="font-size:0.72rem; color:var(--text-secondary); display:block; margin-bottom:4px; font-weight:600;">EXPECTED OUTPUT (Đầu ra mong muốn)</label>
                <textarea class="test-expected-area" placeholder="3..." style="width:100%; min-height:70px; font-family:var(--font-code); font-size:0.78rem; background:#070d1e; color:#f1f5f9; box-sizing:border-box; border-radius:6px; border:1px solid var(--border-color); padding:6px 8px;">${escapeHtml(exp)}</textarea>
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
        loadProblemsBank();
    } else {
        const j = await res.json();
        showAlert(j.detail || "Không thể lưu test cases.", "danger");
    }
});

// ── AI TEST GENERATOR FROM CODE ─────────────────────────────────────────────
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
    const statement = currentEditingProblem ? currentEditingProblem.statement : "";
    
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

document.querySelectorAll(".admin-nav,[data-go]").forEach(btn => btn.addEventListener("click", () => {
    const view = btn.dataset.view || btn.dataset.go;
    document.querySelectorAll(".admin-view").forEach(p => p.classList.toggle("active", p.dataset.viewPanel === view));
    document.querySelectorAll(".admin-nav").forEach(n => n.classList.toggle("active", n.dataset.view === view));
    document.getElementById("page-title").textContent = views[view] || "Control Center";
    if (view === "overview") loadOverview();
    if (view === "monitoring") loadMonitoring();
    if (view === "members") loadMembers();
    if (view === "security") loadSecurity();
    if (view === "contests") loadContests();
    if (view === "problems") loadProblemsBank();
}));

document.getElementById("member-search")?.addEventListener("input", loadMembers);
document.getElementById("new-contest")?.addEventListener("click", () => {
    document.getElementById("contest-form").reset();
    document.getElementById("contest-id").value = "";
    document.getElementById("contest-problems").value = "[]";
    const delBtn = document.getElementById("delete-contest-btn");
    if (delBtn) delBtn.style.display = "none";
});

document.getElementById("import-clueoj-btn")?.addEventListener("click", async () => {
    const path = document.getElementById("clueoj-path-input").value.trim();
    const contestId = document.getElementById("contest-id").value;
    if (!path) { showAlert("Vui lòng nhập đường dẫn thư mục bài tập ClueOJ.", "danger"); return; }
    if (!contestId) { showAlert("Vui lòng tạo hoặc chọn một cuộc thi trước.", "danger"); return; }
    showAlert("Đang đọc bài tập ClueOJ...");
    const res = await request(`/api/admin/competitions/${contestId}/import-clueoj`, {
        method: "POST", body: JSON.stringify({ competition_id: parseInt(contestId), problem_dir: path, statement: "" })
    });
    const j = await res.json();
    showAlert(res.ok ? "Đã nạp bài tập ClueOJ thành công!" : (j.detail || "Không thể nạp bài tập ClueOJ."), res.ok ? "info" : "danger");
    if (res.ok) loadContests();
});

document.getElementById("ai-gen-tests-btn")?.addEventListener("click", async () => {
    const statement = document.getElementById("contest-statement").value.trim();
    if (!statement) { showAlert("Vui lòng nhập mô tả đề bài để AI sinh test cases.", "danger"); return; }
    showAlert("AI đang suy luận và sinh test cases...");
    const res = await request("/api/admin/competitions/generate-tests", {
        method: "POST", body: JSON.stringify({ prompt: statement, count: 5 })
    });
    const j = await res.json();
    if (res.ok) {
        let probs = [];
        try { probs = JSON.parse(document.getElementById("contest-problems").value || "[]"); } catch {}
        if (!probs.length) probs.push({ code: "A", title: "Problem A", statement, tests: j.tests });
        else probs[0].tests = j.tests;
        document.getElementById("contest-problems").value = JSON.stringify(probs, null, 2);
        showAlert(`Đã sinh ${j.tests.length} test cases từ AI!`);
    } else { showAlert(j.detail || "Không thể sinh test từ AI.", "danger"); }
});

document.getElementById("contest-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    let problems;
    try { problems = JSON.parse(document.getElementById("contest-problems").value || "[]"); }
    catch { document.getElementById("contest-message").textContent = "Problems JSON không hợp lệ."; return; }
    const id = document.getElementById("contest-id").value;
    const body = {
        title: document.getElementById("contest-title").value,
        key: document.getElementById("contest-key").value,
        statement: document.getElementById("contest-statement").value,
        status: document.getElementById("contest-status").value,
        format: document.getElementById("contest-format").value,
        is_rated: document.getElementById("contest-is-rated").value === "1",
        access_code: document.getElementById("contest-access-code").value,
        scoreboard_visibility: document.getElementById("contest-scoreboard").value,
        starts_at: document.getElementById("contest-start").value || null,
        ends_at: document.getElementById("contest-end").value || null,
        tests: [], problems
    };
    const res = await request(id ? `/api/admin/competitions/${id}` : "/api/admin/competitions", {
        method: id ? "PUT" : "POST", body: JSON.stringify(body)
    });
    document.getElementById("contest-message").textContent = res.ok ? "Đã lưu và xuất bản cuộc thi ClueOJ thành công!" : (await res.json()).detail;
    loadContests();
});

document.getElementById("save-model")?.addEventListener("click", async () => {
    const res = await request("/api/admin/settings/model", {
        method: "POST", body: JSON.stringify({ model: document.getElementById("model-select").value })
    });
    const j = await res.json();
    showAlert(res.ok ? "Đã cập nhật model AI thành công." : j.detail, res.ok ? "info" : "danger");
});

document.getElementById("save-github-config")?.addEventListener("click", async () => {
    const res = await request("/api/admin/github", { method: "PUT", body: JSON.stringify({
        auto_push: document.getElementById("github-auto-push").checked,
        trigger_count: Number(document.getElementById("github-trigger-count").value || 0),
        backup_time_1: document.getElementById("github-time-1").value,
        backup_time_2: document.getElementById("github-time-2").value,
        backup_time_3: document.getElementById("github-time-3").value
    }) });
    const data = await res.json();
    showAlert(res.ok ? "Đã lưu cấu hình sao lưu GitHub." : data.detail, res.ok ? "info" : "danger");
});

document.getElementById("console-github-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const res = await request("/api/admin/github", { method: "PUT", body: JSON.stringify({
        auto_push: document.getElementById("console-github-auto-push").checked,
        trigger_count: Number(document.getElementById("console-github-trigger-count").value || 0),
        backup_time_1: document.getElementById("console-github-time-1").value,
        backup_time_2: document.getElementById("console-github-time-2").value,
        backup_time_3: document.getElementById("console-github-time-3").value,
        custom_commit_prefix: document.getElementById("console-custom-prefix").value.trim()
    }) });
    const data = await res.json();
    showAlert(res.ok ? "Đã lưu cấu hình sao lưu GitHub thành công." : data.detail, res.ok ? "info" : "danger");
    if (res.ok) loadGitHubConfig();
});

document.getElementById("push-github")?.addEventListener("click", async () => {
    if (!confirm("Push các thay đổi mã nguồn đã chọn lên remote origin?")) return;
    const res = await request("/api/admin/github/push", { method: "POST", body: JSON.stringify({}) });
    const data = await res.json();
    showAlert(res.ok ? (data.message || "Đã push thành công!") : data.detail, res.ok ? "info" : "danger");
    if (res.ok) loadGitHubConfig();
});

document.getElementById("console-push-github")?.addEventListener("click", async () => {
    const btn = document.getElementById("console-push-github");
    const prefix = document.getElementById("console-custom-prefix").value.trim() || "Backup CP Studio";
    const customMsg = prompt("Nhập lời nhắn Commit (Message) cho lần Push này:", `${prefix} - ${new Date().toLocaleString('vi-VN')}`);
    if (customMsg === null) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang Push...';

    try {
        const res = await request("/api/admin/github/push", {
            method: "POST",
            body: JSON.stringify({ commit_message: customMsg.trim() || undefined })
        });
        const data = await res.json();
        if (data.success) {
            showAlert(data.message || "Đã push mã nguồn lên GitHub thành công!", "info");
        } else {
            showAlert(data.message || "Push thất bại. Kiểm tra Git Credentials.", "danger");
        }
    } catch {
        showAlert("Lỗi khi kết nối push.", "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Push ngay';
        loadGitHubConfig();
    }
});

document.getElementById("btn-console-test-conn")?.addEventListener("click", async () => {
    const btn = document.getElementById("btn-console-test-conn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang test...';

    try {
        const res = await request("/api/admin/github/test-connection", { method: "POST" });
        const data = await res.json();
        alert(data.success ? `✅ ${data.message}` : `❌ ${data.message}`);
    } catch {
        alert("Lỗi kết nối kiểm tra remote.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-network-wired"></i> Kiểm tra Kết nối Remote';
    }
});

document.getElementById("btn-refresh-console-history")?.addEventListener("click", loadGitHubConfig);

document.getElementById("export-members")?.addEventListener("click", async () => {
    const res = await request("/api/admin/export-members");
    if (!res.ok) { showAlert((await res.json()).detail, "danger"); return; }
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `clueoj_members_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
});

document.getElementById("reset-system")?.addEventListener("click", async () => {
    if (!confirm("XÁC NHẬN: Reset toàn bộ session, submission và dữ liệu đã lưu? Chỉ DEV mới thực hiện được!")) return;
    const res = await request("/api/admin/reset", { method: "POST" });
    const j = await res.json();
    showAlert(res.ok ? "Đã reset toàn bộ dữ liệu hệ thống." : j.detail, res.ok ? "info" : "danger");
});

document.getElementById("refresh-judges")?.addEventListener("click", loadJudges);
document.getElementById("refresh-monitoring")?.addEventListener("click", loadMonitoring);
document.getElementById("refresh-blocked")?.addEventListener("click", loadBlockedIps);
document.getElementById("refresh-events")?.addEventListener("click", loadSecurityEvents);

document.getElementById("run-health-check")?.addEventListener("click", async () => {
    const res = await request("/api/admin/monitoring/health-check", { method: "POST" });
    const j = await res.json();
    showAlert(res.ok ? "Đã kiểm tra sức khỏe 5 Judge Workers." : j.detail, res.ok ? "info" : "danger");
    await loadMonitoring();
});

// ── INITIAL BOOT ──────────────────────────────────────────────────────────
checkAuthAndLoad();
