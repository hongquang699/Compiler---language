/**
 * COMPILER---LANGUAGE — Standings Module JavaScript Controller
 */

(function () {
    let allStandings = [];
    let currentFilter = 'all';
    let currentQuery = '';

    async function loadStandings() {
        const tbody = document.getElementById('standings-tbody');
        try {
            const res = await fetch('/api/standings');
            if (!res.ok) throw new Error('Không thể tải bảng xếp hạng');
            const data = await res.json();
            allStandings = data.standings || [];
            renderStandings();
        } catch (err) {
            if (tbody) {
                tbody.innerHTML = `
                    <tr><td colspan="6" style="text-align:center; padding:40px; color:#ef4444;">
                        <i class="fa-solid fa-triangle-exclamation" style="font-size:1.5rem; margin-bottom:8px;"></i>
                        <p>${err.message}</p>
                    </td></tr>
                `;
            }
        }
    }

    function filterStandings(type, btn) {
        document.querySelectorAll('.filters .filter').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        currentFilter = type;
        renderStandings();
    }

    function searchStandings(val) {
        currentQuery = (val || '').trim().toLowerCase();
        renderStandings();
    }

    function renderStandings() {
        const tbody = document.getElementById('standings-tbody');
        if (!tbody) return;

        const currentUser = window.currentUser;

        let filtered = allStandings.filter(item => {
            const role = (item.role || '').toLowerCase();
            const username = (item.username || '').toLowerCase();
            const isExcluded = item.is_admin || 
                               ['admin', 'superadmin', 'dev', 'developer', 'staff', 'moderator'].includes(role) ||
                               ['admin', 'superadmin', 'dev', 'developer', 'root', 'staff'].includes(username);
            if (isExcluded) return false;
            if (currentQuery && !username.includes(currentQuery)) return false;
            return true;
        });

        if (!filtered.length) {
            tbody.innerHTML = `
                <tr><td colspan="6" style="text-align:center; padding:40px; color:var(--arena-text-muted);">
                    Không tìm thấy thành viên nào phù hợp.
                </td></tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map((item, index) => {
            const rank = item.rank;
            let rankClass = '';
            if (rank === 1) rankClass = 'gold';
            else if (rank === 2) rankClass = 'silver';
            else if (rank === 3) rankClass = 'bronze';

            const isCurrent = currentUser && currentUser.username === item.username;
            const initials = (item.username || 'CP').slice(0, 2).toUpperCase();
            const role = (item.role || (item.is_admin ? 'admin' : 'user')).toLowerCase();
            const roleLabel = role === 'dev' ? 'DEV' : (role === 'admin' ? 'ADMIN' : 'USER');
            const roleClass = role === 'dev' ? 'dev' : (role === 'admin' ? 'admin' : 'user');
            const joinedDate = item.joined_at ? new Date(item.joined_at).toLocaleDateString('vi-VN') : 'Mới';

            return `
                <tr class="${isCurrent ? 'standing-row-current' : ''}" style="animation: fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.04}s both;">
                    <td style="text-align: center;">
                        <span class="rank ${rankClass}">${rank}</span>
                    </td>
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar-sm">${initials}</div>
                            <div>
                                <strong style="color: var(--arena-text-main); font-size: 0.95rem;">${escapeHtml(item.username)}</strong>
                                ${isCurrent ? '<span style="font-size:0.72rem; color:var(--arena-primary); margin-left:6px; font-weight:700;">(Bạn)</span>' : ''}
                            </div>
                        </div>
                    </td>
                    <td style="text-align: center;">
                        <span class="role-tag ${roleClass}">${roleLabel}</span>
                    </td>
                    <td style="text-align: center; font-weight: 700;">
                        ${item.solved_count} bài
                    </td>
                    <td style="text-align: center;">
                        <span class="score">${Number(item.total_score).toLocaleString('vi-VN')}</span>
                    </td>
                    <td style="text-align: right; color: var(--arena-text-muted); font-size: 0.84rem;">
                        ${joinedDate}
                    </td>
                </tr>
            `;
        }).join('');
    }

    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[c]);
    }

    // Expose functions globally for event handlers
    window.StandingsController = {
        loadStandings,
        filterStandings,
        searchStandings,
    };

    window.filterStandings = filterStandings;
    window.searchStandings = searchStandings;

    document.addEventListener('DOMContentLoaded', loadStandings);
})();
