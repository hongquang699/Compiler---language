// ==========================================================================
// COMPILER---LANGUAGE — ClueOJ Multi-Role Admin Console Engine v9.0
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
    submissions: "Quản lý Bài nộp & Kết quả Chấm điểm",
    github: "Sao lưu GitHub & Auto Push Studio",
    members: "Thành viên & Tài khoản",
    security: "Bảo mật & Kiểm soát IP",
    notifs: "Quản lý Thông Báo & Duyệt Nâng Cấp Gói",
    monitoring: "Giám sát Máy chấm",
    system: "Cấu hình & Hệ thống",
    anticheat_monitor: "Giám sát Hệ thống Chống Gian lận (Dev Only)",
    web_monitor: "Radar Giám Sát Web & Điểm Rủi Ro IP (Dev Only)",
    bot_actions: "Trung Tâm Tác Chiến & Nhật Ký Bot Sentinel (Dev Only)",
    data_storage: "Giám sát Lưu trữ Dữ liệu & Nginx"
};

let currentUser = null;

function roleBadge(role, isAdmin) {
    const r = (role || "").toLowerCase();
    if (r === "dev") return '<span class="badge dev"><i class="fa-solid fa-code"></i> DEV</span>';
    if (r === "superadmin") return '<span class="badge superadmin"><i class="fa-solid fa-crown"></i> SUPERADMIN</span>';
    if (r === "admin" || (isAdmin && r !== "pro" && r !== "enterprise" && r !== "dev" && r !== "superadmin")) return '<span class="badge admin"><i class="fa-solid fa-user-shield"></i> ADMIN</span>';
    if (r === "pro") return '<span class="badge pro"><i class="fa-solid fa-bolt"></i> PRO</span>';
    if (r === "enterprise") return '<span class="badge" style="background:#fbbf24; color:#000; font-weight:700;"><i class="fa-solid fa-gem"></i> ENTERPRISE</span>';
    return '<span class="badge user"><i class="fa-solid fa-user"></i> USER</span>';
}

function userLevel(user) {
    if (!user) return 0;
    const r = (user.role || (user.is_admin ? "admin" : "user")).toLowerCase();
    if (r === "dev" || (user.username || "").toLowerCase() === "dev") return 9;
    if (r === "superadmin") return 8;
    if (r === "admin" || user.is_admin) return 7;
    if (r === "enterprise") return 5;
    if (r === "pro") return 3;
    return 1;
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

        showNavButtons(["overview", "contests", "problems", "external_problems", "submissions", "github", "members", "security", "notifs", "monitoring", "system", "anticheat_monitor", "web_monitor", "bot_actions", "data_storage"]);
        showElements(["card-stat-blocked", "card-role-breakdown", "card-ai-model-overview", "btn-quick-model-switch", "card-system-model-config", "reset-system"]);
        document.getElementById("members-panel-title").textContent = "Thành viên & Quản lý Toàn quyền";
        document.getElementById("members-panel-desc").textContent = "Phân quyền vai trò, Khóa/Mở khóa và Xóa tài khoản vĩnh viễn (Chế độ Dev Master).";
    } else if (level === 8 || role === "superadmin") {
        // ── 2. SUPERADMIN CONTROL CENTER ──
        sidebarKicker.textContent = "SUPERADMIN CONTROL";
        topbarKicker.textContent = "SUPERADMIN CONTROL CENTER";
        bannerTitle.innerHTML = '👑 SUPERADMIN CONTROL CENTER <span style="font-size:0.75rem; background:rgba(236,72,153,.3); padding:2px 8px; border-radius:6px; margin-left:6px; font-weight:700;">MANAGEMENT</span>';
        bannerDesc.textContent = "Không gian Tổng Quản trị: Quản lý Cuộc thi, Phân quyền Thí sinh, Khóa tài khoản & Kiểm soát An ninh IP.";
        bannerTag.innerHTML = roleBadge("superadmin", true);

        showNavButtons(["overview", "contests", "problems", "external_problems", "submissions", "members", "security", "notifs", "system"]);
        showElements(["card-stat-blocked", "card-role-breakdown"]);
        hideElements(["btn-quick-model-switch", "card-system-model-config", "reset-system"]);
        document.getElementById("members-panel-title").textContent = "Quản lý Thành viên & Phân quyền";
        document.getElementById("members-panel-desc").textContent = "Đổi vai trò thành viên, Khóa/Mở khóa và quản lý địa chỉ IP thí sinh.";
    } else {
        // ── 3. ADMIN WORKSPACE ──
        sidebarKicker.textContent = "ADMIN WORKSPACE";
        topbarKicker.textContent = "CLUEOJ ADMIN WORKSPACE";
        bannerTitle.innerHTML = '🛡️ ADMIN WORKSPACE <span style="font-size:0.75rem; background:rgba(34,211,238,.25); padding:2px 8px; border-radius:6px; margin-left:6px; font-weight:700;">CONTEST &amp; PROBLEMS</span>';
        bannerDesc.textContent = "Không gian Ban Chuyên môn: Tạo Cuộc thi ClueOJ, Nạp bài tập (init.yml), AI sinh testcase & Theo dõi thí sinh.";
        bannerTag.innerHTML = roleBadge("admin", true);

        showNavButtons(["overview", "contests", "problems", "external_problems", "submissions", "members"]);
        document.getElementById("members-panel-title").textContent = "Danh sách Thí sinh";
        document.getElementById("members-panel-desc").textContent = "Xem danh sách thí sinh và số bài đã nộp (Chế độ Giám thị - Chỉ xem).";

        hideElements(["card-stat-blocked", "card-role-breakdown", "btn-quick-model-switch", "card-system-model-config", "reset-system"]);
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
            showLoginModal("⛔ TÀI KHOẢN '" + escapeHtml(user.username) + "' KHÔNG CÓ QUYỀN QUẢN TRỊ. Bạn sẽ được chuyển hướng về trang chủ...");
            setTimeout(() => {
                window.location.replace("index.html?error=unauthorized");
            }, 2000);
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
            if (data.user) localStorage.setItem("local_cp_user", JSON.stringify(data.user));
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
let cachedJudgesData = [];

async function loadJudges() {
    const res = await request("/api/admin/judges");
    if (!res.ok) return;
    const data = await res.json();
    cachedJudgesData = data.judges || [];
    const isDev = userLevel(currentUser) >= 9;
    document.getElementById("judges-table").innerHTML = cachedJudgesData.map(judge => {
        const uptime = Math.max(0, Math.floor((Date.now() - new Date(judge.started_at).getTime()) / 1000));
        const activeText = judge.active_jobs > 0 ? `<span style="color:#22c55e; font-weight:700;"><i class="fa-solid fa-spinner fa-spin"></i> ${judge.active_jobs} đang chạy</span>` : `<span style="color:var(--text-secondary);">Rảnh rỗi</span>`;
        const langsPill = (judge.languages || []).map(l => `<span style="font-size:0.68rem; padding:2px 6px; border-radius:4px; background:rgba(34,211,238,0.1); color:var(--accent-cyan); font-family:var(--font-code);">${l}</span>`).join(" ");
        return `<tr style="cursor:pointer;" onclick="openJudgeDetailModal('${judge.id}')">
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-server" style="color:var(--accent-cyan);"></i>
                    <div>
                        <strong style="color:var(--text-bright);">${escapeHtml(judge.name)}</strong>
                        <small style="display:block; opacity:.6; font-family:var(--font-code);">${escapeHtml(judge.id)}</small>
                    </div>
                </div>
            </td>
            <td>
                <span class="judge-status ${judge.status}"><i></i>${escapeHtml(judge.status.toUpperCase())}</span>
                <div style="font-size:0.75rem; margin-top:2px;">${activeText}</div>
            </td>
            <td><code style="font-size:0.78rem; color:var(--text-primary);">${escapeHtml(judge.compiler)}</code></td>
            <td><div style="display:flex; gap:4px; flex-wrap:wrap;">${langsPill}</div></td>
            <td><strong style="color:var(--accent-cyan); font-family:var(--font-code);">${judge.timeout_seconds}s</strong> / ${judge.memory_limit_mb} MB</td>
            <td onclick="event.stopPropagation()">
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span class="judge-uptime" style="font-size:0.75rem;"><i class="fa-solid fa-stopwatch"></i> ${Math.floor(uptime/3600)}h ${Math.floor(uptime/60)%60}m ${uptime%60}s</span>
                    <div style="display:flex; gap:6px;">
                        <button class="btn-icon" onclick="openJudgeDetailModal('${judge.id}')" title="Xem chi tiết & Benchmark"><i class="fa-solid fa-circle-info"></i> Chi tiết</button>
                        ${isDev ? `<button class="admin-button judge-toggle" data-judge-id="${judge.id}" data-enabled="${judge.enabled}" style="padding:4px 8px; font-size:0.72rem;">${judge.enabled ? "⏹ Tắt" : "▶ Bật"}</button>` : ""}
                    </div>
                </div>
            </td>
        </tr>`;
    }).join("");

    document.querySelectorAll(".judge-toggle").forEach(btn => btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        btn.disabled = true;
        const enabled = btn.dataset.enabled !== "true";
        await request(`/api/admin/judges/${btn.dataset.judgeId}/toggle?enabled=${enabled}`, { method: "POST" });
        await loadJudges();
    }));
    document.getElementById("judges-checked").textContent = `Kiểm tra lúc ${new Date(data.checked_at).toLocaleString("vi-VN")}`;
}

let activeBenchmarkJudgeId = null;

window.openJudgeDetailModal = function(judgeId) {
    const judge = cachedJudgesData.find(j => j.id === judgeId);
    if (!judge) return;
    activeBenchmarkJudgeId = judgeId;

    const uptime = Math.max(0, Math.floor((Date.now() - new Date(judge.started_at).getTime()) / 1000));
    const totalJobs = (judge.completed_jobs || 0) + (judge.failed_jobs || 0);
    const successRate = totalJobs > 0 ? ((judge.completed_jobs / totalJobs) * 100).toFixed(1) : "100.0";

    document.getElementById("judge-detail-title").innerHTML = `<i class="fa-solid fa-server" style="color:var(--accent-cyan);"></i> Chi tiết Máy chấm: ${escapeHtml(judge.name)} [${judge.id}]`;
    document.getElementById("judge-benchmark-result").hidden = true;

    document.getElementById("judge-detail-body").innerHTML = `
        <div class="stat-grid" style="grid-template-columns:repeat(3, 1fr); margin-bottom:16px;">
            <div class="stat-card">
                <small>TRẠNG THÁI RUNTIME</small>
                <strong style="font-size:1.2rem; color:${judge.status === 'online' ? '#22c55e' : '#ef4444'};">${judge.status.toUpperCase()}</strong>
            </div>
            <div class="stat-card">
                <small>ĐANG XỬ LÝ (ACTIVE)</small>
                <strong style="font-size:1.4rem; color:var(--accent-cyan);">${judge.active_jobs || 0} jobs</strong>
            </div>
            <div class="stat-card">
                <small>TỶ LỆ THÀNH CÔNG (AC)</small>
                <strong style="font-size:1.4rem; color:#4ade80;">${successRate}%</strong>
            </div>
        </div>

        <div class="admin-card" style="margin-bottom:12px; padding:16px;">
            <h4 style="color:var(--text-bright); margin-bottom:10px; font-size:0.9rem;"><i class="fa-solid fa-microchip" style="color:var(--accent-cyan);"></i> Thông số Kỹ thuật &amp; Compiler Path</h4>
            <table style="width:100%; font-size:0.82rem; border-collapse:collapse;">
                <tr><td style="color:var(--text-secondary); padding:4px 0; width:170px;">Trình biên dịch C++:</td><td><code style="color:var(--accent-cyan); font-family:var(--font-code);">${escapeHtml(judge.compiler)} -std=c++17 -O2 -pipe</code></td></tr>
                <tr><td style="color:var(--text-secondary); padding:4px 0;">Giới hạn Sandbox:</td><td style="font-family:var(--font-code);">${judge.timeout_seconds} giây CPU / ${judge.memory_limit_mb} MB RAM</td></tr>
                <tr><td style="color:var(--text-secondary); padding:4px 0;">Đường dẫn Sandbox:</td><td><code style="font-size:0.76rem; color:var(--text-secondary);">${escapeHtml(judge.sandbox_path)}</code></td></tr>
                <tr><td style="color:var(--text-secondary); padding:4px 0;">Ngôn ngữ hỗ trợ:</td><td>${(judge.languages || []).map(l => `<span class="badge user" style="margin-right:4px;">${l}</span>`).join('')}</td></tr>
                <tr><td style="color:var(--text-secondary); padding:4px 0;">Tổng số Jobs đã chấm:</td><td style="font-family:var(--font-code);">${judge.completed_jobs || 0} AC / ${judge.failed_jobs || 0} Failed</td></tr>
                <tr><td style="color:var(--text-secondary); padding:4px 0;">Uptime:</td><td style="font-family:var(--font-code);">${Math.floor(uptime/3600)} giờ ${Math.floor(uptime/60)%60} phút ${uptime%60} giây</td></tr>
            </table>
        </div>
    `;

    document.getElementById("judge-detail-modal-overlay").classList.add("open");
};

