/**
 * LOCAL CP STUDIO — DYNAMIC GLASSMORPHISM & MOUSE SPOTLIGHT TRACKER
 * Tự động kích hoạt hiệu ứng quầng sáng Laser Spotlight theo con trỏ chuột
 * cho toàn bộ Card, Panel, Nút bấm trên toàn bộ các trang web chính.
 */
(function () {
  function initGlassSpotlights() {
    const cards = document.querySelectorAll(
      '.panel, .problem-card, .stat-card, .card, .glass-panel, .tmath-card, .admin-card, .submission-card, .standings-card, [data-glass-spotlight]'
    );

    cards.forEach((card) => {
      card.setAttribute('data-glass-spotlight', 'true');

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.removeProperty('--mouse-x');
        card.style.removeProperty('--mouse-y');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlassSpotlights);
  } else {
    initGlassSpotlights();
  }

  // Hỗ trợ tái khởi động khi nội dung động được nạp thêm qua AJAX
  window.initGlassSpotlights = initGlassSpotlights;
})();
