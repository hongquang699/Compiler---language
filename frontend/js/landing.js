/**
 * LOCAL CP AI - SaaS Landing Page Interactive Script
 * UI/UX Pro Max Edition
 */

document.addEventListener('DOMContentLoaded', () => {
    initHeroSimulator();
    initPricingToggle();
    initFaqAccordion();
    initMetricsCounter();
    initSmoothScroll();
    initScrollReveal();
    initPaymentModal();
});

/* ==========================================================================
   Scroll Reveal Animations
   ========================================================================== */
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.bento-card, .metric-card, .pricing-card, .seo-card, .faq-accordion-item');
    revealElements.forEach((el, idx) => {
        el.classList.add('reveal-on-scroll');
        const delayClass = `reveal-delay-${(idx % 4) + 1}`;
        el.classList.add(delayClass);
    });

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    revealElements.forEach(el => observer.observe(el));
}

/* ==========================================================================
   1. Hero Interactive Code & AI Simulator
   ========================================================================== */
const SIMULATOR_DATA = {
    cpp: {
        filename: 'dijkstra_shortest_path.cpp',
        langLabel: 'C++17 (g++ -O2)',
        code: `#include <bits/stdc++.h>
using namespace std;

// Fast I/O & Dijkstra Algorithm Template
const long long INF = 1e18;

void solve() {
    int n, m;
    if (!(cin >> n >> m)) return;
    vector<vector<pair<int, int>>> adj(n + 1);
    for (int i = 0; i < m; ++i) {
        int u, v, w; cin >> u >> v >> w;
        adj[u].push_back({v, w});
        adj[v].push_back({u, w});
    }
    vector<long long> dist(n + 1, INF);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> pq;
    dist[1] = 0;
    pq.push({0, 1});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        for (auto& [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    cout << (dist[n] == INF ? -1 : dist[n]) << "\\n";
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    solve();
    return 0;
}`,
        output: `[Compile] g++ -std=c++17 -O2 -Wall dijkstra_shortest_path.cpp -o main.exe
[Sandbox] Executing inside isolated process sandbox...
[Input] Nodes: 5, Edges: 6
[Output] Shortest Path (1 -> 5): 14
[Verdict] AC — Time: 0.002s | RAM: 1.8MB | Exit: 0`
    },
    python: {
        filename: 'segment_tree.py',
        langLabel: 'Python 3.12',
        code: `import sys
import heapq

# Fast I/O & Priority Queue Dijkstra
def solve():
    input = sys.stdin.read
    data = input().split()
    if not data:
        return
    n, m = int(data[0]), int(data[1])
    adj = [[] for _ in range(n + 1)]
    idx = 2
    for _ in range(m):
        u, v, w = int(data[idx]), int(data[idx+1]), int(data[idx+2])
        adj[u].append((v, w))
        adj[v].append((u, w))
        idx += 3
    
    dist = [float('inf')] * (n + 1)
    dist[1] = 0
    pq = [(0, 1)]
    
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w;
                heapq.heappush(pq, (dist[v], v))
                
    ans = dist[n] if dist[n] != float('inf') else -1
    print(ans)

if __name__ == '__main__':
    solve()`,
        output: `[Sandbox] Running Python 3.12 Process Isolation...
[Input] Nodes: 5, Edges: 6
[Output] Shortest Path (1 -> 5): 14
[Verdict] AC — Time: 0.048s | RAM: 8.4MB | Exit: 0`
    },
    rust: {
        filename: 'dsu_disjoint_set.rs',
        langLabel: 'Rust 2021 (rustc)',
        code: `use std::io::{self, Read};

struct Dsu {
    parent: Vec<usize>,
}

impl Dsu {
    fn new(n: usize) -> Self {
        Dsu { parent: (0..=n).collect() }
    }
    fn find(&mut self, i: usize) -> usize {
        if self.parent[i] == i {
            i
        } else {
            let root = self.find(self.parent[i]);
            self.parent[i] = root;
            root
        }
    }
    fn union(&mut self, i: usize, j: usize) -> bool {
        let root_i = self.find(i);
        let root_j = self.find(j);
        if root_i != root_j {
            self.parent[root_i] = root_j;
            true
        } else {
            false
        }
    }
}

fn main() {
    let mut dsu = Dsu::new(5);
    dsu.union(1, 2);
    dsu.union(2, 3);
    println!("Connected(1,3): {}", dsu.find(1) == dsu.find(3));
}`,
        output: `[Compile] rustc -O dsu_disjoint_set.rs -o main
[Sandbox] Executing in memory-safe sandbox...
[Output] Connected(1,3): true
[Verdict] AC — Time: 0.001s | RAM: 1.2MB | Exit: 0`
    }
};

