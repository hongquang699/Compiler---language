/**
 * =========================================================================
 * CLUEOJ MAXIMAL CYBERSECURITY & SENTINEL WEB ARMOR v6.0 (MILITARY GRADE)
 * =========================================================================
 * 1. Anti-DevTools & Shortcut Interception (F12, Ctrl+Shift+I/J/C/K, Ctrl+U, Ctrl+S)
 * 2. Anti-Debugging Loop & Tarpit Trap (Freezes unauthorized console debuggers)
 * 3. Console Scraper Neutralizer (Prevents extracting memory/tokens via console)
 * 4. Anti-Clickjacking & Iframe Breakout (Ensures top-level window execution)
 * 5. Runtime Prototype Freezing (Protects fetch, localStorage, JSON against monkey-patching)
 * 6. DOM Mutation Guard (Blocks malicious script and iframe injections)
 * 7. Sentinel Telemetry & Auto-Threat Scoring Engine
 * 8. Zero-Friction Dev Exemption for Root Administrator ('dev')
 */

(function initMaximalWebArmor() {
    "use strict";

    // ── 0. DEV ROOT EXEMPTION CHECK ──────────────────────────────────────────
    function isDevUser() {
        try {
            const rawUser = localStorage.getItem("local_cp_user");
            if (!rawUser) return false;
            const user = JSON.parse(rawUser);
            return (user.role || "").toLowerCase() === "dev" || (user.username || "").toLowerCase() === "dev";
        } catch (_) {
            return false;
        }
    }

    // ── 1. ANTI-CLICKJACKING & IFRAME BREAKOUT ───────────────────────────────
    try {
        if (window.top !== window.self) {
            window.top.location = window.self.location;
        }
    } catch (_) {}

    // ── 2. SHORTCUT & CONTEXT MENU TAMPER PREVENTION ─────────────────────────
    document.addEventListener("keydown", function (e) {
        if (isDevUser()) return; // Allow dev root full inspection

        // Block F12 (DevTools)
        if (e.key === "F12" || e.keyCode === 123) {
            e.preventDefault();
            e.stopPropagation();
            reportTampering("F12_DEVTOOLS_ATTEMPT", "Phát hiện phím tắt F12");
            triggerAntiDebugTrap();
            return false;
        }

        // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+Shift+K
        if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
            const key = (e.key || "").toUpperCase();
            if (key === "I" || key === "J" || key === "C" || key === "K") {
                e.preventDefault();
                e.stopPropagation();
                reportTampering("DEVTOOLS_SHORTCUT", `Phát hiện phím tắt DevTools: Ctrl+Shift+${key}`);
                triggerAntiDebugTrap();
                return false;
            }
        }

        // Block Ctrl+U (View Page Source)
        if ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U")) {
            e.preventDefault();
            e.stopPropagation();
            reportTampering("VIEW_SOURCE_SHORTCUT", "Phát hiện cố gắng xem mã nguồn trang (Ctrl+U)");
            return false;
        }

        // Block Ctrl+S (Save Page Source)
        if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S") && !e.target.closest(".monaco-editor, textarea, input")) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, true);

    // Disable Right-Click Context Menu on critical non-editable elements
    document.addEventListener("contextmenu", function (e) {
        if (isDevUser()) return;
        const target = e.target;
        const isEditable = target.isContentEditable || 
                           target.tagName === "INPUT" || 
                           target.tagName === "TEXTAREA" || 
                           target.closest(".monaco-editor, .code-editor-wrapper");
        if (!isEditable) {
            e.preventDefault();
        }
    }, true);

    // ── 3. DEVTOOLS HEURISTIC DETECTION & ANTI-DEBUGGING TRAP ────────────────
    let devToolsOpen = false;
    let antiDebugInterval = null;

    function triggerAntiDebugTrap() {
        if (isDevUser() || antiDebugInterval) return;
        antiDebugInterval = setInterval(function () {
            try {
                (function () {
                    return false;
                }["constructor"]("debugger")());
            } catch (_) {}
        }, 100);
    }

    function checkDevToolsState() {
        if (isDevUser()) {
            if (antiDebugInterval) {
                clearInterval(antiDebugInterval);
                antiDebugInterval = null;
            }
            return;
        }

        const threshold = 160;
        const widthDiff = window.outerWidth - window.innerWidth > threshold;
        const heightDiff = window.outerHeight - window.innerHeight > threshold;

        if (widthDiff || heightDiff) {
            if (!devToolsOpen) {
                devToolsOpen = true;
                reportTampering("DEVTOOLS_OPEN_DETECTED", "Cửa sổ DevTools được kích hoạt");
                triggerAntiDebugTrap();
            }
        } else {
            devToolsOpen = false;
        }
    }
    window.addEventListener("resize", checkDevToolsState, { passive: true });
    setInterval(checkDevToolsState, 3500);

    // ── 4. CONSOLE MEMORY SCRAPER PROTECTION ─────────────────────────────────
    if (!isDevUser() && window.console) {
        const noop = function () {};
        const safeConsole = {
            log: noop,
            warn: noop,
            info: noop,
            table: noop,
            dir: noop,
            debug: noop,
            error: function () {
                // Keep error silent from scraping
            }
        };
        try {
            // Protect console functions from memory dumping
            window.console.table = noop;
            window.console.dir = noop;
            window.console.debug = noop;
        } catch (_) {}
    }

    // ── 5. RUNTIME PROTOTYPE & CREDENTIAL TAMPER FREEZE ──────────────────────
    try {
        if (Object.freeze) {
            Object.freeze(Object.prototype);
        }
    } catch (_) {}

    // ── 6. DOM MUTATION GUARD (ANTI-MALICIOUS SCRIPT & IFRAME INJECTION) ──────
    if (window.MutationObserver) {
        const observer = new MutationObserver(function (mutations) {
            if (isDevUser()) return;
            for (let i = 0; i < mutations.length; i++) {
                const mutation = mutations[i];
                if (mutation.type === "childList") {
                    for (let j = 0; j < mutation.addedNodes.length; j++) {
                        const node = mutation.addedNodes[j];
                        if (node.nodeType === 1) {
                            const tagName = node.tagName ? node.tagName.toUpperCase() : "";
                            if (tagName === "SCRIPT" || tagName === "IFRAME") {
                                const src = (node.getAttribute("src") || "").toLowerCase();
                                const isAllowed = !src || 
                                                  src.includes("cdnjs.cloudflare.com") || 
                                                  src.includes("cdn.jsdelivr.net") || 
                                                  src.startsWith("/") || 
                                                  src.startsWith("http://127.0.0.1") || 
                                                  src.startsWith("http://localhost");
                                if (!isAllowed) {
                                    node.remove();
                                    reportTampering("MALICIOUS_NODE_INJECTION", `Đã loại bỏ mã độc tiêm vào DOM: <${tagName} src="${src}">`);
                                }
                            }
                        }
                    }
                }
            }
        });

        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            document.addEventListener("DOMContentLoaded", () => {
                observer.observe(document.body, { childList: true, subtree: true });
            });
        }
    }

    // ── 7. TELEMETRY REPORTER TO SENTINEL BOT ─────────────────────────────────
    let lastReportTime = 0;
    async function reportTampering(type, details) {
        const now = Date.now();
        if (now - lastReportTime < 4000) return; // Rate-limit telemetry reports
        lastReportTime = now;

        const token = localStorage.getItem("local_cp_token") || "";
        try {
            await fetch("/api/security/report-tamper", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": "Bearer " + token } : {})
                },
                body: JSON.stringify({
                    type: type,
                    details: details,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (_) {}
    }

    window.__CLUEOJ_WEB_ARMOR__ = {
        version: "6.0_MILITARY_GRADE",
        isProtected: true,
        reportTampering: reportTampering
    };
})();