window.closeJudgeDetailModal = function() {
    document.getElementById("judge-detail-modal-overlay").classList.remove("open");
};

document.getElementById("btn-run-judge-benchmark")?.addEventListener("click", async () => {
    if (!activeBenchmarkJudgeId) return;
    const btn = document.getElementById("btn-run-judge-benchmark");
    const resBox = document.getElementById("judge-benchmark-result");
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang biên dịch &amp; đo độ trễ...';

    try {
        const res = await request(`/api/admin/judges/${activeBenchmarkJudgeId}/benchmark`, { method: "POST" });
        const data = await res.json();
        resBox.hidden = false;
        if (data.success) {
            resBox.innerHTML = `<div style="padding:10px; border-radius:8px; background:rgba(34,197,94,0.15); border:1px solid #22c55e; color:#4ade80;">
                <i class="fa-solid fa-circle-check"></i> Benchmark THÀNH CÔNG! <br>
                • Tổng độ trễ (Latency): <strong>${data.latency_ms}ms</strong> <br>
                • Thời gian biên dịch C++ (Compile Time): <strong>${data.compile_time_ms}ms</strong> <br>
                • Máy chấm phản hồi hoàn hảo!
            </div>`;
        } else {
            resBox.innerHTML = `<div style="padding:10px; border-radius:8px; background:rgba(239,68,68,0.15); border:1px solid #ef4444; color:#f87171;">
                <i class="fa-solid fa-circle-xmark"></i> Benchmark THẤT BẠI: ${escapeHtml(data.verdict || "Error")}
            </div>`;
        }
    } catch {
        resBox.hidden = false;
        resBox.innerHTML = `<div style="color:#f87171;"><i class="fa-solid fa-circle-xmark"></i> Lỗi kết nối benchmark.</div>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-stopwatch"></i> ⚡ Chạy Benchmark Kiểm tra Tốc độ Máy chấm';
    }
});

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

// ── 5. SECURITY & SENTINEL DEFENSE BOT (SUPERADMIN & DEV) ─────────────────
let activeAntiCheatReport = null;

async function loadSecurity() {
    await Promise.all([
        loadSentinelStatus(),
        loadAntiCheatContests(),
        loadAntiCheatReports(),
        loadSentinelActions(),
        loadHoneypotLogs(),
        loadThreatScores(),
        loadBlockedIps(),
        loadSecurityEvents()
    ]);
}

async function loadSentinelStatus() {
    try {
        const res = await request("/api/admin/security/sentinel/status");
        if (!res.ok) return;
        const data = await res.json();
        
        document.getElementById("sentinel-stat-mitigated").textContent = data.threats_mitigated || 0;
        document.getElementById("sentinel-stat-honeypot").textContent = data.honeypot_triggers_total || 0;
        document.getElementById("sentinel-stat-bans").textContent = data.active_bans_count || 0;
        document.getElementById("sentinel-stat-unsafe-code").textContent = data.unsafe_codes_blocked || 0;
        document.getElementById("sentinel-stat-killed").textContent = data.sessions_killed || 0;

        const modeSel = document.getElementById("sentinel-mode-select");
        if (modeSel) modeSel.value = data.mode || "autonomous";

        const badge = document.getElementById("sentinel-mode-badge");
        if (badge) {
            if (data.mode === "strict") {
                badge.className = "badge locked";
                badge.innerHTML = '<i class="fa-solid fa-lock"></i> STRICT LOCKDOWN';
            } else if (data.mode === "monitoring") {
                badge.className = "badge user";
                badge.innerHTML = '<i class="fa-solid fa-eye"></i> MONITORING ONLY';
            } else {
                badge.className = "badge dev";
                badge.innerHTML = '<i class="fa-solid fa-robot"></i> AUTONOMOUS DEFENSE';
            }
        }
    } catch (e) {
        console.error("Lỗi tải Sentinel status:", e);
    }
}

document.getElementById("btn-save-sentinel-mode")?.addEventListener("click", async () => {
    const mode = document.getElementById("sentinel-mode-select").value;
    const res = await request("/api/admin/security/sentinel/mode", {
        method: "POST",
        body: JSON.stringify({ mode })
    });
    const j = await res.json();
    showAlert(res.ok ? j.message : j.detail, res.ok ? "info" : "danger");
    loadSentinelStatus();
});

document.getElementById("btn-manual-killswitch")?.addEventListener("click", async () => {
    const target = prompt("Nhập User ID hoặc IP cần hủy toàn bộ token phiên làm việc:");
    if (!target) return;
    const res = await request("/api/admin/security/sentinel/execute-skill", {
        method: "POST",
        body: JSON.stringify({ skill_name: "session_killswitch", target: target.trim() })
    });
    const j = await res.json();
    showAlert(res.ok ? j.message : j.detail, res.ok ? "info" : "danger");
    loadSentinelStatus();
    loadSentinelActions();
});

document.getElementById("btn-strict-lockdown")?.addEventListener("click", async () => {
    if (!confirm("KÍCH HOẠT CHẾ ĐỘ PHÒNG THỦ NGHIÊM NGẶT (Strict Lockdown)? Hệ thống sẽ siết rate-limit và khóa ngay mọi request có điểm nguy cơ!")) return;
    const res = await request("/api/admin/security/sentinel/execute-skill", {
        method: "POST",
        body: JSON.stringify({ skill_name: "emergency_lockdown" })
    });
    const j = await res.json();
    showAlert(res.ok ? j.message : j.detail, res.ok ? "info" : "danger");
    loadSentinelStatus();
});

async function loadSentinelActions() {
    try {
        const res = await request("/api/admin/security/sentinel/actions?limit=50");
        if (!res.ok) return;
        const { actions } = await res.json();
        const tbody = document.getElementById("sentinel-actions-tbody");
        if (!tbody) return;
        tbody.innerHTML = (actions && actions.length)
            ? actions.map(a => `<tr>
                <td style="font-size:.74rem; font-family:var(--font-code); color:var(--text-secondary);">${new Date(a.created_at).toLocaleString("vi-VN")}</td>
                <td><span class="badge ${a.action_type.includes('CRITICAL') ? 'locked' : a.action_type.includes('KILLSWITCH') ? 'warn' : 'dev'}">${escapeHtml(a.action_type)}</span></td>
                <td><code style="font-size:.76rem; color:var(--accent-cyan);">${escapeHtml(a.target_ip || (a.target_user_id ? 'User #' + a.target_user_id : 'System'))}</code></td>
                <td style="font-size:.76rem; color:var(--text-secondary); max-width:260px; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(a.details || a.reason)}">${escapeHtml(a.reason || '')} ${a.details ? '<small>(' + escapeHtml(a.details) + ')</small>' : ''}</td>
            </tr>`).join("")
            : `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-secondary);">Chưa có hành động phòng vệ nào gần đây.</td></tr>`;
    } catch (e) {
        console.error("Lỗi tải Sentinel actions:", e);
    }
}

async function loadHoneypotLogs() {
    try {
        const res = await request("/api/admin/security/honeypot/logs?limit=50");
        if (!res.ok) return;
        const { logs } = await res.json();
        const tbody = document.getElementById("honeypot-logs-table");
        if (!tbody) return;
        tbody.innerHTML = (logs && logs.length)
            ? logs.map(l => `<tr>
                <td style="font-size:.74rem; font-family:var(--font-code); color:var(--text-secondary);">${new Date(l.created_at).toLocaleString("vi-VN")}</td>
                <td><span class="ip-badge">${escapeHtml(l.ip)}</span></td>
                <td><code style="font-size:.72rem;">${escapeHtml(l.method)}</code></td>
                <td><span style="color:#f59e0b; font-family:var(--font-code); font-size:.76rem;">${escapeHtml(l.path)}</span></td>
                <td><span class="badge locked" style="font-size:0.7rem;">${escapeHtml(l.action_taken || 'AUTO_BAN')}</span></td>
            </tr>`).join("")
            : `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--text-secondary);">Chưa có tin tặc hay scanner nào sập bẫy Honeypot.</td></tr>`;
    } catch (e) {
        console.error("Lỗi tải Honeypot logs:", e);
    }
}

async function loadThreatScores() {
    try {
        const res = await request("/api/admin/security/threat-scores?limit=50");
        if (!res.ok) return;
        const { threat_scores } = await res.json();
        const tbody = document.getElementById("threat-scores-table");
        if (!tbody) return;
        tbody.innerHTML = (threat_scores && threat_scores.length)
            ? threat_scores.map(t => {
                const isCrit = t.score >= 100;
                const isWarn = t.score >= 30;
                const scoreColor = isCrit ? "#f87171" : isWarn ? "#fb923c" : "#34d399";
                return `<tr>
                    <td><span class="ip-badge">${escapeHtml(t.ip)}</span></td>
                    <td><strong style="color:${scoreColor}; font-family:var(--font-code); font-size:.9rem;">${t.score} pts</strong></td>
                    <td style="text-align:center; font-family:var(--font-code); font-size:.8rem;">${t.violation_count}</td>
                    <td style="font-size:.76rem; color:var(--text-secondary);">${escapeHtml(t.last_violation || 'N/A')}</td>
                    <td style="text-align:right;">
                        <button class="btn-icon" onclick="resetThreatScore('${escapeHtml(t.ip)}')" title="Xóa điểm nguy cơ"><i class="fa-solid fa-rotate-left"></i> Reset</button>
                    </td>
                </tr>`;
            }).join("")
            : `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--text-secondary);">Tất cả IP kết nối đều có chỉ số an toàn tốt.</td></tr>`;
    } catch (e) {
        console.error("Lỗi tải Threat scores:", e);
    }
}

async function resetThreatScore(ip) {
    if (!confirm(`Xóa điểm nguy cơ cho IP ${ip}?`)) return;
    const res = await request(`/api/admin/security/threat-scores/${encodeURIComponent(ip)}`, { method: "DELETE" });
    const j = await res.json();
    showAlert(res.ok ? j.message : j.detail, res.ok ? "info" : "danger");
    loadThreatScores();
    loadSentinelStatus();
}

// ── ANTI-CHEAT & PLAGIARISM INSPECTOR ──────────────────────────────────────
async function loadAntiCheatContests() {
    try {
        const res = await request("/api/admin/competitions");
        if (!res.ok) return;
        const contests = await res.json();
        const select = document.getElementById("anticheat-contest-select");
        if (!select) return;
        select.innerHTML = '<option value="">Chọn cuộc thi để quét...</option>' +
            (contests || []).map(c => `<option value="${c.id}">${escapeHtml(c.title)} (ID: ${c.id})</option>`).join("");
    } catch (e) {
        console.error("Lỗi tải danh sách contest cho Anti-Cheat:", e);
    }
}

