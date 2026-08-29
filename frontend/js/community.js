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
    ['create-community-modal', 'payment-modal', 'auth-modal', 'create-post-modal', 'post-detail-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', function(e) {
                if (e.target === this) this.classList.add('hidden');
            });
        }
    });
    document.getElementById('community-detail-modal')?.addEventListener('click', function(e) {
        if (e.target === this) this.classList.add('hidden');
    });

    // Tab switcher between Groups and Forum
    document.getElementById('tab-groups-btn')?.addEventListener('click', () => switchTab('groups'));
    document.getElementById('tab-forum-btn')?.addEventListener('click', () => switchTab('forum'));

    // Forum event listeners
    document.getElementById('forum-search')?.addEventListener('input', () => {
        const q = document.getElementById('forum-search').value.trim();
        const cat = document.getElementById('forum-category-filter').value;
        loadForumPosts(cat, q);
    });
    document.getElementById('forum-category-filter')?.addEventListener('change', () => {
        const q = document.getElementById('forum-search').value.trim();
        const cat = document.getElementById('forum-category-filter').value;
        loadForumPosts(cat, q);
    });
    document.getElementById('forum-refresh-btn')?.addEventListener('click', () => {
        const q = document.getElementById('forum-search').value.trim();
        const cat = document.getElementById('forum-category-filter').value;
        loadForumPosts(cat, q);
    });
    document.getElementById('btn-create-post')?.addEventListener('click', () => {
        if (!currentUser) {
            document.getElementById('auth-modal')?.classList.remove('hidden');
            return;
        }
        document.getElementById('create-post-modal')?.classList.remove('hidden');
    });
    document.getElementById('close-post-modal')?.addEventListener('click', () => {
        document.getElementById('create-post-modal')?.classList.add('hidden');
    });
    document.getElementById('close-post-detail-modal')?.addEventListener('click', () => {
        document.getElementById('post-detail-modal')?.classList.add('hidden');
    });
    document.getElementById('create-post-form')?.addEventListener('submit', handleCreatePost);
    document.getElementById('btn-submit-comment')?.addEventListener('click', handleSubmitComment);
}

function switchTab(tab) {
    const groupsBtn = document.getElementById('tab-groups-btn');
    const forumBtn = document.getElementById('tab-forum-btn');
    const secGroups = document.getElementById('section-groups');
    const secForum = document.getElementById('section-forum');

    if (tab === 'forum') {
        groupsBtn?.classList.remove('btn-ide-run', 'active');
        groupsBtn?.classList.add('btn-ide-ghost');
        forumBtn?.classList.remove('btn-ide-ghost');
        forumBtn?.classList.add('btn-ide-run', 'active');
        if (secGroups) secGroups.style.display = 'none';
        if (secForum) secForum.style.display = 'block';
        loadForumPosts();
    } else {
        forumBtn?.classList.remove('btn-ide-run', 'active');
        forumBtn?.classList.add('btn-ide-ghost');
        groupsBtn?.classList.remove('btn-ide-ghost');
        groupsBtn?.classList.add('btn-ide-run', 'active');
        if (secGroups) secGroups.style.display = 'block';
        if (secForum) secForum.style.display = 'none';
        loadCommunities();
    }
}

// ============================================================
// FORUM & DISCUSSIONS LOGIC
// ============================================================
let allForumPosts = [];
let activePostId = null;

async function loadForumPosts(category = 'all', q = '') {
    const container = document.getElementById('forum-posts-container');
    if (!container) return;
    try {
        let url = `${API}/api/forum/posts?page=1&limit=30`;
        if (category && category !== 'all') url += `&category=${encodeURIComponent(category)}`;
        if (q) url += `&q=${encodeURIComponent(q)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Không tải được danh sách bài viết.');
        const data = await res.json();
        allForumPosts = data.posts || [];
        renderForumPosts(allForumPosts);
    } catch (err) {
        container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted);">${err.message}</div>`;
    }
}

