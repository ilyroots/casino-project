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
        $$('.game-card[data-nav]').forEach(card => {
            card.addEventListener('click', () => navigateTo(card.dataset.nav));
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
        initDice();
        initLimbo();
        initMines();
        initCrash();
        initPlinko();
        initKeno();
        initHilo();
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

    // ═══════════════════════════════════════════════
    // DONK ORIGINALS GAMES
    // ═══════════════════════════════════════════════

    function gameGenerateSeed() {
        return Array.from({length:32},()=>'0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
    }

    function gamePlaySound(type) {
        if (!bjSoundOn) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (type === 'win') {
                [523,659,784].forEach((f,i) => {
                    const o = ctx.createOscillator(), g = ctx.createGain();
                    o.connect(g); g.connect(ctx.destination);
                    o.type = 'sine'; o.frequency.value = f;
                    g.gain.setValueAtTime(0.05, ctx.currentTime + i*0.08);
                    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i*0.08 + 0.25);
                    o.start(ctx.currentTime + i*0.08);
                    o.stop(ctx.currentTime + i*0.08 + 0.25);
                });
            } else if (type === 'loss') {
                const o = ctx.createOscillator(), g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = 'sawtooth'; o.frequency.setValueAtTime(300, ctx.currentTime);
                o.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
                g.gain.setValueAtTime(0.03, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.3);
            } else if (type === 'click') {
                const o = ctx.createOscillator(), g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = 'sine'; o.frequency.value = 1200;
                g.gain.setValueAtTime(0.03, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
                o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.03);
            }
        } catch(e) {}
    }

    function getGameBet(inputId) {
        const val = parseFloat($(inputId)?.value) || 10;
        return Math.max(0.01, Math.min(getBjBalanceUsd(), val));
    }

    function updateGameBet(inputId, val) {
        const el = $(inputId);
        if (el) el.value = val.toFixed(2);
    }

    function gameAddHistory(listId, result, bet, payout) {
        const el = $(listId);
        if (!el) return;
        const profit = payout - bet;
        const profitStr = profit >= 0 ? `+$${profit.toFixed(2)}` : `-$${Math.abs(profit).toFixed(2)}`;
        const profitColor = profit > 0 ? 'var(--neon)' : profit < 0 ? 'var(--hot)' : 'var(--text-secondary)';
        const item = document.createElement('div');
        item.className = `game-history-item ${result}`;
        item.innerHTML = `<span class="game-h-res">${result}</span><span class="game-h-amt" style="color:${profitColor}">${profitStr}</span>`;
        el.insertBefore(item, el.firstChild);
        while (el.children.length > 50) el.removeChild(el.lastChild);
    }

    function setupFairModal(btnId, modalId, closeId, serverId, clientId, nonceId, seedObj) {
        $(btnId)?.addEventListener('click', () => $(modalId)?.classList.remove('hidden'));
        $(closeId)?.addEventListener('click', () => $(modalId)?.classList.add('hidden'));
        $(modalId)?.querySelector('.game-modal-overlay')?.addEventListener('click', () => $(modalId)?.classList.add('hidden'));
        if (seedObj) {
            $(serverId).textContent = seedObj.server.slice(0,16)+'...';
            $(clientId).textContent = seedObj.client.slice(0,16)+'...';
            $(nonceId).textContent = seedObj.nonce;
        }
    }

    function setupAmountMods(gamePrefix, inputId) {
        $$(`.game-amount-mod[data-game="${gamePrefix}"]`).forEach(btn => {
            btn.addEventListener('click', () => {
                const mod = btn.dataset.mod;
                let val = parseFloat($(inputId).value) || 10;
                if (mod === '0.5') val *= 0.5;
                else if (mod === '2') val *= 2;
                else if (mod === 'min') val = 0.01;
                else if (mod === 'max') val = getBjBalanceUsd();
                updateGameBet(inputId, Math.max(0.01, Math.min(getBjBalanceUsd(), val)));
                gamePlaySound('click');
            });
        });
    }

    // ─── DICE ───
    let diceBet = 10, diceTarget = 50, diceHistory = [], diceNonce = 0;
    let diceSeeds = { server: gameGenerateSeed(), client: gameGenerateSeed() };

    function updateDiceUI() {
        const mult = (99 / (diceTarget - 1)).toFixed(4);
        const chance = ((diceTarget - 1) / 99 * 100).toFixed(2);
        $('#diceMultiplier').textContent = mult + '×';
        $('#diceChance').textContent = chance + '%';
        $('#diceSliderVal').textContent = diceTarget;
        $('#diceTargetDisp').textContent = 'Under ' + diceTarget;
        $('#diceBarMarker').style.left = diceTarget + '%';
    }

    function playDice() {
        diceBet = getGameBet('#diceBetInput');
        if (diceBet <= 0 || getBjBalanceUsd() <= 0) return;
        if (!bjDeductBet(diceBet)) return;
        diceNonce++;
        const result = Math.floor(Math.random() * 100) + 1;
        const win = result < diceTarget;
        const mult = parseFloat((99 / (diceTarget - 1)).toFixed(4));
        const payout = win ? diceBet * mult : 0;
        if (payout > 0) bjAddWinnings(payout);

        $('#diceResult').textContent = result;
        $('#diceResult').className = 'dice-result';
        $('#diceBarFill').style.width = result + '%';
        $('#diceBarFill').style.background = win
            ? 'linear-gradient(90deg, var(--neon-dim), var(--neon))'
            : 'linear-gradient(90deg, #5c1a1a, var(--hot))';
        gameAddHistory('diceHistoryList', win ? 'win' : 'loss', diceBet, payout);
        gamePlaySound(win ? 'win' : 'loss');

        $('#diceFairServer').textContent = diceSeeds.server.slice(0,16)+'...';
        $('#diceFairClient').textContent = diceSeeds.client.slice(0,16)+'...';
        $('#diceFairNonce').textContent = diceNonce;
    }

    function initDice() {
        updateDiceUI();
        $('#diceSlider')?.addEventListener('input', (e) => {
            diceTarget = parseInt(e.target.value);
            updateDiceUI();
        });
        $('#diceBetInput')?.addEventListener('change', () => updateGameBet('#diceBetInput', getGameBet('#diceBetInput')));
        setupAmountMods('dice', '#diceBetInput');
        $('#dicePlayBtn')?.addEventListener('click', playDice);
        setupFairModal('#diceFairBtn', '#diceFairModal', '#diceFairClose', '#diceFairServer', '#diceFairClient', '#diceFairNonce', diceSeeds);
        $('#diceSoundToggle')?.addEventListener('click', () => {
            bjSoundOn = !bjSoundOn;
            $('#diceSoundToggle').textContent = bjSoundOn ? '🔊' : '🔇';
        });
    }

    // ─── LIMBO ───
    let limboBet = 10, limboTarget = 2.0, limboHistory = [], limboNonce = 0;
    let limboSeeds = { server: gameGenerateSeed(), client: gameGenerateSeed() };

    function updateLimboUI() {
        const chance = (99 / limboTarget).toFixed(2);
        $('#limboWinChance').textContent = chance + '%';
    }

    function drawLimboCanvas(result, crashed) {
        const canvas = $('#limboCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        // Grid
        ctx.strokeStyle = 'rgba(57,255,20,0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            ctx.beginPath(); ctx.moveTo(i * w/10, 0); ctx.lineTo(i * w/10, h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * h/10); ctx.lineTo(w, i * h/10); ctx.stroke();
        }
        // Rocket path
        ctx.strokeStyle = crashed ? '#ff3864' : '#39ff14';
        ctx.lineWidth = 3;
        ctx.shadowColor = crashed ? '#ff3864' : '#39ff14';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(0, h);
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const mult = 1 + (result - 1) * Math.pow(t, 0.7);
            const x = t * w;
            const y = h - (Math.log(mult) / Math.log(result || 2)) * h * 0.85;
            ctx.lineTo(x, Math.max(10, y));
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Rocket
        const rx = w * 0.85;
        const ry = h - (Math.log(result) / Math.log(result || 2)) * h * 0.85;
        ctx.fillStyle = crashed ? '#ff3864' : '#39ff14';
        ctx.beginPath();
        ctx.moveTo(rx, ry); ctx.lineTo(rx-10, ry+6); ctx.lineTo(rx-10, ry-6);
        ctx.fill();
        // Text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px "Tektur", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(result.toFixed(2) + '×', w/2, h/2);
    }

    function playLimbo() {
        limboBet = getGameBet('#limboBetInput');
        limboTarget = parseFloat($('#limboTarget')?.value) || 2.0;
        if (limboBet <= 0 || getBjBalanceUsd() <= 0) return;
        if (!bjDeductBet(limboBet)) return;
        limboNonce++;

        const result = 0.99 / (1 - Math.random());
        const capped = Math.min(result, 1000);
        const win = capped >= limboTarget;
        const payout = win ? limboBet * limboTarget : 0;
        if (payout > 0) bjAddWinnings(payout);

        drawLimboCanvas(capped, !win);
        const overlay = $('#limboResultOverlay');
        if (overlay) {
            overlay.innerHTML = `<div class="limbo-result-text ${win ? 'win' : 'loss'}">${win ? 'WIN!' : 'BUST'}</div>`;
            overlay.classList.remove('hidden');
            setTimeout(() => overlay.classList.add('hidden'), 2000);
        }
        gameAddHistory('limboHistoryList', win ? 'win' : 'loss', limboBet, payout);
        gamePlaySound(win ? 'win' : 'loss');

        $('#limboFairServer').textContent = limboSeeds.server.slice(0,16)+'...';
        $('#limboFairClient').textContent = limboSeeds.client.slice(0,16)+'...';
        $('#limboFairNonce').textContent = limboNonce;
    }

    function initLimbo() {
        updateLimboUI();
        drawLimboCanvas(1.0, false);
        $('#limboTarget')?.addEventListener('change', () => {
            limboTarget = parseFloat($('#limboTarget').value) || 2.0;
            updateLimboUI();
        });
        $('#limboBetInput')?.addEventListener('change', () => updateGameBet('#limboBetInput', getGameBet('#limboBetInput')));
        setupAmountMods('limbo', '#limboBetInput');
        $('#limboPlayBtn')?.addEventListener('click', playLimbo);
        setupFairModal('#limboFairBtn', '#limboFairModal', '#limboFairClose', '#limboFairServer', '#limboFairClient', '#limboFairNonce', limboSeeds);
        $('#limboSoundToggle')?.addEventListener('click', () => {
            bjSoundOn = !bjSoundOn;
            $('#limboSoundToggle').textContent = bjSoundOn ? '🔊' : '🔇';
        });
    }

    // ─── MINES ───
    let minesBet = 10, minesCount = 3, minesGridState = [], minesRevealed = 0;
    let minesInProgress = false, minesMultiplier = 1, minesHistory = [], minesNonce = 0;
    let minesSeeds = { server: gameGenerateSeed(), client: gameGenerateSeed() };

    function getMinesMultiplier(revealed, mines) {
        const total = 25;
        const safe = total - mines;
        if (revealed === 0) return 1;
        let prob = 1;
        for (let i = 0; i < revealed; i++) prob *= (safe - i) / (total - i);
        return Math.max(1.01, 0.99 / prob);
    }

    function renderMinesGrid() {
        const grid = $('#minesGrid');
        if (!grid) return;
        grid.innerHTML = '';
        for (let i = 0; i < 25; i++) {
            const tile = document.createElement('button');
            tile.className = 'mines-tile';
            tile.dataset.index = i;
            tile.textContent = '';
            tile.addEventListener('click', () => clickMineTile(i));
            grid.appendChild(tile);
        }
    }

    function clickMineTile(index) {
        if (!minesInProgress) return;
        const tiles = $$('.mines-tile');
        const tile = tiles[index];
        if (!tile || tile.classList.contains('revealed') || tile.classList.contains('mine')) return;

        if (minesGridState[index]) {
            // Mine!
            tile.classList.add('mine');
            tile.textContent = '💣';
            minesInProgress = false;
            // Reveal all mines
            minesGridState.forEach((isMine, i) => {
                if (isMine && i !== index) {
                    tiles[i].classList.add('mine');
                    tiles[i].textContent = '💣';
                }
            });
            gameAddHistory('minesHistoryList', 'loss', minesBet, 0);
            gamePlaySound('loss');
            $('#minesPlayBtn')?.classList.remove('hidden');
            $('#minesCashoutBtn')?.classList.add('hidden');
            return;
        }

        // Safe
        minesRevealed++;
        tile.classList.add('revealed', 'gem');
        tile.textContent = '💎';
        gamePlaySound('click');
        minesMultiplier = getMinesMultiplier(minesRevealed, minesCount);
        $('#minesNextMult').textContent = minesMultiplier.toFixed(2) + '×';
        $('#minesCashoutVal').textContent = (minesBet * minesMultiplier).toFixed(2);

        if (minesRevealed >= 25 - minesCount) {
            // All safe tiles revealed
            cashoutMines();
        }
    }

    function startMines() {
        minesBet = getGameBet('#minesBetInput');
        minesCount = parseInt($('#minesCount')?.value) || 3;
        if (minesBet <= 0 || getBjBalanceUsd() <= 0) return;
        if (!bjDeductBet(minesBet)) return;
        minesNonce++;
        minesInProgress = true;
        minesRevealed = 0;
        minesMultiplier = 1;

        // Place mines
        minesGridState = Array(25).fill(false);
        let placed = 0;
        while (placed < minesCount) {
            const idx = Math.floor(Math.random() * 25);
            if (!minesGridState[idx]) { minesGridState[idx] = true; placed++; }
        }

        renderMinesGrid();
        $('#minesNextMult').textContent = getMinesMultiplier(1, minesCount).toFixed(2) + '×';
        $('#minesCashoutVal').textContent = minesBet.toFixed(2);
        $('#minesPlayBtn')?.classList.add('hidden');
        $('#minesCashoutBtn')?.classList.remove('hidden');

        $('#minesFairServer').textContent = minesSeeds.server.slice(0,16)+'...';
        $('#minesFairClient').textContent = minesSeeds.client.slice(0,16)+'...';
        $('#minesFairNonce').textContent = minesNonce;
    }

    function cashoutMines() {
        if (!minesInProgress) return;
        minesInProgress = false;
        const payout = minesBet * minesMultiplier;
        bjAddWinnings(payout);
        gameAddHistory('minesHistoryList', 'win', minesBet, payout);
        gamePlaySound('win');
        $('#minesPlayBtn')?.classList.remove('hidden');
        $('#minesCashoutBtn')?.classList.add('hidden');
    }

    function initMines() {
        renderMinesGrid();
        $('#minesCount')?.addEventListener('change', () => {
            minesCount = parseInt($('#minesCount').value) || 3;
            $('#minesNextMult').textContent = getMinesMultiplier(1, minesCount).toFixed(2) + '×';
        });
        $('#minesBetInput')?.addEventListener('change', () => updateGameBet('#minesBetInput', getGameBet('#minesBetInput')));
        setupAmountMods('mines', '#minesBetInput');
        $('#minesPlayBtn')?.addEventListener('click', startMines);
        $('#minesCashoutBtn')?.addEventListener('click', cashoutMines);
        setupFairModal('#minesFairBtn', '#minesFairModal', '#minesFairClose', '#minesFairServer', '#minesFairClient', '#minesFairNonce', minesSeeds);
        $('#minesSoundToggle')?.addEventListener('click', () => {
            bjSoundOn = !bjSoundOn;
            $('#minesSoundToggle').textContent = bjSoundOn ? '🔊' : '🔇';
        });
    }

    // ─── CRASH ───
    let crashBet = 10, crashAuto = 2.0, crashHistory = [], crashNonce = 0;
    let crashInProgress = false, crashMult = 1.0, crashAnimId = null, crashStrip = [];
    let crashSeeds = { server: gameGenerateSeed(), client: gameGenerateSeed() };

    function drawCrashCanvas(mult, crashed) {
        const canvas = $('#crashCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        // Grid
        ctx.strokeStyle = 'rgba(57,255,20,0.06)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 8; i++) {
            ctx.beginPath(); ctx.moveTo(i * w/8, 0); ctx.lineTo(i * w/8, h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * h/8); ctx.lineTo(w, i * h/8); ctx.stroke();
        }
        // Curve
        const maxMult = Math.max(mult, 2);
        ctx.strokeStyle = crashed ? '#ff3864' : '#39ff14';
        ctx.lineWidth = 3;
        ctx.shadowColor = crashed ? '#ff3864' : '#39ff14';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 4) {
            const t = x / w;
            const m = 1 + (maxMult - 1) * Math.pow(t, 1.5);
            const y = h - (Math.log(m) / Math.log(maxMult)) * h * 0.85;
            ctx.lineTo(x, Math.max(10, y));
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    function updateCrashUI(mult, status) {
        $('#crashMultiplier').textContent = mult.toFixed(2) + '×';
        $('#crashMultiplier').className = 'crash-multiplier' + (status === 'crashed' ? ' crash' : '');
        $('#crashStatus').textContent = status;
        drawCrashCanvas(mult, status === 'crashed');
    }

    function runCrashRound() {
        const crashPoint = 0.99 / (1 - Math.random());
        const capped = Math.min(crashPoint, 100);
        crashMult = 1.0;
        crashInProgress = true;
        const startTime = performance.now();
        const duration = (capped - 1) * 1000; // ~1s per 1x

        function frame(now) {
            if (!crashInProgress) return;
            const elapsed = (now - startTime) / 1000;
            crashMult = 1 + elapsed;

            // Check auto cashout
            const autoVal = parseFloat($('#crashAutoCashout')?.value) || 999;
            if (crashMult >= autoVal && crashMult < capped) {
                cashoutCrash();
                return;
            }

            if (crashMult >= capped) {
                crashMult = capped;
                updateCrashUI(crashMult, 'crashed');
                crashInProgress = false;
                gameAddHistory('crashHistoryList', 'loss', crashBet, 0);
                gamePlaySound('loss');
                addCrashStrip(capped, false);
                $('#crashPlayBtn')?.classList.remove('hidden');
                $('#crashCashoutBtn')?.classList.add('hidden');
                return;
            }

            updateCrashUI(crashMult, 'Running...');
            crashAnimId = requestAnimationFrame(frame);
        }
        crashAnimId = requestAnimationFrame(frame);
    }

    function addCrashStrip(mult, win) {
        crashStrip.unshift({ mult, win });
        if (crashStrip.length > 20) crashStrip.pop();
        const el = $('#crashHistoryStrip');
        if (el) {
            el.innerHTML = crashStrip.map(r =>
                `<span class="crash-history-pill ${r.win ? 'green' : 'red'}">${r.mult.toFixed(2)}×</span>`
            ).join('');
        }
    }

    function startCrash() {
        crashBet = getGameBet('#crashBetInput');
        if (crashBet <= 0 || getBjBalanceUsd() <= 0) return;
        if (!bjDeductBet(crashBet)) return;
        crashNonce++;
        if (crashAnimId) cancelAnimationFrame(crashAnimId);
        $('#crashPlayBtn')?.classList.add('hidden');
        $('#crashCashoutBtn')?.classList.remove('hidden');
        runCrashRound();
        $('#crashFairServer').textContent = crashSeeds.server.slice(0,16)+'...';
        $('#crashFairClient').textContent = crashSeeds.client.slice(0,16)+'...';
        $('#crashFairNonce').textContent = crashNonce;
    }

    function cashoutCrash() {
        if (!crashInProgress) return;
        crashInProgress = false;
        if (crashAnimId) cancelAnimationFrame(crashAnimId);
        const payout = crashBet * crashMult;
        bjAddWinnings(payout);
        updateCrashUI(crashMult, 'Cashed Out!');
        gameAddHistory('crashHistoryList', 'win', crashBet, payout);
        gamePlaySound('win');
        addCrashStrip(crashMult, true);
        $('#crashPlayBtn')?.classList.remove('hidden');
        $('#crashCashoutBtn')?.classList.add('hidden');
    }

    function initCrash() {
        updateCrashUI(1.0, 'Place your bet');
        $('#crashBetInput')?.addEventListener('change', () => updateGameBet('#crashBetInput', getGameBet('#crashBetInput')));
        setupAmountMods('crash', '#crashBetInput');
        $('#crashPlayBtn')?.addEventListener('click', startCrash);
        $('#crashCashoutBtn')?.addEventListener('click', cashoutCrash);
        setupFairModal('#crashFairBtn', '#crashFairModal', '#crashFairClose', '#crashFairServer', '#crashFairClient', '#crashFairNonce', crashSeeds);
        $('#crashSoundToggle')?.addEventListener('click', () => {
            bjSoundOn = !bjSoundOn;
            $('#crashSoundToggle').textContent = bjSoundOn ? '🔊' : '🔇';
        });
    }

    // ─── PLINKO ───
    let plinkoBet = 10, plinkoRisk = 'low', plinkoRows = 12, plinkoBalls = 5;
    let plinkoHistory = [], plinkoNonce = 0;
    let plinkoSeeds = { server: gameGenerateSeed(), client: gameGenerateSeed() };

    function getPlinkoMultipliers(risk, row) {
        const maps = {
            low: { 8: [5.6,2.1,1.1,1,0.5,1,1.1,2.1,5.6], 12: [10,3,1.6,1.4,1.1,1,0.5,1,1.1,1.4,1.6,3,10], 16: [16,9,2,1.4,1.4,1.2,1.1,1,0.5,1,1.1,1.2,1.4,1.4,2,9,16] },
            medium: { 8: [13,3,1.3,0.7,0.4,0.7,1.3,3,13], 12: [24,6,3,1.8,1.2,0.6,0.4,0.6,1.2,1.8,3,6,24], 16: [41,20,8,5,3,1.5,1,0.5,0.3,0.5,1,1.5,3,5,8,20,41] },
            high: { 8: [29,4,1.5,0.3,0.2,0.3,1.5,4,29], 12: [56,11,5,3,1.5,0.5,0.2,0.5,1.5,3,5,11,56], 16: [120,50,20,10,5,3,1.5,0.5,0.2,0.5,1.5,3,5,10,20,50,120] }
        };
        return maps[risk][row] || maps[risk][12];
    }

    function drawPlinkoBoard() {
        const canvas = $('#plinkoCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const rows = plinkoRows;
        const pegRadius = 3;
        const startY = 40;
        const endY = h - 80;
        const spacingX = w / (rows + 2);
        const spacingY = (endY - startY) / rows;

        ctx.fillStyle = 'rgba(57,255,20,0.2)';
        for (let r = 0; r < rows; r++) {
            const pegsInRow = r + 3;
            const rowWidth = (pegsInRow - 1) * spacingX;
            const startX = (w - rowWidth) / 2;
            for (let p = 0; p < pegsInRow; p++) {
                ctx.beginPath();
                ctx.arc(startX + p * spacingX, startY + r * spacingY, pegRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Buckets
        const mults = getPlinkoMultipliers(plinkoRisk, plinkoRows);
        const bucketW = w / mults.length;
        mults.forEach((m, i) => {
            ctx.fillStyle = m >= 10 ? 'rgba(255,56,100,0.15)' : m >= 3 ? 'rgba(57,255,20,0.1)' : 'rgba(255,255,255,0.03)';
            ctx.fillRect(i * bucketW, h - 50, bucketW - 2, 40);
            ctx.fillStyle = m >= 10 ? '#ff3864' : m >= 3 ? 'var(--neon)' : 'var(--text-secondary)';
            ctx.font = '600 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(m + '×', i * bucketW + bucketW/2, h - 18);
        });
    }

    function animatePlinkoBall() {
        const canvas = $('#plinkoCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        const rows = plinkoRows;
        const spacingX = w / (rows + 2);
        const startY = 40;
        const endY = h - 80;
        const spacingY = (endY - startY) / rows;

        let pos = { x: w/2, y: 10 };
        let row = 0;
        let path = [];
        for (let r = 0; r < rows; r++) {
            path.push(Math.random() < 0.5 ? -1 : 1);
        }
        let col = 0;

        function drawBall() {
            drawPlinkoBoard();
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        function step() {
            if (row >= rows) {
                const mults = getPlinkoMultipliers(plinkoRisk, plinkoRows);
                const bucketIdx = Math.floor((pos.x / w) * mults.length);
                const safeIdx = Math.max(0, Math.min(mults.length - 1, bucketIdx));
                const mult = mults[safeIdx];
                const payout = plinkoBet * mult;
                bjAddWinnings(payout);
                gameAddHistory('plinkoHistoryList', mult >= 1 ? 'win' : 'loss', plinkoBet, payout);
                gamePlaySound(mult >= 1 ? 'win' : 'loss');
                drawPlinkoBoard();
                return;
            }
            const pegsInRow = row + 3;
            const rowWidth = (pegsInRow - 1) * spacingX;
            const startX = (w - rowWidth) / 2;
            const targetX = startX + (col + 1.5) * spacingX + (path[row] === 1 ? spacingX/2 : -spacingX/2);
            const targetY = startY + row * spacingY;

            const dx = targetX - pos.x;
            const dy = targetY - pos.y;
            pos.x += dx * 0.15;
            pos.y += dy * 0.15;

            if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
                col += path[row] === 1 ? 1 : 0;
                row++;
            }
            drawBall();
            requestAnimationFrame(step);
        }
        step();
    }

    function playPlinko() {
        plinkoBet = getGameBet('#plinkoBetInput');
        if (plinkoBet <= 0 || getBjBalanceUsd() <= 0) return;
        if (!bjDeductBet(plinkoBet)) return;
        plinkoNonce++;
        const count = plinkoBalls;
        let dropped = 0;
        function dropNext() {
            if (dropped >= count) return;
            dropped++;
            animatePlinkoBall();
            setTimeout(dropNext, 300);
        }
        dropNext();
        $('#plinkoFairServer').textContent = plinkoSeeds.server.slice(0,16)+'...';
        $('#plinkoFairClient').textContent = plinkoSeeds.client.slice(0,16)+'...';
        $('#plinkoFairNonce').textContent = plinkoNonce;
    }

    function initPlinko() {
        drawPlinkoBoard();
        $('#plinkoRows')?.addEventListener('input', (e) => {
            plinkoRows = parseInt(e.target.value);
            $('#plinkoRowsVal').textContent = plinkoRows;
            drawPlinkoBoard();
        });
        $$('.plinko-risk-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.plinko-risk-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                plinkoRisk = btn.dataset.risk;
                drawPlinkoBoard();
            });
        });
        $$('.plinko-ball-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.plinko-ball-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                plinkoBalls = parseInt(btn.dataset.balls);
            });
        });
        $('#plinkoBetInput')?.addEventListener('change', () => updateGameBet('#plinkoBetInput', getGameBet('#plinkoBetInput')));
        setupAmountMods('plinko', '#plinkoBetInput');
        $('#plinkoPlayBtn')?.addEventListener('click', playPlinko);
        setupFairModal('#plinkoFairBtn', '#plinkoFairModal', '#plinkoFairClose', '#plinkoFairServer', '#plinkoFairClient', '#plinkoFairNonce', plinkoSeeds);
        $('#plinkoSoundToggle')?.addEventListener('click', () => {
            bjSoundOn = !bjSoundOn;
            $('#plinkoSoundToggle').textContent = bjSoundOn ? '🔊' : '🔇';
        });
    }

    // ─── KENO ───
    let kenoBet = 10, kenoPicks = [], kenoHistory = [], kenoNonce = 0;
    let kenoSeeds = { server: gameGenerateSeed(), client: gameGenerateSeed() };

    const KENO_PAYOUTS = {
        1: [0, 3.96],
        2: [0, 2, 9.7],
        3: [0, 0, 3.3, 48],
        4: [0, 0, 1.7, 10, 100],
        5: [0, 0, 1.2, 4, 15, 450],
        6: [0, 0, 0, 3, 7, 50, 800],
        7: [0, 0, 0, 2, 4, 15, 200, 1200],
        8: [0, 0, 0, 0, 3, 8, 40, 300, 2500],
        9: [0, 0, 0, 0, 2, 5, 20, 100, 1000, 5000],
        10: [0, 0, 0, 0, 0, 3, 10, 40, 200, 1500, 10000]
    };

    function renderKenoGrid() {
        const grid = $('#kenoGrid');
        if (!grid) return;
        grid.innerHTML = '';
        for (let i = 1; i <= 40; i++) {
            const cell = document.createElement('button');
            cell.className = 'keno-number';
            cell.textContent = i;
            cell.dataset.num = i;
            cell.addEventListener('click', () => toggleKenoPick(i));
            grid.appendChild(cell);
        }
    }

    function toggleKenoPick(n) {
        const idx = kenoPicks.indexOf(n);
        if (idx >= 0) {
            kenoPicks.splice(idx, 1);
        } else if (kenoPicks.length < 10) {
            kenoPicks.push(n);
        }
        updateKenoUI();
    }

    function updateKenoUI() {
        $$('.keno-number').forEach(cell => {
            const n = parseInt(cell.dataset.num);
            cell.classList.toggle('selected', kenoPicks.includes(n));
            cell.classList.remove('drawn', 'matched');
        });
        $('#kenoPickCount').textContent = kenoPicks.length;
        const payout = KENO_PAYOUTS[kenoPicks.length];
        $('#kenoMultiplier').textContent = payout ? 'Up to ' + payout[payout.length-1] + '×' : '--';
    }

    function playKeno() {
        kenoBet = getGameBet('#kenoBetInput');
        if (kenoBet <= 0 || getBjBalanceUsd() <= 0) return;
        if (kenoPicks.length === 0) return;
        if (!bjDeductBet(kenoBet)) return;
        kenoNonce++;

        // Draw 10 numbers
        const drawn = [];
        const pool = Array.from({length:40},(_,i)=>i+1);
        for (let i = 0; i < 10; i++) {
            const idx = Math.floor(Math.random() * pool.length);
            drawn.push(pool.splice(idx, 1)[0]);
        }

        // Animate
        $$('.keno-number').forEach(c => c.classList.remove('drawn', 'matched'));
        const drawnEl = $('#kenoDrawn');
        if (drawnEl) drawnEl.innerHTML = '';

        let step = 0;
        const interval = setInterval(() => {
            if (step >= drawn.length) {
                clearInterval(interval);
                const matches = kenoPicks.filter(p => drawn.includes(p)).length;
                const payoutTable = KENO_PAYOUTS[kenoPicks.length];
                const mult = payoutTable ? (payoutTable[matches] || 0) : 0;
                const payout = kenoBet * mult;
                if (payout > 0) bjAddWinnings(payout);
                gameAddHistory('kenoHistoryList', mult > 0 ? 'win' : 'loss', kenoBet, payout);
                gamePlaySound(mult > 0 ? 'win' : 'loss');
                return;
            }
            const num = drawn[step];
            const cell = $(`.keno-number[data-num="${num}"]`);
            if (cell) {
                cell.classList.add('drawn');
                if (kenoPicks.includes(num)) cell.classList.add('matched');
            }
            if (drawnEl) {
                const ball = document.createElement('div');
                ball.className = 'keno-drawn-ball';
                ball.textContent = num;
                drawnEl.appendChild(ball);
            }
            gamePlaySound('click');
            step++;
        }, 250);

        $('#kenoFairServer').textContent = kenoSeeds.server.slice(0,16)+'...';
        $('#kenoFairClient').textContent = kenoSeeds.client.slice(0,16)+'...';
        $('#kenoFairNonce').textContent = kenoNonce;
    }

    function initKeno() {
        renderKenoGrid();
        $('#kenoBetInput')?.addEventListener('change', () => updateGameBet('#kenoBetInput', getGameBet('#kenoBetInput')));
        setupAmountMods('keno', '#kenoBetInput');
        $('#kenoPlayBtn')?.addEventListener('click', playKeno);
        $$('.keno-auto-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.clear !== undefined) {
                    kenoPicks = [];
                } else {
                    const count = parseInt(btn.dataset.pick);
                    kenoPicks = [];
                    const pool = Array.from({length:40},(_,i)=>i+1);
                    for (let i = 0; i < count; i++) {
                        const idx = Math.floor(Math.random() * pool.length);
                        kenoPicks.push(pool.splice(idx, 1)[0]);
                    }
                }
                updateKenoUI();
            });
        });
        setupFairModal('#kenoFairBtn', '#kenoFairModal', '#kenoFairClose', '#kenoFairServer', '#kenoFairClient', '#kenoFairNonce', kenoSeeds);
        $('#kenoSoundToggle')?.addEventListener('click', () => {
            bjSoundOn = !bjSoundOn;
            $('#kenoSoundToggle').textContent = bjSoundOn ? '🔊' : '🔇';
        });
    }

    // ─── HILO ───
    let hiloBet = 10, hiloMult = 1.0, hiloStreak = 0, hiloHistory = [], hiloNonce = 0;
    let hiloCurrentCard = null, hiloDeck = [], hiloInProgress = false;
    let hiloSeeds = { server: gameGenerateSeed(), client: gameGenerateSeed() };
    const HILO_DECK = [];
    for (const s of ['♠','♥','♣','♦']) {
        for (const r of ['A','2','3','4','5','6','7','8','9','10','J','Q','K']) {
            HILO_DECK.push({ suit: s, rank: r, value: cardValue(r) });
        }
    }

    function shuffleHiloDeck() {
        hiloDeck = [...HILO_DECK];
        for (let i = hiloDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [hiloDeck[i], hiloDeck[j]] = [hiloDeck[j], hiloDeck[i]];
        }
    }

    function renderHiloCard(card, container) {
        if (!card) return;
        const isRed = card.suit === '♥' || card.suit === '♦';
        const div = document.createElement('div');
        div.className = `hilo-card ${isRed ? 'red' : 'black'}`;
        div.innerHTML = `
            <div class="hilo-card-corner top-left"><div class="hilo-card-rank">${card.rank}</div><div class="hilo-card-suit">${card.suit}</div></div>
            <div class="hilo-card-suit">${card.suit}</div>
            <div class="hilo-card-corner bottom-right"><div class="hilo-card-rank">${card.rank}</div><div class="hilo-card-suit">${card.suit}</div></div>
        `;
        container.appendChild(div);
        container.scrollLeft = container.scrollWidth;
    }

    function updateHiloUI() {
        const higherMult = (hiloMult * (1 + 0.96 * (1 - hiloCurrentCard.value / 13))).toFixed(2);
        const lowerMult = (hiloMult * (1 + 0.96 * (hiloCurrentCard.value / 13))).toFixed(2);
        $('#hiloCurrentMult').textContent = hiloMult.toFixed(2) + '×';
        $('#hiloNextMult').textContent = `${higherMult}× / ${lowerMult}×`;
        $('#hiloHigherBtn').disabled = !hiloInProgress;
        $('#hiloLowerBtn').disabled = !hiloInProgress;
        $('#hiloCashoutBtn').disabled = !hiloInProgress || hiloStreak === 0;
        $('#hiloStartBtn').classList.toggle('hidden', hiloInProgress);
    }

    function startHilo() {
        hiloBet = getGameBet('#hiloBetInput');
        if (hiloBet <= 0 || getBjBalanceUsd() <= 0) return;
        if (!bjDeductBet(hiloBet)) return;
        hiloNonce++;
        hiloInProgress = true;
        hiloStreak = 0;
        hiloMult = 1.0;
        shuffleHiloDeck();
        hiloCurrentCard = hiloDeck.pop();
        const area = $('#hiloCardArea');
        if (area) area.innerHTML = '';
        renderHiloCard(hiloCurrentCard, area);
        $('#hiloStreak').innerHTML = '';
        updateHiloUI();
        $('#hiloFairServer').textContent = hiloSeeds.server.slice(0,16)+'...';
        $('#hiloFairClient').textContent = hiloSeeds.client.slice(0,16)+'...';
        $('#hiloFairNonce').textContent = hiloNonce;
    }

    function guessHilo(direction) {
        if (!hiloInProgress || hiloDeck.length === 0) return;
        const nextCard = hiloDeck.pop();
        renderHiloCard(nextCard, $('#hiloCardArea'));
        const isHigher = nextCard.value > hiloCurrentCard.value;
        const isEqual = nextCard.value === hiloCurrentCard.value;
        const win = isEqual || (direction === 'higher' && isHigher) || (direction === 'lower' && !isHigher);

        if (win) {
            hiloStreak++;
            const factor = direction === 'higher'
                ? (1 + 0.96 * (1 - hiloCurrentCard.value / 13))
                : (1 + 0.96 * (hiloCurrentCard.value / 13));
            hiloMult *= factor;
            hiloCurrentCard = nextCard;
            gamePlaySound('click');
            const dot = document.createElement('div');
            dot.className = 'hilo-streak-dot';
            $('#hiloStreak').appendChild(dot);
            updateHiloUI();
        } else {
            hiloInProgress = false;
            gameAddHistory('hiloHistoryList', 'loss', hiloBet, 0);
            gamePlaySound('loss');
            updateHiloUI();
        }
    }

    function cashoutHilo() {
        if (!hiloInProgress || hiloStreak === 0) return;
        hiloInProgress = false;
        const payout = hiloBet * hiloMult;
        bjAddWinnings(payout);
        gameAddHistory('hiloHistoryList', 'win', hiloBet, payout);
        gamePlaySound('win');
        updateHiloUI();
    }

    function initHilo() {
        $('#hiloBetInput')?.addEventListener('change', () => updateGameBet('#hiloBetInput', getGameBet('#hiloBetInput')));
        setupAmountMods('hilo', '#hiloBetInput');
        $('#hiloStartBtn')?.addEventListener('click', startHilo);
        $('#hiloHigherBtn')?.addEventListener('click', () => guessHilo('higher'));
        $('#hiloLowerBtn')?.addEventListener('click', () => guessHilo('lower'));
        $('#hiloCashoutBtn')?.addEventListener('click', cashoutHilo);
        setupFairModal('#hiloFairBtn', '#hiloFairModal', '#hiloFairClose', '#hiloFairServer', '#hiloFairClient', '#hiloFairNonce', hiloSeeds);
        $('#hiloSoundToggle')?.addEventListener('click', () => {
            bjSoundOn = !bjSoundOn;
            $('#hiloSoundToggle').textContent = bjSoundOn ? '🔊' : '🔇';
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
