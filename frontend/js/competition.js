// ==========================================================================
// LOCAL CP — ClueOJ Contest Module Engine
// ==========================================================================

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

function initCompetitionModule() {
    const list = document.getElementById("competition-list");
    const listContainer = document.getElementById("contest-list-container");
    const detail = document.getElementById("competition-detail");
    const adminList = document.getElementById("admin-competition-list");
    const searchInput = document.getElementById("contest-search-input");
    const filterTabs = document.querySelectorAll("#contest-filter-tabs .clueoj-tab");
    
    if (!list || !detail) return;

    let allCompetitions = [];
    let currentFilter = "all";
    let searchQuery = "";
    let timerInterval = null;

    const rankingHtml = data => data.ranking?.length
        ? `<div class="clueoj-table-wrap"><table class="clueoj-table"><thead><tr><th>#</th><th>Thí sinh</th><th>Điểm số</th><th>Số lần nộp</th></tr></thead><tbody>${data.ranking.map((item, idx) => `<tr><td class="scoreboard-rank-col">#${idx + 1}</td><td><strong>${escapeHtml(item.username)}</strong></td><td><span class="score-pill-ac">${item.score} điểm</span></td><td>${item.submission_count} lần</td></tr>`).join("")}</tbody></table></div>`
        : `<div style="padding: 16px; color: var(--text-secondary); text-align: center;">Chưa có lượt nộp bài nào được ghi nhận.</div>`;

    const loadRanking = async id => {
        const response = await authFetch(`/api/competitions/${id}/ranking`);
        return response.ok ? response.json() : { ranking: [] };
    };

    const getContestCategory = competition => {
        const now = new Date();
        const start = competition.starts_at ? new Date(competition.starts_at) : null;
        const end = competition.ends_at ? new Date(competition.ends_at) : null;

        if (end && now > end) return "past";
        if (start && now < start) return "upcoming";
        return "ongoing";
    };

    const formatCountdown = seconds => {
        if (seconds <= 0) return "00:00:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const renderContestCard = competition => {
        const category = getContestCategory(competition);
        const now = new Date();
        const start = competition.starts_at ? new Date(competition.starts_at) : null;
        const end = competition.ends_at ? new Date(competition.ends_at) : null;
        
        let timeLabel = "";
        let actionBtn = "";

        if (category === "ongoing") {
            const secsLeft = end ? Math.max(0, Math.floor((end - now) / 1000)) : 0;
            timeLabel = `<span style="color: #16a34a; font-weight: 600;"><i class="fa-solid fa-clock"></i> Còn lại: <strong>${formatCountdown(secsLeft)}</strong></span>`;
            actionBtn = `<a href="workspace.html?id=${competition.id}" class="btn-contest-enter"><i class="fa-solid fa-play"></i> Vào thi (Workspace)</a>`;
        } else if (category === "upcoming") {
            const secsToStart = start ? Math.max(0, Math.floor((start - now) / 1000)) : 0;
            timeLabel = `<span style="color: #d97706; font-weight: 600;"><i class="fa-solid fa-hourglass-start"></i> Bắt đầu sau: <strong>${formatCountdown(secsToStart)}</strong></span>`;
            actionBtn = `<a href="workspace.html?id=${competition.id}" class="btn-contest-sub"><i class="fa-solid fa-bell"></i> Chi tiết</a>`;
        } else {
            timeLabel = `<span style="color: #94a3b8;"><i class="fa-solid fa-flag-checkered"></i> Đã kết thúc</span>`;
            actionBtn = `<a href="workspace.html?id=${competition.id}" class="btn-contest-sub"><i class="fa-solid fa-repeat"></i> Xem lại</a>`;
        }

        const animDelay = (index || 0) * 0.05;
        return `
            <div class="clueoj-contest-card" data-competition-id="${competition.id}" style="animation-delay: ${animDelay}s;">
                <div class="clueoj-card-main">
                    <div class="clueoj-card-title">
                        <a href="javascript:void(0)" style="color: var(--text-bright); text-decoration: none;">${escapeHtml(competition.title)}</a>
                        <div class="contest-tags">
                            <span class="contest-tag rated"><i class="fa-solid fa-chart-line"></i> Rated</span>
                            <span class="contest-tag tag-item">ICPC Format</span>
                            ${competition.status === "draft" ? `<span class="contest-tag private">Nháp</span>` : ""}
                        </div>
                    </div>
                    <div class="clueoj-card-meta">
                        <span><i class="fa-solid fa-calendar"></i> ${start ? start.toLocaleString("vi-VN") : "Linh hoạt"}</span>
                        <span><i class="fa-solid fa-user-group"></i> ${competition.participant_count ?? 0} thí sinh</span>
                        <span><i class="fa-solid fa-list-check"></i> ${competition.test_count ?? 0} test cases</span>
                        ${timeLabel}
                    </div>
                </div>
                <div style="flex-shrink: 0;">
                    ${actionBtn}
                </div>
            </div>
        `;
    };

    const filterAndRender = () => {
        if (!allCompetitions.length) {
            list.innerHTML = `<div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-secondary);"><i class="fa-solid fa-trophy" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.4;"></i><p>Chưa có cuộc thi nào được mở.</p></div>`;
            return;
        }

        let filtered = allCompetitions.filter(item => {
            const cat = getContestCategory(item);
            if (currentFilter !== "all" && cat !== currentFilter) return false;
            if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });

        // Update counts
        const ongoingCount = allCompetitions.filter(c => getContestCategory(c) === "ongoing").length;
        const upcomingCount = allCompetitions.filter(c => getContestCategory(c) === "upcoming").length;
        const pastCount = allCompetitions.filter(c => getContestCategory(c) === "past").length;

        document.getElementById("count-all").textContent = allCompetitions.length;
        document.getElementById("count-ongoing").textContent = ongoingCount;
        document.getElementById("count-upcoming").textContent = upcomingCount;
        document.getElementById("count-past").textContent = pastCount;

        if (!filtered.length) {
            list.innerHTML = `<div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-secondary);"><p>Không tìm thấy cuộc thi phù hợp với bộ lọc.</p></div>`;
            return;
        }

        list.innerHTML = filtered.map((c, i) => renderContestCard(c, i)).join("");
        list.querySelectorAll("[data-competition-id]").forEach(card => {
            card.addEventListener("click", () => {
                const id = card.dataset.competitionId;
                window.location.href = `workspace.html?id=${id}`;
            });
        });
    };

    const showDetail = id => {
        window.location.href = `workspace.html?id=${id}`;
    };

    const loadCompetitions = async () => {
        try {
            const response = await authFetch("/api/competitions");
            if (response.ok) {
                const data = await response.json();
                allCompetitions = Array.isArray(data) ? data : [];
                filterAndRender();
            }
        } catch (err) {
            console.error("Failed to load competitions:", err);
        }
    };

    // Filter tabs listeners
    filterTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            filterTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            currentFilter = tab.dataset.filter || "all";
            filterAndRender();
        });
    });

    // Search input listener
    if (searchInput) {
        searchInput.addEventListener("input", e => {
            searchQuery = e.target.value;
            filterAndRender();
        });
    }

    window.loadCompetitions = loadCompetitions;
    document.querySelector("[data-tab='competition-tab']")?.addEventListener("click", loadCompetitions);
    document.addEventListener("contest-user-ready", loadCompetitions);

    // Initial load
    loadCompetitions();
}

document.addEventListener("DOMContentLoaded", initCompetitionModule);

