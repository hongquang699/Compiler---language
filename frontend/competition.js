function initCompetitionModule() {
    const list = document.getElementById("competition-list");
    const detail = document.getElementById("competition-detail");
    const form = document.getElementById("competition-form");
    const adminList = document.getElementById("admin-competition-list");
    if (!list || !detail) return;

    const rankingHtml = data => data.ranking?.length
        ? `<ol>${data.ranking.map(item => `<li>${escapeHtml(item.username)} <span>(${item.score} điểm · ${item.submission_count} lần nộp)</span></li>`).join("")}</ol>`
        : `<div>Chưa có người tham gia.</div>`;

    const loadRanking = async id => {
        const response = await authFetch(`/api/competitions/${id}/ranking`);
        return response.ok ? response.json() : { ranking: [] };
    };

    const showDetail = async id => {
        const response = await authFetch(`/api/competitions/${id}`);
        const competition = await response.json();
        if (!response.ok) { alert(competition.detail || "Không thể tải cuộc thi."); return; }
        const fallback = { id, code: "A", title: competition.title, statement: competition.statement, test_count: competition.test_count, points: 100, sample_input: "", sample_output: "" };
        let selectedProblem = (competition.problems || [fallback])[0];
        detail.classList.remove("hidden");

        const bindProblem = () => {
            detail.querySelector("[data-back-to-contest]")?.addEventListener("click", renderContest);
            detail.querySelector("[data-scroll-ranking]")?.addEventListener("click", () => detail.querySelector("[data-ranking-id]")?.scrollIntoView({ behavior: "smooth" }));
            detail.querySelector("[data-join-competition]")?.addEventListener("click", async event => {
                const join = await authFetch(`/api/competitions/${id}/join`, { method: "POST", headers: { Origin: window.location.origin } });
                const result = await join.json();
                if (!join.ok) { alert(result.detail || "Không thể tham gia."); return; }
                state.auth.user.competition_joined = true;
                updateAuthUI();
                showDetail(id);
            });
            detail.querySelector("[data-submit-competition]")?.addEventListener("submit", async event => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const resultBox = event.currentTarget.querySelector("[data-submit-result]");
                resultBox.textContent = "Đang chấm...";
                const submit = await authFetch(`/api/competitions/${id}/submit`, {
                    method: "POST", headers: { "Content-Type": "application/json", Origin: window.location.origin },
                    body: JSON.stringify({ source_code: data.get("source_code"), language: data.get("language"), problem_id: selectedProblem.id })
                });
                const result = await submit.json();
                resultBox.textContent = submit.ok ? `${result.verdict} · ${result.score} điểm · ${result.passed_tests}/${result.total_tests} test` : (result.detail || "Không thể nộp bài.");
                if (submit.ok) renderRanking(id);
            });
        };

        const renderRanking = async competitionId => {
            const target = detail.querySelector("[data-ranking-id]");
            if (!target) return;
            target.innerHTML = "<strong>Bảng xếp hạng</strong><div>Đang tải...</div>";
            target.innerHTML = `<strong>Bảng xếp hạng</strong>${rankingHtml(await loadRanking(competitionId))}`;
        };

        const renderProblem = () => {
            detail.innerHTML = `<div class="problem-page-head"><button class="btn-ide btn-ide-secondary btn-xs" data-back-to-contest><i class="fa-solid fa-arrow-left"></i> Danh sách bài</button><span class="panel-subtitle">${escapeHtml(competition.title)}</span></div>
                <div class="problem-page-grid"><article class="problem-statement-panel"><div class="problem-status-label">TRẠNG THÁI</div><h2>${escapeHtml(selectedProblem.code || "A")}. ${escapeHtml(selectedProblem.title)}</h2><div class="problem-divider"></div><div class="problem-copy">${safeParse(selectedProblem.statement || "")}</div>
                <section class="problem-section"><h3>Dữ liệu vào Specification</h3><p>Đọc dữ liệu từ <code>stdin</code> theo mô tả đề bài.</p></section><section class="problem-section"><h3>Dữ liệu ra Specification</h3><p>In kết quả ra <code>stdout</code>.</p></section><section class="problem-section"><h3>Sample Input</h3><pre>${escapeHtml(selectedProblem.sample_input || "")}</pre></section><section class="problem-section"><h3>Sample Output</h3><pre>${escapeHtml(selectedProblem.sample_output || "")}</pre></section><section class="problem-clarifications"><div class="problem-status-label">LÀM RÕ</div><h3>Giải đáp thắc mắc trong cuộc thi</h3><p>Chưa có lời làm rõ nào được đưa ra ở thời điểm này.</p></section></article>
                <aside class="problem-sidebar"><div class="problem-status-label">THÔNG TIN</div><h3>Thông tin bài tập</h3>${competition.joined ? `<form class="competition-submit problem-submit" data-submit-competition><button class="problem-submit-button" type="submit"><i class="fa-solid fa-paper-plane"></i> Gửi bài giải</button>` : `<button class="problem-submit-button" data-join-competition="${id}"><i class="fa-solid fa-flag-checkered"></i> Tham gia cuộc thi</button>`}
                ${competition.joined ? `<div class="problem-info-grid"><div><small>ĐIỂM</small><strong>${selectedProblem.points ?? 100}</strong></div><div><small>GIỚI HẠN THỜI GIAN</small><strong>${selectedProblem.time_limit ?? 2}s</strong></div><div><small>GIỚI HẠN BỘ NHỚ</small><strong>${selectedProblem.memory_limit ?? 256} MB</strong></div><div><small>I/O</small><strong>stdin -&gt; stdout</strong></div></div><select name="language"><option value="cpp">C++17</option><option value="python">Python 3</option><option value="java">Java 17</option><option value="c">C11</option><option value="rust">Rust</option><option value="go">Go</option></select><textarea name="source_code" placeholder="Dán mã nguồn của bạn..." required></textarea><span class="panel-subtitle" data-submit-result></span></form>` : ""}<button class="problem-side-link" data-scroll-ranking><i class="fa-solid fa-list-ol"></i> Bảng xếp hạng</button><div class="problem-language-box"><small>NGÔN NGỮ CHO PHÉP</small><p>C, C++, Java, Pascal, Python, Text</p></div><div class="competition-ranking" data-ranking-id><strong>Bảng xếp hạng</strong></div></aside></div>`;
            bindProblem();
            renderRanking(id);
        };

        const renderContest = () => {
            detail.innerHTML = `<div class="contest-overview-head"><button class="btn-ide btn-ide-secondary btn-xs" data-close-detail><i class="fa-solid fa-arrow-left"></i> Tất cả cuộc thi</button><div><div class="problem-status-label">CUỘC THI</div><h2>${escapeHtml(competition.title)}</h2><p class="panel-subtitle">${competition.starts_at ? new Date(competition.starts_at).toLocaleString("vi-VN") : "Chưa đặt giờ bắt đầu"}</p></div></div><p class="competition-statement">${escapeHtml(competition.statement)}</p><div class="contest-problem-list"><div class="problem-list-heading"><strong>Các bài tập</strong><span>${competition.participant_count ?? 0} người tham gia</span></div>${(competition.problems || [fallback]).map(problem => `<button class="contest-problem-card" data-problem-id="${problem.id}"><span class="problem-code">${escapeHtml(problem.code || "A")}</span><span><strong>${escapeHtml(problem.title)}</strong><small>${problem.test_count ?? competition.test_count ?? 0} test · ${problem.points ?? 100} điểm</small></span><i class="fa-solid fa-chevron-right"></i></button>`).join("")}</div>`;
            detail.querySelector("[data-close-detail]").addEventListener("click", () => { detail.classList.add("hidden"); list.classList.remove("hidden"); });
            detail.querySelectorAll("[data-problem-id]").forEach(button => button.addEventListener("click", () => { selectedProblem = (competition.problems || [fallback]).find(problem => String(problem.id) === button.dataset.problemId) || fallback; renderProblem(); }));
        };
        renderContest();
    };

    const loadCompetitions = async () => {
        if (!state.auth.user) { list.innerHTML = `<div class="empty-state">Đăng nhập để xem và tham gia cuộc thi.</div>`; return; }
        const response = await authFetch("/api/competitions");
        const competitions = await response.json();
        list.innerHTML = competitions.length ? competitions.map(competition => `<button class="competition-card" data-competition-id="${competition.id}"><span class="competition-card-icon"><i class="fa-solid fa-trophy"></i></span><span class="competition-card-copy"><strong>${escapeHtml(competition.title)}</strong><small>${competition.status === "published" ? "Đang diễn ra" : competition.status} · ${competition.test_count} test · ${competition.participant_count} người</small></span><i class="fa-solid fa-arrow-right"></i></button>`).join("") : `<div class="empty-state">Chưa có cuộc thi được mở.</div>`;
        list.classList.remove("hidden");
        list.querySelectorAll("[data-competition-id]").forEach(card => card.addEventListener("click", () => showDetail(card.dataset.competitionId)));
    };
    window.loadCompetitions = loadCompetitions;
    document.querySelector("[data-tab='competition-tab']")?.addEventListener("click", loadCompetitions);
    const loadAdminCompetitions = async () => {
        if (!adminList || !state.auth.user?.is_admin) return;
        const response = await authFetch("/api/admin/competitions");
        const competitions = await response.json();
        adminList.innerHTML = competitions.map(competition => `<button class="competition-admin-item" data-edit-competition="${competition.id}"><strong>${escapeHtml(competition.title)}</strong><span>${competition.status} · ${competition.test_count} tests</span></button>`).join("") || `<p class="panel-subtitle">Chưa có cuộc thi.</p>`;
        adminList.querySelectorAll("[data-edit-competition]").forEach(button => button.addEventListener("click", async () => {
            const item = await (await authFetch(`/api/competitions/${button.dataset.editCompetition}`)).json();
            document.getElementById("competition-edit-id").value = item.id;
            document.getElementById("competition-title").value = item.title;
            document.getElementById("competition-status").value = item.status;
            document.getElementById("competition-starts-at").value = item.starts_at ? item.starts_at.slice(0, 16) : "";
            document.getElementById("competition-ends-at").value = item.ends_at ? item.ends_at.slice(0, 16) : "";
            document.getElementById("competition-statement").value = item.statement;
            document.getElementById("competition-tests").value = JSON.stringify(item.tests || [], null, 2);
            document.getElementById("competition-problems").value = JSON.stringify(item.problems || [], null, 2);
        }));
    };
    window.loadAdminCompetitions = loadAdminCompetitions;
    document.getElementById("competition-new-btn")?.addEventListener("click", () => {
        form?.reset();
        document.getElementById("competition-edit-id").value = "";
        document.getElementById("competition-tests").value = "[]";
        document.getElementById("competition-problems").value = "[]";
    });
    document.getElementById("competition-import-clueoj")?.addEventListener("click", async () => {
        const competitionId = document.getElementById("competition-edit-id").value;
        if (!competitionId) { alert("Hãy lưu cuộc thi trước khi nạp problem."); return; }
        const response = await authFetch(`/api/admin/competitions/${competitionId}/import-clueoj`, {
            method: "POST", headers: { "Content-Type": "application/json", Origin: window.location.origin },
            body: JSON.stringify({ competition_id: Number(competitionId), problem_dir: document.getElementById("competition-clueoj-path").value, statement: document.getElementById("competition-clueoj-statement").value })
        });
        const result = await response.json();
        document.getElementById("competition-admin-message").textContent = response.ok ? `Đã nạp ${result.problem.code} với ${result.problem.tests.length} test.` : (result.detail || "Không thể nạp problem.");
        if (response.ok) { document.getElementById("competition-problems").value = JSON.stringify([result.problem], null, 2); loadAdminCompetitions(); }
    });
    form?.addEventListener("submit", async event => {
        event.preventDefault();
        let tests, problems;
        try { tests = JSON.parse(document.getElementById("competition-tests").value || "[]"); problems = JSON.parse(document.getElementById("competition-problems").value || "[]"); } catch { alert("Test hoặc problem JSON không hợp lệ."); return; }
        const editId = document.getElementById("competition-edit-id").value;
        const response = await authFetch(editId ? `/api/admin/competitions/${editId}` : "/api/admin/competitions", { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json", Origin: window.location.origin }, body: JSON.stringify({ title: document.getElementById("competition-title").value, statement: document.getElementById("competition-statement").value, status: document.getElementById("competition-status").value, starts_at: document.getElementById("competition-starts-at").value || null, ends_at: document.getElementById("competition-ends-at").value || null, tests, problems }) });
        const result = await response.json();
        document.getElementById("competition-admin-message").textContent = response.ok ? "Đã lưu cuộc thi." : (result.detail || "Không thể lưu cuộc thi.");
        if (response.ok) loadAdminCompetitions();
    });
    document.querySelector("[data-tab='admin-tab']")?.addEventListener("click", loadAdminCompetitions);
    document.addEventListener("contest-user-ready", loadCompetitions, { once: true });
}