function initHeroSimulator() {
    const tabs = document.querySelectorAll('.hero-sim-tab');
    const codeEl = document.getElementById('hero-sim-code');
    const outputEl = document.getElementById('hero-sim-output');
    const filenameEl = document.getElementById('hero-sim-filename');
    const runBtn = document.getElementById('hero-sim-run-btn');
    const agentFixBtn = document.getElementById('hero-sim-fix-btn');

    if (!codeEl || !outputEl) return;

    let activeLang = 'cpp';

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeLang = tab.dataset.lang;
            const data = SIMULATOR_DATA[activeLang];
            if (data) {
                codeEl.textContent = data.code;
                outputEl.textContent = data.output;
                if (filenameEl) filenameEl.textContent = data.filename;
            }
        });
    });

    if (runBtn) {
        runBtn.addEventListener('click', () => {
            outputEl.textContent = '⚡ Running in sandbox...\n';
            runBtn.disabled = true;
            setTimeout(() => {
                const data = SIMULATOR_DATA[activeLang];
                outputEl.textContent = data ? data.output : 'Executed successfully.';
                runBtn.disabled = false;
            }, 600);
        });
    }

    if (agentFixBtn) {
        agentFixBtn.addEventListener('click', () => {
            outputEl.textContent = '🤖 AI Agent analyzing error traceback...\n[Step 1/3] RAG Template lookup: Dijkstra Shortest Path\n[Step 2/3] Analyzing constraints (N <= 10^5, W <= 10^9) -> Upgraded to long long INF\n[Step 3/3] Sandbox validation... ALL 10 TEST CASES PASSED (AC 100%)!\n';
        });
    }
}

/* ==========================================================================
   2. SaaS Pricing Billing Toggle (Monthly vs Annual)
   ========================================================================== */
function initPricingToggle() {
    const toggle = document.getElementById('pricing-billing-toggle');
    const pricePro = document.getElementById('price-pro-val');
    const priceEnterprise = document.getElementById('price-enterprise-val');
    const periodEls = document.querySelectorAll('.pricing-period');

    if (!toggle || !pricePro || !priceEnterprise) return;

    toggle.addEventListener('change', () => {
        const isAnnual = toggle.checked;
        if (isAnnual) {
            pricePro.textContent = '$15';
            priceEnterprise.textContent = '$79';
            periodEls.forEach(el => el.textContent = '/ thg (thanh toán năm)');
        } else {
            pricePro.textContent = '$19';
            priceEnterprise.textContent = '$99';
            periodEls.forEach(el => el.textContent = '/ tháng');
        }
    });
}

/* ==========================================================================
   3. Dynamic FAQ Accordion Pro Max Interactivity
   ========================================================================== */
function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-accordion-item');
    const searchInput = document.getElementById('landing-faq-search');
    const clearBtn = document.getElementById('landing-faq-clear');
    const tabChips = document.querySelectorAll('#landing-faq-tabs .faq-tab-chip');

    let currentCategory = 'all';
    let searchQuery = '';

    // Accordion Toggle
    faqItems.forEach(item => {
        const btn = item.querySelector('.faq-accordion-question');
        if (btn) {
            btn.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                // Close others for clean accordion experience
                faqItems.forEach(i => {
                    i.classList.remove('open');
                    const b = i.querySelector('.faq-accordion-question');
                    if (b) b.setAttribute('aria-expanded', 'false');
                });
                if (!isOpen) {
                    item.classList.add('open');
                    btn.setAttribute('aria-expanded', 'true');
                }
            });
        }
    });

    // Filter Logic
    function filterFaq() {
        const query = searchQuery.toLowerCase().trim();
        faqItems.forEach(item => {
            const cat = item.dataset.cat || 'all';
            const matchesCat = currentCategory === 'all' || cat === currentCategory;
            const textContent = (item.textContent || '').toLowerCase();
            const matchesSearch = !query || textContent.includes(query);

            if (matchesCat && matchesSearch) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Category Tabs
    tabChips.forEach(chip => {
        chip.addEventListener('click', () => {
            tabChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentCategory = chip.dataset.cat || 'all';
            filterFaq();
        });
    });

    // Search Input
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            searchQuery = searchInput.value;
            if (clearBtn) {
                clearBtn.style.display = searchQuery ? 'flex' : 'none';
            }
            filterFaq();
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                searchQuery = '';
                clearBtn.style.display = 'none';
                filterFaq();
                searchInput.focus();
            });
        }

        // Global hotkey '/' to focus search
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && document.activeElement !== searchInput && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                e.preventDefault();
                searchInput.focus();
                searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            if (e.key === 'Escape' && document.activeElement === searchInput) {
                searchInput.blur();
            }
        });
    }
}

// Global Vote Handler
window.handleFaqVote = function(btn, isHelpful) {
    if (!btn) return;
    const parent = btn.parentElement;
    if (parent) {
        parent.querySelectorAll('.faq-feedback-btn').forEach(b => b.classList.remove('voted'));
    }
    btn.classList.add('voted');
    btn.innerHTML = isHelpful 
        ? '<i class="fa-solid fa-check"></i> Cảm ơn bạn!' 
        : '<i class="fa-solid fa-check"></i> Đã ghi nhận!';
};

