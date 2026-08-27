// Dynamic Problem Bank & Arena Engine for Compiler---language Studio
let allProblems = [];
let currentPage = 1;
const pageSize = 25;
let currentFilter = 'all';
let currentChapter = 0;
let currentSearch = '';

document.addEventListener('DOMContentLoaded', () => {
    initProblemBank();
});

async function initProblemBank() {
    const tbody = document.getElementById('problem-rows');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem; color:#2196f3; margin-bottom:10px; display:block;"></i>Đang tải 300 bài tập từ kho đề bài...</td></tr>`;
    }

    try {
        const res = await fetch('/api/problem-bank?limit=300');
        const data = await res.json();
        allProblems = data.problems || [];
        populateChapterFilter(allProblems);
        setupEventListeners();
        renderProblems();
    } catch (err) {
        console.error('Lỗi khi tải kho bài tập:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Không thể kết nối đến máy chủ. Vui lòng thử lại.</td></tr>`;
        }
    }
}

function populateChapterFilter(problems) {
    const chapterMap = {};
    problems.forEach(p => {
        if (p.chapter_num && p.chapter_title) {
            chapterMap[p.chapter_num] = p.chapter_title;
        }
    });

    // Check if chapter select exists or create it in toolbar
    let chapterSelect = document.getElementById('chapter-filter-select');
    if (!chapterSelect) {
        const toolbar = document.querySelector('.toolbar');
        if (toolbar) {
            const selectWrap = document.createElement('div');
            selectWrap.style.display = 'flex';
            selectWrap.style.alignItems = 'center';
            selectWrap.style.gap = '8px';
            selectWrap.innerHTML = `
                <label style="font-size: 0.82rem; font-weight: 700; color: var(--arena-text-sub); white-space: nowrap;"><i class="fa-solid fa-book-open"></i> Chuyên đề:</label>
                <select id="chapter-filter-select" style="padding: 6px 12px; border-radius: 8px; border: 1px solid var(--arena-border); background: var(--arena-card); color: var(--arena-text-main); font-size: 0.85rem; font-weight: 600; cursor: pointer; outline: none;">
                    <option value="0">Tất cả 30 chuyên đề (300 bài)</option>
                </select>
            `;
            toolbar.insertBefore(selectWrap, toolbar.querySelector('.search'));
            chapterSelect = document.getElementById('chapter-filter-select');
        }
    }

    if (chapterSelect) {
        Object.keys(chapterMap).sort((a, b) => Number(a) - Number(b)).forEach(cNum => {
            const opt = document.createElement('option');
            opt.value = cNum;
            opt.textContent = `${chapterMap[cNum]}`;
            chapterSelect.appendChild(opt);
        });

        chapterSelect.addEventListener('change', (e) => {
            currentChapter = Number(e.target.value);
            currentPage = 1;
            renderProblems();
        });
    }
}

function setupEventListeners() {
    // Difficulty filter buttons
    const filterButtons = document.querySelectorAll('.filter');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(item => item.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter || 'all';
            currentPage = 1;
            renderProblems();
        });
    });

    // Search input
    const searchInput = document.getElementById('problem-search');
    if (searchInput) {
        searchInput.placeholder = "Tìm theo mã bài (PY001), tên bài, hoặc từ khóa...";
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.trim().toLowerCase();
            currentPage = 1;
            renderProblems();
        });
    }
}

function getFilteredProblems() {
    return allProblems.filter(p => {
        // Filter by chapter
        if (currentChapter > 0 && p.chapter_num !== currentChapter) {
            return false;
        }

        // Filter by difficulty (heuristic: basic chapters 1-10 easy, 11-20 medium, 21-30 hard)
        if (currentFilter !== 'all') {
            const chap = p.chapter_num || 1;
            if (currentFilter === 'easy' && chap > 10) return false;
            if (currentFilter === 'medium' && (chap <= 10 || chap > 20)) return false;
            if (currentFilter === 'hard' && chap <= 20) return false;
        }

        // Search query
        if (currentSearch) {
            const matchTitle = (p.title || '').toLowerCase().includes(currentSearch);
            const matchCode = (p.code || '').toLowerCase().includes(currentSearch);
            const matchChap = (p.chapter_title || '').toLowerCase().includes(currentSearch);
            if (!matchTitle && !matchCode && !matchChap) return false;
        }

        return true;
    });
}

