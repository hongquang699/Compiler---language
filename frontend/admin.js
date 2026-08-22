const token = localStorage.getItem("local_cp_token");
const headers = () => { const value = { "Content-Type": "application/json" }; if (token) value.Authorization = `Bearer ${token}`; return value; };
const request = (url, options = {}) => fetch(url, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
const alertBox = document.getElementById("admin-alert");
const showAlert = message => { alertBox.textContent = message; alertBox.hidden = false; };
const views = { overview: "Tổng quan hệ thống", monitoring: "Giám sát máy chấm", members: "Thành viên", contests: "Cuộc thi", system: "Hệ thống" };

async function loadOverview() {
    const response = await request("/api/admin/overview");
    if (!response.ok) throw new Error((await response.json()).detail || "Bạn không có quyền admin.");
    const data = await response.json();
    document.getElementById("stat-members").textContent = data.total_members ?? 0;
    document.getElementById("stat-admins").textContent = data.admin_count ?? 0;
    document.getElementById("stat-sessions").textContent = data.total_sessions ?? 0;
    document.getElementById("stat-solved").textContent = data.total_saved_problems ?? 0;
    document.getElementById("overview-model").textContent = data.current_model || "Chưa cấu hình";
    document.getElementById("model-select").value = data.current_model || "gemma4:latest";
    document.getElementById("admin-user").textContent = "Admin console";
    await loadJudges();
}

async function loadJudges() {
    const response = await request("/api/admin/judges");
    if (!response.ok) return;
    const data = await response.json();
    document.getElementById("judges-table").innerHTML = data.judges.map(judge => { const uptime = Math.max(0, Math.floor((Date.now() - new Date(judge.started_at).getTime()) / 1000)); return `<tr><td><strong>${escapeHtml(judge.name)}</strong><small>${escapeHtml(judge.id)}</small></td><td><span class="judge-status ${judge.status}"><i></i>${escapeHtml(judge.status)}</span></td><td>${escapeHtml(judge.compiler)}</td><td>${judge.languages.map(escapeHtml).join(", ")}</td><td>${judge.timeout_seconds}s / ${judge.memory_limit_mb} MB</td><td><span class="judge-uptime">${Math.floor(uptime / 3600)}h ${Math.floor(uptime / 60) % 60}m ${uptime % 60}s</span><small>${judge.last_job_at ? `Job: ${new Date(judge.last_job_at).toLocaleTimeString("vi-VN")}` : "Chưa có job"}</small><button class="admin-button judge-toggle" data-judge-id="${judge.id}" data-enabled="${judge.enabled}">${judge.enabled ? "Tắt" : "Bật"}</button></td></tr>`; }).join("");
    document.querySelectorAll("[data-judge-id]").forEach(button => button.addEventListener("click", async () => { button.disabled = true; const enabled = button.dataset.enabled !== "true"; const response = await request(`/api/admin/judges/${button.dataset.judgeId}/toggle?enabled=${enabled}`, { method: "POST" }); if (!response.ok) showAlert((await response.json()).detail || "Không thể đổi trạng thái judge."); await loadJudges(); }));
    document.getElementById("judges-checked").textContent = `Kiểm tra lúc ${new Date(data.checked_at).toLocaleString("vi-VN")}`;
}

async function loadMonitoring() {
    const response = await request("/api/admin/monitoring");
    if (!response.ok) return;
    const data = await response.json();
    document.getElementById("monitor-service").textContent = data.service;
    document.getElementById("monitor-active").textContent = data.active_jobs;
    document.getElementById("monitor-completed").textContent = data.completed_jobs;
    document.getElementById("monitor-failed").textContent = data.failed_jobs;
    document.getElementById("monitoring-table").innerHTML = data.judges.map(judge => { const uptime = Math.max(0, Math.floor((Date.now() - new Date(judge.started_at).getTime()) / 1000)); return `<tr><td>${escapeHtml(judge.name)}</td><td><span class="judge-status ${judge.status}"><i></i>${judge.status}</span></td><td>${judge.active_jobs} đang chạy / ${judge.completed_jobs} xong / ${judge.failed_jobs} lỗi</td><td>${Math.floor(uptime / 3600)}h ${Math.floor(uptime / 60) % 60}m ${uptime % 60}s</td></tr>`; }).join("");
    document.getElementById("monitoring-checked").textContent = `Kiểm tra lúc ${new Date(data.checked_at).toLocaleString("vi-VN")}`;
}

async function loadMembers() {
    const data = await (await request("/api/admin/members")).json();
    const query = document.getElementById("member-search").value.toLowerCase();
    document.getElementById("members-table").innerHTML = (data.members || []).filter(member => `${member.username} ${member.email} ${member.ips}`.toLowerCase().includes(query)).map(member => `<tr><td>${escapeHtml(member.username)}</td><td>${member.is_admin ? "Admin" : "User"}</td><td>${escapeHtml(member.ips || "-")}</td><td>${member.session_count ?? 0}</td><td>${member.solved_count ?? 0}</td><td>${new Date(member.created_at).toLocaleDateString("vi-VN")}</td><td><button class="admin-button" data-member="${member.id}">Xem</button></td></tr>`).join("");
    document.querySelectorAll("[data-member]").forEach(button => button.addEventListener("click", async () => { const detail = await (await request(`/api/admin/members/${button.dataset.member}`)).json(); document.getElementById("member-detail").textContent = `${detail.user.username}: ${(detail.ips || []).map(item => item.ip).join(", ") || "chưa có IP"}`; }));
}

async function loadContests() {
    const data = await (await request("/api/admin/competitions")).json();
    document.getElementById("contest-list").innerHTML = (data || []).map(item => `<button class="contest-item" data-contest="${item.id}"><strong>${escapeHtml(item.title)}</strong><span>${item.status} · ${item.test_count} test</span></button>`).join("") || "Chưa có contest";
    document.querySelectorAll("[data-contest]").forEach(button => button.addEventListener("click", async () => { const item = await (await request(`/api/competitions/${button.dataset.contest}`)).json(); document.getElementById("contest-id").value = item.id; document.getElementById("contest-title").value = item.title; document.getElementById("contest-status").value = item.status; document.getElementById("contest-statement").value = item.statement; document.getElementById("contest-problems").value = JSON.stringify(item.problems || [], null, 2); }));
}

document.querySelectorAll(".admin-nav,[data-go]").forEach(button => button.addEventListener("click", () => { const view = button.dataset.view || button.dataset.go; document.querySelector(".admin-content").classList.toggle("monitoring-open", view === "monitoring"); document.querySelectorAll(".admin-view").forEach(panel => panel.classList.toggle("active", panel.dataset.viewPanel === view)); document.querySelectorAll(".admin-nav").forEach(nav => nav.classList.toggle("active", nav.dataset.view === view)); document.getElementById("page-title").textContent = views[view]; if (view === "monitoring") loadMonitoring(); if (view === "members") loadMembers(); if (view === "contests") loadContests(); }));
document.getElementById("member-search").addEventListener("input", loadMembers);
document.getElementById("new-contest").addEventListener("click", () => { document.getElementById("contest-form").reset(); document.getElementById("contest-id").value = ""; document.getElementById("contest-problems").value = "[]"; });
document.getElementById("contest-form").addEventListener("submit", async event => { event.preventDefault(); let problems; try { problems = JSON.parse(document.getElementById("contest-problems").value || "[]"); } catch { document.getElementById("contest-message").textContent = "Problems JSON không hợp lệ."; return; } const id = document.getElementById("contest-id").value; const body = { title: document.getElementById("contest-title").value, statement: document.getElementById("contest-statement").value, status: document.getElementById("contest-status").value, starts_at: document.getElementById("contest-start").value || null, ends_at: document.getElementById("contest-end").value || null, tests: [], problems }; const response = await request(id ? `/api/admin/competitions/${id}` : "/api/admin/competitions", { method: id ? "PUT" : "POST", body: JSON.stringify(body) }); document.getElementById("contest-message").textContent = response.ok ? "Đã lưu contest." : (await response.json()).detail; loadContests(); });
document.getElementById("save-model").addEventListener("click", async () => { const response = await request("/api/admin/settings/model", { method: "POST", body: JSON.stringify({ model: document.getElementById("model-select").value }) }); showAlert(response.ok ? "Đã cập nhật model." : (await response.json()).detail); });
document.getElementById("export-members").addEventListener("click", async () => { const response = await request("/api/admin/export-members"); const blob = await response.blob(); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "members.json"; link.click(); URL.revokeObjectURL(link.href); });
document.getElementById("reset-system").addEventListener("click", async () => { if (!confirm("Reset toàn bộ session, submission và dữ liệu lưu?")) return; const response = await request("/api/admin/reset", { method: "POST" }); showAlert(response.ok ? "Đã reset hệ thống." : (await response.json()).detail); });
document.getElementById("refresh-judges").addEventListener("click", loadJudges);
document.getElementById("refresh-monitoring").addEventListener("click", loadMonitoring);
document.getElementById("run-health-check").addEventListener("click", async () => { const response = await request("/api/admin/monitoring/health-check", { method: "POST" }); showAlert(response.ok ? "Đã kiểm tra toàn bộ máy chấm." : "Không thể kiểm tra máy chấm."); await loadMonitoring(); });
loadOverview().catch(error => showAlert(error.message));
