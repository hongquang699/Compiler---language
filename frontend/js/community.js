/**
 * COMPILER---LANGUAGE — Community Hub JavaScript
 * Handles: auth, community listing, create, join, member approval, payment modal
 */

const API = '';   // same origin
let currentUser = null;
let allCommunities = [];
let currentCommunity = null;
let pendingPlan = 'pro';

// ============================================================
// Boot
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadCurrentUser();
    await loadCommunities();
    bindUI();
});

// ============================================================
// Auth
// ============================================================
async function loadCurrentUser() {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    try {
        const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        currentUser = data;
        updateHeader(data);
    } catch (_) {}
}

function updateHeader(user) {
    document.getElementById('auth-open-btn')?.classList.add('hidden');
    document.getElementById('auth-logout-btn')?.classList.remove('hidden');
    const nameEl = document.getElementById('account-name');
    if (nameEl) nameEl.classList.remove('hidden');
    const usernameEl = document.getElementById('account-username');
    if (usernameEl) usernameEl.textContent = user.username || user.name || '';
    const badgeEl = document.getElementById('account-role-badge');
    if (badgeEl && user.role && user.role !== 'user') {
        const roleLabels = { pro: '★ Pro', enterprise: '◆ Enterprise', admin: '⚙ Admin', superadmin: '👑 SuperAdmin', dev: '🛠 Dev' };
        badgeEl.textContent = roleLabels[user.role] || user.role;
        badgeEl.style.display = 'inline-block';
    }
    // avatar
    const avatarImg = document.getElementById('user-avatar-img');
    if (avatarImg) {
        avatarImg.src = user.avatar_path
            ? `/static/uploads/${user.avatar_path}`
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=00f2fe&color=040914&size=64`;
    }
}

// ============================================================
// Load Communities
// ============================================================
async function loadCommunities() {
    const token = localStorage.getItem('auth_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
        const res = await fetch(`${API}/api/communities`, { headers });
        if (!res.ok) throw new Error('Không thể tải communities.');
        const data = await res.json();
        allCommunities = data.communities || [];
        renderCommunities(allCommunities);
    } catch (err) {
        renderCommunities([]);
    }
}

function renderCommunities(list) {
    const grid = document.getElementById('community-grid');
    const empty = document.getElementById('community-empty');

    // Remove old cards (keep empty state)
    [...grid.querySelectorAll('.community-card')].forEach(c => c.remove());

    const searchVal = (document.getElementById('community-search')?.value || '').toLowerCase();
    const filterVal = document.getElementById('community-filter')?.value || 'all';

    const filtered = list.filter(c => {
        const matchSearch = !searchVal || c.name.toLowerCase().includes(searchVal) || c.description.toLowerCase().includes(searchVal);
        const matchFilter = filterVal === 'all' || c.privacy_mode === filterVal;
        return matchSearch && matchFilter;
    });

    if (filtered.length === 0) {
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    filtered.forEach(community => {
        const card = buildCommunityCard(community);
        grid.appendChild(card);
    });
}

function buildCommunityCard(c) {
    const isPrivate = c.privacy_mode === 'private';
    const card = document.createElement('div');
    card.className = 'community-card glass-panel reveal-on-scroll';
    card.innerHTML = `
        <div class="community-card-header">
            <div class="community-card-icon" style="background:${isPrivate ? 'linear-gradient(135deg,#7f00ff,#b147fe)' : 'linear-gradient(135deg,#00f2fe,#00c6ff)'};">
                <i class="fa-solid fa-${isPrivate ? 'lock' : 'globe'}" style="color:#040914;font-size:1rem;"></i>
            </div>
            <div style="flex:1;">
                <h3 class="community-card-name">${escHtml(c.name)}</h3>
                <span class="community-privacy-badge ${isPrivate ? 'badge-private' : 'badge-public'}">
                    <i class="fa-solid fa-${isPrivate ? 'lock' : 'globe'}"></i>
                    ${isPrivate ? 'Riêng tư' : 'Công khai'}
                </span>
            </div>
        </div>
        <p class="community-card-desc">${escHtml(c.description)}</p>
        <div class="community-card-footer">
            <span style="color:var(--text-muted);font-size:0.78rem;">
                <i class="fa-solid fa-users"></i> ${c.member_count || 0} thành viên
                &nbsp;·&nbsp; <i class="fa-solid fa-user-astronaut"></i> ${escHtml(c.owner_name || 'unknown')}
            </span>
            <button class="btn-ide btn-ide-secondary btn-xs view-community-btn" data-id="${c.id}">
                <i class="fa-solid fa-arrow-right"></i> Xem
            </button>
        </div>
    `;
    card.querySelector('.view-community-btn').addEventListener('click', () => openCommunityDetail(c));
    return card;
}

// ============================================================
// Community Detail Modal
// ============================================================
async function openCommunityDetail(community) {
    currentCommunity = community;
    const modal = document.getElementById('community-detail-modal');
    const badge = document.getElementById('detail-privacy-badge');
    const nameEl = document.getElementById('detail-name');
    const ownerEl = document.getElementById('detail-owner');
    const descEl = document.getElementById('detail-desc');

    const isPrivate = community.privacy_mode === 'private';
    badge.className = `community-privacy-badge ${isPrivate ? 'badge-private' : 'badge-public'}`;
    badge.innerHTML = `<i class="fa-solid fa-${isPrivate ? 'lock' : 'globe'}"></i> ${isPrivate ? 'Riêng tư' : 'Công khai'}`;
    nameEl.textContent = community.name;
    ownerEl.textContent = `Bởi: ${community.owner_name || 'unknown'} · ${community.member_count || 0} thành viên`;
    descEl.textContent = community.description;

    // Show detail tabs
    document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.detail-tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelector('.detail-tab[data-target="tab-members"]').classList.add('active');
    document.getElementById('tab-members').classList.remove('hidden');

    // Load members
    await loadMembers(community.id);

    // Show/hide join/delete buttons based on role & membership
    const joinBtn = document.getElementById('detail-join-btn');
    const deleteBtn = document.getElementById('detail-delete-btn');
    joinBtn.classList.remove('hidden');
    deleteBtn.classList.add('hidden');

    if (currentUser) {
        const isOwner = community.created_by === currentUser.id;
        const isPrivileged = ['admin', 'superadmin', 'dev'].includes(currentUser.role);
        if (isOwner || isPrivileged) {
            deleteBtn.classList.remove('hidden');
            // Load requests tab too
            document.getElementById('requests-tab-btn').classList.remove('hidden');
        } else {
            document.getElementById('requests-tab-btn').classList.add('hidden');
        }
    }

    modal.classList.remove('hidden');
}

async function loadMembers(communityId) {
    const token = localStorage.getItem('auth_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const listEl = document.getElementById('members-list');
    listEl.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</div>';
    try {
        const res = await fetch(`${API}/api/communities/${communityId}/members`, { headers });
        if (!res.ok) {
            listEl.innerHTML = `<p style="color:var(--text-secondary);text-align:center;padding:20px;">Không có quyền xem danh sách thành viên.</p>`;
            return;
        }
        const data = await res.json();
        listEl.innerHTML = '';
        if (!data.members || data.members.length === 0) {
            listEl.innerHTML = `<p style="color:var(--text-muted);text-align:center;">Chưa có thành viên nào.</p>`;
            return;
        }
        data.members.forEach(m => {
            const row = document.createElement('div');
            row.className = 'member-row';
            const roleColor = m.role === 'owner' ? 'var(--accent-cyan)' : m.role === 'admin' ? '#f59e0b' : 'var(--text-secondary)';
            row.innerHTML = `
                <img src="${m.avatar_path ? `/static/uploads/${m.avatar_path}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(m.username)}&background=00f2fe&color=040914&size=32`}" class="member-avatar" alt="${escHtml(m.username)}">
                <div style="flex:1;">
                    <strong style="color:var(--text-bright);font-size:0.88rem;">${escHtml(m.username)}</strong>
                    <span style="color:${roleColor};font-size:0.72rem;margin-left:8px;font-weight:700;">${m.role.toUpperCase()}</span>
                </div>
                <span style="color:var(--text-muted);font-size:0.72rem;">${formatDate(m.joined_at)}</span>
            `;
            listEl.appendChild(row);
        });
    } catch (_) {
        listEl.innerHTML = `<p style="color:var(--text-secondary);text-align:center;padding:20px;">Lỗi khi tải thành viên.</p>`;
    }
}

async function loadRequests(communityId) {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    const listEl = document.getElementById('requests-list');
    listEl.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</div>';
    try {
        const res = await fetch(`${API}/api/communities/${communityId}/requests`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
            listEl.innerHTML = `<p style="color:var(--text-secondary);text-align:center;">Không có quyền xem danh sách yêu cầu.</p>`;
            return;
        }
        const data = await res.json();
        listEl.innerHTML = '';
        if (!data.requests || data.requests.length === 0) {
            listEl.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:20px;"><i class="fa-solid fa-check-circle" style="color:var(--accent-green);"></i> Không có yêu cầu nào đang chờ.</p>`;
            return;
        }
        data.requests.forEach(req => {
            const row = document.createElement('div');
            row.className = 'member-row';
            row.innerHTML = `
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(req.username)}&background=7f00ff&color=fff&size=32" class="member-avatar" alt="${escHtml(req.username)}">
                <div style="flex:1;">
                    <strong style="color:var(--text-bright);font-size:0.88rem;">${escHtml(req.username)}</strong>
                    <span style="color:var(--text-muted);font-size:0.72rem;display:block;">${formatDate(req.created_at)}</span>
                </div>
                <div style="display:flex;gap:6px;">
                    <button class="btn-ide btn-ide-run btn-xs approve-btn" data-id="${req.id}" title="Duyệt">
                        <i class="fa-solid fa-check"></i> Duyệt
                    </button>
                    <button class="btn-ide btn-ide-danger btn-xs reject-btn" data-id="${req.id}" title="Từ chối">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `;
            row.querySelector('.approve-btn').addEventListener('click', () => processRequest(req.id, 'approved', listEl, communityId));
            row.querySelector('.reject-btn').addEventListener('click', () => processRequest(req.id, 'rejected', listEl, communityId));
            listEl.appendChild(row);
        });
    } catch (_) {
        listEl.innerHTML = `<p style="color:var(--text-secondary);text-align:center;">Lỗi tải yêu cầu.</p>`;
    }
}

