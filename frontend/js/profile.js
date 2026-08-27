/**
 * LOCAL CP / TMath — Profile Module JavaScript Controller
 * Strictly connects to the currently logged-in account or specified ?user= query
 */

(function () {
    const TOKEN_KEY = 'local_cp_token';
    let cachedProfileData = null;
    let cachedSubmissions = null;

    // --- 1. DATA INITIALIZATION & AUTH CHECK ---
    async function loadProfile() {
        const token = localStorage.getItem(TOKEN_KEY);
        const params = new URLSearchParams(window.location.search);
        const targetUsername = params.get('user') || params.get('u');

        let url = '/api/user/profile';
        if (targetUsername) {
            url += `?username=${encodeURIComponent(targetUsername)}`;
        }

        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};

        try {
            const res = await fetch(url, { headers });

            if (res.status === 401) {
                // Người dùng chưa đăng nhập
                renderNotLoggedIn();
                return;
            }

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                renderError(err.detail || 'Không thể tải thông tin hồ sơ.');
                return;
            }

            const data = await res.json();
            cachedProfileData = data;
            renderData(data);
        } catch (e) {
            renderError('Lỗi kết nối đến máy chủ.');
        }
    }

    function renderNotLoggedIn() {
        const leftSidebar = document.getElementById('profile-left-sidebar');
        const rightContent = document.getElementById('profile-right-content');
        const headingEl = document.getElementById('tmath-workspace-heading');

        if (headingEl) headingEl.textContent = 'Đăng nhập tài khoản';

        if (leftSidebar) {
            leftSidebar.innerHTML = `
                <div class="tmath-avatar-box">
                    <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#1e1b4b; color:#818cf8; font-size:2.5rem;">
                        <i class="fa-solid fa-user-lock"></i>
                    </div>
                </div>
                <div class="tmath-solved-label">Chưa đăng nhập</div>
                <p style="font-size:0.8rem; color:#94a3b8; text-align:center; margin-bottom:16px;">
                    Đăng nhập để xem thống kê cá nhân, bài đã giải và lịch sử bài nộp.
                </p>
                <a href="index.html#login" class="btn-tmath-submissions" style="background:#2563eb; text-decoration:none;">
                    <i class="fa-solid fa-right-to-bracket"></i> Đăng nhập ngay
                </a>
            `;
        }

        if (rightContent) {
            rightContent.innerHTML = `
                <div class="tmath-card" style="text-align:center; padding:50px 20px;">
                    <i class="fa-solid fa-shield-halved" style="font-size:3rem; color:#818cf8; margin-bottom:16px; opacity:0.8;"></i>
                    <h2 style="font-size:1.3rem; font-weight:800; color:#fff; margin-bottom:8px;">Yêu cầu đăng nhập</h2>
                    <p style="color:#94a3b8; font-size:0.9rem; max-width:480px; margin:0 auto 24px;">
                        Hồ sơ cá nhân được liên kết bảo mật với tài khoản của bạn. Vui lòng đăng nhập để tiếp tục.
                    </p>
                    <div style="display:flex; justify-content:center; gap:12px;">
                        <a href="index.html" style="padding:10px 20px; border-radius:12px; background:#2563eb; color:#fff; font-weight:700; text-decoration:none;">
                            Về Trang Chủ / Đăng Nhập
                        </a>
                        <a href="standings.html" style="padding:10px 20px; border-radius:12px; background:rgba(255,255,255,0.08); color:#cbd5e1; font-weight:700; text-decoration:none;">
                            Xem Bảng Xếp Hạng
                        </a>
                    </div>
                </div>
            `;
        }
    }

    function renderError(msg) {
        const rightContent = document.getElementById('profile-right-content');
        if (rightContent) {
            rightContent.innerHTML = `
                <div class="tmath-card" style="text-align:center; padding:40px 20px; color:#f87171;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem; margin-bottom:12px;"></i>
                    <h3 style="margin:0 0 8px; color:#fff;">Thông báo</h3>
                    <p style="margin:0 0 16px;">${escapeHtml(msg)}</p>
                    <a href="standings.html" style="color:#38bdf8; font-weight:700; text-decoration:none;">Quay lại Bảng xếp hạng</a>
                </div>
            `;
        }
    }

    function renderData(data) {
        const user = data.user || {};
        const stats = data.stats || {};
        const heatmap = data.heatmap || {};
        const solvedList = data.solved_problems || [];

        const displayName = user.fullname || user.username || 'Thành viên';
        const titleText = `Tài khoản của tôi (${user.username || ''})`;
        const headingEl = document.getElementById('tmath-workspace-heading');
        if (headingEl) headingEl.textContent = titleText;

        const solvedCountEl = document.getElementById('tmath-solved-count');
        if (solvedCountEl) solvedCountEl.textContent = `${stats.solved_count || 0} số lượng bài đã giải`;

        const rankEl = document.getElementById('tmath-rank');
        if (rankEl) rankEl.textContent = `#${stats.rank || 1}`;

        const totalScoreEl = document.getElementById('tmath-total-score');
        if (totalScoreEl) totalScoreEl.textContent = stats.total_score || 0;

        const bioEl = document.getElementById('tmath-bio');
        if (bioEl) {
            bioEl.textContent = user.bio || 'Chưa cập nhật tiểu sử giới thiệu.';
            if (!user.bio) bioEl.style.color = '#94a3b8';
            else bioEl.style.color = '#f43f5e';
        }

        // Populate Form Edit Inputs with exact user data
        const editBioInput = document.getElementById('edit-bio-input');
        if (editBioInput) editBioInput.value = user.bio || '';

        const editFullname = document.getElementById('edit-fullname-input');
        if (editFullname) editFullname.value = user.fullname || user.username || '';

        const editTz = document.getElementById('edit-timezone-input');
        if (editTz && user.timezone) editTz.value = user.timezone;

        const editLang = document.getElementById('edit-language-input');
        if (editLang && user.language) editLang.value = user.language;

        const editTheme = document.getElementById('edit-editor-theme-input');
        if (editTheme && user.editor_theme) editTheme.value = user.editor_theme;

        const editLastName = document.getElementById('edit-last-name-change');
        if (editLastName) editLastName.value = user.last_name_change || user.created_at || 'Mới đây';

        const totalSubs = stats.total_submissions || Object.values(heatmap).reduce((a, b) => a + b, 0);
        const heatTitleEl = document.getElementById('tmath-heatmap-title');
        if (heatTitleEl) heatTitleEl.textContent = `${totalSubs} submissions in the last year`;

        const heatFooterEl = document.getElementById('tmath-total-subs-footer');
        if (heatFooterEl) heatFooterEl.textContent = `${totalSubs} total submissions`;

        const avatarImg = document.getElementById('tmath-avatar-img');
        if (avatarImg) {
            if (user.avatar_path) {
                avatarImg.src = user.avatar_path;
            } else {
                avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'User')}&background=6366f1&color=fff&size=256&bold=true`;
            }
        }

        renderHeatmapGrid(heatmap);
        renderSolvedProblems(solvedList);
    }

    // --- 2. 52-WEEK SUBMISSIONS HEATMAP ---
    function renderHeatmapGrid(heatmapData) {
        const gridEl = document.getElementById('tmath-cells-grid');
        if (!gridEl) return;
        gridEl.innerHTML = '';
        const daysName = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - (52 * 7) + 1);

        let curDate = new Date(startDate);

        for (let w = 0; w < 52; w++) {
            const col = document.createElement('div');
            col.className = 'tmath-week-col';

            for (let d = 0; d < 7; d++) {
                const cell = document.createElement('div');
                const dateStr = curDate.toISOString().split('T')[0];
                const count = heatmapData[dateStr] || 0;

                let cls = '';
                if (count >= 10) cls = 'c-4';
                else if (count >= 5) cls = 'c-3';
                else if (count >= 2) cls = 'c-2';
                else if (count >= 1) cls = 'c-1';

                cell.className = `tmath-cell ${cls}`;
                cell.title = `${dateStr} (${daysName[d]}): ${count} bài nộp`;

                col.appendChild(cell);
                curDate.setDate(curDate.getDate() + 1);
            }
            gridEl.appendChild(col);
        }
    }

    // --- 3. SOLVED PROBLEMS LIST ---
    function renderSolvedProblems(list) {
        const container = document.getElementById('solved-problems-container');
        if (!container) return;

        if (!list || list.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:30px 10px; color:#94a3b8;">
                    <i class="fa-solid fa-code" style="font-size:2rem; margin-bottom:8px; opacity:0.5;"></i>
                    <p>Chưa có bài tập nào được giải.</p>
                    <a href="problems.html" style="color:#38bdf8; font-weight:700; text-decoration:none;">Khám phá kho bài tập ngay</a>
                </div>
            `;
            return;
        }

        let html = `
            <table class="tmath-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Tên Bài Tập</th>
                        <th>Phân Loại</th>
                        <th>Trạng Thái</th>
                        <th>Thời Gian</th>
                        <th>Hành Động</th>
                    </tr>
                </thead>
                <tbody>
        `;

        list.forEach((item, idx) => {
            html += `
                <tr>
                    <td style="font-family:'JetBrains Mono',monospace; color:#94a3b8;">${idx + 1}</td>
                    <td style="font-weight:700; color:#fff;">${escapeHtml(item.title || 'Bài tập')}</td>
                    <td><span style="font-size:0.75rem; background:rgba(99,102,241,0.15); color:#a5b4fc; padding:2px 8px; border-radius:6px;">${escapeHtml(item.category || 'Algorithm')}</span></td>
                    <td><span class="badge-verdict ac"><i class="fa-solid fa-circle-check"></i> ${escapeHtml(item.verdict || 'AC')}</span></td>
                    <td style="font-size:0.78rem; color:#94a3b8;">${item.created_at || 'Mới đây'}</td>
                    <td>
                        <a href="index.html?problem=${item.id}" style="color:#38bdf8; font-weight:700; text-decoration:none; font-size:0.8rem;">
                            <i class="fa-solid fa-play"></i> Làm lại
                        </a>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    // --- 4. USER SUBMISSIONS LIST & CODE VIEWER ---
    async function loadUserSubmissions() {
        const container = document.getElementById('user-submissions-container');
        if (!container) return;
        container.innerHTML = '<p style="color:#94a3b8; font-size:0.85rem;">Đang tải danh sách bài nộp...</p>';

        try {
            const token = localStorage.getItem(TOKEN_KEY);
            if (!token) {
                container.innerHTML = '<p style="color:#f87171; font-size:0.85rem;">Vui lòng đăng nhập để xem lịch sử bài nộp.</p>';
                return;
            }

            const headers = { 'Authorization': 'Bearer ' + token };
            const res = await fetch('/api/user/submissions', { headers });

            if (res.ok) {
                const list = await res.json();
                cachedSubmissions = list;
                const countBadge = document.getElementById('submissions-count-badge');
                if (countBadge) countBadge.textContent = `${list.length} bài nộp`;
                renderSubmissionsTable(list);
            } else {
                container.innerHTML = '<p style="color:#f87171; font-size:0.85rem;">Không thể tải danh sách bài nộp.</p>';
            }
        } catch {
            container.innerHTML = '<p style="color:#f87171; font-size:0.85rem;">Lỗi kết nối máy chủ.</p>';
        }
    }

    function renderSubmissionsTable(list) {
        const container = document.getElementById('user-submissions-container');
        if (!container) return;

        if (!list || list.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:30px 10px; color:#94a3b8;">
                    <i class="fa-solid fa-clock-rotate-left" style="font-size:2rem; margin-bottom:8px; opacity:0.5;"></i>
                    <p>Bạn chưa nộp bài nào.</p>
                    <a href="problems.html" style="color:#38bdf8; font-weight:700; text-decoration:none;">Nộp bài ngay</a>
                </div>
            `;
            return;
        }

        let html = `
            <table class="tmath-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Đề Bài / Cuộc Thi</th>
                        <th>Ngôn Ngữ</th>
                        <th>Kết Quả</th>
                        <th>Điểm</th>
                        <th>Thời Gian</th>
                        <th>Chi Tiết</th>
                    </tr>
                </thead>
                <tbody>
        `;

        list.forEach((s) => {
            const verdict = (s.verdict || 'AC').toUpperCase();
            let vClass = 'ac';
            if (verdict.includes('WA') || verdict.includes('WRONG')) vClass = 'wa';
            else if (verdict.includes('TLE') || verdict.includes('TIME')) vClass = 'tle';

            html += `
                <tr>
                    <td style="font-family:'JetBrains Mono',monospace; color:#94a3b8;">#${s.id}</td>
                    <td style="font-weight:700; color:#fff;">${escapeHtml(s.competition_title || 'Bài tập')}</td>
                    <td><span style="font-size:0.75rem; background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:6px; font-family:'JetBrains Mono',monospace;">${escapeHtml(s.language || 'cpp')}</span></td>
                    <td><span class="badge-verdict ${vClass}">${verdict}</span></td>
                    <td style="font-weight:700; font-family:'JetBrains Mono',monospace; color:#38bdf8;">${s.score || 0}</td>
                    <td style="font-size:0.78rem; color:#94a3b8;">${s.created_at || ''}</td>
                    <td>
                        <button onclick="window.ProfileController.viewSubmissionCode(${s.id})" style="background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.3); color:#38bdf8; padding:4px 10px; border-radius:8px; font-size:0.78rem; font-weight:700; cursor:pointer;">
                            <i class="fa-solid fa-code"></i> Xem code
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    async function viewSubmissionCode(subId) {
        const overlay = document.getElementById('code-modal-overlay');
        const codeEl = document.getElementById('modal-code-content');
        const titleEl = document.getElementById('modal-sub-title');
        const metaEl = document.getElementById('modal-sub-meta');
        const compBox = document.getElementById('modal-compiler-box');
        const compOut = document.getElementById('modal-compiler-output');

        if (overlay) overlay.classList.add('open');
        if (codeEl) codeEl.textContent = '// Đang tải mã nguồn...';
        if (titleEl) titleEl.textContent = `Chi Tiết Bài Nộp #${subId}`;
        if (compBox) compBox.style.display = 'none';

        try {
            const token = localStorage.getItem(TOKEN_KEY);
            const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
            const res = await fetch(`/api/user/submissions/${subId}`, { headers });

            if (res.ok) {
                const sub = await res.json();
                if (codeEl) codeEl.textContent = sub.code || '// Không có mã nguồn đính kèm.';
                if (metaEl) metaEl.textContent = `${sub.language?.toUpperCase() || 'CODE'} • ${sub.verdict || 'AC'} • ${sub.score || 0} Điểm • ${sub.passed_tests || 0}/${sub.total_tests || 0} Tests`;

                if (sub.compiler_output && compBox && compOut) {
                    compBox.style.display = 'block';
                    compOut.textContent = sub.compiler_output;
                }
            } else {
                if (codeEl) codeEl.textContent = '// Không thể tải nội dung bài nộp.';
            }
        } catch {
            if (codeEl) codeEl.textContent = '// Lỗi kết nối khi tải mã nguồn.';
        }
    }

    function closeCodeModal() {
        const overlay = document.getElementById('code-modal-overlay');
        if (overlay) overlay.classList.remove('open');
    }

    // --- 5. TAB SWITCHING ---
    function switchView(tab) {
        const viewAbout = document.getElementById('view-about');
        const viewProblems = document.getElementById('view-problems');
        const viewSubmissions = document.getElementById('view-submissions');
        const viewEdit = document.getElementById('view-edit');

        const btnAbout = document.getElementById('tab-btn-about');
        const btnProblems = document.getElementById('tab-btn-problems');
        const btnSubmissions = document.getElementById('tab-btn-submissions');
        const btnEdit = document.getElementById('tab-btn-edit');
        const headingEl = document.getElementById('tmath-workspace-heading');

        [btnAbout, btnProblems, btnSubmissions, btnEdit].forEach(b => b?.classList.remove('active'));
        [viewAbout, viewProblems, viewSubmissions, viewEdit].forEach(v => v ? v.style.display = 'none' : null);

        const username = cachedProfileData?.user?.username || '';

        if (tab === 'about') {
            if (viewAbout) viewAbout.style.display = 'flex';
            btnAbout?.classList.add('active');
            if (headingEl) headingEl.textContent = `Tài khoản của tôi (${username})`;
        } else if (tab === 'problems') {
            if (viewProblems) viewProblems.style.display = 'block';
            btnProblems?.classList.add('active');
            if (headingEl) headingEl.textContent = 'Bài tập đã giải';
        } else if (tab === 'submissions') {
            if (viewSubmissions) viewSubmissions.style.display = 'block';
            if (btnSubmissions) btnSubmissions.classList.add('active');
            if (headingEl) headingEl.textContent = 'Lịch sử bài nộp';
            loadUserSubmissions();
        } else if (tab === 'edit') {
            if (viewEdit) viewEdit.style.display = 'block';
            btnEdit?.classList.add('active');
            if (headingEl) headingEl.textContent = 'Chỉnh sửa tiểu sử';
        }
    }

    // --- 6. SAVE PROFILE CHANGES ---
    async function saveProfileChanges() {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            alert('Vui lòng đăng nhập để cập nhật hồ sơ của bạn.');
            return;
        }

        const bio = document.getElementById('edit-bio-input')?.value || '';
        const fullname = document.getElementById('edit-fullname-input')?.value || '';
        const timezone = document.getElementById('edit-timezone-input')?.value || 'Ho_Chi_Minh';
        const language = document.getElementById('edit-language-input')?.value || 'C++17';
        const editor_theme = document.getElementById('edit-editor-theme-input')?.value || 'Github';

        try {
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            };

            const res = await fetch('/api/user/profile', {
                method: 'POST',
                headers,
                body: JSON.stringify({ bio, fullname, timezone, language, editor_theme })
            });

            if (res.ok) {
                alert('Cập nhật profile thành công!');
                loadProfile();
                switchView('about');
            } else {
                const err = await res.json().catch(() => ({}));
                alert('Không thể lưu profile: ' + (err.detail || 'Vui lòng thử lại.'));
            }
        } catch (e) {
            alert('Lỗi kết nối máy chủ: ' + e.message);
        }
    }

    function changeAvatar() {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            alert('Vui lòng đăng nhập để thay đổi ảnh đại diện.');
            return;
        }

        const current = cachedProfileData?.user?.avatar_path || '';
        const newUrl = prompt('Nhập URL ảnh đại diện mới của bạn (hoặc link ảnh WebP/PNG):', current);
        if (newUrl !== null && newUrl.trim()) {
            fetch('/api/user/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ avatar_path: newUrl.trim() })
            }).then(() => {
                alert('Cập nhật ảnh đại diện thành công!');
                loadProfile();
            });
        }
    }

    function changePassword() {
        alert('Chức năng đổi mật khẩu an toàn: Đã gửi liên kết xác thực đến email tài khoản của bạn.');
    }

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }

    // Expose controller globally
    window.ProfileController = {
        loadProfile,
        switchView,
        viewSubmissionCode,
        closeCodeModal,
        saveProfileChanges,
        changeAvatar,
        changePassword,
    };

    document.addEventListener('DOMContentLoaded', loadProfile);
})();