function renderForumPosts(posts) {
    const container = document.getElementById('forum-posts-container');
    if (!container) return;
    if (posts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 50px 20px; background: rgba(15,23,42,0.5); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px;">
                <i class="fa-solid fa-comments" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 12px;"></i>
                <h4 style="color: var(--text-secondary); margin-bottom: 6px;">Chưa có bài viết nào trong chủ đề này</h4>
                <p style="color: var(--text-muted); font-size: 0.82rem;">Hãy là người đầu tiên chia sẻ kiến thức hoặc đặt câu hỏi!</p>
                <button class="btn-ide btn-ide-run btn-sm" onclick="document.getElementById('btn-create-post').click()" style="margin-top: 10px;">
                    <i class="fa-solid fa-pen-nib"></i> Viết bài mới ngay
                </button>
            </div>
        `;
        return;
    }

    const catBadge = {
        general: '<span style="color:#38bdf8;background:rgba(56,189,248,0.12);padding:3px 9px;border-radius:6px;font-size:0.75rem;font-weight:700;"><i class="fa-solid fa-comments"></i> Thảo luận</span>',
        tutorial: '<span style="color:#34d399;background:rgba(52,211,153,0.12);padding:3px 9px;border-radius:6px;font-size:0.75rem;font-weight:700;"><i class="fa-solid fa-lightbulb"></i> Hướng dẫn</span>',
        editorial: '<span style="color:#c084fc;background:rgba(168,85,247,0.12);padding:3px 9px;border-radius:6px;font-size:0.75rem;font-weight:700;"><i class="fa-solid fa-book-open"></i> Lời giải</span>',
        announcement: '<span style="color:#fbbf24;background:rgba(245,158,11,0.12);padding:3px 9px;border-radius:6px;font-size:0.75rem;font-weight:700;"><i class="fa-solid fa-bullhorn"></i> Thông báo</span>'
    };

    container.innerHTML = posts.map(p => {
        const isPinned = p.is_pinned ? '<span style="color:#fbbf24;margin-right:6px;" title="Bài viết được ghim"><i class="fa-solid fa-thumbtack"></i></span>' : '';
        const isLocked = p.is_locked ? '<span style="color:#f87171;margin-right:6px;" title="Đã khóa bình luận"><i class="fa-solid fa-lock"></i></span>' : '';
        const tags = (p.tags || '').split(',').filter(Boolean).map(t => `<span style="font-size:0.72rem;color:var(--text-muted);background:rgba(255,255,255,0.05);padding:2px 7px;border-radius:4px;">#${escHtml(t.trim())}</span>`).join(' ');

        return `
            <div class="community-card" style="cursor: pointer; transition: transform 0.2s, border-color 0.2s;" onclick="openPostDetail(${p.id})">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                            ${catBadge[p.category] || catBadge.general}
                            ${isPinned}
                            ${isLocked}
                            <span style="color: var(--text-muted); font-size: 0.78rem;">Đăng bởi <strong style="color: var(--accent-cyan);">@${escHtml(p.username)}</strong> · ${formatDate(p.created_at)}</span>
                        </div>
                        <h3 style="color: var(--text-bright); font-size: 1.1rem; font-weight: 700; margin: 0 0 8px; line-height: 1.4;">
                            ${escHtml(p.title)}
                        </h3>
                        <p style="color: var(--text-secondary); font-size: 0.84rem; margin: 0 0 12px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${escHtml(p.content.substring(0, 200))}...
                        </p>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                            ${tags}
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end; flex-shrink: 0;">
                        <span style="font-size: 0.8rem; color: var(--accent-cyan); background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.2); padding: 4px 10px; border-radius: 8px; font-weight: 600;">
                            <i class="fa-solid fa-arrow-up"></i> ${p.upvotes || 0}
                        </span>
                        <span style="font-size: 0.76rem; color: var(--text-muted);">
                            <i class="fa-solid fa-comment"></i> ${p.comment_count || 0}
                        </span>
                        <span style="font-size: 0.74rem; color: var(--text-dim);">
                            <i class="fa-solid fa-eye"></i> ${p.view_count || 0}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function handleCreatePost(e) {
    e.preventDefault();
    const title = document.getElementById('post-title').value.trim();
    const category = document.getElementById('post-category').value;
    const tags = document.getElementById('post-tags').value.trim();
    const content = document.getElementById('post-content').value.trim();

    if (!title || !content) {
        showToast('Vui lòng điền tiêu đề và nội dung bài viết.', 'error');
        return;
    }

    const token = localStorage.getItem('auth_token');
    try {
        const res = await fetch(`${API}/api/forum/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ title, category, tags, content })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Không thể đăng bài viết.');
        showToast('✓ Đã đăng bài viết thảo luận thành công!');
        document.getElementById('create-post-modal')?.classList.add('hidden');
        document.getElementById('create-post-form').reset();
        loadForumPosts();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