async function processRequest(requestId, status, listEl, communityId) {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    try {
        const res = await fetch(`${API}/api/communities/requests/${requestId}/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status }),
        });
        if (res.ok) {
            await loadRequests(communityId);
            await loadMembers(communityId);
            await loadCommunities();
        } else {
            const err = await res.json();
            alert(err.detail || 'Lỗi xử lý yêu cầu.');
        }
    } catch (_) { alert('Lỗi kết nối.'); }
}

// ============================================================
// Create Community
// ============================================================
async function handleCreateCommunity(e) {
    e.preventDefault();
    const token = localStorage.getItem('auth_token');
    if (!token) {
        document.getElementById('create-community-modal').classList.add('hidden');
        document.getElementById('auth-modal').classList.remove('hidden');
        return;
    }
    const name = document.getElementById('comm-name').value.trim();
    const description = document.getElementById('comm-desc').value.trim();
    const privacyMode = document.querySelector('input[name="privacy"]:checked')?.value || 'public';
    const errEl = document.getElementById('create-community-error');
    errEl.classList.add('hidden');

    const res = await fetch(`${API}/api/communities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description, privacy_mode: privacyMode }),
    });
    const data = await res.json();
    if (res.status === 403) {
        // Needs upgrade
        document.getElementById('create-community-modal').classList.add('hidden');
        openPaymentModal('pro');
        return;
    }
    if (!res.ok) {
        errEl.textContent = data.detail || 'Lỗi tạo community.';
        errEl.classList.remove('hidden');
        return;
    }
    document.getElementById('create-community-modal').classList.add('hidden');
    document.getElementById('create-community-form').reset();
    await loadCommunities();
}

