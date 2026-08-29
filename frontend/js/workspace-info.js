/**
 * COMPILER---LANGUAGE — Workspace Contest Info Controller
 */

(function () {
    const params = new URLSearchParams(window.location.search);
    const contestId = params.get('id') || '3';
    let countdownInterval = null;

    function goPage(page) {
        window.location.href = page + '?id=' + contestId;
    }

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[c]);
    }

    async function loadContest() {
        const token = localStorage.getItem('local_cp_token');
        const headers = token ? { Authorization: 'Bearer ' + token } : {};
        try {
            const res = await fetch('/api/competitions/' + contestId, { headers });
            if (!res.ok) {
                const titleEl = document.getElementById('ws-title');
                if (titleEl) titleEl.textContent = 'Không tìm thấy cuộc thi';
                return;
            }
            const data = await res.json();
            document.title = (data.title || 'Cuộc thi') + ' | COMPILER---LANGUAGE Studio';
            const titleEl = document.getElementById('ws-title');
            if (titleEl) titleEl.textContent = data.title || 'Cuộc thi ClueOJ';

            const stmt = data.statement || 'Không có mô tả chi tiết cho cuộc thi này.';
            const descEl = document.getElementById('ws-desc-content');
            if (descEl) {
                descEl.innerHTML = typeof marked !== 'undefined' ? marked.parse(stmt) : stmt.replace(/\n/g, '<br>');
            }

            startCountdown(data.starts_at, data.ends_at);
        } catch (e) {
            console.error('Lỗi khi tải thông tin cuộc thi:', e);
        }
    }

    function startCountdown(startStr, endStr) {
        if (countdownInterval) clearInterval(countdownInterval);
        const start = startStr ? new Date(startStr) : null;
        const end = endStr ? new Date(endStr) : null;

        const dateEl = document.getElementById('ws-date-str');
        const timeEl = document.getElementById('ws-time-str');
        const diffEl = document.getElementById('ws-time-diff');
        const subEl = document.getElementById('ws-time-sub');

        if (start) {
            if (dateEl) dateEl.textContent = start.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
            if (timeEl) timeEl.textContent = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        } else {
            if (dateEl) dateEl.textContent = 'Linh hoạt';
            if (timeEl) timeEl.textContent = '--:--';
        }

        const tick = () => {
            const now = new Date();
            if (end && now < end) {
                const diff = Math.max(0, Math.floor((end - now) / 1000));
                const h = String(Math.floor(diff / 3600)).padStart(2, '0');
                const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
                const s = String(diff % 60).padStart(2, '0');
                if (diffEl) diffEl.textContent = `You have ${h}:${m}:${s} remaining.`;
                if (subEl) subEl.textContent = end.toLocaleString('vi-VN') + ' +07';
            } else if (start && now < start) {
                const diff = Math.max(0, Math.floor((start - now) / 1000));
                const h = String(Math.floor(diff / 3600)).padStart(2, '0');
                const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
                const s = String(diff % 60).padStart(2, '0');
                if (diffEl) diffEl.textContent = `Starts in ${h}:${m}:${s}`;
                if (subEl) subEl.textContent = 'Tính từ ' + start.toLocaleString('vi-VN');
            } else if (!start && !end) {
                if (diffEl) diffEl.textContent = 'Linh hoạt';
                if (subEl) subEl.textContent = 'Cuộc thi không giới hạn thời gian.';
            } else {
                if (diffEl) diffEl.textContent = 'ĐÃ KẾT THÚC';
                if (subEl) subEl.textContent = 'Cuộc thi đã kết thúc.';
                clearInterval(countdownInterval);
            }
        };
        tick();
        countdownInterval = setInterval(tick, 1000);
    }

    function addComment() {
        const input = document.getElementById('comment-input');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        const list = document.getElementById('comments-list');
        const now = new Date().toLocaleString('vi-VN');
        const commentHtml = `
            <div style="padding: 12px 0; border-bottom: 1px solid var(--ws-border);">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <strong style="color:var(--ws-text-main); font-size:0.88rem;">Thí sinh</strong>
                    <span style="color:var(--ws-text-sub); font-size:0.75rem;">${now}</span>
                </div>
                <p style="color:var(--ws-text-muted); font-size:0.88rem; margin:0;">${escapeHtml(text)}</p>
            </div>
        `;
        if (list && list.querySelector('p')) list.innerHTML = '';
        if (list) list.innerHTML += commentHtml;
        input.value = '';
    }

    async function loadClarifications() {
        const listEl = document.getElementById('clarifications-list');
        if (!listEl) return;
        const token = localStorage.getItem('local_cp_token') || localStorage.getItem('auth_token');
        const headers = token ? { Authorization: 'Bearer ' + token } : {};

        try {
            const res = await fetch(`/api/competitions/${contestId}/clarifications`, { headers });
            if (!res.ok) throw new Error('Không thể nạp clarifications.');
            const data = await res.json();
            const clars = data.clarifications || [];

            if (clars.length === 0) {
                listEl.innerHTML = `<p style="text-align: center; color: #94a3b8; font-size: 0.84rem; padding: 12px 0;">Chưa có giải đáp nào. Bấm "Đặt câu hỏi" nếu bạn có thắc mắc về đề bài.</p>`;
                return;
            }

            listEl.innerHTML = clars.map(c => {
                const isAnswered = Boolean(c.answer);
                const statusBadge = isAnswered
                    ? `<span style="color:#34d399; background:rgba(52,211,153,0.12); padding:2px 8px; border-radius:4px; font-size:0.72rem; font-weight:700;">ĐÃ TRẢ LỜI</span>`
                    : `<span style="color:#fbbf24; background:rgba(245,158,11,0.12); padding:2px 8px; border-radius:4px; font-size:0.72rem; font-weight:700;">CHỜ TRẢ LỜI</span>`;

                return `
                    <div style="background: rgba(15,23,42,0.5); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <span style="font-weight: 700; color: #38bdf8; font-size: 0.8rem;">[Bài ${escapeHtml(c.problem_code || 'GENERAL')}]</span>
                                <span style="color: #94a3b8; font-size: 0.76rem;">Bởi @${escapeHtml(c.username || 'Thí sinh')}</span>
                            </div>
                            <div>${statusBadge}</div>
                        </div>
                        <div style="color: #f1f5f9; font-size: 0.84rem; margin-bottom: ${isAnswered ? '8px' : '0'};">
                            <strong>Hỏi:</strong> ${escapeHtml(c.question)}
                        </div>
                        ${isAnswered ? `
                            <div style="background: rgba(56,189,248,0.08); border-left: 3px solid #38bdf8; padding: 8px 12px; border-radius: 4px; color: #bae6fd; font-size: 0.82rem;">
                                <strong>Ban Tổ Chức (${escapeHtml(c.answered_by_name || 'Admin')}):</strong> ${escapeHtml(c.answer)}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        } catch (e) {
            listEl.innerHTML = `<p style="text-align: center; color: #94a3b8; font-size: 0.8rem;">${e.message}</p>`;
        }
    }

    function toggleClarificationForm() {
        const box = document.getElementById('clarification-form-box');
        if (box) box.style.display = (box.style.display === 'none' || !box.style.display) ? 'block' : 'none';
    }

    async function submitClarification() {
        const probCode = (document.getElementById('clar-prob-code')?.value || 'GENERAL').trim();
        const question = (document.getElementById('clar-question-input')?.value || '').trim();
        if (!question) {
            alert('Vui lòng nhập nội dung câu hỏi.');
            return;
        }

        const token = localStorage.getItem('local_cp_token') || localStorage.getItem('auth_token');
        if (!token) {
            alert('Vui lòng đăng nhập để đặt câu hỏi.');
            return;
        }

        try {
            const res = await fetch(`/api/competitions/${contestId}/clarifications`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + token
                },
                body: JSON.stringify({ problem_code: probCode, question })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Không gửi được câu hỏi.');
            alert('✓ Đã gửi câu hỏi tới Ban tổ chức thành công!');
            document.getElementById('clar-question-input').value = '';
            toggleClarificationForm();
            loadClarifications();
        } catch (e) {
            alert(e.message);
        }
    }

    // Expose global functions
    window.WorkspaceInfoController = {
        loadContest,
        goPage,
        addComment,
        loadClarifications,
        toggleClarificationForm,
        submitClarification
    };

    window.goPage = goPage;
    window.addComment = addComment;
    window.toggleClarificationForm = toggleClarificationForm;
    window.submitClarification = submitClarification;

    document.addEventListener('DOMContentLoaded', () => {
        loadContest();
        loadClarifications();
    });
})();