async function loadAntiCheatReports(competitionId = null) {
    try {
        const url = competitionId ? `/api/admin/security/anti-cheat/reports?competition_id=${competitionId}` : "/api/admin/security/anti-cheat/reports";
        const res = await request(url);
        if (!res.ok) return;
        const { reports } = await res.json();
        const tbody = document.getElementById("anticheat-reports-tbody");
        if (!tbody) return;
        tbody.innerHTML = (reports && reports.length)
            ? reports.map(r => {
                let badgeClass = "badge user";
                if (r.verdict === "PLAGIARISM_FLAGGED" || r.verdict === "DISQUALIFIED") badgeClass = "badge locked";
                else if (r.verdict === "SUSPICIOUS" || r.verdict === "FLAGGED") badgeClass = "badge admin";
                
                const scoreColor = r.similarity_score >= 80 ? "#f87171" : r.similarity_score >= 50 ? "#fb923c" : "#34d399";
                return `<tr>
                    <td style="font-family:var(--font-code); font-size:.78rem;">#${r.id}</td>
                    <td>
                        <strong style="color:var(--accent-cyan); font-size:0.85rem;">${escapeHtml(r.username_1)}</strong>
                        <small style="display:block; color:var(--text-secondary); font-family:var(--font-code);">Sub #${r.submission_id_1}</small>
                    </td>
                    <td>
                        <strong style="color:#f472b6; font-size:0.85rem;">${escapeHtml(r.username_2)}</strong>
                        <small style="display:block; color:var(--text-secondary); font-family:var(--font-code);">Sub #${r.submission_id_2}</small>
                    </td>
                    <td style="text-align:center;">
                        <strong style="color:${scoreColor}; font-family:var(--font-code); font-size:1rem;">${r.similarity_score}%</strong>
                        <small style="display:block; color:var(--text-secondary); font-size:0.7rem;">${r.matched_tokens || 0} tokens trùng</small>
                    </td>
                    <td style="text-align:center;"><span class="${badgeClass}">${escapeHtml(r.verdict)}</span></td>
                    <td style="text-align:right;">
                        <button class="btn-icon" onclick="openAntiCheatComparisonModal(${r.id})" style="background:rgba(168,85,247,0.15); color:#c084fc; border-color:#a855f7;">
                            <i class="fa-solid fa-code-compare"></i> Đối chiếu Code
                        </button>
                    </td>
                </tr>`;
            }).join("")
            : `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-secondary);">Chưa có báo cáo vi phạm. Hãy chọn cuộc thi và nhấn "Quét Gian Lận".</td></tr>`;
    } catch (e) {
        console.error("Lỗi tải Anti-Cheat reports:", e);
    }
}

document.getElementById("btn-run-anticheat-scan")?.addEventListener("click", async () => {
    const contestId = document.getElementById("anticheat-contest-select").value;
    if (!contestId) { showAlert("Vui lòng chọn cuộc thi để quét gian lận.", "danger"); return; }
    const threshold = parseFloat(document.getElementById("anticheat-threshold-input").value) || 60;
    
    showAlert("Đang chạy thuật toán Token Winnowing quét gian lận toàn bộ bài nộp...", "info");
    const res = await request(`/api/admin/security/anti-cheat/scan/${contestId}`, {
        method: "POST",
        body: JSON.stringify({ threshold })
    });
    const j = await res.json();
    if (res.ok) {
        showAlert(`Hoàn tất quét: Phát hiện ${j.flagged_count} cặp bài nộp có tỷ lệ trùng khớp >= ${threshold}%.`, j.flagged_count > 0 ? "danger" : "info");
        loadAntiCheatReports(contestId);
    } else {
        showAlert(j.detail || "Không thể quét gian lận.", "danger");
    }
});

async function openAntiCheatComparisonModal(reportId) {
    try {
        const res = await request("/api/admin/security/anti-cheat/reports");
        const { reports } = await res.json();
        const report = (reports || []).find(r => r.id === reportId);
        if (!report) { showAlert("Không tìm thấy báo cáo gian lận.", "danger"); return; }
        
        activeAntiCheatReport = report;
        document.getElementById("anticheat-modal-report-id").textContent = report.id;
        
        const scoreBadge = document.getElementById("anticheat-modal-score-badge");
        const scoreColor = report.similarity_score >= 80 ? "#f87171" : report.similarity_score >= 50 ? "#fb923c" : "#34d399";
        scoreBadge.innerHTML = `<span style="color:${scoreColor}; background:rgba(0,0,0,0.4); padding:4px 10px; border-radius:8px; border:1px solid ${scoreColor};">Độ tương đồng: ${report.similarity_score}%</span>`;

        document.getElementById("anticheat-user-a").textContent = report.username_1;
        document.getElementById("anticheat-sub-a-meta").textContent = `Submission #${report.submission_id_1}`;
        document.getElementById("anticheat-code-a").textContent = "Đang tải mã nguồn...";

        document.getElementById("anticheat-user-b").textContent = report.username_2;
        document.getElementById("anticheat-sub-b-meta").textContent = `Submission #${report.submission_id_2}`;
        document.getElementById("anticheat-code-b").textContent = "Đang tải mã nguồn...";

        document.getElementById("anticheat-modal-overlay").classList.add("open");

        // Fetch both submission details
        const [subA, subB] = await Promise.all([
            request(`/api/user/submissions/${report.submission_id_1}`).then(r => r.json()).catch(() => null),
            request(`/api/user/submissions/${report.submission_id_2}`).then(r => r.json()).catch(() => null),
        ]);

        if (subA && subA.code) document.getElementById("anticheat-code-a").textContent = subA.code;
        else document.getElementById("anticheat-code-a").textContent = "/* Không thể tải mã nguồn bài nộp A */";

        if (subB && subB.code) document.getElementById("anticheat-code-b").textContent = subB.code;
        else document.getElementById("anticheat-code-b").textContent = "/* Không thể tải mã nguồn bài nộp B */";

    } catch (e) {
        showAlert("Lỗi tải chi tiết đối chiếu: " + e.message, "danger");
    }
}

function closeAntiCheatModal() {
    document.getElementById("anticheat-modal-overlay").classList.remove("open");
    activeAntiCheatReport = null;
}

async function submitAntiCheatVerdict(verdict) {
    if (!activeAntiCheatReport) return;
    const res = await request("/api/admin/security/anti-cheat/verdict", {
        method: "POST",
        body: JSON.stringify({ report_id: activeAntiCheatReport.id, verdict })
    });
    const j = await res.json();
    showAlert(res.ok ? `Đã cập nhật phán quyết thành '${verdict}'.` : j.detail, res.ok ? "info" : "danger");
    closeAntiCheatModal();
    loadAntiCheatReports();
}

document.getElementById("btn-verdict-disqualify")?.addEventListener("click", () => submitAntiCheatVerdict("DISQUALIFIED"));
document.getElementById("btn-verdict-flagged")?.addEventListener("click", () => submitAntiCheatVerdict("FLAGGED"));
document.getElementById("btn-verdict-clean")?.addEventListener("click", () => submitAntiCheatVerdict("CLEAN"));

document.getElementById("refresh-sentinel-actions")?.addEventListener("click", loadSentinelActions);
document.getElementById("refresh-honeypot")?.addEventListener("click", loadHoneypotLogs);
document.getElementById("refresh-threats")?.addEventListener("click", loadThreatScores);
document.getElementById("refresh-blocked")?.addEventListener("click", loadBlockedIps);
document.getElementById("refresh-events")?.addEventListener("click", loadSecurityEvents);

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
        : `<tr><td colspan="4" style="text-align:center;color:var(--text-secondary);padding:36px 16px;">
            <i class="fa-solid fa-shield-check" style="font-size:2.2rem;color:#4ade80;margin-bottom:10px;opacity:0.85;display:block;"></i>
            <strong style="color:#fff;display:block;margin-bottom:4px;">Không có IP nào đang bị chặn</strong>
            <span style="font-size:0.8rem;">Tường lửa và hệ thống bảo mật đang hoạt động an toàn.</span>
          </td></tr>`;
    document.querySelectorAll("[data-unblock]").forEach(btn => btn.addEventListener("click", async () => {
        const ip = btn.dataset.unblock;
        if (!confirm(`Mở chặn IP ${ip}?`)) return;
        const res = await request(`/api/admin/security/blocked-ips/${encodeURIComponent(ip)}`, { method: "DELETE" });
        showAlert((await res.json()).message);
        loadBlockedIps();
        loadSentinelStatus();
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
        : `<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:36px 16px;">
            <i class="fa-solid fa-clipboard-check" style="font-size:2.2rem;color:var(--accent-cyan);margin-bottom:10px;opacity:0.85;display:block;"></i>
            <strong style="color:#fff;display:block;margin-bottom:4px;">Chưa có sự kiện bảo mật</strong>
            <span style="font-size:0.8rem;">Toàn bộ lượt truy cập máy chủ đều hợp lệ.</span>
          </td></tr>`;
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
    loadSentinelStatus();
});

// ── 5.1 DEV-ONLY: ANTI-CHEAT MASTER MONITOR ────────────────────────────────
async function loadAntiCheatMonitor() {
    try {
        const res = await request("/api/dev/anticheat-monitor/stats");
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            showAlert(errData.detail || "Không có quyền truy cập trang Giám sát Chống Gian lận DEV.", "danger");
            return;
        }
        const data = await res.json();
        
        document.getElementById("dev-ac-stat-total").textContent = data.total_reports || 0;
        document.getElementById("dev-ac-stat-flagged").textContent = data.flagged_count || 0;
        document.getElementById("dev-ac-stat-dq").textContent = data.disqualified_count || 0;
        document.getElementById("dev-ac-stat-clean").textContent = data.clean_count || 0;

        // Render Contest Breakdown Table
        const contestTbody = document.getElementById("dev-ac-contest-breakdown-tbody");
        if (contestTbody) {
            contestTbody.innerHTML = (data.contest_breakdown && data.contest_breakdown.length)
                ? data.contest_breakdown.map(c => `<tr>
                    <td><strong style="color:var(--text-bright);">${escapeHtml(c.title || 'Cuộc thi #' + c.competition_id)}</strong></td>
                    <td style="text-align:center; font-family:var(--font-code);">${c.report_count || 0}</td>
                    <td style="text-align:center; font-family:var(--font-code); color:${(c.avg_similarity || 0) >= 60 ? '#f87171' : '#34d399'};">${(c.avg_similarity || 0).toFixed(1)}%</td>
                    <td style="text-align:center;"><span class="badge ${c.dq_count > 0 ? 'locked' : 'user'}">${c.dq_count || 0} bài</span></td>
                </tr>`).join("")
                : `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-secondary);">Chưa có dữ liệu kỳ thi.</td></tr>`;
        }

        // Render Full Reports Table
        const fullTbody = document.getElementById("dev-ac-full-reports-tbody");
        if (fullTbody) {
            fullTbody.innerHTML = (data.recent_reports && data.recent_reports.length)
                ? data.recent_reports.map(r => {
                    let badgeClass = "badge user";
                    if (r.verdict === "PLAGIARISM_FLAGGED" || r.verdict === "DISQUALIFIED") badgeClass = "badge locked";
                    else if (r.verdict === "SUSPICIOUS" || r.verdict === "FLAGGED") badgeClass = "badge admin";
                    const scoreColor = r.similarity_score >= 80 ? "#f87171" : r.similarity_score >= 50 ? "#fb923c" : "#34d399";

                    return `<tr>
                        <td style="font-family:var(--font-code); font-size:.78rem;">#${r.id}</td>
                        <td style="font-size:.8rem; color:var(--text-secondary);">Comp #${r.competition_id}</td>
                        <td><strong style="color:var(--accent-cyan); font-size:0.85rem;">${escapeHtml(r.username_1)}</strong> <small>(#${r.submission_id_1})</small></td>
                        <td><strong style="color:#f472b6; font-size:0.85rem;">${escapeHtml(r.username_2)}</strong> <small>(#${r.submission_id_2})</small></td>
                        <td style="text-align:center;"><strong style="color:${scoreColor}; font-family:var(--font-code); font-size:.95rem;">${r.similarity_score}%</strong></td>
                        <td style="text-align:center;"><span class="${badgeClass}">${escapeHtml(r.verdict)}</span></td>
                        <td style="font-size:.74rem; color:var(--text-secondary); white-space:nowrap;">${new Date(r.created_at).toLocaleString("vi-VN")}</td>
                        <td style="text-align:right;">
                            <button class="btn-icon" onclick="openAntiCheatComparisonModal(${r.id})" style="background:rgba(168,85,247,0.15); color:#c084fc; border-color:#a855f7;">
                                <i class="fa-solid fa-code-compare"></i> Đối chiếu
                            </button>
                        </td>
                    </tr>`;
                }).join("")
                : `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-secondary);">Chưa phát hiện hành vi gian lận nào trong toàn bộ hệ thống.</td></tr>`;
        }

    } catch (e) {
        console.error("Lỗi tải Anti-Cheat Monitor:", e);
    }
}

