const state = { auth: { token: localStorage.getItem("local_cp_token"), user: null } };

function authFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (state.auth.token) headers.set("Authorization", `Bearer ${state.auth.token}`);
    return fetch(url, { ...options, headers });
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function safeParse(value) {
    if (typeof marked !== "undefined" && marked.parse) return marked.parse(value || "");
    return escapeHtml(value).replace(/\n/g, "<br>");
}

function updateAuthUI() {}

async function loadContestUser() {
    if (!state.auth.token) return;
    const response = await authFetch("/api/auth/me");
    if (response.ok) state.auth.user = await response.json();
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadContestUser();
    if (!state.auth.user) document.getElementById("contest-login-message").hidden = false;
    document.dispatchEvent(new CustomEvent("contest-user-ready"));
});