// ============================================================
// Join Community
// ============================================================
async function joinCommunity(communityId) {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        document.getElementById('community-detail-modal').classList.add('hidden');
        document.getElementById('auth-modal').classList.remove('hidden');
        return;
    }
    const res = await fetch(`${API}/api/communities/${communityId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
        const msgs = {
            joined: '✅ Bạn đã tham gia community thành công!',
            already_member: 'ℹ️ Bạn đã là thành viên rồi.',
            pending_request: '📨 Yêu cầu tham gia đã được gửi. Chờ Admin duyệt.',
            request_exists: '⏳ Yêu cầu của bạn đang chờ duyệt.',
        };
        showToast(msgs[data.status] || '✅ Thành công!');
        await loadMembers(communityId);
        await loadCommunities();
    } else {
        showToast(`❌ ${data.detail || 'Lỗi tham gia.'}`, 'error');
    }
}

// ============================================================
// Delete Community
// ============================================================
async function deleteCommunity(communityId) {
    if (!confirm('Bạn có chắc muốn xóa community này? Hành động không thể hoàn tác.')) return;
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    const res = await fetch(`${API}/api/communities/${communityId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
        document.getElementById('community-detail-modal').classList.add('hidden');
        showToast('🗑️ Community đã được xóa.');
        await loadCommunities();
    } else {
        const err = await res.json();
        showToast(`❌ ${err.detail || 'Lỗi xóa.'}`, 'error');
    }
}