document.getElementById("btn-refresh-dev-anticheat")?.addEventListener("click", loadAntiCheatMonitor);

let devWebMonitorInterval = null;

// ── 5.2 DEV-ONLY: WEB SECURITY & SENTINEL BOT MONITOR ──────────────────────
async function loadWebSecurityMonitor() {
    try {
        const res = await request("/api/dev/web-monitor/telemetry");
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            showAlert(errData.detail || "Không có quyền truy cập trang Giám sát Web & Sentinel Bot DEV.", "danger");
            return;
        }
        const data = await res.json();

        // 0. Update Bot Master Switch UI
        const isBotActive = data.bot_active !== false;
        const toggleInput = document.getElementById("dev-bot-master-toggle");
        const statusIndicator = document.getElementById("dev-bot-status-indicator");
        const statusText = document.getElementById("dev-bot-status-text");
        const slider = document.getElementById("dev-bot-slider");
        const knob = document.getElementById("dev-bot-knob");

        if (toggleInput && !toggleInput._isUserInteracting) {
            toggleInput.checked = isBotActive;
        }
        if (statusIndicator) {
            statusIndicator.style.background = isBotActive ? "#10b981" : "#f87171";
            statusIndicator.style.boxShadow = isBotActive ? "0 0 12px #10b981" : "0 0 12px #f87171";
        }
        if (statusText) {
            statusText.textContent = isBotActive ? "BOT ĐANG CHẠY LIÊN TỤC 24/7" : "BOT ĐÃ TẠM DỪNG";
            statusText.style.color = isBotActive ? "#34d399" : "#f87171";
        }
        if (slider) {
            slider.style.background = isBotActive ? "#10b981" : "rgba(239, 68, 68, 0.4)";
            slider.style.boxShadow = isBotActive ? "0 0 12px rgba(16,185,129,0.5)" : "0 0 12px rgba(239,68,68,0.3)";
        }
        if (knob) {
            knob.style.left = isBotActive ? "26px" : "4px";
        }

        // 1. Render Real-time Terminal TTY Logs & Live Action Stream
        const terminalBox = document.getElementById("dev-web-terminal-logs");
        if (terminalBox && data.action_stream && data.action_stream.length) {
            const lines = data.action_stream.slice(0, 20).map(a => {
                const isBan = a.action_type.includes("BAN");
                const isKill = a.action_type.includes("KILLSWITCH") || a.action_type.includes("LOCKED");
                const isHoneypot = a.action_type.includes("HONEYPOT") || a.action_type.includes("ESCALATION");
                const tagColor = isBan ? "#f87171" : isKill ? "#fb923c" : isHoneypot ? "#c084fc" : "#22d3ee";
                const target = a.target_ip || (a.target_user_id ? "USER#" + a.target_user_id : "SYS");
                return `<div style="margin-bottom:3px;"><span style="color:#64748b;">[${new Date(a.created_at).toLocaleTimeString("vi-VN")}]</span> <strong style="color:${tagColor};">[${escapeHtml(a.action_type)}]</strong> <span style="color:#f8fafc;">${escapeHtml(target)}</span> &gt;&gt; <span style="color:#94a3b8;">${escapeHtml(a.reason || '')}</span> ${a.details ? '<span style="color:#64748b;">(' + escapeHtml(a.details) + ')</span>' : ''}</div>`;
            }).join("");
            terminalBox.innerHTML = lines;
        }

        const streamTbody = document.getElementById("dev-web-action-stream-tbody");
        if (streamTbody) {
            streamTbody.innerHTML = (data.action_stream && data.action_stream.length)
                ? data.action_stream.map(a => `<tr>
                    <td style="font-size:.74rem; font-family:var(--font-code); color:var(--text-secondary); white-space:nowrap;">${new Date(a.created_at).toLocaleString("vi-VN")}</td>
                    <td><span class="badge ${a.action_type.includes('BAN') ? 'locked' : a.action_type.includes('KILLSWITCH') ? 'warn' : 'dev'}">${escapeHtml(a.action_type)}</span></td>
                    <td><code style="color:var(--accent-cyan); font-size:.78rem;">${escapeHtml(a.target_ip || (a.target_user_id ? 'User #' + a.target_user_id : 'System'))}</code></td>
                    <td style="font-size:.76rem; color:var(--text-secondary); max-width:280px; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(a.details || a.reason)}">${escapeHtml(a.reason || '')} ${a.details ? '<small>(' + escapeHtml(a.details) + ')</small>' : ''}</td>
                </tr>`).join("")
                : `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-secondary);">Chưa có hành động phản xạ nào từ Bot.</td></tr>`;
        }

        // 2. Render Locked Users List
        const lockedTbody = document.getElementById("dev-web-locked-users-tbody");
        if (lockedTbody) {
            lockedTbody.innerHTML = (data.locked_users && data.locked_users.length)
                ? data.locked_users.map(u => `<tr>
                    <td style="font-family:var(--font-code); font-size:.8rem;">#${u.id}</td>
                    <td><strong style="color:#f87171;">${escapeHtml(u.username)}</strong></td>
                    <td style="font-size:.78rem; color:var(--text-secondary);">${escapeHtml(u.email || '—')}</td>
                    <td><span class="badge ${u.role === 'admin' ? 'admin' : 'user'}">${escapeHtml(u.role)}</span></td>
                    <td style="text-align:right;">
                        <button class="btn-icon" onclick="devQuickUnlock(${u.id})" style="color:#34d399; border-color:#10b981;"><i class="fa-solid fa-lock-open"></i> Mở khóa</button>
                    </td>
                </tr>`).join("")
                : `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-secondary);">Không có tài khoản nào bị khóa.</td></tr>`;
        }

        // 3. Render Monitored Entities Radar Table
        const radarTbody = document.getElementById("dev-web-monitored-entities-tbody");
        if (radarTbody) {
            radarTbody.innerHTML = (data.monitored_entities && data.monitored_entities.length)
                ? data.monitored_entities.map(e => {
                    const isCrit = e.score >= 100;
                    const isWarn = e.score >= 30;
                    const scoreColor = isCrit ? "#f87171" : isWarn ? "#fb923c" : "#34d399";
                    const isDev = (e.role || "").toLowerCase() === "dev";

                    return `<tr>
                        <td><span class="ip-badge">${escapeHtml(e.ip)}</span></td>
                        <td>${e.username ? '<strong style="color:var(--text-bright);">' + escapeHtml(e.username) + '</strong>' : '<span style="color:var(--text-secondary);">Khách / Scanner</span>'}</td>
                        <td><span class="badge ${isDev ? 'dev' : e.role === 'superadmin' ? 'superadmin' : e.role === 'admin' ? 'admin' : 'user'}">${isDev ? '🛡️ DEV (IMMUNE)' : escapeHtml(e.role || 'Guest')}</span></td>
                        <td style="text-align:center;"><strong style="color:${scoreColor}; font-family:var(--font-code);">${e.score} pts</strong></td>
                        <td style="text-align:center; font-family:var(--font-code);">${e.violation_count || 0}</td>
                        <td style="font-size:.76rem; color:var(--text-secondary); max-width:180px; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(e.last_violation || 'N/A')}</td>
                        <td style="text-align:center;">
                            ${isDev ? '<span class="badge dev" style="background:rgba(168,85,247,0.15); color:#c084fc; border-color:#a855f7;">🛡️ IMMUNE</span>' : (e.is_banned ? '<span class="badge locked">BANNED IP</span>' : e.is_locked ? '<span class="badge locked">LOCKED ACC</span>' : '<span class="badge user" style="background:rgba(16,185,129,0.15); color:#34d399; border-color:#10b981;">SAFE</span>')}
                        </td>
                        <td style="text-align:right;">
                            ${isDev ? '<span style="color:var(--accent-cyan); font-size:0.75rem;">Miễn trừ</span>' : `
                                <div style="display:inline-flex; gap:6px;">
                                    <button class="btn-icon danger" onclick="devDirectBanEntity('${escapeHtml(e.ip)}', ${e.user_id || 'null'})" title="Khóa ngay"><i class="fa-solid fa-ban"></i></button>
                                    <button class="btn-icon" onclick="devDirectUnbanEntity('${escapeHtml(e.ip)}', ${e.user_id || 'null'})" title="Mở khóa"><i class="fa-solid fa-rotate-left"></i></button>
                                </div>
                            `}
                        </td>
                    </tr>`;
                }).join("")
                : `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-secondary);">Chưa có entity nào vi phạm. Mọi kết nối đều an toàn.</td></tr>`;
        }

    } catch (e) {
        console.error("Lỗi tải Web Monitor Telemetry:", e);
    }
}

document.getElementById("btn-refresh-dev-web-monitor")?.addEventListener("click", loadWebSecurityMonitor);
document.getElementById("btn-refresh-dev-bot-actions")?.addEventListener("click", loadWebSecurityMonitor);

document.getElementById("btn-clear-terminal-logs")?.addEventListener("click", () => {
    const terminalBox = document.getElementById("dev-web-terminal-logs");
    if (terminalBox) terminalBox.innerHTML = '<div style="color:var(--text-muted);">[SYSTEM] Màn hình console đã được xóa sạch. Đang đợi sự kiện tiếp theo...</div>';
});

document.getElementById("dev-bot-master-toggle")?.addEventListener("change", async (e) => {
    const active = e.target.checked;
    e.target._isUserInteracting = true;
    try {
        const res = await request("/api/dev/web-monitor/toggle-bot", {
            method: "POST",
            body: JSON.stringify({ active })
        });
        const j = await res.json();
        showAlert(res.ok ? j.message : (j.detail || "Lỗi thay đổi trạng thái Bot"), res.ok ? (active ? "info" : "warn") : "danger");
        loadWebSecurityMonitor();
    } catch (err) {
        showAlert("Lỗi kết nối tới máy chủ.", "danger");
    } finally {
        setTimeout(() => { e.target._isUserInteracting = false; }, 1500);
    }
});

document.getElementById("btn-dev-direct-ban")?.addEventListener("click", async () => {
    const val = document.getElementById("dev-ban-target-input").value.trim();
    if (!val) { showAlert("Vui lòng nhập IP hoặc User ID cần khóa khẩn cấp.", "danger"); return; }
    if (!confirm(`Khóa khẩn cấp đối tượng '${val}'?`)) return;
    
    const isId = /^\d+$/.test(val);
    const body = isId ? { user_id: parseInt(val), reason: "Dev Direct Emergency Ban" } : { ip: val, reason: "Dev Direct Emergency Ban" };
    const res = await request("/api/dev/web-monitor/ban-user", { method: "POST", body: JSON.stringify(body) });
    const j = await res.json();
    showAlert(res.ok ? j.message : j.detail, res.ok ? "info" : "danger");
    document.getElementById("dev-ban-target-input").value = "";
    loadWebSecurityMonitor();
});

document.getElementById("btn-dev-direct-unban")?.addEventListener("click", async () => {
    const val = document.getElementById("dev-ban-target-input").value.trim();
    if (!val) { showAlert("Vui lòng nhập IP hoặc User ID cần mở khóa.", "danger"); return; }
    const isId = /^\d+$/.test(val);
    const body = isId ? { user_id: parseInt(val) } : { ip: val };
    const res = await request("/api/dev/web-monitor/unban", { method: "POST", body: JSON.stringify(body) });
    const j = await res.json();
    showAlert(res.ok ? j.message : j.detail, res.ok ? "info" : "danger");
    document.getElementById("dev-ban-target-input").value = "";
    loadWebSecurityMonitor();
});

