/**
 * LOCAL CP Studio — Ultra Smooth Light / Dark Mode Theming Controller
 * Features:
 * - Circular Expand/Ripple View Transition API animation
 * - Smooth CSS token transitions (0.3s cubic-bezier)
 * - Persistent preference in localStorage
 * - Seamless synchronization with Monaco Editor and System preference
 */
(function() {
    // 1. Initial theme load before render (prevent flash)
    const savedTheme = localStorage.getItem('cp_theme') || localStorage.getItem('local_cp_theme') || 
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.documentElement.dataset.theme = savedTheme;

    // 2. Update toggle button icon/text
    function updateThemeUI() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const btns = document.querySelectorAll('.btn-theme-toggle');
        btns.forEach(btn => {
            const isDark = current === 'dark';
            btn.innerHTML = isDark 
                ? '<i class="fa-solid fa-sun" style="color: #f59e0b; transition: transform 0.3s ease;"></i> <span class="theme-label" style="font-size: 0.8rem; font-weight: 600;">Sáng</span>' 
                : '<i class="fa-solid fa-moon" style="color: #64748b; transition: transform 0.3s ease;"></i> <span class="theme-label" style="font-size: 0.8rem; font-weight: 600;">Tối</span>';
            btn.title = isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối';
            btn.setAttribute('aria-label', btn.title);
        });

        // Sync with index.html select picker if exists
        const selector = document.getElementById('theme-selector');
        if (selector && selector.value !== current) {
            selector.value = current;
        }

        // Sync with Monaco Editor if exists
        if (window.monaco && window.monaco.editor) {
            window.monaco.editor.setTheme(current === 'light' ? 'cp-light' : 'cp-aurora');
        }
    }

    // 3. Smooth Toggle Transition Function
    window.toggleTheme = function(event) {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';

        const applyThemeChanges = () => {
            document.documentElement.setAttribute('data-theme', next);
            document.documentElement.dataset.theme = next;
            localStorage.setItem('cp_theme', next);
            localStorage.setItem('local_cp_theme', next);
            updateThemeUI();
        };

        // If View Transitions API is not supported or user prefers reduced motion, fallback to smooth CSS transition
        if (!document.startViewTransition || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
            // Add temporary transition class
            document.documentElement.classList.add('theme-transitioning');
            applyThemeChanges();
            setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 400);
            return;
        }

        // Circular Expand / Ripple animation from click coordinates
        const x = event && typeof event.clientX === 'number' ? event.clientX : window.innerWidth / 2;
        const y = event && typeof event.clientY === 'number' ? event.clientY : 40;
        const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        const transition = document.startViewTransition(() => {
            applyThemeChanges();
        });

        transition.ready.then(() => {
            const clipPath = [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`
            ];
            
            document.documentElement.animate(
                {
                    clipPath: next === 'dark' ? clipPath : [...clipPath].reverse()
                },
                {
                    duration: 450,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    pseudoElement: next === 'dark' ? '::view-transition-new(root)' : '::view-transition-old(root)'
                }
            );
        }).catch(() => {
            applyThemeChanges();
        });
    };

    document.addEventListener('DOMContentLoaded', updateThemeUI);
})();
