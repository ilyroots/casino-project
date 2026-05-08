/* ═══════════════════════════════════════════════
   ADMIN PORTAL CLIENT
   Manage users, balances, and tables
   ═══════════════════════════════════════════════ */

(function() {
    'use strict';
    console.log('[ADMIN] admin.js loaded');

    const API_URL = window.location.origin;
    let adminKey = localStorage.getItem('donk_admin_key') || '';

    const $ = (s, el = document) => el.querySelector(s);
    const $$ = (s, el = document) => el.querySelectorAll(s);

    // ═══════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════
    function init() {
        setupTabs();
        setupAuth();
        setupActions();

        // Show admin nav link if we have a key stored
        if (adminKey) {
            showAdminNav(true);
        }

        // When admin view becomes active, auto-load data
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((m) => {
                if (m.type === 'attributes' && m.attributeName === 'class') {
                    const view = $('.view[data-view="admin"]');
                    if (view && view.classList.contains('active')) {
                        onAdminViewActive();
                    }
                }
            });
        });
        const view = $('.view[data-view="admin"]');
        if (view) observer.observe(view, { attributes: true });
    }

    function onAdminViewActive() {
        if (adminKey) {
            showDashboard(true);
            loadUsers();
        } else {
            showDashboard(false);
        }
    }

    // ═══════════════════════════════════════════════
    // AUTH
    // ═══════════════════════════════════════════════
    function setupAuth() {
        $('#adminLoginBtn')?.addEventListener('click', () => {
            const key = $('#adminKeyInput').value.trim();
            if (!key) {
                showToast('Enter admin key', 'error');
                return;
            }
            // Verify key works by hitting an admin endpoint
            fetch(`${API_URL}/api/admin/users`, {
                headers: { 'X-Admin-Key': key }
            })
            .then(r => {
                if (r.ok) {
                    adminKey = key;
                    localStorage.setItem('donk_admin_key', key);
                    showDashboard(true);
                    showAdminNav(true);
                    loadUsers();
                    showToast('Admin access granted', 'success');
                } else {
                    showToast('Invalid admin key', 'error');
                }
            })
            .catch(() => showToast('Server error', 'error'));
        });
    }

    function showDashboard(show) {
        const auth = $('#adminAuthCard');
        const dash = $('#adminDashboard');
        if (auth) auth.classList.toggle('hidden', show);
        if (dash) dash.classList.toggle('hidden', !show);
    }

    function showAdminNav(show) {
        const link = $('#adminNavLink');
        if (link) link.style.display = show ? 'flex' : 'none';
    }

    // ═══════════════════════════════════════════════
    // TABS
    // ═══════════════════════════════════════════════
    function setupTabs() {
        $$('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                $$('.admin-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                $$('.admin-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === target));

                if (target === 'users') loadUsers();
                if (target === 'tables') loadTables();
            });
        });
    }

    // ═══════════════════════════════════════════════
    // USERS
    // ═══════════════════════════════════════════════
    function loadUsers() {
        if (!adminKey) return;
        fetch(`${API_URL}/api/admin/users`, {
            headers: { 'X-Admin-Key': adminKey }
        })
        .then(r => r.json())
        .then(data => {
            const tbody = $('#adminUsersTable tbody');
            if (!tbody) return;
            if (!data.users || data.users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align:center">No users found</td></tr>';
                return;
            }
            tbody.innerHTML = data.users.map(u => {
                const b = u.balances || {};
                return `<tr>
                    <td>${u.id}</td>
                    <td><strong>${escapeHtml(u.username)}</strong></td>
                    <td>${escapeHtml(u.email)}</td>
                    <td>${fmt(b.BTC)}</td>
                    <td>${fmt(b.ETH)}</td>
                    <td>${fmt(b.SOL)}</td>
                    <td>${fmt(b.USDT)}</td>
                    <td>${fmt(b.LTC)}</td>
                    <td>${u.created_at ? u.created_at.split('T')[0] : '-'}</td>
                </tr>`;
            }).join('');
        })
        .catch(() => showToast('Failed to load users', 'error'));
    }

    $('#refreshUsersBtn')?.addEventListener('click', loadUsers);

    // ═══════════════════════════════════════════════
    // GIVE BALANCE
    // ═══════════════════════════════════════════════
    function setupActions() {
        $('#giveBalanceBtn')?.addEventListener('click', () => {
            const username = $('#giveBalanceUser').value.trim();
            const currency = $('#giveBalanceCurrency').value;
            const amount = parseFloat($('#giveBalanceAmount').value);
            const resultEl = $('#giveBalanceResult');

            if (!username || !amount || amount <= 0) {
                resultEl.textContent = 'Enter valid username and amount';
                resultEl.className = 'admin-result error';
                return;
            }

            resultEl.textContent = 'Processing...';
            resultEl.className = 'admin-result';

            fetch(`${API_URL}/api/admin/give-balance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Key': adminKey
                },
                body: JSON.stringify({ username, currency, amount })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    resultEl.textContent = `✅ Gave ${amount} ${currency} to ${username}. New balance: ${data.new_balance}`;
                    resultEl.className = 'admin-result success';
                    loadUsers();
                } else {
                    resultEl.textContent = `❌ ${data.error || 'Failed'}`;
                    resultEl.className = 'admin-result error';
                }
            })
            .catch(() => {
                resultEl.textContent = '❌ Server error';
                resultEl.className = 'admin-result error';
            });
        });

        // Seed data
        $('#seedDataBtn')?.addEventListener('click', () => {
            const resultEl = $('#seedDataResult');
            resultEl.textContent = 'Seeding...';
            resultEl.className = 'admin-result';

            fetch(`${API_URL}/api/admin/seed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Key': adminKey
                },
                body: JSON.stringify({})
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    resultEl.textContent = `✅ ${data.message}`;
                    resultEl.className = 'admin-result success';
                    loadUsers();
                } else {
                    resultEl.textContent = `❌ ${data.error || 'Failed'}`;
                    resultEl.className = 'admin-result error';
                }
            })
            .catch(() => {
                resultEl.textContent = '❌ Server error';
                resultEl.className = 'admin-result error';
            });
        });

        $('#refreshTablesBtn')?.addEventListener('click', loadTables);
    }

    // ═══════════════════════════════════════════════
    // TABLES
    // ═══════════════════════════════════════════════
    function loadTables() {
        if (!adminKey) return;
        fetch(`${API_URL}/api/admin/tables`, {
            headers: { 'X-Admin-Key': adminKey }
        })
        .then(r => r.json())
        .then(data => {
            const tbody = $('#adminTablesTable tbody');
            if (!tbody) return;
            if (!data.tables || data.tables.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">No tables found</td></tr>';
                return;
            }
            tbody.innerHTML = data.tables.map(t => `<tr>
                <td>${t.id}</td>
                <td>${escapeHtml(t.name)}</td>
                <td><span class="status-badge ${t.status}">${t.status}</span></td>
                <td>${t.small_blind} / ${t.big_blind}</td>
                <td>${t.min_buyin} - ${t.max_buyin}</td>
                <td>${t.currency}</td>
                <td>${t.max_seats}</td>
                <td>${t.created_at ? t.created_at.split('T')[0] : '-'}</td>
            </tr>`).join('');
        })
        .catch(() => showToast('Failed to load tables', 'error'));
    }

    // ═══════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════
    function fmt(v) {
        if (v === undefined || v === null) return '0';
        const n = parseFloat(v);
        if (n >= 1000) return n.toFixed(2);
        if (n >= 1) return n.toFixed(4);
        return n.toFixed(6);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showToast(message, type = 'success') {
        if (window.showToast) window.showToast(message, type);
    }

    // Expose logout handler to clear admin key
    document.addEventListener('logout', () => {
        adminKey = '';
        localStorage.removeItem('donk_admin_key');
        showAdminNav(false);
        showDashboard(false);
    });

    init();
})();