window.devQuickUnlock = async function(userId) {
    if (!confirm(`Mở khóa cho tài khoản User #${userId}?`)) return;
    const res = await request("/api/dev/web-monitor/unban", { method: "POST", body: JSON.stringify({ user_id: userId }) });
    const j = await res.json();
    showAlert(res.ok ? j.message : j.detail, res.ok ? "info" : "danger");
    loadWebSecurityMonitor();
};

window.devDirectBanEntity = async function(ip, userId) {
    if (!confirm(`Khóa đối tượng IP '${ip}' / User #${userId}?`)) return;
    const res = await request("/api/dev/web-monitor/ban-user", { method: "POST", body: JSON.stringify({ ip: ip || null, user_id: userId || null, reason: "Dev Table Direct Action" }) });
    const j = await res.json();
    showAlert(res.ok ? j.message : j.detail, res.ok ? "info" : "danger");
    loadWebSecurityMonitor();
};

window.devDirectUnbanEntity = async function(ip, userId) {
    if (!confirm(`Mở khóa đối tượng IP '${ip}' / User #${userId}?`)) return;
    const res = await request("/api/dev/web-monitor/unban", { method: "POST", body: JSON.stringify({ ip: ip || null, user_id: userId || null }) });
    const j = await res.json();
    showAlert(res.ok ? j.message : j.detail, res.ok ? "info" : "danger");
    loadWebSecurityMonitor();
};

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
        contestSelectedProblems = item.problems || [];
        renderContestSelectedChips();
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
            contestSelectedProblems = [];
            renderContestSelectedChips();
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

let bankSelectedProbIds = new Set();

async function loadProblemsBank() {
    const res = await request("/api/admin/problems");
    if (!res.ok) return;
    allBankProblems = await res.json();
    populateProblemContestFilter();
    renderProblemsBank();
}