// ============================================================
// Payment Modal
// ============================================================
function openPaymentModal(plan) {
    pendingPlan = plan;
    const amounts = { pro: '485.000đ', enterprise: '2.490.000đ' };
    const titles = { pro: 'Nâng cấp Pro Developer', enterprise: 'Đăng ký Enterprise/Campus' };
    document.getElementById('payment-plan-title').textContent = titles[plan] || 'Nâng cấp';
    document.getElementById('payment-amount').textContent = amounts[plan] || '485.000đ';
    const username = currentUser?.username || 'USER';
    const userDisplay = document.getElementById('payment-user-display');
    if (userDisplay) userDisplay.textContent = username;
    document.getElementById('payment-ref').textContent = `LOCALCP ${username.toUpperCase()} ${plan.toUpperCase()}`;
    document.getElementById('payment-error').classList.add('hidden');
    const senderInput = document.getElementById('payment-sender-name');
    if (senderInput) senderInput.value = '';
    document.getElementById('payment-modal').classList.remove('hidden');
}

async function confirmPayment() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        document.getElementById('payment-modal').classList.add('hidden');
        document.getElementById('auth-modal').classList.remove('hidden');
        return;
    }
    const senderName = document.getElementById('payment-sender-name')?.value?.trim() || '';
    const errEl = document.getElementById('payment-error');
    if (!senderName) {
        if (errEl) {
            errEl.textContent = 'Vui lòng nhập họ và tên người chuyển khoản theo tài khoản ngân hàng.';
            errEl.classList.remove('hidden');
        }
        document.getElementById('payment-sender-name')?.focus();
        return;
    }

    const refCode = document.getElementById('payment-ref').textContent;
    const btn = document.getElementById('confirm-payment-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi thông báo Dev & SuperAdmin...';

    try {
        const res = await fetch(`${API}/api/payment/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ plan: pendingPlan, ref_code: refCode, sender_name: senderName }),
        });
        const data = await res.json();
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Tôi đã chuyển khoản — Gửi yêu cầu phê duyệt gói';

        if (res.ok) {
            document.getElementById('payment-modal').classList.add('hidden');
            showToast(`🎉 Đã gửi yêu cầu xét duyệt gói ${data.plan?.toUpperCase()} thành công đến Dev & SuperAdmin. Tài khoản sẽ được nâng cấp ngay sau khi quản trị viên phê duyệt.`);
            await loadCurrentUser();
        } else {
            if (errEl) {
                errEl.textContent = data.detail || 'Lỗi gửi yêu cầu thanh toán.';
                errEl.classList.remove('hidden');
            }
        }
    } catch (e) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Tôi đã chuyển khoản — Gửi yêu cầu phê duyệt gói';
        if (errEl) {
            errEl.textContent = 'Không thể kết nối máy chủ.';
            errEl.classList.remove('hidden');
        }
    }
}

// ============================================================
// Auth Handlers (lightweight, copied from app.js pattern)
// ============================================================
async function handleAuth(e) {
    e.preventDefault();
    const mode = document.querySelector('.auth-tab.active')?.dataset.authMode || 'login';
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    const errEl = document.getElementById('auth-error');
    errEl.classList.add('hidden');

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
        errEl.textContent = data.detail || 'Lỗi đăng nhập.';
        errEl.classList.remove('hidden');
        return;
    }
    localStorage.setItem('auth_token', data.token);
    document.getElementById('auth-modal').classList.add('hidden');
    await loadCurrentUser();
    await loadCommunities();
}

// ============================================================
// Bind UI events
// ============================================================
function bindUI() {
    // Create community button
    document.getElementById('create-community-btn').addEventListener('click', async () => {
        if (!currentUser) {
            document.getElementById('auth-modal').classList.remove('hidden');
            return;
        }
        // Check if user can create
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API}/api/payment/can-create-community`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (!data.allowed) {
                openPaymentModal('pro');
                return;
            }
        } catch (_) {}
        document.getElementById('create-community-modal').classList.remove('hidden');
    });

    document.getElementById('close-create-modal').addEventListener('click', () => {
        document.getElementById('create-community-modal').classList.add('hidden');
    });
    document.getElementById('create-community-form').addEventListener('submit', handleCreateCommunity);

    // Privacy card visuals
    document.querySelectorAll('input[name="privacy"]').forEach(radio => {
        radio.addEventListener('change', () => {
            document.getElementById('opt-public').classList.toggle('selected', document.querySelector('input[name="privacy"][value="public"]').checked);
            document.getElementById('opt-private').classList.toggle('selected', document.querySelector('input[name="privacy"][value="private"]').checked);
        });
    });
    document.getElementById('opt-public').classList.add('selected');

    // Detail tabs
    document.querySelectorAll('.detail-tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.detail-tab-content').forEach(t => t.classList.add('hidden'));
            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.target);
            if (target) target.classList.remove('hidden');
            if (tab.dataset.target === 'tab-requests' && currentCommunity) {
                await loadRequests(currentCommunity.id);
            }
        });
    });

    // Join / delete from detail
    document.getElementById('detail-join-btn').addEventListener('click', () => {
        if (currentCommunity) joinCommunity(currentCommunity.id);
    });
    document.getElementById('detail-delete-btn').addEventListener('click', () => {
        if (currentCommunity) deleteCommunity(currentCommunity.id);
    });

    // Payment modal
    document.getElementById('close-payment-modal').addEventListener('click', () => {
        document.getElementById('payment-modal').classList.add('hidden');
    });
    document.getElementById('confirm-payment-btn').addEventListener('click', confirmPayment);

    // Auth modal
    document.getElementById('auth-open-btn')?.addEventListener('click', () => {
        document.getElementById('auth-modal').classList.remove('hidden');
    });
    document.getElementById('auth-close-btn')?.addEventListener('click', () => {
        document.getElementById('auth-modal').classList.add('hidden');
    });
    document.getElementById('auth-logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem('auth_token');
        currentUser = null;
        location.reload();
    });
    document.getElementById('auth-form')?.addEventListener('submit', handleAuth);
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });

    // Search & filter
    document.getElementById('community-search').addEventListener('input', () => renderCommunities(allCommunities));
    document.getElementById('community-filter').addEventListener('change', () => renderCommunities(allCommunities));
    document.getElementById('refresh-btn').addEventListener('click', loadCommunities);

    // Close modals on backdrop click
    ['create-community-modal', 'payment-modal', 'auth-modal'].forEach(id => {
        document.getElementById(id).addEventListener('click', function(e) {
            if (e.target === this) this.classList.add('hidden');
        });
    });
    document.getElementById('community-detail-modal').addEventListener('click', function(e) {
        if (e.target === this) this.classList.add('hidden');
    });
}

// ============================================================
// Helpers
// ============================================================
function escHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position:fixed;bottom:24px;right:24px;z-index:9999;
        padding:12px 20px;border-radius:12px;font-size:0.85rem;font-weight:600;
        background:${type === 'error' ? 'rgba(239,68,68,.95)' : 'rgba(16,185,129,.95)'};
        color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.3);
        animation:slideInRight .3s ease;max-width:360px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
