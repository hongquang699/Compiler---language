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
                const username = user.username || 'vohongquang';
                const avatarUrl = user.avatar_path || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=100&auto=format&fit=crop&q=80';
                const role = (user.role || (user.is_admin ? 'admin' : 'user')).toUpperCase();

                container.innerHTML = `
                    <div style="display:inline-flex; align-items:center; gap:6px;">
                        <a href="profile.html" class="user-pill-glass" title="Xem thông tin tài khoản của tôi" style="display:inline-flex; align-items:center; gap:8px; padding:3px 12px 3px 4px; border-radius:20px; background:rgba(255,255,255,0.08); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.2); font-size:0.84rem; font-weight:700; color:#fff; text-decoration:none; box-shadow:0 4px 16px rgba(0,0,0,0.2); transition:all 0.3s ease;">
                            <div style="width:26px; height:26px; border-radius:50%; overflow:hidden; border:1px solid rgba(255,255,255,0.4); display:flex; align-items:center; justify-content:center; background:#1e1b4b;">
                                <img src="${avatarUrl}" alt="avatar" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=100&auto=format&fit=crop&q=80'">
                            </div>
                            <span style="font-family:'JetBrains Mono',monospace; color:var(--text-primary, #fff);">${escapeHtml(username)}</span>
                            <span style="width:6px; height:6px; border-radius:50%; background:#34d399; box-shadow:0 0 8px #34d399;"></span>
                        </a>
                        <button onclick="window.logoutUser()" title="Đăng xuất" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#94a3b8; cursor:pointer; font-size:0.78rem; padding:5px 8px; border-radius:10px; transition:all 0.2s;">
                            <i class="fa-solid fa-arrow-right-from-bracket"></i>
                        </button>
                    </div>
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
