/**
 * LOCAL CP Studio — Global Auth Navigation & User State Controller
 * Synchronizes user login state across all subpages with index.html
 */
(function() {
    const TOKEN_KEY = 'local_cp_token';

    async function getAuthenticatedUser() {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return null;
        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!res.ok) {
                localStorage.removeItem(TOKEN_KEY);
                return null;
            }
            return await res.json();
        } catch {
            return null;
        }
    }

    function renderUserNav(user) {
        const containers = document.querySelectorAll('.user-auth-area, .user-chip-container');
        containers.forEach(container => {
            if (!user) {
                container.innerHTML = `
                    <a href="index.html#login" class="btn-auth-login" style="display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:8px; background:var(--arena-tab-active-bg, rgba(37,99,235,0.1)); color:var(--arena-primary, #2563eb); border:1px solid var(--arena-border, #e2e8f0); font-size:0.82rem; font-weight:700; text-decoration:none; transition:all 0.2s;">
                        <i class="fa-solid fa-user"></i> Đăng nhập
                    </a>
                `;
            } else {
                const initials = (user.username || 'CP').slice(0, 2).toUpperCase();
                const role = (user.role || (user.is_admin ? 'admin' : 'user')).toUpperCase();
                let roleBadgeColor = '#2563eb';
                if (role === 'DEV') roleBadgeColor = '#a855f7';
                else if (role === 'SUPERADMIN' || role === 'ADMIN') roleBadgeColor = '#ec4899';

                container.innerHTML = `
                    <div class="user-chip" style="display:inline-flex; align-items:center; gap:8px; padding:4px 10px 4px 4px; border-radius:20px; background:var(--arena-box-bg, #f8fafc); border:1px solid var(--arena-border, #e2e8f0); font-size:0.84rem; font-weight:700; color:var(--arena-text-main, #0f172a);">
                        <span class="avatar" style="width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg, #2563eb, #06b6d4); color:#fff; display:grid; place-items:center; font-size:0.75rem; font-weight:800; font-family:'JetBrains Mono',monospace;">${initials}</span>
                        <span>${escapeHtml(user.username)}</span>
                        <span style="font-size:0.65rem; padding:2px 6px; border-radius:6px; background:${roleBadgeColor}20; color:${roleBadgeColor}; font-family:'JetBrains Mono',monospace;">${role}</span>
                        <button onclick="window.logoutUser()" title="Đăng xuất" style="background:none; border:none; color:var(--arena-text-sub, #94a3b8); cursor:pointer; font-size:0.8rem; padding:2px 4px; margin-left:2px;">
                            <i class="fa-solid fa-arrow-right-from-bracket"></i>
                        </button>
                    </div>
                `;
                const adminBtns = document.querySelectorAll('#admin-nav-btn, #admin-prob-nav-btn');
                if (user.is_admin || ['admin', 'superadmin', 'dev'].includes(role.toLowerCase())) {
                    adminBtns.forEach(btn => btn.classList.remove('hidden'));
                }
            }
        });
    }

    window.logoutUser = async function() {
        if (!confirm('Bạn có chắc muốn đăng xuất?')) return;
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
            } catch {}
        }
        localStorage.removeItem(TOKEN_KEY);
        window.location.reload();
    };

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }

    window.initUserNav = async function() {
        const user = await getAuthenticatedUser();
        window.currentUser = user;
        renderUserNav(user);
        return user;
    };

    document.addEventListener('DOMContentLoaded', window.initUserNav);
})();