function populateProblemContestFilter() {
    const sel = document.getElementById("problem-contest-filter");
    if (!sel) return;
    const currentVal = sel.value || "all";
    const contests = new Map();
    allBankProblems.forEach(p => {
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

function renderProblemsBank() {
    const q = (document.getElementById("problem-bank-search")?.value || "").trim().toLowerCase();
    const statusFilter = document.getElementById("problem-status-filter")?.value || "all";
    const contestFilter = document.getElementById("problem-contest-filter")?.value || "all";
    const tbody = document.getElementById("problems-bank-tbody");
    if (!tbody) return;

    // Calculate metric stats
    const totalCount = allBankProblems.length;
    const hiddenCount = allBankProblems.filter(p => p.is_hidden).length;
    const activeCount = totalCount - hiddenCount;
    let totalTests = 0;
    allBankProblems.forEach(p => { totalTests += (p.test_count || 0); });

    const elTotal = document.getElementById("prob-stat-total");
    const elActive = document.getElementById("prob-stat-active");
    const elHidden = document.getElementById("prob-stat-hidden");
    const elTests = document.getElementById("prob-stat-tests");
    if (elTotal) elTotal.textContent = totalCount.toLocaleString("vi-VN");
    if (elActive) elActive.textContent = activeCount.toLocaleString("vi-VN");
    if (elHidden) elHidden.textContent = hiddenCount.toLocaleString("vi-VN");
    if (elTests) elTests.textContent = totalTests.toLocaleString("vi-VN");

    const filtered = allBankProblems.filter(p => {
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
        updateBankSelectedCount();
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const isHidden = Boolean(p.is_hidden);
        const isChecked = bankSelectedProbIds.has(p.id);
        const statusBadge = isHidden 
            ? '<span class="badge" style="background:rgba(245,158,11,0.15); color:#fbbf24; border:1px solid rgba(245,158,11,0.3); font-weight:700;"><i class="fa-solid fa-eye-slash"></i> TẠM ẨN</span>'
            : '<span class="badge" style="background:rgba(52,211,153,0.15); color:#34d399; border:1px solid rgba(52,211,153,0.3); font-weight:700;"><i class="fa-solid fa-eye"></i> HIỂN THỊ</span>';

        const toggleBtnIcon = isHidden ? "fa-solid fa-eye" : "fa-solid fa-eye-slash";
        const toggleBtnTitle = isHidden ? "Mở hiển thị bài tập cho thí sinh" : "Tạm ẩn bài tập không cho thí sinh thấy";
        const toggleBtnStyle = isHidden ? "color:#34d399; border-color:rgba(52,211,153,0.35);" : "color:#f59e0b; border-color:rgba(245,158,11,0.35);";

        return `
            <tr style="${isHidden ? 'opacity:0.75; background:rgba(245,158,11,0.02);' : ''}">
                <td style="text-align:center;">
                    <input type="checkbox" class="prob-row-cb" data-id="${p.id}" ${isChecked ? 'checked' : ''} onchange="toggleBankProbSelect(${p.id}, this.checked)" style="cursor:pointer; transform:scale(1.15);">
                </td>
                <td><strong style="color:var(--accent-cyan); font-family:var(--font-code); font-size:0.95rem;">${escapeHtml(p.code || 'A')}</strong></td>
                <td>
                    <div style="font-weight:700; color:var(--text-bright); font-size:0.92rem; display:flex; align-items:center; gap:8px;">
                        ${escapeHtml(p.title || 'Không tiêu đề')}
                    </div>
                    <small style="color:var(--text-secondary);">${escapeHtml((p.statement || '').slice(0, 80))}...</small>
                </td>
                <td><span style="font-size:0.8rem; color:var(--text-secondary);"><i class="fa-solid fa-flag-checkered" style="font-size:0.75rem; color:var(--accent-cyan);"></i> ${escapeHtml(p.contest_title || 'Kho tự do')}</span></td>
                <td style="text-align:center;">${statusBadge}</td>
                <td style="text-align:center; font-family:var(--font-code); font-size:0.8rem;">
                    <span style="color:var(--accent-cyan); font-weight:700;">${p.points ?? 100}p</span> · <span style="color:var(--text-secondary);">${p.time_limit ?? 1.0}s / ${p.memory_limit ?? 256}MB</span>
                </td>
                <td style="text-align:center;"><span class="badge admin" style="font-weight:700;">${p.test_count ?? 0} tests</span></td>
                <td style="text-align:right; white-space:nowrap;">
                    <button class="btn-icon" style="${toggleBtnStyle}" onclick="toggleProblemVisibility(${p.id})" title="${toggleBtnTitle}"><i class="${toggleBtnIcon}"></i> ${isHidden ? 'Hiện' : 'Ẩn'}</button>
                    <button class="btn-icon" style="border-color:rgba(56,189,248,0.4); color:#38bdf8;" onclick="openViewTestCasesModal('${p.code || p.id}')" title="Xem chi tiết bộ Test Cases"><i class="fa-solid fa-vial-circle-check"></i> Tests (${p.test_count ?? 0})</button>
                    <button class="btn-icon" onclick="openEditProblemModal(${p.id})" title="Chỉnh sửa Đề bài"><i class="fa-solid fa-pen"></i> Sửa</button>
                    <button class="btn-icon" style="border-color:rgba(168,85,247,0.4); color:#c084fc;" onclick="openTestModal(${p.id})" title="Chỉnh sửa / AI sinh tests"><i class="fa-solid fa-wand-magic-sparkles"></i> Sửa Tests</button>
                    <button class="btn-icon danger" onclick="deleteProblem(${p.id})" title="Xóa Bài tập"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join("");

    updateBankSelectedCount();
}

window.toggleBankProbSelect = function(id, isChecked) {
    if (isChecked) bankSelectedProbIds.add(id);
    else bankSelectedProbIds.delete(id);
    updateBankSelectedCount();
};

document.getElementById("prob-bank-master-cb")?.addEventListener("change", function() {
    const checked = this.checked;
    document.querySelectorAll(".prob-row-cb").forEach(cb => {
        cb.checked = checked;
        const id = parseInt(cb.getAttribute("data-id"));
        if (checked) bankSelectedProbIds.add(id);
        else bankSelectedProbIds.delete(id);
    });
    updateBankSelectedCount();
});

function updateBankSelectedCount() {
    const el = document.getElementById("prob-selected-count-badge");
    if (el) el.innerHTML = `Chọn: <strong style="color:#38bdf8;">${bankSelectedProbIds.size}</strong> bài`;
}

window.toggleProblemVisibility = async function(probId) {
    try {
        const res = await request(`/api/admin/problems/${probId}/toggle-visibility`, { method: "POST" });
        if (!res.ok) throw new Error("Không thể thay đổi trạng thái ẩn/hiện.");
        const data = await res.json();
        
        // Update local object
        const found = allBankProblems.find(p => p.id === probId);
        if (found) found.is_hidden = data.data.is_hidden;
        
        renderProblemsBank();
        showAlert(`✓ ${data.message}`, "success");
    } catch (err) {
        showAlert(`Lỗi: ${err.message}`, "danger");
    }
};

window.bulkActionProblems = async function(action) {
    if (bankSelectedProbIds.size === 0) {
        showAlert("Vui lòng tích chọn ít nhất 1 bài tập để thực hiện thao tác.", "warning");
        return;
    }
    const actionText = action === "hide" ? "TẠM ẨN" : (action === "unhide" ? "HIỂN THỊ" : "XÓA VĨNH VIỄN");
    if (!confirm(`XÁC NHẬN: Bạn có chắc chắn muốn ${actionText} ${bankSelectedProbIds.size} bài tập đã chọn?`)) return;

    try {
        const res = await request("/api/admin/problems/bulk-action", {
            method: "POST",
            body: JSON.stringify({
                problem_ids: Array.from(bankSelectedProbIds),
                action: action
            })
        });
        if (!res.ok) throw new Error("Thao tác hàng loạt thất bại.");
        const data = await res.json();
        showAlert(`✓ Đã ${actionText.toLowerCase()} thành công ${data.affected} bài tập!`, "success");
        bankSelectedProbIds.clear();
        document.getElementById("prob-bank-master-cb").checked = false;
        loadProblemsBank();
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

document.getElementById("problem-bank-search")?.addEventListener("input", renderProblemsBank);
document.getElementById("problem-status-filter")?.addEventListener("change", renderProblemsBank);
document.getElementById("problem-contest-filter")?.addEventListener("change", renderProblemsBank);

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
    document.getElementById("edit-prob-hidden").checked = false;
    document.getElementById("problem-modal-title").innerHTML = '<i class="fa-solid fa-plus-circle"></i> Tạo Bài tập mới trong Kho';
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
        loadProblemsBank();
    } else {
        const j = await res.json();
        showAlert(j.detail || "Không thể lưu bài tập.", "danger");
    }
});

window.deleteProblem = async function(probId) {
    const found = allBankProblems.find(p => p.id === probId);
    const title = found ? `[${found.code}] ${found.title}` : `bài tập #${probId}`;
    if (!confirm(`XÁC NHẬN XÓA: Bạn có chắc chắn muốn xóa vĩnh viễn ${title} cùng toàn bộ test cases liên quan?`)) return;
    const res = await request(`/api/admin/problems/${probId}`, { method: "DELETE" });
    if (res.ok) {
        showAlert("✓ Đã xóa bài tập thành công!", "success");
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

let allSubmissionsData = [];

async function loadSubmissions() {
    try {
        const res = await request("/api/admin/submissions?limit=100");
        if (!res.ok) return;
        allSubmissionsData = await res.json();
        renderSubmissionsTable();
    } catch (e) {
        console.error("Lỗi tải danh sách bài nộp:", e);
    }
}

function renderSubmissionsTable() {
    const q = (document.getElementById("sub-search-input")?.value || "").trim().toLowerCase();
    const verdictFilter = document.getElementById("sub-verdict-filter")?.value || "";
    const langFilter = document.getElementById("sub-lang-filter")?.value || "";

    const tbody = document.getElementById("submissions-tbody");
    if (!tbody) return;

    const filtered = allSubmissionsData.filter(s => {
        const matchQ = !q || String(s.id).includes(q) || (s.username || "").toLowerCase().includes(q) || (s.competition_title || "").toLowerCase().includes(q);
        const matchV = !verdictFilter || (s.verdict || "").toUpperCase() === verdictFilter;
        const matchL = !langFilter || (s.language || "").toLowerCase().includes(langFilter);
        return matchQ && matchV && matchL;
    });

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--text-secondary);">Không tìm thấy bài nộp nào phù hợp.</td></tr>';
        const cntEl = document.getElementById("submissions-count");
        if (cntEl) cntEl.textContent = `Tổng số 0 / ${allSubmissionsData.length} bài nộp.`;
        return;
    }

    tbody.innerHTML = filtered.map(s => {
        let vBadge = `<span class="badge admin">${escapeHtml(s.verdict || "PENDING")}</span>`;
        const v = (s.verdict || "").toUpperCase();
        if (v === "AC") vBadge = `<span style="color:#22c55e; font-weight:700;"><i class="fa-solid fa-circle-check"></i> AC</span>`;
        else if (v === "WA") vBadge = `<span style="color:#ef4444; font-weight:700;"><i class="fa-solid fa-circle-xmark"></i> WA</span>`;
        else if (v === "TLE") vBadge = `<span style="color:#f59e0b; font-weight:700;"><i class="fa-solid fa-clock"></i> TLE</span>`;
        else if (v === "CE") vBadge = `<span style="color:#3b82f6; font-weight:700;"><i class="fa-solid fa-code"></i> CE</span>`;
        else if (v === "RTE") vBadge = `<span style="color:#a855f7; font-weight:700;"><i class="fa-solid fa-bug"></i> RTE</span>`;

        const dt = s.created_at ? new Date(s.created_at).toLocaleString("vi-VN") : "--";
        const lang = s.language || "cpp";
        const execTime = s.execution_time_ms != null ? `${s.execution_time_ms}ms` : "--";
        const memKb = s.memory_kb != null ? `${s.memory_kb} KB` : "--";

        return `<tr style="cursor:pointer;" onclick="openSubmissionModal(${s.id})">
            <td><strong style="color:var(--accent-cyan); font-family:var(--font-code);">#${s.id}</strong></td>
            <td><strong>${escapeHtml(s.username || "Thí sinh")}</strong></td>
            <td>${escapeHtml(s.competition_title || "Bài tập")}</td>
            <td style="text-align:center;"><span style="font-size:0.75rem; padding:2px 8px; border-radius:4px; background:rgba(34,211,238,0.1); color:var(--accent-cyan); font-family:var(--font-code);">${escapeHtml(lang)}</span></td>
            <td style="text-align:center;">${vBadge}</td>
            <td style="text-align:center; font-weight:700; font-family:var(--font-code); color:var(--text-bright);">${s.score || 0}</td>
            <td style="text-align:center; font-family:var(--font-code); color:var(--text-secondary);">${execTime}</td>
            <td style="text-align:center; font-family:var(--font-code); color:var(--text-secondary);">${memKb}</td>
            <td style="font-size:0.8rem; color:var(--text-secondary);">${dt}</td>
            <td style="text-align:center;" onclick="event.stopPropagation()">
                <button class="btn-icon" onclick="openSubmissionModal(${s.id})" title="Xem Mã nguồn &amp; Chi tiết"><i class="fa-solid fa-code"></i> Xem Code</button>
            </td>
        </tr>`;
    }).join("");

    const cntEl = document.getElementById("submissions-count");
    if (cntEl) cntEl.textContent = `Hiển thị ${filtered.length} / ${allSubmissionsData.length} bài nộp.`;
}

window.openSubmissionModal = function(subId) {
    const sub = allSubmissionsData.find(s => s.id === subId);
    if (!sub) return;

    document.getElementById("sub-modal-id").textContent = sub.id;
    document.getElementById("sub-modal-meta").innerHTML = `
        <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:0.85rem; color:var(--text-secondary); background:rgba(0,0,0,0.3); padding:10px 14px; border-radius:8px; border:1px solid var(--border-color);">
            <div>Thí sinh: <strong style="color:var(--text-bright);">${escapeHtml(sub.username || "Thí sinh")}</strong></div>
            <div>Cuộc thi: <strong style="color:var(--text-bright);">${escapeHtml(sub.competition_title || "Bài tập")}</strong></div>
            <div>Ngôn ngữ: <strong style="color:var(--accent-cyan);">${escapeHtml(sub.language || "cpp")}</strong></div>
            <div>Verdict: <strong style="color:${sub.verdict === 'AC' ? '#22c55e' : '#ef4444'};">${escapeHtml(sub.verdict || "PENDING")}</strong></div>
            <div>Điểm: <strong>${sub.score || 0}</strong></div>
            <div>Thời gian: <strong>${sub.execution_time_ms || 0}ms</strong></div>
            <div>Bộ nhớ: <strong>${sub.memory_kb || 0} KB</strong></div>
        </div>
    `;

    document.getElementById("sub-modal-code").textContent = sub.code || "// Không có mã nguồn lưu trữ cho bài nộp này.";

    const compilerBox = document.getElementById("sub-modal-compiler-box");
    const compilerOut = document.getElementById("sub-modal-compiler-out");
    if (sub.compiler_output) {
        compilerBox.hidden = false;
        compilerOut.textContent = sub.compiler_output;
    } else {
        compilerBox.hidden = true;
    }

    document.getElementById("submission-detail-modal-overlay").classList.add("open");
};

window.closeSubmissionModal = function() {
    document.getElementById("submission-detail-modal-overlay").classList.remove("open");
};

document.getElementById("sub-search-input")?.addEventListener("input", renderSubmissionsTable);
document.getElementById("sub-verdict-filter")?.addEventListener("change", renderSubmissionsTable);
document.getElementById("sub-lang-filter")?.addEventListener("change", renderSubmissionsTable);
document.getElementById("refresh-submissions")?.addEventListener("click", loadSubmissions);

document.querySelectorAll(".admin-nav,[data-go]").forEach(btn => btn.addEventListener("click", () => {
    const view = btn.dataset.view || btn.dataset.go;
    const role = (currentUser?.role || "").toLowerCase();
    const level = currentUser ? userLevel(currentUser) : 0;

    if (view === "github" || view === "anticheat_monitor" || view === "web_monitor" || view === "bot_actions" || view === "data_storage") {
        if (role !== "dev" && level < 9) {
            showAlert("Chỉ tài khoản DEV mới có quyền truy cập trang quản trị đặc quyền này.", "danger");
            return;
        }
    }
    document.querySelectorAll(".admin-view").forEach(p => p.classList.toggle("active", p.dataset.viewPanel === view));
    document.querySelectorAll(".admin-nav").forEach(n => n.classList.toggle("active", n.dataset.view === view));
    document.getElementById("page-title").textContent = views[view] || "Control Center";
    
    // Manage real-time auto-polling for web_monitor & bot_actions
    if (devWebMonitorInterval) {
        clearInterval(devWebMonitorInterval);
        devWebMonitorInterval = null;
    }

    if (view === "overview") loadOverview();
    if (view === "monitoring") { loadJudges(); loadMonitoring(); }
    if (view === "submissions") loadSubmissions();
    if (view === "github") loadGitHubConfig();
    if (view === "members") loadMembers();
    if (view === "security") loadSecurity();
    if (view === "contests") loadContests();
    if (view === "problems") loadProblemsBank();
    if (view === "anticheat_monitor") loadAntiCheatMonitor();
    if (view === "data_storage") loadStorageStats();
    if (view === "notifs") loadAdminNotifications();
    if (view === "web_monitor" || view === "bot_actions") {
        loadWebSecurityMonitor();
        devWebMonitorInterval = setInterval(loadWebSecurityMonitor, 3000);
    }
}));

// ── CONTEST PROBLEMS BUILDER & PROBLEM BANK PICKER ────────────────────────
let contestSelectedProblems = [];
let modalAllBankProblems = [];
let modalSelectedCodes = new Set();

function renderContestSelectedChips() {
    const container = document.getElementById("contest-selected-chips-list");
    const countEl = document.getElementById("contest-selected-count");
    const jsonArea = document.getElementById("contest-problems");
    if (countEl) countEl.textContent = contestSelectedProblems.length;

    if (!container) return;

    if (contestSelectedProblems.length === 0) {
        container.innerHTML = `<div style="color: #64748b; font-size: 0.8rem; font-style: italic; text-align: center; padding: 16px;">Chưa chọn bài tập nào. Bấm nút "Chọn bài từ Kho bài tập" ở trên để tích chọn bài.</div>`;
        if (jsonArea) jsonArea.value = "[]";
        return;
    }

    container.innerHTML = contestSelectedProblems.map((p, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(30,41,59,0.7); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px 12px; gap:10px;">
            <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                <span style="font-family:var(--font-code); font-weight:800; color:#38bdf8; font-size:0.8rem; background:rgba(56,189,248,0.1); padding:2px 8px; border-radius:6px;">${p.code || 'P' + (idx+1)}</span>
                <span style="font-size:0.84rem; font-weight:600; color:#f8fafc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(p.title || '')}">${escapeHtml(p.title || '')}</span>
                ${p.chapter_title ? `<span style="font-size:0.72rem; color:#94a3b8; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">${escapeHtml(p.chapter_title)}</span>` : ''}
                <span style="font-size:0.72rem; color:#a78bfa;"><i class="fa-solid fa-vial"></i> ${(p.tests || []).length} tests</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <label style="font-size:0.75rem; color:#94a3b8; display:flex; align-items:center; gap:4px;">
                    Điểm: <input type="number" value="${p.points || 100}" onchange="updateContestProblemPoints(${idx}, this.value)" style="width:60px; padding:3px 6px; font-size:0.78rem; background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#fbbf24; text-align:right;">
                </label>
                <button type="button" onclick="removeContestProblem(${idx})" style="background:none; border:none; color:#ef4444; font-size:0.9rem; cursor:pointer; padding:4px 6px;" title="Gỡ bài này khỏi cuộc thi"><i class="fa-solid fa-xmark"></i></button>
            </div>
        </div>
    `).join("");

    if (jsonArea) {
        jsonArea.value = JSON.stringify(contestSelectedProblems, null, 2);
    }
}

window.updateContestProblemPoints = function(idx, val) {
    if (contestSelectedProblems[idx]) {
        contestSelectedProblems[idx].points = parseInt(val) || 100;
        const jsonArea = document.getElementById("contest-problems");
        if (jsonArea) jsonArea.value = JSON.stringify(contestSelectedProblems, null, 2);
    }
};

window.removeContestProblem = function(idx) {
    contestSelectedProblems.splice(idx, 1);
    renderContestSelectedChips();
};

document.getElementById("clear-all-contest-problems-btn")?.addEventListener("click", () => {
    if (contestSelectedProblems.length === 0) return;
    if (confirm("Bạn có chắc muốn xóa tất cả các bài tập đã chọn khỏi cuộc thi này?")) {
        contestSelectedProblems = [];
        renderContestSelectedChips();
    }
});

async function openProblemPickerModal() {
    const modal = document.getElementById("problem-picker-modal");
    if (!modal) return;
    modal.style.display = "flex";

    // Initialize selected codes from current contestSelectedProblems
    modalSelectedCodes = new Set((contestSelectedProblems || []).map(p => (p.code || '').toUpperCase()));
    updateModalSelectedCountBadge();

    // Fetch problem bank if not loaded
    if (modalAllBankProblems.length === 0) {
        try {
            const res = await request("/api/problem-bank?limit=300");
            const data = await res.json();
            modalAllBankProblems = data.problems || [];

            // Populate chapter dropdown
            const chapSelect = document.getElementById("modal-chapter-filter");
            if (chapSelect && chapSelect.options.length <= 1) {
                const chaptersMap = new Map();
                modalAllBankProblems.forEach(p => {
                    if (p.chapter_num && !chaptersMap.has(p.chapter_num)) {
                        chaptersMap.set(p.chapter_num, p.chapter_title || `Chương ${p.chapter_num}`);
                    }
                });
                [...chaptersMap.entries()].sort((a,b) => a[0] - b[0]).forEach(([num, title]) => {
                    const opt = document.createElement("option");
                    opt.value = num;
                    opt.textContent = `${title}`;
                    chapSelect.appendChild(opt);
                });
            }
        } catch (err) {
            console.error("Lỗi tải kho bài tập cho modal:", err);
            showAlert("Không thể tải danh sách bài tập từ kho.", "danger");
        }
    }

    renderModalProblemTable();
}

function closeProblemPickerModal() {
    const modal = document.getElementById("problem-picker-modal");
    if (modal) modal.style.display = "none";
}

function updateModalSelectedCountBadge() {
    const badge = document.getElementById("modal-selected-count-badge");
    if (badge) badge.textContent = modalSelectedCodes.size;
}

function getFilteredModalProblems() {
    const chapSelect = document.getElementById("modal-chapter-filter");
    const searchInput = document.getElementById("modal-problem-search");
    const chapFilter = chapSelect ? parseInt(chapSelect.value) || 0 : 0;
    const searchStr = (searchInput ? searchInput.value.trim() : "").toLowerCase();

    return modalAllBankProblems.filter(p => {
        if (chapFilter > 0 && p.chapter_num !== chapFilter) return false;
        if (searchStr) {
            const matchTitle = (p.title || "").toLowerCase().includes(searchStr);
            const matchCode = (p.code || "").toLowerCase().includes(searchStr);
            const matchChap = (p.chapter_title || "").toLowerCase().includes(searchStr);
            if (!matchTitle && !matchCode && !matchChap) return false;
        }
        return true;
    });
}

function renderModalProblemTable() {
    const tbody = document.getElementById("modal-problems-tbody");
    if (!tbody) return;

    const filtered = getFilteredModalProblems();
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;"><i class="fa-solid fa-magnifying-glass" style="font-size:1.5rem; margin-bottom:8px; display:block;"></i>Không tìm thấy bài tập phù hợp</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const codeUpper = (p.code || "").toUpperCase();
        const isChecked = modalSelectedCodes.has(codeUpper);
        return `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
                <td style="padding:10px 8px; text-align:center;">
                    <input type="checkbox" class="modal-problem-cb" data-code="${codeUpper}" ${isChecked ? 'checked' : ''} onchange="toggleModalProblemSelection('${codeUpper}', this.checked)" style="cursor:pointer; transform:scale(1.15);">
                </td>
                <td style="padding:10px 8px; font-family:var(--font-code); font-weight:700; color:#38bdf8;">${p.code}</td>
                <td style="padding:10px 8px; font-weight:600; color:#f8fafc;">${escapeHtml(p.title || '')}</td>
                <td style="padding:10px 8px; font-size:0.78rem; color:#94a3b8;">${escapeHtml(p.chapter_title || '')}</td>
                <td style="padding:10px 8px; font-size:0.8rem; color:#a78bfa;"><i class="fa-solid fa-vial"></i> ${p.test_count || 3} tests</td>
                <td style="padding:10px 8px; font-size:0.8rem; color:#fbbf24; text-align:right; font-weight:700;">100 pts</td>
            </tr>
        `;
    }).join("");

    updateModalSelectedCountBadge();
}

window.toggleModalProblemSelection = function(codeUpper, isChecked) {
    if (isChecked) {
        modalSelectedCodes.add(codeUpper);
    } else {
        modalSelectedCodes.delete(codeUpper);
    }
    updateModalSelectedCountBadge();
};

async function applySelectedProblemsToContest() {
    if (modalSelectedCodes.size === 0) {
        if (!confirm("Bạn chưa tích chọn bài tập nào. Bạn có muốn làm trống danh sách bài tập của cuộc thi?")) return;
        contestSelectedProblems = [];
        renderContestSelectedChips();
        closeProblemPickerModal();
        return;
    }

    showAlert("Đang nạp dữ liệu chi tiết các bài tập đã chọn...");
    
    // Map selected codes to full problem definitions
    const newSelected = [];
    for (const code of modalSelectedCodes) {
        const found = modalAllBankProblems.find(p => (p.code || '').toUpperCase() === code);
        if (found) {
            let fullTests = found.tests || [];
            let fullStatement = found.statement || '';
            if (!fullTests.length || !fullStatement) {
                try {
                    const res = await request(`/api/problem-bank/${found.code}`);
                    if (res.ok) {
                        const detail = await res.json();
                        fullTests = detail.tests || [];
                        fullStatement = detail.statement || '';
                    }
                } catch (e) {
                    console.error("Lỗi nạp chi tiết bài:", e);
                }
            }

            newSelected.push({
                code: found.code,
                title: found.title,
                chapter_title: found.chapter_title,
                points: 100,
                statement: fullStatement,
                tests: fullTests
            });
        }
    }

    contestSelectedProblems = newSelected;
    renderContestSelectedChips();
    closeProblemPickerModal();
    showAlert(`Đã thêm thành công ${contestSelectedProblems.length} bài tập vào cuộc thi!`, "info");
}

document.getElementById("open-problem-picker-btn")?.addEventListener("click", openProblemPickerModal);
document.getElementById("close-problem-picker-modal")?.addEventListener("click", closeProblemPickerModal);
document.getElementById("modal-cancel-btn")?.addEventListener("click", closeProblemPickerModal);
document.getElementById("modal-apply-btn")?.addEventListener("click", applySelectedProblemsToContest);
document.getElementById("modal-chapter-filter")?.addEventListener("change", renderModalProblemTable);
document.getElementById("modal-problem-search")?.addEventListener("input", renderModalProblemTable);

document.getElementById("modal-select-all-btn")?.addEventListener("click", () => {
    const filtered = getFilteredModalProblems();
    filtered.forEach(p => modalSelectedCodes.add((p.code || '').toUpperCase()));
    renderModalProblemTable();
});

document.getElementById("modal-deselect-all-btn")?.addEventListener("click", () => {
    const filtered = getFilteredModalProblems();
    filtered.forEach(p => modalSelectedCodes.delete((p.code || '').toUpperCase()));
    renderModalProblemTable();
});

document.getElementById("modal-master-checkbox")?.addEventListener("change", (e) => {
    const filtered = getFilteredModalProblems();
    if (e.target.checked) {
        filtered.forEach(p => modalSelectedCodes.add((p.code || '').toUpperCase()));
    } else {
        filtered.forEach(p => modalSelectedCodes.delete((p.code || '').toUpperCase()));
    }
    renderModalProblemTable();
});

document.getElementById("member-search")?.addEventListener("input", loadMembers);
document.getElementById("new-contest")?.addEventListener("click", () => {
    document.getElementById("contest-form").reset();
    document.getElementById("contest-id").value = "";
    document.getElementById("contest-problems").value = "[]";
    contestSelectedProblems = [];
    renderContestSelectedChips();
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

// ── MOUSE DRAG & WHEEL SCROLL ENGINE (Di nút chuột kéo trang lên/xuống) ──
(function initGlobalDragScroll() {
    let isDragging = false;
    let startY = 0;
    let initialScrollY = 0;
    let activeContainer = null;
    let startContainerY = 0;
    let startContainerScrollY = 0;

    document.addEventListener("mousedown", (e) => {
        if (e.target.closest("button, a, input, select, textarea, .admin-nav, .judge-toggle, .btn-icon")) return;

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

// ── DATA STORAGE & BACKUP CONTROLLER ──────────────────────────────────────
async function loadStorageStats() {
    try {
        const res = await fetch("/api/admin/storage/stats", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to load storage stats");
        const data = await res.json();

        // Update metric cards
        const dbSizeEl = document.getElementById("storage-db-size");
        const dbMetaEl = document.getElementById("storage-db-meta");
        if (dbSizeEl) dbSizeEl.textContent = `${data.database.size_mb} MB`;
        if (dbMetaEl) {
            const c = data.database.counts || {};
            dbMetaEl.textContent = `${c.users || 0} users · ${c.submissions || 0} bài nộp · ${c.problem_tests || 0} tests`;
        }

        const probSizeEl = document.getElementById("storage-problems-size");
        const probMetaEl = document.getElementById("storage-problems-meta");
        if (probSizeEl) probSizeEl.textContent = `${data.problem_bank.size_mb} MB`;
        if (probMetaEl) probMetaEl.textContent = `${data.problem_bank.problems_count} bài tập · ${data.problem_bank.tests_count} tests (${data.problem_bank.chapters_count} chuyên đề)`;

        const mediaSizeEl = document.getElementById("storage-media-size");
        const mediaMetaEl = document.getElementById("storage-media-meta");
        if (mediaSizeEl) mediaSizeEl.textContent = `${data.media.size_mb} MB`;
        if (mediaMetaEl) mediaMetaEl.textContent = `${data.media.avatars_count} avatar · ${data.media.images_count} ảnh bài tập`;

        const diskFreeEl = document.getElementById("storage-disk-free");
        const backupMetaEl = document.getElementById("storage-backup-meta");
        if (diskFreeEl) diskFreeEl.textContent = `${data.disk.free_gb} GB`;
        if (backupMetaEl) backupMetaEl.textContent = `${data.backups.total_backups} bản sao lưu (${data.backups.size_mb} MB)`;

        // Update directory breakdown table
        const breakdownTbody = document.getElementById("storage-breakdown-tbody");
        if (breakdownTbody) {
            const rows = [
                { name: "data/memory.db", type: "SQLite Database chính", size: `${data.database.size_mb} MB`, icon: "fa-database", color: "#34d399" },
                { name: "data/python_300_kids/", type: "Kho 300 đề bài & 9.000 tests", size: `${data.problem_bank.size_mb} MB`, icon: "fa-folder-tree", color: "#60a5fa" },
                { name: "data/media/", type: "Ảnh đại diện & File upload", size: `${data.media.size_mb} MB`, icon: "fa-images", color: "#fbbf24" },
                { name: "data/sandbox/", type: "Vùng cô lập thực thi code", size: `${data.sandbox.size_mb} MB`, icon: "fa-flask", color: "#f472b6" },
                { name: "backups/", type: "Tệp nén sao lưu định kỳ", size: `${data.backups.size_mb} MB`, icon: "fa-box-archive", color: "#c084fc" },
                { name: "logs/", type: "Nhật ký Nginx & Backend", size: `${data.logs.size_mb} MB`, icon: "fa-file-lines", color: "#94a3b8" }
            ];
            breakdownTbody.innerHTML = rows.map(r => `
                <tr>
                    <td>
                        <span style="font-family:var(--font-code); font-size:0.84rem; display:inline-flex; align-items:center; gap:8px;">
                            <i class="fa-solid ${r.icon}" style="color:${r.color};"></i> ${r.name}
                        </span>
                    </td>
                    <td style="color:var(--text-secondary); font-size:0.82rem;">${r.type}</td>
                    <td style="text-align:right; font-family:var(--font-code); font-weight:700; color:var(--text-bright);">${r.size}</td>
                </tr>
            `).join("");
        }

        // Update backups table
        renderBackupTable(data.backups.items);
    } catch (err) {
        console.error("Storage stats error:", err);
    }
}

function renderBackupTable(items) {
    const tbody = document.getElementById("storage-backups-tbody");
    const badge = document.getElementById("storage-backups-count-badge");
    if (badge) badge.textContent = `${items ? items.length : 0} bản sao lưu`;
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-secondary); padding:24px;">Chưa có bản sao lưu nào. Bấm "Tạo Bản Sao Lưu Ngay" ở trên để sao lưu.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(b => `
        <tr>
            <td>
                <span style="font-family:var(--font-code); font-size:0.84rem; font-weight:600; color:#60a5fa; display:inline-flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-file-zipper" style="color:#c084fc;"></i> ${escapeHtml(b.filename)}
                </span>
            </td>
            <td style="font-family:var(--font-code); font-size:0.82rem; color:var(--text-secondary);">${escapeHtml(b.created_at)}</td>
            <td style="text-align:right; font-family:var(--font-code); font-weight:700; color:#34d399;">${b.size_mb} MB</td>
            <td style="text-align:center;">
                <div style="display:flex; justify-content:center; gap:8px;">
                    <a href="/api/admin/storage/backups/${encodeURIComponent(b.filename)}/download?token=${encodeURIComponent(token)}" 
                       target="_blank" 
                       class="admin-button" 
                       style="padding:4px 10px; font-size:0.75rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                        <i class="fa-solid fa-download"></i> Tải về
                    </a>
                    <button type="button" 
                            onclick="deleteBackup('${escapeHtml(b.filename)}')" 
                            class="admin-button danger" 
                            style="padding:4px 10px; font-size:0.75rem;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join("");
}

async function createManualBackup() {
    const btn = document.getElementById("btn-create-backup-now");
    if (!btn) return;
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang sao lưu...`;

    try {
        const res = await fetch("/api/admin/storage/backup", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showAlert(`✓ ${data.message}`, "success");
            loadStorageStats();
        } else {
            showAlert(`Lỗi sao lưu: ${data.detail || data.message || "Không xác định"}`, "danger");
        }
    } catch (err) {
        showAlert(`Lỗi mạng khi tạo sao lưu: ${err.message}`, "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

async function deleteBackup(filename) {
    if (!confirm(`Bạn có chắc chắn muốn xóa bản sao lưu "${filename}" không?`)) return;
    try {
        const res = await fetch(`/api/admin/storage/backups/${encodeURIComponent(filename)}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showAlert(`✓ ${data.message}`, "success");
            loadStorageStats();
        } else {
            showAlert(`Lỗi xóa: ${data.detail || "Không thể xóa file"}`, "danger");
        }
    } catch (err) {
        showAlert(`Lỗi: ${err.message}`, "danger");
    }
}

document.getElementById("btn-refresh-storage")?.addEventListener("click", loadStorageStats);
document.getElementById("btn-create-backup-now")?.addEventListener("click", createManualBackup);

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

// =========================================================================
// THÔNG BÁO & DUYỆT GÓI WORKSPACE (DEV & SUPERADMIN ONLY)
// =========================================================================
async function loadAdminNotifications() {
    const role = (currentUser?.role || "").toLowerCase();
    const level = currentUser ? userLevel(currentUser) : 0;
    if (role !== "dev" && role !== "superadmin" && level < 8) return;

    try {
        const [reqsRes, notifsRes] = await Promise.all([
            request("/api/admin/payment-requests"),
            request("/api/admin/notifications")
        ]);

        let pendingList = [];
        if (reqsRes && reqsRes.ok) {
            const data = await reqsRes.json();
            pendingList = data.payment_requests || [];
        }

        let allNotifs = [];
        if (notifsRes && notifsRes.ok) {
            const nData = await notifsRes.json();
            allNotifs = nData.notifications || [];
        }

        renderPendingPaymentRequests(pendingList);
        renderNotifsHistory(allNotifs, pendingList);

        // Update sidebar notification badge
        const pendingCount = pendingList.filter(p => (p.status || "").toUpperCase() === "PENDING").length;
        const badgeEl = document.getElementById("sidebar-notif-badge");
        const countEl = document.getElementById("pending-requests-count");
        if (countEl) countEl.textContent = pendingCount;
        if (badgeEl) {
            badgeEl.textContent = pendingCount;
            badgeEl.style.display = pendingCount > 0 ? "inline-block" : "none";
        }
    } catch (err) {
        console.error("Failed to load admin notifications:", err);
    }
}

function renderPendingPaymentRequests(requests) {
    const container = document.getElementById("pending-requests-container");
    if (!container) return;

    const pending = requests.filter(r => (r.status || "").toUpperCase() === "PENDING");
    if (pending.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:36px 20px; background:rgba(255,255,255,0.02); border-radius:10px; border:1px dashed rgba(255,255,255,0.1);">
                <i class="fa-solid fa-circle-check" style="font-size:2rem; color:#10b981; margin-bottom:10px;"></i>
                <h4 style="margin:0 0 6px; color:#f8fafc; font-size:1rem;">Tất cả yêu cầu chuyển gói đã được xử lý!</h4>
                <p style="margin:0; font-size:0.84rem; color:var(--text-secondary);">Hiện không có yêu cầu mua gói Pro / Enterprise nào đang chờ duyệt.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = pending.map(p => {
        const plan = (p.plan || "").toLowerCase();
        const planBadge = plan === "enterprise"
            ? '<span class="badge" style="background:#fbbf24; color:#000; font-weight:800; padding:4px 10px; font-size:0.8rem;"><i class="fa-solid fa-gem"></i> ENTERPRISE (2.490.000đ)</span>'
            : '<span class="badge pro" style="font-weight:700; padding:4px 10px; font-size:0.8rem;"><i class="fa-solid fa-bolt"></i> PRO (485.000đ)</span>';
        
        return `
            <div class="pending-pay-card" style="background:rgba(15,23,42,0.8); border:1px solid rgba(244,114,182,0.3); border-radius:12px; padding:18px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
                <div style="flex:1; min-width:280px;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; flex-wrap:wrap;">
                        <span style="font-weight:700; font-size:1.05rem; color:#f8fafc;">@${escapeHtml(p.username || 'user')}</span>
                        <span style="font-size:0.8rem; color:var(--text-secondary);">(${escapeHtml(p.email || 'Không có email')})</span>
                        ${roleBadge(p.current_role)}
                        <i class="fa-solid fa-arrow-right" style="color:var(--text-secondary); font-size:0.75rem;"></i>
                        ${planBadge}
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:8px 16px; background:rgba(0,0,0,0.3); border-radius:8px; padding:10px 14px; font-size:0.84rem; border:1px solid rgba(255,255,255,0.06);">
                        <div><span style="color:var(--text-secondary);">👤 Tên người chuyển:</span> <b style="color:#fbbf24;">${escapeHtml(p.sender_name || 'Chưa nhập')}</b></div>
                        <div><span style="color:var(--text-secondary);">🏷️ Mã nội dung CK:</span> <code style="color:#38bdf8; background:rgba(56,189,248,0.1); padding:2px 6px; border-radius:4px;">${escapeHtml(p.ref_code)}</code></div>
                        <div><span style="color:var(--text-secondary);">💰 Số tiền:</span> <b style="color:#34d399;">${Number(p.amount_vnd || 0).toLocaleString()} VNĐ</b></div>
                        <div><span style="color:var(--text-secondary);">🕒 Thời gian:</span> <span style="color:var(--text-secondary);">${escapeHtml(p.created_at || '')}</span></div>
                    </div>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <button type="button" class="admin-button primary btn-approve-pay" data-id="${p.id}" data-user="${escapeHtml(p.username)}" data-plan="${escapeHtml(p.plan)}" style="background:linear-gradient(135deg, #059669, #10b981); border:none; padding:10px 18px; font-weight:700; border-radius:8px; box-shadow:0 4px 12px rgba(16,185,129,0.35); cursor:pointer;">
                        <i class="fa-solid fa-circle-check"></i> Đồng Ý Duyệt Gói
                    </button>
                    <button type="button" class="admin-button danger btn-reject-pay" data-id="${p.id}" data-user="${escapeHtml(p.username)}" style="padding:10px 16px; font-weight:600; border-radius:8px; cursor:pointer;">
                        <i class="fa-solid fa-circle-xmark"></i> Từ Chối
                    </button>
                </div>
            </div>
        `;
    }).join("");

    // Attach approve / reject click listeners
    container.querySelectorAll(".btn-approve-pay").forEach(btn => {
        btn.addEventListener("click", async () => {
            const payId = btn.dataset.id;
            const uname = btn.dataset.user;
            const plan = btn.dataset.plan;
            if (!confirm(`Xác nhận DUYỆT nâng cấp gói [${plan.toUpperCase()}] cho tài khoản @${uname}?`)) return;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang duyệt...';
            try {
                const res = await request(`/api/admin/payment-requests/${payId}/approve`, { method: "POST" });
                const data = await res.json();
                if (res.ok) {
                    showAlert(`Đã duyệt thành công và nâng cấp tài khoản @${uname} lên gói [${plan.toUpperCase()}]!`, "success");
                    loadAdminNotifications();
                    if (document.querySelector('.admin-view[data-view-panel="members"]')?.classList.contains("active")) loadMembers();
                } else {
                    showAlert(data.detail || "Không thể duyệt gói.", "danger");
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Đồng Ý Duyệt Gói';
                }
            } catch (err) {
                showAlert("Lỗi máy chủ: " + err.message, "danger");
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Đồng Ý Duyệt Gói';
            }
        });
    });

    container.querySelectorAll(".btn-reject-pay").forEach(btn => {
        btn.addEventListener("click", async () => {
            const payId = btn.dataset.id;
            const uname = btn.dataset.user;
            const reason = prompt(`Nhập lý do từ chối giao dịch của @${uname}:`, "Không tìm thấy giao dịch chuyển khoản");
            if (reason === null) return;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
            try {
                const res = await request(`/api/admin/payment-requests/${payId}/reject`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reason: reason.trim() })
                });
                const data = await res.json();
                if (res.ok) {
                    showAlert(`Đã từ chối giao dịch #${payId} của @${uname}.`, "warn");
                    loadAdminNotifications();
                } else {
                    showAlert(data.detail || "Không thể từ chối.", "danger");
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Từ Chối';
                }
            } catch (err) {
                showAlert("Lỗi máy chủ: " + err.message, "danger");
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Từ Chối';
            }
        });
    });
}

function renderNotifsHistory(notifications, paymentRequests) {
    const tbody = document.getElementById("notifs-history-tbody");
    if (!tbody) return;

    if (!paymentRequests || paymentRequests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--text-secondary); padding:24px;">Chưa có lịch sử giao dịch nào.</td></tr>';
        return;
    }

    tbody.innerHTML = paymentRequests.map(p => {
        const st = (p.status || "").toUpperCase();
        let statusBadge = '<span class="badge warn"><i class="fa-solid fa-clock"></i> Chờ duyệt</span>';
        if (st === "APPROVED" || st === "COMPLETED") statusBadge = '<span class="badge success" style="background:#10b981; color:#fff;"><i class="fa-solid fa-check"></i> Đã duyệt</span>';
        if (st === "REJECTED") statusBadge = '<span class="badge danger" style="background:#ef4444; color:#fff;"><i class="fa-solid fa-xmark"></i> Đã từ chối</span>';

        const planBadge = (p.plan || "").toLowerCase() === "enterprise"
            ? '<span class="badge" style="background:#fbbf24; color:#000; font-weight:700;">ENTERPRISE</span>'
            : '<span class="badge pro">PRO</span>';

        return `
            <tr>
                <td style="font-family:var(--font-code); font-size:0.8rem; color:var(--text-secondary);">#${p.id}</td>
                <td><span class="badge" style="background:rgba(244,114,182,0.15); color:#f472b6; border:1px solid rgba(244,114,182,0.3);">MUA GÓI</span></td>
                <td><b>Yêu cầu nâng cấp ${p.plan ? p.plan.toUpperCase() : ''}</b></td>
                <td><b>@${escapeHtml(p.username || 'user')}</b></td>
                <td style="color:#fbbf24; font-weight:600;">${escapeHtml(p.sender_name || 'N/A')}</td>
                <td>${planBadge} <span style="font-size:0.8rem; color:var(--text-secondary);">(${Number(p.amount_vnd || 0).toLocaleString()}đ)</span></td>
                <td><code style="color:#38bdf8; font-family:var(--font-code); font-size:0.8rem;">${escapeHtml(p.ref_code)}</code></td>
                <td>${statusBadge}</td>
                <td style="font-size:0.8rem; color:var(--text-secondary); white-space:nowrap;">${escapeHtml(p.created_at || '')}</td>
            </tr>
        `;
    }).join("");
}

document.getElementById("btn-refresh-notifs")?.addEventListener("click", loadAdminNotifications);

// ── INITIAL BOOT ──────────────────────────────────────────────────────────
checkAuthAndLoad().then(() => {
    // Load notifications count badge for dev/superadmin on boot
    const level = currentUser ? userLevel(currentUser) : 0;
    if (level >= 8) {
        loadAdminNotifications();
    }
});