/* ==========================================================================
   4. Animated Metrics Counters
   ========================================================================== */
function initMetricsCounter() {
    const counters = document.querySelectorAll('.metric-num-count');
    if (counters.length === 0) return;

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const endVal = parseInt(target.dataset.count, 10);
                if (!isNaN(endVal)) {
                    animateValue(target, 0, endVal, 1500);
                }
                obs.unobserve(target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        obj.textContent = current.toLocaleString() + (obj.dataset.suffix || '');
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

/* ==========================================================================
   5. Smooth Scroll Navigation
   ========================================================================== */
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId && targetId !== '#' && targetId.startsWith('#')) {
                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    e.preventDefault();
                    targetEl.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
}

/* ==========================================================================
   6. VietQR Payment Modal & Plan Upgrade
   ========================================================================== */
function initPaymentModal() {
    const modal = document.getElementById('payment-modal');
    const closeBtn = document.getElementById('close-payment-modal');
    const openBtns = document.querySelectorAll('.open-payment-btn');
    const confirmBtn = document.getElementById('confirm-payment-btn');
    const copyBtn = document.getElementById('copy-ref-btn');
    const errorEl = document.getElementById('payment-error');
    let currentPlan = 'pro';

    if (!modal) return;

    openBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const plan = btn.dataset.plan || 'pro';
            currentPlan = plan;

            const token = localStorage.getItem('auth_token');
            let username = 'USER';
            if (token) {
                try {
                    const res = await fetch('/api/auth/me', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const user = await res.json();
                        username = user.username || user.name || 'USER';
                    }
                } catch (_) {}
            }

            const titleEl = document.getElementById('payment-plan-title');
            const amountEl = document.getElementById('payment-amount');
            const refEl = document.getElementById('payment-ref');
            const userDisplayEl = document.getElementById('payment-user-display');

            if (userDisplayEl) userDisplayEl.textContent = username;

            if (plan === 'pro') {
                if (titleEl) titleEl.textContent = 'Nâng cấp Pro Developer';
                if (amountEl) amountEl.textContent = '485.000đ';
                if (refEl) refEl.textContent = `LOCALCP ${username.toUpperCase()} PRO`;
            } else {
                if (titleEl) titleEl.textContent = 'Đăng ký Enterprise / Campus';
                if (amountEl) amountEl.textContent = '2.490.000đ';
                if (refEl) refEl.textContent = `LOCALCP ${username.toUpperCase()} ENT`;
            }

            if (errorEl) errorEl.classList.add('hidden');
            const senderInput = document.getElementById('payment-sender-name');
            if (senderInput) senderInput.value = '';
            modal.classList.remove('hidden');
        });
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const refText = document.getElementById('payment-ref')?.textContent || '';
            navigator.clipboard.writeText(refText);
            copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i>';
            }, 2000);
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                alert('Vui lòng đăng nhập tại Web IDE trước khi xác nhận nâng cấp.');
                window.location.href = 'index.html';
                return;
            }

            const senderName = document.getElementById('payment-sender-name')?.value?.trim() || '';
            if (!senderName) {
                if (errorEl) {
                    errorEl.textContent = 'Vui lòng nhập họ và tên người chuyển khoản theo tài khoản ngân hàng.';
                    errorEl.classList.remove('hidden');
                }
                document.getElementById('payment-sender-name')?.focus();
                return;
            }

            const refCode = document.getElementById('payment-ref')?.textContent || '';
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi yêu cầu & thông báo Dev / SuperAdmin...';

            try {
                const res = await fetch('/api/payment/confirm', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        plan: currentPlan,
                        ref_code: refCode,
                        sender_name: senderName
                    })
                });

                const data = await res.json();
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Tôi đã chuyển khoản — Xác nhận kích hoạt ngay';

                if (res.ok) {
                    modal.classList.add('hidden');
                    alert(`🎉 Gửi xác nhận thành công!\n\nThông báo đã được chuyển đến Dev & SuperAdmin với tên tài khoản '${data.username || 'bạn'}' và tên chuyển khoản '${senderName}'. Gói ${currentPlan.toUpperCase()} đã được kích hoạt.`);
                    window.location.href = 'community.html';
                } else {
                    if (errorEl) {
                        errorEl.textContent = data.detail || 'Lỗi xác nhận thanh toán.';
                        errorEl.classList.remove('hidden');
                    }
                }
            } catch (err) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Tôi đã chuyển khoản — Xác nhận kích hoạt ngay';
                if (errorEl) {
                    errorEl.textContent = 'Không thể kết nối máy chủ.';
                    errorEl.classList.remove('hidden');
                }
            }
        });
    }
}