window.openPostDetail = async function(postId) {
    activePostId = postId;
    const token = localStorage.getItem('auth_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
        const res = await fetch(`${API}/api/forum/posts/${postId}`, { headers });
        if (!res.ok) throw new Error('Không thể tải bài viết.');
        const { post } = await res.json();

        const contentEl = document.getElementById('post-detail-content');
        if (contentEl) {
            contentEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px;">
                    <div>
                        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px;">
                            <span style="color: var(--accent-cyan); font-weight: 700; font-size: 0.85rem;"><i class="fa-solid fa-user"></i> @${escHtml(post.username)}</span>
                            <span style="color: var(--text-dim); font-size: 0.78rem;">· ${formatDate(post.created_at)}</span>
                        </div>
                        <h2 style="color: var(--text-bright); font-size: 1.35rem; font-weight: 800; margin: 0; line-height: 1.35;">
                            ${escHtml(post.title)}
                        </h2>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="btn-action-pill" onclick="handlePostReact(${post.id}, 'up')" style="color: var(--accent-cyan); border-color: rgba(56,189,248,0.3);">
                            <i class="fa-solid fa-arrow-up"></i> Upvote (${post.upvotes || 0})
                        </button>
                        <button class="btn-action-pill" onclick="handlePostReact(${post.id}, 'down')" style="color: var(--text-muted);">
                            <i class="fa-solid fa-arrow-down"></i> (${post.downvotes || 0})
                        </button>
                    </div>
                </div>
                <div style="background: rgba(2,6,23,0.7); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; color: var(--text-bright); font-size: 0.9rem; line-height: 1.65; white-space: pre-wrap; word-break: break-word;">
                    ${escHtml(post.content)}
                </div>
            `;
        }
        document.getElementById('post-detail-modal')?.classList.remove('hidden');
        loadPostComments(postId);
    } catch (err) {
        showToast(err.message, 'error');
    }
};

async function loadPostComments(postId) {
    const container = document.getElementById('post-comments-container');
    const countEl = document.getElementById('post-detail-comment-count');
    if (!container) return;

    try {
        const res = await fetch(`${API}/api/forum/posts/${postId}/comments`);
        if (!res.ok) throw new Error('Không thể tải bình luận.');
        const { comments } = await res.json();
        if (countEl) countEl.textContent = comments.length;

        if (comments.length === 0) {
            container.innerHTML = `<p style="color: var(--text-dim); font-size: 0.82rem; text-align: center; padding: 12px 0;">Chưa có bình luận nào. Hãy chia sẻ ý kiến của bạn!</p>`;
            return;
        }

        container.innerHTML = comments.map(c => `
            <div style="background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; padding: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: 700; color: var(--accent-cyan); font-size: 0.82rem;">@${escHtml(c.username)}</span>
                    <span style="color: var(--text-dim); font-size: 0.74rem;">${formatDate(c.created_at)}</span>
                </div>
                <div style="color: var(--text-secondary); font-size: 0.85rem; line-height: 1.5; white-space: pre-wrap;">
                    ${escHtml(c.content)}
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.8rem;">${err.message}</p>`;
    }
}

async function handleSubmitComment() {
    const input = document.getElementById('new-comment-input');
    const content = input?.value.trim();
    if (!content || !activePostId) {
        showToast('Vui lòng nhập nội dung bình luận.', 'error');
        return;
    }
    const token = localStorage.getItem('auth_token');
    if (!token) {
        showToast('Vui lòng đăng nhập để bình luận.', 'error');
        return;
    }

    try {
        const res = await fetch(`${API}/api/forum/posts/${activePostId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Gửi bình luận thất bại.');
        input.value = '';
        showToast('✓ Đã gửi bình luận!');
        loadPostComments(activePostId);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

window.handlePostReact = async function(postId, reactionType) {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        showToast('Vui lòng đăng nhập để bình chọn.', 'error');
        return;
    }
    try {
        const res = await fetch(`${API}/api/forum/react`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ target_type: 'post', target_id: postId, reaction_type: reactionType })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Bình chọn thất bại.');
        openPostDetail(postId);
    } catch (err) {
        showToast(err.message, 'error');
    }
};

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