function renderProblems() {
    const tbody = document.getElementById('problem-rows');
    if (!tbody) return;

    const filtered = getFilteredProblems();
    const total = filtered.length;
    const startIdx = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(startIdx, startIdx + pageSize);

    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:35px; color:#94a3b8;"><i class="fa-solid fa-magnifying-glass" style="font-size:1.5rem; margin-bottom:10px; display:block;"></i>Không tìm thấy bài tập phù hợp với tiêu chí lọc.</td></tr>`;
        renderPagination(0, 0);
        return;
    }

    let rowsHtml = '';
    pageItems.forEach(p => {
        const chapNum = p.chapter_num || 1;
        let diffTag = '<span class="tag easy">Cơ bản</span>';
        if (chapNum > 20) diffTag = '<span class="tag hard">Nâng cao</span>';
        else if (chapNum > 10) diffTag = '<span class="tag medium">Trung bình</span>';

        const codeStr = p.code || `PY${String(p.num).padStart(3, '0')}`;
        const solveUrl = `problem.html?code=${codeStr}`;

        rowsHtml += `
            <tr style="animation: fadeInUp 0.25s ease;">
                <td class="problem-index" style="font-family:'JetBrains Mono',monospace; font-weight:700; color:#2563eb;">${codeStr}</td>
                <td>
                    <a href="${solveUrl}" style="font-weight:600; color:var(--arena-text-main); text-decoration:none; display:flex; align-items:center; gap:6px;">
                        ${p.title}
                    </a>
                </td>
                <td style="font-size:0.84rem; color:var(--arena-text-sub);">${p.chapter_title || 'Bài tập Python'}</td>
                <td>${diffTag}</td>
                <td><span class="status"><i class="fa-regular fa-circle" style="color:#94a3b8;"></i> ${p.test_count || 3} tests</span></td>
                <td style="text-align: right;">
                    <a class="solve" href="${solveUrl}" style="background:#2563eb; color:#fff; padding:6px 14px; border-radius:8px; font-weight:700; font-size:0.82rem; text-decoration:none; display:inline-flex; align-items:center; gap:5px; transition:background 0.2s;">
                        <i class="fa-solid fa-code"></i> Làm bài
                    </a>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
    renderPagination(total, startIdx + pageItems.length);
}

function renderPagination(total, displayedCount) {
    const paginContainer = document.querySelector('.pagination');
    if (!paginContainer) return;

    if (total === 0) {
        paginContainer.innerHTML = `<span>Không có bài tập nào</span>`;
        return;
    }

    const totalPages = Math.ceil(total / pageSize);
    const startNum = total > 0 ? (currentPage - 1) * pageSize + 1 : 0;

    let pagesHtml = '';
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            pagesHtml += `<a class="page ${i === currentPage ? 'active' : ''}" href="javascript:void(0)" onclick="goToPage(${i})">${i}</a>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            pagesHtml += `<span style="padding:4px 6px; color:#94a3b8;">...</span>`;
        }
    }

    paginContainer.innerHTML = `
        <span>Hiển thị ${startNum}-${displayedCount} trong tổng số <strong>${total}</strong> bài tập</span>
        <div class="pages">
            ${currentPage > 1 ? `<a class="page" href="javascript:void(0)" onclick="goToPage(${currentPage - 1})">&laquo;</a>` : ''}
            ${pagesHtml}
            ${currentPage < totalPages ? `<a class="page" href="javascript:void(0)" onclick="goToPage(${currentPage + 1})">&raquo;</a>` : ''}
        </div>
    `;
}

function goToPage(page) {
    currentPage = page;
    renderProblems();
    window.scrollTo({ top: 300, behavior: 'smooth' });
}
