// Modern Arena & Practice Problems Interactive Enhancements
document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.filter');
    const searchInput = document.getElementById('problem-search');
    const rows = document.querySelectorAll('#problem-rows tr');

    function applyFilterAndSearch() {
        const activeFilter = document.querySelector('.filter.active')?.dataset.filter || 'all';
        const query = searchInput ? searchInput.value.trim().toLocaleLowerCase('vi') : '';

        let visibleIndex = 0;
        rows.forEach(row => {
            const level = row.dataset.level || '';
            const matchFilter = activeFilter === 'all' || level === activeFilter;
            const matchQuery = !query || row.innerText.toLocaleLowerCase('vi').includes(query);

            if (matchFilter && matchQuery) {
                row.hidden = false;
                row.style.animation = 'none';
                void row.offsetHeight; // trigger reflow
                row.style.animation = `fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${visibleIndex * 0.04}s both`;
                visibleIndex++;
            } else {
                row.hidden = true;
            }
        });
    }

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(item => item.classList.remove('active'));
            btn.classList.add('active');
            applyFilterAndSearch();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', applyFilterAndSearch);
    }

    // Initialize initial staggered entry animation
    applyFilterAndSearch();

    // Submission handler
    const submitBtn = document.getElementById('submit-solution');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const source = document.getElementById('source')?.value.trim();
            if (!source) {
                alert('Vui lòng nhập mã nguồn trước khi nộp.');
                return;
            }
            const resultBox = document.getElementById('submit-result');
            if (resultBox) {
                resultBox.hidden = false;
                resultBox.style.animation = 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both';
            }
        });
    }
});
