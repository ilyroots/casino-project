/**
 * DONK CASINO — Real Crypto Frontend
 * JWT auth, API-backed balances, deposits, withdrawals.
 */

(function() {
    'use strict';

    const API_URL = 'http://localhost:5000';
    const CURRENCIES = ['BTC', 'ETH', 'SOL', 'USDT', 'LTC'];
    let selectedDisplayCurrency = 'total'; // 'total', 'BTC', 'ETH', 'SOL', 'USDT', 'LTC'
    let userBalances = {};

    // ═══════════════════════════════════════════════
    // DOM UTILS
    // ═══════════════════════════════════════════════
    const $ = (s, el = document) => el.querySelector(s);
    const $$ = (s, el = document) => el.querySelectorAll(s);

    // ═══════════════════════════════════════════════
    // API HELPERS
    // ═══════════════════════════════════════════════
    function getToken() { return localStorage.getItem('donk_token') || ''; }
    function setToken(t) { localStorage.setItem('donk_token', t); }
    function clearToken() { localStorage.removeItem('donk_token'); }

    async function api(path, opts = {}) {
        const url = `${API_URL}${path}`;
        const headers = {
            'Content-Type': 'application/json',
            ...opts.headers,
        };
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const resp = await fetch(url, { ...opts, headers });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
        return data;
    }

    // ═══════════════════════════════════════════════
    // AUTH STATE
    // ═══════════════════════════════════════════════
    async function fetchUser() {
        try {
            return await api('/api/auth/me');
        } catch {
            clearToken();
            return null;
        }
    }

    async function updateAuthUI() {
        const user = await fetchUser();
        const loggedOut = $('#headerActions');
        const loggedIn = $('#userActions');
        if (!loggedOut || !loggedIn) return;

        if (user) {
            loggedOut.classList.add('hidden');
            loggedIn.classList.remove('hidden');
            const letter = user.username?.[0]?.toUpperCase() || 'U';
            $('.avatar-letter').textContent = letter;
            $('#dropdownLetter').textContent = letter;
            $('#dropdownName').textContent = user.username;

            const pUser = $('#profileUsername');
            const pEmail = $('#profileEmail');
            const pDate = $('#profileDate');
            if (pUser) pUser.value = user.username;
            if (pEmail) pEmail.value = user.email;
            if (pDate) pDate.value = new Date(user.created_at).toLocaleDateString();

            await loadBalances();
        } else {
            loggedOut.classList.remove('hidden');
            loggedIn.classList.add('hidden');
            renderGuestBalances();
        }
    }

    // ═══════════════════════════════════════════════
    // BALANCES
    // ═══════════════════════════════════════════════
    async function loadBalances() {
        try {
            const data = await api('/api/balance/all');
            userBalances = data.balances || {};
            renderBalances();
        } catch (err) {
            console.error('Balance load failed:', err);
        }
    }

    function renderBalances() {
        const widget = $('#balanceWidget');
        if (!widget) return;

        if (!getToken()) {
            widget.innerHTML = `<div class="balance-guest">Log in to view balances</div>`;
            return;
        }

        // Calculate total USD
        let totalUsd = 0;
        CURRENCIES.forEach(curr => {
            totalUsd += userBalances[curr]?.usd || 0;
        });

        // Update dropdown values
        $('#pickTotal').textContent = `$${totalUsd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        CURRENCIES.forEach(curr => {
            const info = userBalances[curr];
            const val = info?.crypto || 0;
            const el = $(`#pick${curr}`);
            if (el) el.textContent = val.toFixed(curr === 'USDT' ? 2 : 8);
        });

        // Render main widget based on selected currency
        let icon = '💰', label = 'Total Balance', value = '';
        if (selectedDisplayCurrency === 'total') {
            icon = '💰';
            label = 'Total Balance';
            value = `$${totalUsd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        } else {
            const curr = selectedDisplayCurrency;
            const info = userBalances[curr];
            const val = info?.crypto || 0;
            const usd = info?.usd || 0;
            icon = {BTC:'₿',ETH:'Ξ',SOL:'◎',USDT:'₮',LTC:'Ł'}[curr] || '$';
            label = curr;
            value = `${val.toFixed(curr === 'USDT' ? 2 : 8)} ${curr}`;
        }

        widget.innerHTML = `
            <span class="bal-icon">${icon}</span>
            <div class="bal-main">
                <span class="bal-label">${label}</span>
                <span class="bal-value ${selectedDisplayCurrency === 'total' ? 'usd' : ''}">${value}</span>
            </div>
        `;

        // Wallet page balances (all currencies)
        const walletBalances = $('#walletBalances');
        if (walletBalances) {
            let whtml = '';
            CURRENCIES.forEach(curr => {
                const info = userBalances[curr];
                const val = info?.crypto || 0;
                const usd = info?.usd || 0;
                whtml += `
                    <div class="wallet-balance-card">
                        <div class="wallet-balance-info">
                            <span class="wallet-label">${curr}</span>
                            <span class="wallet-value">${val.toFixed(curr === 'USDT' ? 2 : 8)} ${curr}</span>
                            <span class="wallet-usd" style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-tertiary);">$${usd.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                        </div>
                    </div>`;
            });
            walletBalances.innerHTML = whtml;
        }

        // Profile page balances
        CURRENCIES.forEach(curr => {
            const el = $(`#bal${curr}`);
            if (el) {
                const val = userBalances[curr]?.crypto || 0;
                el.textContent = val.toFixed(curr === 'USDT' ? 2 : 8);
            }
        });
        const totalEl = $('#balTotalUSD');
        if (totalEl) {
            totalEl.textContent = `$${totalUsd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
    }

    // ═══════════════════════════════════════════════
    // MODALS & AUTH FORMS
    // ═══════════════════════════════════════════════
    function openModal(id) { $(id)?.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function closeModal(id) { $(id)?.classList.remove('open'); document.body.style.overflow = ''; }

    function initModals() {
        $('#loginBtn')?.addEventListener('click', () => openModal('#loginModal'));
        $('#signupBtn')?.addEventListener('click', () => openModal('#signupModal'));
        $('#loginClose')?.addEventListener('click', () => closeModal('#loginModal'));
        $('#signupClose')?.addEventListener('click', () => closeModal('#signupModal'));
        $('#depositClose')?.addEventListener('click', () => closeModal('#depositModal'));
        $('#withdrawClose')?.addEventListener('click', () => closeModal('#withdrawModal'));
        $('#switchToSignup')?.addEventListener('click', () => { closeModal('#loginModal'); openModal('#signupModal'); });
        $('#switchToLogin')?.addEventListener('click', () => { closeModal('#signupModal'); openModal('#loginModal'); });

        $$('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(`#${overlay.id}`); });
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') $$('.modal-overlay.open').forEach(m => m.classList.remove('open'));
        });
    }

    function initAuthForms() {
        // LOGIN
        $('#loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = $('#loginEmail').value.trim();
            const password = $('#loginPassword').value;
            try {
                const data = await api('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password }),
                });
                setToken(data.token);
                await updateAuthUI();
                closeModal('#loginModal');
                showToast(`Welcome back, ${data.user.username}`);
                $('#loginForm').reset();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });

        // SIGNUP
        $('#signupForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = $('#signupUsername').value.trim();
            const email = $('#signupEmail').value.trim();
            const password = $('#signupPassword').value;
            const confirm = $('#signupConfirm').value;
            const dob = $('#signupDob').value;
            const terms = $('#signupTerms').checked;

            // Client validation
            if (username.length < 3) { showToast('Username must be at least 3 characters', 'error'); return; }
            if (!email.includes('@')) { showToast('Invalid email', 'error'); return; }
            if (password.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
            if (password !== confirm) { showToast('Passwords do not match', 'error'); return; }
            if (!dob) { showToast('Date of birth required', 'error'); return; }
            const age = (new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000);
            if (age < 21) { showToast('You must be 21 or older', 'error'); return; }
            if (!terms) { showToast('You must agree to the terms', 'error'); return; }

            try {
                const data = await api('/api/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ username, email, password }),
                });
                setToken(data.token);
                await updateAuthUI();
                closeModal('#signupModal');
                showToast(`Account created. Welcome, ${data.user.username}!`);
                $('#signupForm').reset();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    // ═══════════════════════════════════════════════
    // USER DROPDOWN & LOGOUT
    // ═══════════════════════════════════════════════
    function initUserMenu() {
        const userMenu = $('#userMenu');
        $('#userAvatar')?.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu?.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!userMenu?.contains(e.target)) userMenu?.classList.remove('open');
        });

        // Wallet icon button (logged in)
        $('#walletBtnLogged')?.addEventListener('click', () => {
            navigateTo('wallet');
        });

        // Wallet icon button (logged out)
        $('#walletBtn')?.addEventListener('click', () => {
            showToast('Log in to access your wallet', 'error');
            openModal('#loginModal');
        });

        $('#logoutBtn')?.addEventListener('click', () => {
            clearToken();
            updateAuthUI();
            showToast('Logged out');
            navigateTo('home');
        });
    }

    // ═══════════════════════════════════════════════
    // DEPOSIT SYSTEM
    // ═══════════════════════════════════════════════
    function initDeposit() {
        const depositCurrency = $('#depositCurrency');
        const depositAmount = $('#depositAmount');
        const depositAddress = $('#depositAddress');
        const depositQr = $('#depositQr');
        const depositSubmit = $('#depositSubmit');

        async function refreshDeposit() {
            const curr = depositCurrency?.value || 'BTC';
            const amt = depositAmount?.value || '';
            try {
                const data = await api(`/api/deposit/qr?currency=${curr}&amount=${amt}`);
                if (depositAddress) depositAddress.value = data.address;
                if (depositQr) {
                    depositQr.src = data.qr_base64;
                    depositQr.style.display = 'block';
                }
            } catch (err) {
                console.error('Deposit QR failed:', err);
                if (depositQr) depositQr.style.display = 'none';
            }
        }

        depositCurrency?.addEventListener('change', refreshDeposit);
        depositAmount?.addEventListener('input', refreshDeposit);

        $('#openDepositBtn')?.addEventListener('click', async () => {
            if (!getToken()) { showToast('Log in to deposit', 'error'); openModal('#loginModal'); return; }
            openModal('#depositModal');
            await refreshDeposit();
        });

        $('#heroDepositBtn')?.addEventListener('click', async () => {
            if (!getToken()) { showToast('Log in to deposit', 'error'); openModal('#loginModal'); return; }
            openModal('#depositModal');
            await refreshDeposit();
        });

        $('#copyAddressBtn')?.addEventListener('click', () => {
            const addr = depositAddress?.value;
            if (!addr) return;
            navigator.clipboard.writeText(addr).then(() => {
                showToast('Address copied to clipboard');
            }).catch(() => {
                // Fallback
                depositAddress.select();
                document.execCommand('copy');
                showToast('Address copied to clipboard');
            });
        });

        depositSubmit?.addEventListener('click', async () => {
            const curr = depositCurrency.value;
            const amt = parseFloat(depositAmount.value);
            if (!amt || amt <= 0) { showToast('Enter a valid amount', 'error'); return; }
            try {
                const data = await api('/api/deposit/request', {
                    method: 'POST',
                    body: JSON.stringify({ currency: curr, amount: amt }),
                });
                showToast(data.message);
                closeModal('#depositModal');
                await loadTransactions();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    // ═══════════════════════════════════════════════
    // WITHDRAWAL SYSTEM
    // ═══════════════════════════════════════════════
    function initWithdraw() {
        $('#openWithdrawBtn')?.addEventListener('click', () => {
            if (!getToken()) { showToast('Log in to withdraw', 'error'); openModal('#loginModal'); return; }
            openModal('#withdrawModal');
        });

        $('#withdrawSubmit')?.addEventListener('click', async () => {
            const curr = $('#withdrawCurrency').value;
            const amt = parseFloat($('#withdrawAmount').value);
            const addr = $('#withdrawAddress').value.trim();

            if (!amt || amt <= 0) { showToast('Enter a valid amount', 'error'); return; }
            if (!addr) { showToast('Enter your wallet address', 'error'); return; }

            try {
                const data = await api('/api/withdraw', {
                    method: 'POST',
                    body: JSON.stringify({ currency: curr, amount: amt, wallet_address: addr }),
                });
                showToast(data.message);
                closeModal('#withdrawModal');
                await loadBalances();
                await loadTransactions();
                $('#withdrawAmount').value = '';
                $('#withdrawAddress').value = '';
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    // ═══════════════════════════════════════════════
    // TRANSACTIONS
    // ═══════════════════════════════════════════════
    async function loadTransactions() {
        const tbody = $('#txTableBody');
        if (!tbody) return;
        if (!getToken()) {
            tbody.innerHTML = '<tr><td colspan="5" class="tx-empty">Log in to view transactions</td></tr>';
            return;
        }
        try {
            const data = await api('/api/transactions');
            const txs = data.transactions || [];
            if (txs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="tx-empty">No transactions yet</td></tr>';
                return;
            }
            tbody.innerHTML = txs.map(tx => {
                const date = new Date(tx.created_at).toLocaleDateString();
                const time = new Date(tx.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                const amount = parseFloat(tx.amount).toFixed(tx.amount < 0.01 ? 8 : 4);
                return `<tr>
                    <td class="tx-type ${tx.type}">${tx.type.toUpperCase()}</td>
                    <td>${tx.currency}</td>
                    <td class="tx-amount">${amount} ${tx.currency}</td>
                    <td><span class="tx-status ${tx.status}">${tx.status}</span></td>
                    <td>${date} ${time}</td>
                </tr>`;
            }).join('');
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="5" class="tx-empty">Failed to load</td></tr>';
        }
    }

    // ═══════════════════════════════════════════════
    // CURRENCY MODE SWITCHER
    // ═══════════════════════════════════════════════
    function initCurrencyPicker() {
        const picker = $('#currencyPicker');
        const btn = $('#currencyPickerBtn');
        const dropdown = $('#currencyPickerDropdown');

        btn?.addEventListener('click', (e) => {
            e.stopPropagation();
            picker?.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!picker?.contains(e.target)) picker?.classList.remove('open');
        });

        $$('.picker-option').forEach(opt => {
            opt.addEventListener('click', () => {
                selectedDisplayCurrency = opt.dataset.curr;
                $$('.picker-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                picker?.classList.remove('open');
                renderBalances();
            });
        });
    }

    // ═══════════════════════════════════════════════
    // ROUTER
    // ═══════════════════════════════════════════════
    function navigateTo(viewName, pushState = true) {
        $$('.view').forEach(v => v.classList.remove('active'));
        const target = $(`.view[data-view="${viewName}"]`);
        if (target) {
            target.classList.add('active');
            target.scrollTop = 0;
        } else {
            $(`.view[data-view="home"]`).classList.add('active');
            viewName = 'home';
        }
        $$('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });
        if (pushState) history.pushState({ view: viewName }, '', `#${viewName}`);
        $('#sidebarLeft')?.classList.remove('open');
        $('#userMenu')?.classList.remove('open');

        // Load data for specific views
        if (viewName === 'wallet' || viewName === 'profile') {
            loadBalances();
            loadTransactions();
        }
    }

    function initRouter() {
        $$('.nav-link[data-view]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(link.dataset.view);
            });
        });
        $$('.view-all[data-nav], a[data-nav]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(link.dataset.nav);
            });
        });
        window.addEventListener('popstate', (e) => {
            navigateTo(e.state?.view || location.hash.slice(1) || 'home', false);
        });
        navigateTo(location.hash.slice(1) || 'home', false);
    }

    // ═══════════════════════════════════════════════
    // TOASTS
    // ═══════════════════════════════════════════════
    function showToast(message, type = 'success') {
        const container = $('#toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : '✕'}</span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.classList.add('out'); setTimeout(() => toast.remove(), 300); }, 3500);
    }

    // ═══════════════════════════════════════════════
    // SIDEBAR
    // ═══════════════════════════════════════════════
    function initSidebar() {
        const sidebar = $('#sidebarLeft');
        $('#sidebarToggle')?.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
        $('#mobileMenuBtn')?.addEventListener('click', () => sidebar.classList.toggle('open'));
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 900 && !sidebar.contains(e.target) && !$('#mobileMenuBtn')?.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }

    // ═══════════════════════════════════════════════
    // CHAT
    // ═══════════════════════════════════════════════
    const CHAT_USERS = [
        { name: 'CryptoKing', color: '#39ff14', vip: true },
        { name: 'Lucky7', color: '#ff3864', vip: false },
        { name: 'Moonshot', color: '#00d4ff', vip: false },
        { name: 'WhaleAlert', color: '#fbbf24', vip: true },
        { name: 'SlotQueen', color: '#c084fc', vip: false },
        { name: 'HighRoller', color: '#fb923c', vip: true },
        { name: 'NightOwl', color: '#6ee7b7', vip: false },
        { name: 'DiamondHands', color: '#60a5fa', vip: false },
    ];
    const CHAT_MESSAGES = [
        'Just hit a <span class="win">500x</span> on Plinko!',
        'Anyone playing Sweet Bonanza right now?',
        'Lost 0.05 BTC but we go again',
        'The new Hacksaw games are insane',
        'Just withdrew <span class="amount">2.5 ETH</span>!',
        'RIP my balance, all in on dice',
        'Crash is so rigged today lol',
        'GG to everyone in the daily race',
        'Mines is actually paying out today',
        'Got the max win on Gates of Olympus!',
        'Is the chat always this dead?',
        'Just joined, this site is fire',
        'Waiting for my deposit to confirm...',
        '<span class="win">W</span> streak on crash!',
        'RIP 10x in a row on dice',
        'The live dealers are so entertaining',
        'Can someone explain how challenges work?',
        'First time withdrawing, wish me luck',
        'How do you get VIP status?',
        'Best slots for wagering?',
    ];

    function initChat() {
        const messagesEl = $('#chatMessages');
        $('#chatClose')?.addEventListener('click', () => $('#sidebarRight')?.classList.add('closed'));
        for (let i = 0; i < 8; i++) addChatMessage(messagesEl, true);
        setInterval(() => { if (Math.random() > 0.6) addChatMessage(messagesEl); }, 3500);

        function handleSend() {
            const input = $('#chatInput');
            const text = input.value.trim();
            if (!text) return;
            const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const msg = document.createElement('div');
            msg.className = 'chat-message';
            msg.innerHTML = `<div class="chat-msg-header"><div class="chat-avatar" style="background:var(--neon-faint);color:var(--neon)">Y</div><span class="chat-username">You</span><span class="chat-time">${time}</span></div><div class="chat-text">${text.replace(/</g, '&lt;')}</div>`;
            messagesEl.appendChild(msg);
            messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
            input.value = '';
        }
        $('#chatSend')?.addEventListener('click', handleSend);
        $('#chatInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSend(); });
    }

    function addChatMessage(container, silent = false) {
        const user = CHAT_USERS[Math.floor(Math.random() * CHAT_USERS.length)];
        const text = CHAT_MESSAGES[Math.floor(Math.random() * CHAT_MESSAGES.length)];
        const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const msg = document.createElement('div');
        msg.className = 'chat-message';
        msg.innerHTML = `<div class="chat-msg-header"><div class="chat-avatar" style="background:${user.color}20;color:${user.color}">${user.name[0]}</div><span class="chat-username ${user.vip ? 'vip' : ''}">${user.name}${user.vip ? ' ⭐' : ''}</span><span class="chat-time">${time}</span></div><div class="chat-text">${text}</div>`;
        container.appendChild(msg);
        if (!silent) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        while (container.children.length > 50) container.removeChild(container.firstChild);
    }

    // ═══════════════════════════════════════════════
    // MOBILE NAV
    // ═══════════════════════════════════════════════
    function initMobileNav() {
        $$('.mobile-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    // ═══════════════════════════════════════════════
    // GAME GRIDS (static, unchanged from before)
    // ═══════════════════════════════════════════════
    const GAME_DATA = {
        'trending-full': [
            { name: 'Gates of Olympus', provider: 'Pragmatic Play', emoji: '⚡' },
            { name: 'Wanted Dead or a Wild', provider: 'Hacksaw', emoji: '🤠' },
            { name: 'Sweet Bonanza', provider: 'Pragmatic Play', emoji: '🍬' },
            { name: 'Zeus vs Hades', provider: 'Pragmatic Play', emoji: '⚔️' },
            { name: 'Le Bandit', provider: 'Hacksaw', emoji: '🦝' },
            { name: 'Big Bass Bonanza', provider: 'Pragmatic Play', emoji: '🎣' },
            { name: 'Sugar Rush', provider: 'Pragmatic Play', emoji: '🍭' },
            { name: 'Retro Tapes', provider: 'Push Gaming', emoji: '📼' },
        ],
        'originals-full': [
            { name: 'Dice', provider: 'Donk Originals', emoji: '🎲' },
            { name: 'Plinko', provider: 'Donk Originals', emoji: '🔵' },
            { name: 'Mines', provider: 'Donk Originals', emoji: '💣' },
            { name: 'Crash', provider: 'Donk Originals', emoji: '🚀' },
            { name: 'Limbo', provider: 'Donk Originals', emoji: '📉' },
            { name: 'Keno', provider: 'Donk Originals', emoji: '🎯' },
            { name: 'Hilo', provider: 'Donk Originals', emoji: '🃏' },
        ],
        'blackjack-full': [
            { name: 'Classic Blackjack', provider: 'Evolution', emoji: '♠️' },
            { name: 'Infinite Blackjack', provider: 'Evolution', emoji: '♣️' },
            { name: 'Speed Blackjack', provider: 'Evolution', emoji: '⚡' },
            { name: 'Free Bet Blackjack', provider: 'Evolution', emoji: '🎰' },
            { name: 'Power Blackjack', provider: 'Evolution', emoji: '💪' },
            { name: 'VIP Blackjack', provider: 'Pragmatic Play', emoji: '👑' },
            { name: 'Quantum Blackjack', provider: 'Playtech', emoji: '⚛️' },
            { name: 'Blackjack Party', provider: 'Evolution', emoji: '🎉' },
        ],
        'roulette-full': [
            { name: 'Lightning Roulette', provider: 'Evolution', emoji: '⚡' },
            { name: 'European Roulette', provider: 'NetEnt', emoji: '🔴' },
            { name: 'American Roulette', provider: 'Pragmatic Play', emoji: '🔵' },
            { name: 'Immersive Roulette', provider: 'Evolution', emoji: '🎥' },
            { name: 'Auto Roulette', provider: 'Evolution', emoji: '🤖' },
            { name: 'French Roulette', provider: 'NetEnt', emoji: '🥖' },
            { name: 'XXXtreme Roulette', provider: 'Evolution', emoji: '🔥' },
            { name: 'Mega Roulette', provider: 'Pragmatic Play', emoji: '💎' },
        ],
        'poker-full': [
            { name: 'Texas Hold\'em', provider: 'Evolution', emoji: '🤠' },
            { name: 'Omaha Poker', provider: 'Evolution', emoji: '🎯' },
            { name: 'Three Card Poker', provider: 'Evolution', emoji: '🃏' },
            { name: 'Caribbean Stud', provider: 'Evolution', emoji: '🏝️' },
            { name: 'Video Poker', provider: 'NetEnt', emoji: '🎰' },
            { name: 'Ultimate Texas Hold\'em', provider: 'Evolution', emoji: '👑' },
            { name: 'Pai Gow Poker', provider: 'Playtech', emoji: '🀄' },
            { name: 'Casino Hold\'em', provider: 'Evolution', emoji: '♦️' },
        ],
        'table-games-full': [
            { name: 'Baccarat', provider: 'Evolution', emoji: '🏛️' },
            { name: 'Craps', provider: 'Evolution', emoji: '🎲' },
            { name: 'Sic Bo', provider: 'Evolution', emoji: '🎋' },
            { name: 'Dragon Tiger', provider: 'Evolution', emoji: '🐉' },
            { name: 'Teen Patti', provider: 'Evolution', emoji: '🇮🇳' },
            { name: 'Andar Bahar', provider: 'Evolution', emoji: '🎯' },
            { name: 'Red Dog', provider: 'NetEnt', emoji: '🐕' },
            { name: 'Casino War', provider: 'Playtech', emoji: '⚔️' },
        ],
        slots: [
            { name: 'Book of Dead', provider: "Play'n GO", emoji: '📖' },
            { name: 'Wolf Gold', provider: 'Pragmatic Play', emoji: '🐺' },
            { name: 'Money Train 4', provider: 'Relax Gaming', emoji: '🚂' },
            { name: 'Deadwood', provider: 'Nolimit City', emoji: '🤠' },
            { name: 'San Quentin', provider: 'Nolimit City', emoji: '🏢' },
            { name: 'Temple Tumble', provider: 'Relax Gaming', emoji: '🏛️' },
            { name: 'Razor Returns', provider: 'Push Gaming', emoji: '🦈' },
            { name: 'Le Bandit', provider: 'Hacksaw', emoji: '🦝' },
        ],
    };

    function renderGameGrid(container, games) {
        if (!container || !games) return;
        const viewMap = {
            'Dice': 'dice', 'Plinko': 'plinko', 'Mines': 'mines',
            'Crash': 'crash', 'Limbo': 'limbo', 'Keno': 'keno', 'Hilo': 'hilo'
        };
        container.innerHTML = games.map((g, i) => {
            const view = viewMap[g.name];
            const clickable = view ? `data-nav="${view}" style="cursor:pointer;"` : '';
            return `
            <div class="game-card" ${clickable} style="animation: cardFadeIn 0.5s var(--ease-out-expo) ${i * 0.04}s both">
                <div class="game-thumb">${g.emoji}</div>
                <div class="game-card-info">
                    <div class="game-card-title">${g.name}</div>
                    <div class="game-card-provider">${g.provider}</div>
                </div>
                <div class="holographic-shimmer"></div>
            </div>
        `}).join('');
    }

    function initGameGrids() {
        $$('[data-render]').forEach(el => {
            const key = el.dataset.render;
            const games = GAME_DATA[key];
            if (games) renderGameGrid(el, games);
        });
    }

    // ═══════════════════════════════════════════════
    // HERO PARALLAX
    // ═══════════════════════════════════════════════
    function initHeroParallax() {
        const hero = $('.hero-section');
        const orbs = $$('.hero-orb');
        if (!hero || window.matchMedia('(pointer: coarse)').matches) return;
        hero.addEventListener('mousemove', (e) => {
            const rect = hero.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            orbs.forEach((orb, i) => {
                const factor = (i + 1) * 15;
                orb.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
            });
        }, { passive: true });
    }

    // ═══════════════════════════════════════════════
    // LOADER
    // ═══════════════════════════════════════════════
    function initLoader() {
        const loader = $('#loader');
        const app = $('.app-container');
        setTimeout(() => {
            loader.classList.add('done');
            setTimeout(() => { app.classList.add('ready'); loader.remove(); }, 300);
        }, 1500);
    }

    // ═══════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════
    function init() {
        initLoader();
        initSidebar();
        initChat();
        initModals();
        initAuthForms();
        initUserMenu();
        initDeposit();
        initWithdraw();
        initCurrencyPicker();
        initRouter();
        initGameGrids();
        initMobileNav();
        initHeroParallax();
        initBlackjack();
        updateAuthUI();
        loadTransactions();
    }

    // ═══════════════════════════════════════════════
    // BLACKJACK GAME v2
    // ═══════════════════════════════════════════════
    let bjDeck = [];
    let bjDealerHand = [];
    let bjPlayerHand = [];
    let bjPlayerSplitHand = null;
    let bjActiveHand = 'main';
    let bjMainDone = false;
    let bjSplitDone = false;
    let bjBet = 10;
    let bjOriginalBet = 0;
    let bjHistory = [];
    let bjSoundOn = true;
    let bjClientSeed = generateSeed();
    let bjServerSeed = generateSeed();
    let bjNonce = 0;
    let bjInProgress = false;

    const SUITS = ['♠','♥','♣','♦'];
    const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

    function generateSeed() {
        return Array.from({length:32},()=>'0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
    }

    function bjPlaySound(type) {
        if (!bjSoundOn) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            if (type === 'deal') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(900, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.06, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
            } else if (type === 'win') {
                [523,659,784,1047].forEach((f,i) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.connect(g); g.connect(ctx.destination);
                    o.type = 'sine'; o.frequency.value = f;
                    g.gain.setValueAtTime(0.06, ctx.currentTime + i*0.08);
                    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i*0.08 + 0.25);
                    o.start(ctx.currentTime + i*0.08);
                    o.stop(ctx.currentTime + i*0.08 + 0.25);
                });
            } else if (type === 'loss') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(280, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.35);
                gain.gain.setValueAtTime(0.04, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.35);
            } else if (type === 'chip') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1400, ctx.currentTime);
                gain.gain.setValueAtTime(0.03, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.03);
            }
        } catch(e) {}
    }

    function getBjUsdRate(curr) {
        const info = userBalances[curr];
        if (!info || !info.crypto) return 0;
        return info.usd / info.crypto;
    }

    function getBjSelectedCurrency() {
        if (selectedDisplayCurrency !== 'total') return selectedDisplayCurrency;
        for (const c of CURRENCIES) {
            if ((userBalances[c]?.crypto || 0) > 0) return c;
        }
        return 'BTC';
    }

    function getBjBalanceUsd() {
        if (!getToken() || !Object.keys(userBalances).length) return 1000;
        let total = 0;
        CURRENCIES.forEach(c => { total += userBalances[c]?.usd || 0; });
        return total;
    }

    function bjDeductBet(usdAmount) {
        if (!getToken()) return true; // Guest demo play
        const curr = getBjSelectedCurrency();
        const rate = getBjUsdRate(curr);
        if (rate <= 0) return false;
        const cryptoAmt = usdAmount / rate;
        if (!userBalances[curr]) userBalances[curr] = { crypto: 0, usd: 0 };
        userBalances[curr].crypto = Math.max(0, (userBalances[curr].crypto || 0) - cryptoAmt);
        userBalances[curr].usd = Math.max(0, (userBalances[curr].usd || 0) - usdAmount);
        renderBalances();
        return true;
    }

    function bjAddWinnings(usdAmount) {
        if (!getToken()) return; // Guest demo play
        const curr = getBjSelectedCurrency();
        const rate = getBjUsdRate(curr);
        if (rate <= 0) return;
        const cryptoAmt = usdAmount / rate;
        if (!userBalances[curr]) userBalances[curr] = { crypto: 0, usd: 0 };
        userBalances[curr].crypto = (userBalances[curr].crypto || 0) + cryptoAmt;
        userBalances[curr].usd = (userBalances[curr].usd || 0) + usdAmount;
        renderBalances();
    }

    function createDeck() {
        const deck = [];
        for (let d = 0; d < 6; d++) {
            for (const suit of SUITS) {
                for (const rank of RANKS) {
                    deck.push({ suit, rank, value: cardValue(rank) });
                }
            }
        }
        return shuffle(deck);
    }

    function cardValue(rank) {
        if (rank === 'A') return 11;
        if (['J','Q','K'].includes(rank)) return 10;
        return parseInt(rank);
    }

    function shuffle(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    function handValue(hand) {
        let total = 0, aces = 0;
        for (const card of hand) { total += card.value; if (card.rank === 'A') aces++; }
        while (total > 21 && aces > 0) { total -= 10; aces--; }
        return total;
    }

    function isBlackjack(hand) {
        return hand.length === 2 && handValue(hand) === 21;
    }

    function dealCard() {
        if (bjDeck.length < 20) {
            bjDeck = createDeck();
            $('#bjDeckIcon')?.classList.add('shuffling');
            setTimeout(() => $('#bjDeckIcon')?.classList.remove('shuffling'), 400);
        }
        return bjDeck.pop();
    }

    function renderCard(card, hidden = false, delay = 0) {
        const isRed = card.suit === '♥' || card.suit === '♦';
        if (hidden) {
            return `<div class="bj-card hidden dealing" style="animation-delay:${delay}s"></div>`;
        }
        return `
            <div class="bj-card ${isRed ? 'red' : 'black'} dealing" style="animation-delay:${delay}s">
                <div class="bj-card-corner top-left">
                    <div class="bj-card-rank">${card.rank}</div>
                    <div class="bj-card-suit">${card.suit}</div>
                </div>
                <div class="bj-card-suit" style="font-size:1.8rem;">${card.suit}</div>
                <div class="bj-card-corner bottom-right">
                    <div class="bj-card-rank">${card.rank}</div>
                    <div class="bj-card-suit">${card.suit}</div>
                </div>
            </div>
        `;
    }

    function renderHand(container, hand, hideFirst = false, baseDelay = 0) {
        if (!container) return;
        container.innerHTML = hand.map((c, i) => renderCard(c, hideFirst && i === 0, baseDelay + i * 0.12)).join('');
    }

    function updateHandValues() {
        const dv = $('#dealerValue');
        const pv = $('#playerValue');
        if (dv) {
            const val = handValue(bjDealerHand);
            dv.textContent = bjDealerHand.length ? (bjDealerHand[0]?.hidden ? '?' : val) : '';
            dv.classList.toggle('bust', val > 21);
        }
        if (pv) {
            const hand = bjActiveHand === 'split' && bjPlayerSplitHand ? bjPlayerSplitHand : bjPlayerHand;
            const val = handValue(hand);
            pv.textContent = hand.length ? val : '';
            pv.classList.toggle('bust', val > 21);
        }
    }

    function showResult(msg, type) {
        const overlay = $('#bjResultOverlay');
        if (!overlay) return;
        overlay.innerHTML = `<div class="bj-result-text ${type}">${msg}</div>`;
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('hidden'), 2200);
    }

    function addHistory(result, bet, payout) {
        bjHistory.unshift({ result, bet, payout, time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) });
        if (bjHistory.length > 50) bjHistory.pop();
        renderHistory();
    }

    function renderHistory() {
        const el = $('#bjHistoryList');
        if (!el) return;
        el.innerHTML = bjHistory.map(h => {
            const profit = h.payout - h.bet;
            const profitStr = profit >= 0 ? `+$${profit.toFixed(2)}` : `-$${Math.abs(profit).toFixed(2)}`;
            const profitColor = profit > 0 ? 'var(--neon)' : profit < 0 ? 'var(--hot)' : 'var(--text-secondary)';
            return `
                <div class="bj-history-item ${h.result}">
                    <span class="bj-h-res">${h.result}</span>
                    <span class="bj-h-amt" style="color:${profitColor}">${profitStr}</span>
                </div>
            `;
        }).join('');
    }

    function setActionsEnabled(enabled) {
        ['bjHitBtn','bjStandBtn','bjSplitBtn','bjDoubleBtn'].forEach(id => {
            const btn = $('#' + id);
            if (btn) btn.disabled = !enabled;
        });
    }

    function updateActionButtons() {
        const hand = bjActiveHand === 'split' && bjPlayerSplitHand ? bjPlayerSplitHand : bjPlayerHand;

        const hitBtn = $('#bjHitBtn');
        const standBtn = $('#bjStandBtn');
        const doubleBtn = $('#bjDoubleBtn');
        const splitBtn = $('#bjSplitBtn');

        if (hitBtn) hitBtn.disabled = false;
        if (standBtn) standBtn.disabled = false;

        const canDouble = hand.length === 2 && bjActiveHand === 'main';
        if (doubleBtn) doubleBtn.disabled = !canDouble;

        const canSplit = hand.length === 2 && hand[0].rank === hand[1].rank && !bjPlayerSplitHand;
        if (splitBtn) splitBtn.disabled = !canSplit;
    }

    function updateBetInput() {
        const input = $('#bjBetInput');
        if (input) input.value = bjBet.toFixed(2);
    }

    function startRound() {
        const input = $('#bjBetInput');
        bjBet = parseFloat(input?.value) || 10;
        if (bjBet < 0.01) bjBet = 0.01;

        const balance = getBjBalanceUsd();
        if (bjBet > balance) {
            bjBet = Math.max(0.01, balance);
            updateBetInput();
        }
        if (bjBet <= 0 || balance <= 0) {
            showResult('Insufficient Balance', 'loss');
            return;
        }

        // Deduct bet from real balance
        if (!bjDeductBet(bjBet)) {
            showResult('Balance Error', 'loss');
            return;
        }

        bjPlayerHand = [];
        bjPlayerSplitHand = null;
        bjDealerHand = [];
        bjActiveHand = 'main';
        bjMainDone = false;
        bjSplitDone = false;
        bjOriginalBet = bjBet;
        bjNonce++;
        bjInProgress = true;

        $('#bjResultOverlay')?.classList.add('hidden');
        $('#bjRulesBanner')?.classList.add('hidden');

        if (!bjDeck.length) bjDeck = createDeck();

        // Deal with staggered animation
        bjPlayerHand.push(dealCard());
        bjDealerHand.push({ ...dealCard(), hidden: true });
        bjPlayerHand.push(dealCard());
        bjDealerHand.push(dealCard());

        renderHand($('#playerCards'), bjPlayerHand, false, 0);
        renderHand($('#dealerCards'), bjDealerHand, true, 0.06);
        updateHandValues();
        bjPlaySound('deal');

        $('#fairServer').textContent = bjServerSeed.slice(0,16) + '...';
        $('#fairClient').textContent = bjClientSeed.slice(0,16) + '...';
        $('#fairNonce').textContent = bjNonce;

        // UI updates
        $('#bjDealBtn')?.classList.add('hidden');
        $('#bjRebetBtn')?.classList.add('hidden');
        setActionsEnabled(true);

        if (isBlackjack(bjPlayerHand) || isBlackjack(bjDealerHand)) {
            setActionsEnabled(false);
            setTimeout(finishRound, 600);
            return;
        }

        updateActionButtons();
    }

    function hit() {
        const hand = bjActiveHand === 'split' && bjPlayerSplitHand ? bjPlayerSplitHand : bjPlayerHand;
        hand.push(dealCard());
        bjPlaySound('deal');
        renderHand($('#playerCards'), bjActiveHand === 'split' && bjPlayerSplitHand ? bjPlayerSplitHand : bjPlayerHand);
        updateHandValues();

        if (handValue(hand) > 21) {
            if (bjActiveHand === 'main') bjMainDone = true;
            else bjSplitDone = true;

            if (bjActiveHand === 'main' && bjPlayerSplitHand && !bjSplitDone) {
                bjActiveHand = 'split';
                updateActionButtons();
                renderHand($('#playerCards'), bjPlayerSplitHand);
                updateHandValues();
            } else if (bjActiveHand === 'split' && bjPlayerSplitHand && !bjMainDone) {
                bjActiveHand = 'main';
                updateActionButtons();
                renderHand($('#playerCards'), bjPlayerHand);
                updateHandValues();
            } else {
                setActionsEnabled(false);
                setTimeout(dealerTurn, 400);
            }
        } else {
            updateActionButtons();
        }
    }

    function stand() {
        if (bjActiveHand === 'main') bjMainDone = true;
        else bjSplitDone = true;

        if (bjActiveHand === 'main' && bjPlayerSplitHand && !bjSplitDone) {
            bjActiveHand = 'split';
            updateActionButtons();
            renderHand($('#playerCards'), bjPlayerSplitHand);
            updateHandValues();
        } else {
            setActionsEnabled(false);
            dealerTurn();
        }
    }

    function doubleDown() {
        const hand = bjActiveHand === 'split' && bjPlayerSplitHand ? bjPlayerSplitHand : bjPlayerHand;

        // Deduct extra bet for double
        if (!bjDeductBet(bjOriginalBet)) {
            showResult('Insufficient Balance', 'loss');
            return;
        }
        bjBet += bjOriginalBet;

        hand.push(dealCard());
        bjPlaySound('deal');
        renderHand($('#playerCards'), bjActiveHand === 'split' && bjPlayerSplitHand ? bjPlayerSplitHand : bjPlayerHand);
        updateHandValues();

        if (bjActiveHand === 'main') bjMainDone = true;
        else bjSplitDone = true;

        if (handValue(hand) > 21) {
            if (bjActiveHand === 'main' && bjPlayerSplitHand && !bjSplitDone) {
                bjActiveHand = 'split';
                renderHand($('#playerCards'), bjPlayerSplitHand);
                updateHandValues();
            } else if (bjActiveHand === 'split' && bjPlayerSplitHand && !bjMainDone) {
                bjActiveHand = 'main';
                renderHand($('#playerCards'), bjPlayerHand);
                updateHandValues();
            } else {
                setActionsEnabled(false);
                setTimeout(dealerTurn, 400);
            }
        } else {
            if (bjActiveHand === 'main' && bjPlayerSplitHand && !bjSplitDone) {
                bjActiveHand = 'split';
                updateActionButtons();
                renderHand($('#playerCards'), bjPlayerSplitHand);
                updateHandValues();
            } else {
                setActionsEnabled(false);
                setTimeout(dealerTurn, 400);
            }
        }
    }

    function split() {
        if (bjPlayerHand.length !== 2 || bjPlayerHand[0].rank !== bjPlayerHand[1].rank) return;

        // Deduct extra bet for split hand
        if (!bjDeductBet(bjOriginalBet)) {
            showResult('Insufficient Balance', 'loss');
            return;
        }
        bjBet += bjOriginalBet;

        bjPlayerSplitHand = [bjPlayerHand.pop()];
        bjPlayerHand.push(dealCard());
        bjPlayerSplitHand.push(dealCard());
        bjPlaySound('deal');
        renderHand($('#playerCards'), bjPlayerHand);
        updateHandValues();
        updateActionButtons();
    }

    function dealerTurn() {
        // Reveal hidden card
        if (bjDealerHand[0]) bjDealerHand[0].hidden = false;
        renderHand($('#dealerCards'), bjDealerHand);
        updateHandValues();
        bjPlaySound('deal');

        let draws = 0;
        const drawInterval = setInterval(() => {
            const val = handValue(bjDealerHand);
            if (val < 17) {
                bjDealerHand.push(dealCard());
                renderHand($('#dealerCards'), bjDealerHand);
                updateHandValues();
                bjPlaySound('deal');
                draws++;
            } else {
                clearInterval(drawInterval);
                finishRound();
            }
        }, 550);
    }

    function finishRound() {
        const dVal = handValue(bjDealerHand);
        const dBJ = isBlackjack(bjDealerHand);

        function evaluate(hand, bet) {
            const pVal = handValue(hand);
            const pBJ = isBlackjack(hand);
            if (pBJ && dBJ) return { result: 'push', payout: bet };
            if (pBJ) return { result: 'blackjack', payout: bet * 2.5 };
            if (dBJ) return { result: 'loss', payout: 0 };
            if (pVal > 21) return { result: 'loss', payout: 0 };
            if (dVal > 21) return { result: 'win', payout: bet * 2 };
            if (pVal > dVal) return { result: 'win', payout: bet * 2 };
            if (pVal < dVal) return { result: 'loss', payout: 0 };
            return { result: 'push', payout: bet };
        }

        let totalPayout = 0;
        let msgs = [];

        const mainEval = evaluate(bjPlayerHand, bjOriginalBet);
        totalPayout += mainEval.payout;
        msgs.push(mainEval.result);

        if (bjPlayerSplitHand) {
            const splitEval = evaluate(bjPlayerSplitHand, bjOriginalBet);
            totalPayout += splitEval.payout;
            msgs.push(splitEval.result);
        }

        // Add winnings to real balance
        if (totalPayout > 0) {
            bjAddWinnings(totalPayout);
        }

        let overall, msg;
        if (!bjPlayerSplitHand) {
            overall = mainEval.result;
            const pVal = handValue(bjPlayerHand);
            if (overall === 'blackjack') msg = 'BLACKJACK!';
            else if (overall === 'win') msg = dVal > 21 ? 'Dealer Bust!' : 'You Win!';
            else if (overall === 'loss') msg = pVal > 21 ? 'Bust' : 'You Lose';
            else msg = 'Push';
        } else {
            const wins = msgs.filter(m => m === 'win' || m === 'blackjack').length;
            const losses = msgs.filter(m => m === 'loss').length;
            if (wins === 2) { overall = 'win'; msg = 'Both Hands Win!'; }
            else if (losses === 2) { overall = 'loss'; msg = 'Both Hands Lose'; }
            else { overall = 'push'; msg = 'Split Result'; }
        }

        addHistory(overall, bjBet, totalPayout);
        showResult(msg, overall);
        bjPlaySound(overall === 'win' || overall === 'blackjack' ? 'win' : overall === 'loss' ? 'loss' : '');

        // Show Play Again, hide Deal
        $('#bjDealBtn')?.classList.add('hidden');
        $('#bjRebetBtn')?.classList.remove('hidden');
        setActionsEnabled(false);
        $('#bjRulesBanner')?.classList.remove('hidden');
        bjInProgress = false;
    }

    function initBlackjack() {
        bjDeck = createDeck();
        renderHistory();
        updateBetInput();
        setActionsEnabled(false);

        // Amount input
        $('#bjBetInput')?.addEventListener('change', () => {
            bjBet = parseFloat($('#bjBetInput').value) || 10;
            if (bjBet < 0.01) bjBet = 0.01;
            updateBetInput();
        });

        // Modifiers
        $$('.bj-amount-mod').forEach(btn => {
            btn.addEventListener('click', () => {
                const mod = btn.dataset.mod;
                let val = parseFloat($('#bjBetInput').value) || 10;
                if (mod === '0.5') val *= 0.5;
                else if (mod === '2') val *= 2;
                else if (mod === 'min') val = 0.01;
                else if (mod === 'max') val = getBjBalanceUsd();
                bjBet = Math.max(0.01, Math.min(getBjBalanceUsd(), val));
                updateBetInput();
                bjPlaySound('chip');
            });
        });

        // Play / Rebet
        $('#bjDealBtn')?.addEventListener('click', startRound);
        $('#bjRebetBtn')?.addEventListener('click', startRound);

        // Actions
        $('#bjHitBtn')?.addEventListener('click', hit);
        $('#bjStandBtn')?.addEventListener('click', stand);
        $('#bjDoubleBtn')?.addEventListener('click', doubleDown);
        $('#bjSplitBtn')?.addEventListener('click', split);

        // Sound toggle
        $('#bjSoundToggle')?.addEventListener('click', () => {
            bjSoundOn = !bjSoundOn;
            $('#bjSoundToggle').textContent = bjSoundOn ? '🔊' : '🔇';
        });

        // Fullscreen
        $('#bjFullscreenBtn')?.addEventListener('click', () => {
            const el = $('.view[data-view="blackjack"]');
            if (!document.fullscreenElement) el?.requestFullscreen?.();
            else document.exitFullscreen?.();
        });

        // Fair modal
        $('#bjFairBtn')?.addEventListener('click', () => $('#bjFairModal')?.classList.remove('hidden'));
        $('#bjFairClose')?.addEventListener('click', () => $('#bjFairModal')?.classList.add('hidden'));
        $('#bjFairModal .bj-modal-overlay')?.addEventListener('click', () => $('#bjFairModal')?.classList.add('hidden'));

        // Clear history
        $('#bjClearHistory')?.addEventListener('click', () => {
            bjHistory = [];
            renderHistory();
        });

        // Follow button
        $('#bjFollowBtn')?.addEventListener('click', function() {
            this.classList.toggle('following');
            this.textContent = this.classList.contains('following') ? '♥ Following' : '♡ Follow';
        });
    }

    // Expose for roulette.js
    window.api = api;
    window.getToken = getToken;
    window.showToast = showToast;
    window.showAuthModal = (type) => {
        if (type === 'login') openModal('#loginModal');
        else if (type === 'signup') openModal('#signupModal');
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
