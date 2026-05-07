/* ═══════════════════════════════════════════════
   TEXAS HOLD'EM MULTIPLAYER CLIENT
   SocketIO real-time poker with tournament elimination
   ═══════════════════════════════════════════════ */

(function() {
    'use strict';
    console.log('[TEXAS] texasholdem.js loaded');

    const API_URL = window.location.origin;
    let socket = null;
    let currentTableId = null;
    let mySeat = null;
    let myUserId = null;
    let currentState = null;
    let actionTimer = null;
    let actionTimerVal = 30;
    let isMyTurn = false;

    // ═══════════════════════════════════════════════
    // DOM HELPERS
    // ═══════════════════════════════════════════════
    const $ = (s, el = document) => el.querySelector(s);
    const $$ = (s, el = document) => el.querySelectorAll(s);

    function getToken() { return localStorage.getItem('donk_token') || ''; }
    function getUserId() {
        try {
            const payload = JSON.parse(atob(getToken().split('.')[1]));
            return payload.user_id;
        } catch { return null; }
    }

    function fmtCrypto(v) {
        if (v >= 1000) return v.toFixed(2);
        if (v >= 1) return v.toFixed(4);
        return v.toFixed(6);
    }

    // ═══════════════════════════════════════════════
    // SOCKET.IO CONNECTION
    // ═══════════════════════════════════════════════
    function connectSocket() {
        if (socket && socket.connected) return;
        socket = io(API_URL, {
            transports: ['websocket', 'polling'],
            auth: { token: getToken() },
            query: { token: getToken() },
        });

        socket.on('connect', () => {
            console.log('[TEXAS] Socket connected');
            if ($('.view[data-view="texas-holdem"]').classList.contains('active')) {
                socket.emit('join_lobby');
            }
        });

        socket.on('disconnect', () => {
            console.log('[TEXAS] Socket disconnected');
        });

        socket.on('error', (data) => {
            showToast(data.message || 'Poker error', 'error');
        });

        socket.on('lobby_state', (data) => {
            renderLobby(data.tables);
        });

        socket.on('lobby_update', (data) => {
            if ($('.view[data-view="texas-holdem"]').classList.contains('active') && $('#thLobby') && !$('#thLobby').classList.contains('hidden')) {
                socket.emit('join_lobby');
            }
        });

        socket.on('table_created', (data) => {
            showToast('Table created!', 'success');
            closeCreateModal();
            socket.emit('join_lobby');
        });

        socket.on('joined_table', (data) => {
            currentTableId = data.table_id;
            mySeat = data.seat;
            showLobby(false);
            showTable(true);
            showToast('Joined table', 'success');
        });

        socket.on('left_table', (data) => {
            currentTableId = null;
            mySeat = null;
            showLobby(true);
            showTable(false);
            showToast('Left table');
        });

        socket.on('table_state', (data) => {
            currentState = data;
            renderTableState(data);
        });

        socket.on('hand_complete', (data) => {
            showToast('Hand complete', 'success');
            // Briefly reveal all cards
            if (currentState) {
                renderTableState(currentState, true);
            }
        });

        socket.on('game_ended', (data) => {
            const winner = data.winner;
            showToast(`${winner.username} wins the tournament!`, 'success');
            setTimeout(() => {
                currentTableId = null;
                mySeat = null;
                showLobby(true);
                showTable(false);
            }, 4000);
        });
    }

    // ═══════════════════════════════════════════════
    // LOBBY UI
    // ═══════════════════════════════════════════════
    function renderLobby(tables) {
        const list = $('#thTableList');
        if (!tables || tables.length === 0) {
            list.innerHTML = '<div class="th-empty">No active tables. Create one to get started!</div>';
            return;
        }
        list.innerHTML = tables.map(t => {
            const statusClass = t.status === 'waiting' ? 'th-status-waiting' : t.status === 'active' ? 'th-status-active' : 'th-status-ended';
            return `
                <div class="th-table-card" data-table-id="${t.id}">
                    <div class="th-table-card-header">
                        <div class="th-table-card-name">${escapeHtml(t.name)}</div>
                        <div class="th-table-card-status ${statusClass}">${t.status}</div>
                    </div>
                    <div class="th-table-card-meta">
                        <span>💰 ${fmtCrypto(t.small_blind)} / ${fmtCrypto(t.big_blind)}</span>
                        <span>📥 ${fmtCrypto(t.min_buyin)} - ${fmtCrypto(t.max_buyin)}</span>
                        <span>🪙 ${t.currency}</span>
                        <span>👤 ${t.players} / ${t.max_seats}</span>
                    </div>
                    <div class="th-table-card-footer">
                        <div class="th-table-card-players">${t.players} seated</div>
                        <button class="th-table-card-join" data-table-id="${t.id}" data-currency="${t.currency}" data-min="${t.min_buyin}" data-max="${t.max_buyin}">Join</button>
                    </div>
                </div>
            `;
        }).join('');

        $$('.th-table-card-join').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openBuyinModal(+btn.dataset.tableId, btn.dataset.currency, +btn.dataset.min, +btn.dataset.max);
            });
        });
    }

    function showLobby(show) {
        const lobby = $('#thLobby');
        const table = $('#thTable');
        if (lobby) lobby.classList.toggle('hidden', !show);
        if (table) table.classList.toggle('hidden', show);
        if (show && socket) socket.emit('join_lobby');
    }

    function showTable(show) {
        const lobby = $('#thLobby');
        const table = $('#thTable');
        if (lobby) lobby.classList.toggle('hidden', show);
        if (table) table.classList.toggle('hidden', !show);
    }

    // ═══════════════════════════════════════════════
    // MODALS
    // ═══════════════════════════════════════════════
    function openCreateModal() {
        if (!getToken()) { showToast('Login required', 'error'); window.showAuthModal?.('login'); return; }
        $('#thCreateModal')?.classList.remove('hidden');
    }
    function closeCreateModal() { $('#thCreateModal')?.classList.add('hidden'); }

    let pendingJoinTableId = null;
    function openBuyinModal(tableId, currency, minBuy, maxBuy) {
        if (!getToken()) { showToast('Login required', 'error'); window.showAuthModal?.('login'); return; }
        pendingJoinTableId = tableId;
        const input = $('#thBuyinAmount');
        const disp = $('#thBuyinCurrencyDisplay');
        if (input) { input.value = Math.max(minBuy, Math.min(10, maxBuy)).toFixed(currency === 'USDT' ? 2 : 6); input.min = minBuy; input.max = maxBuy; }
        if (disp) disp.textContent = currency;
        $('#thBuyinModal')?.classList.remove('hidden');
    }
    function closeBuyinModal() { $('#thBuyinModal')?.classList.add('hidden'); pendingJoinTableId = null; }

    // ═══════════════════════════════════════════════
    // TABLE RENDERING
    // ═══════════════════════════════════════════════
    function renderTableState(state, revealAll = false) {
        if (!state) return;
        myUserId = getUserId();

        // Header
        $('#thTableName').textContent = state.name;
        $('#thBlinds').textContent = `SB: ${fmtCrypto(state.small_blind)} / BB: ${fmtCrypto(state.big_blind)}`;
        $('#thTableCurrency').textContent = state.currency;
        $('#thPlayerCount').textContent = Object.keys(state.players).length;

        // Start button visibility
        const startBtn = $('#thStartGameBtn');
        const isHost = Object.values(state.players).some(p => p.user_id === myUserId);
        if (startBtn && isHost && state.status === 'waiting' && Object.keys(state.players).length >= 2) {
            startBtn.style.display = 'inline-block';
        } else if (startBtn) {
            startBtn.style.display = 'none';
        }

        // Seats
        for (let seat = 1; seat <= state.max_seats; seat++) {
            const seatEl = $(`#thSeat${seat}`);
            const p = state.players[seat];
            if (!seatEl) continue;

            seatEl.classList.remove('empty', 'active-turn', 'eliminated', 'folded', 'all-in');

            if (!p) {
                seatEl.classList.add('empty');
                $(`#thSeat${seat}Name`).textContent = 'Empty';
                $(`#thSeat${seat}Chips`).textContent = '--';
                $(`#thSeat${seat}Avatar`).textContent = seat;
                $(`#thSeat${seat}Cards`).innerHTML = '';
                $(`#thSeat${seat}Badge`).innerHTML = '';
                $(`#thSeat${seat}Timer`).innerHTML = '';
                continue;
            }

            $(`#thSeat${seat}Name`).textContent = p.username;
            $(`#thSeat${seat}Chips`).textContent = fmtCrypto(p.chips);
            $(`#thSeat${seat}Avatar`).textContent = p.username[0].toUpperCase();

            // Status classes
            if (p.status === 'eliminated') seatEl.classList.add('eliminated');
            if (p.status === 'folded') seatEl.classList.add('folded');
            if (p.status === 'all_in') seatEl.classList.add('all-in');

            // Turn indicator
            if (state.hand && state.hand.active_seat === seat && state.hand.street !== 'complete') {
                seatEl.classList.add('active-turn');
            }

            // Badges
            let badge = '';
            if (p.is_dealer) badge += '<span class="th-badge-dealer">D</span>';
            if (p.is_sb) badge += '<span class="th-badge-sb">SB</span>';
            if (p.is_bb) badge += '<span class="th-badge-bb">BB</span>';
            $(`#thSeat${seat}Badge`).innerHTML = badge;

            // Cards
            const cardsEl = $(`#thSeat${seat}Cards`);
            if (p.hole_cards && p.hole_cards.length === 2) {
                cardsEl.innerHTML = p.hole_cards.map(c => {
                    if (c.hidden) return '<div class="th-card-small hidden"></div>';
                    const isRed = c.suit === '♥' || c.suit === '♦';
                    return `<div class="th-card-small ${isRed ? 'red' : 'black'}">${c.rank}${c.suit}</div>`;
                }).join('');
            } else {
                cardsEl.innerHTML = '';
            }

            // Timer
            const timerEl = $(`#thSeat${seat}Timer`);
            if (state.hand && state.hand.active_seat === seat && state.hand.street !== 'complete' && p.status === 'active') {
                timerEl.innerHTML = '<div class="th-seat-timer-fill"></div>';
            } else {
                timerEl.innerHTML = '';
            }
        }

        // Community cards
        const commEl = $('#thCommunityCards');
        if (state.hand && state.hand.community_cards) {
            commEl.innerHTML = state.hand.community_cards.map(c => {
                const isRed = c.suit === '♥' || c.suit === '♦';
                return `<div class="th-community-card ${isRed ? 'red' : 'black'}">${c.rank}${c.suit}</div>`;
            }).join('');
        } else {
            commEl.innerHTML = '';
        }

        // Pot
        if (state.hand) {
            let potText = `Pot: ${fmtCrypto(state.hand.pot)}`;
            if (state.hand.side_pots && state.hand.side_pots.length > 0) {
                potText += ` (${state.hand.side_pots.length} side pots)`;
            }
            $('#thPot').textContent = potText;
            $('#thStreet').textContent = state.hand.street;
        } else {
            $('#thPot').textContent = 'Pot: 0.00';
            $('#thStreet').textContent = state.status === 'waiting' ? 'Waiting for players...' : 'Ready';
        }

        // Game log
        const logEl = $('#thGameLog');
        if (state.game_log && logEl) {
            logEl.innerHTML = state.game_log.map(l => {
                const cls = l.message.includes('eliminated') ? 'log-elim' : l.message.includes('win') || l.message.includes('Win') ? 'log-win' : '';
                return `<div class="${cls}">${escapeHtml(l.message)}</div>`;
            }).join('');
            logEl.scrollTop = logEl.scrollHeight;
        }

        // Action panel
        renderActionPanel(state);
    }

    function renderActionPanel(state) {
        const panel = $('#thActionPanel');
        if (!state.hand || state.hand.street === 'complete' || !mySeat) {
            if (panel) panel.style.display = 'none';
            return;
        }
        const p = state.players[mySeat];
        if (!p || p.status !== 'active') {
            if (panel) panel.style.display = 'none';
            return;
        }
        if (state.hand.active_seat !== mySeat) {
            if (panel) panel.style.display = 'none';
            return;
        }

        panel.style.display = 'flex';
        isMyTurn = true;

        const callAmount = state.hand.current_bet - p.current_bet;
        const foldBtn = $('#thFoldBtn');
        const checkCallBtn = $('#thCheckCallBtn');
        const betRaiseBtn = $('#thBetRaiseBtn');
        const allInBtn = $('#thAllInBtn');
        const sliderWrap = $('#thBetSliderWrap');
        const slider = $('#thBetSlider');
        const betVal = $('#thBetVal');

        // Enable all buttons first
        foldBtn.disabled = false;
        checkCallBtn.disabled = false;
        betRaiseBtn.disabled = false;
        allInBtn.disabled = false;

        foldBtn.textContent = 'Fold';

        if (callAmount <= 0) {
            checkCallBtn.textContent = 'Check';
        } else {
            checkCallBtn.textContent = `Call ${fmtCrypto(callAmount)}`;
            checkCallBtn.disabled = p.chips < callAmount;
        }

        const minRaise = state.hand.current_bet + state.big_blind;
        if (state.hand.current_bet === 0) {
            betRaiseBtn.textContent = 'Bet';
            betRaiseBtn.disabled = p.chips < state.big_blind;
        } else {
            betRaiseBtn.textContent = 'Raise';
            betRaiseBtn.disabled = p.chips < minRaise;
        }

        allInBtn.disabled = p.chips <= 0;

        // Slider
        const minBet = state.hand.current_bet === 0 ? state.big_blind : minRaise;
        slider.min = minBet;
        slider.max = p.chips;
        slider.step = state.big_blind;
        slider.value = Math.min(minBet + state.big_blind, p.chips);
        betVal.textContent = fmtCrypto(parseFloat(slider.value));
        sliderWrap.style.display = 'flex';

        // Start timer
        startActionTimer();
    }

    function startActionTimer() {
        clearInterval(actionTimer);
        actionTimerVal = 30;
        actionTimer = setInterval(() => {
            actionTimerVal--;
            if (actionTimerVal <= 0) {
                clearInterval(actionTimer);
                if (isMyTurn) {
                    sendAction('fold');
                }
            }
        }, 1000);
    }

    function stopActionTimer() {
        clearInterval(actionTimer);
        isMyTurn = false;
    }

    // ═══════════════════════════════════════════════
    // ACTIONS
    // ═══════════════════════════════════════════════
    function sendAction(action, amount = 0) {
        if (!socket || !currentTableId || !isMyTurn) return;
        stopActionTimer();
        // Disable all action buttons immediately to prevent double-clicks/race conditions
        $$('.th-action-btn').forEach(btn => btn.disabled = true);
        socket.emit('player_action', {
            table_id: currentTableId,
            action: action,
            amount: parseFloat(amount) || 0,
        });
    }

    // ═══════════════════════════════════════════════
    // EVENT BINDING
    // ═══════════════════════════════════════════════
    function initEvents() {
        // Create table
        $('#thCreateTableBtn')?.addEventListener('click', openCreateModal);
        $('#thCreateCancel')?.addEventListener('click', closeCreateModal);
        $('#thCreateSubmit')?.addEventListener('click', () => {
            const name = $('#thCreateName').value.trim();
            const sb = parseFloat($('#thCreateSB').value);
            const bb = parseFloat($('#thCreateBB').value);
            const minBuy = parseFloat($('#thCreateMin').value);
            const maxBuy = parseFloat($('#thCreateMax').value);
            const currency = $('#thCreateCurrency').value;
            const seats = parseInt($('#thCreateSeats').value);
            if (!name) { showToast('Enter a table name', 'error'); return; }
            if (sb <= 0 || bb <= 0 || minBuy <= 0 || maxBuy < minBuy) {
                showToast('Invalid stakes', 'error'); return;
            }
            socket.emit('create_table', { name, small_blind: sb, big_blind: bb, min_buyin: minBuy, max_buyin: maxBuy, currency, max_seats: seats });
        });

        // Buy-in
        $('#thBuyinCancel')?.addEventListener('click', closeBuyinModal);
        $('#thBuyinSubmit')?.addEventListener('click', () => {
            if (!pendingJoinTableId) return;
            const amount = parseFloat($('#thBuyinAmount').value);
            if (amount <= 0) { showToast('Enter a valid buy-in amount', 'error'); return; }
            socket.emit('join_table', { table_id: pendingJoinTableId, buyin: amount });
            closeBuyinModal();
        });

        // Leave table
        $('#thLeaveTable')?.addEventListener('click', () => {
            if (!currentTableId) return;
            if (confirm('Leave table? Any remaining chips will be returned to your balance.')) {
                socket.emit('leave_table', { table_id: currentTableId });
            }
        });

        // Start game
        $('#thStartGameBtn')?.addEventListener('click', () => {
            if (!currentTableId) return;
            socket.emit('start_game', { table_id: currentTableId });
        });

        // Actions
        $('#thFoldBtn')?.addEventListener('click', () => sendAction('fold'));
        $('#thCheckCallBtn')?.addEventListener('click', () => {
            if (!currentState || !mySeat) return;
            const p = currentState.players[mySeat];
            const callAmount = currentState.hand.current_bet - p.current_bet;
            if (callAmount <= 0) sendAction('check');
            else sendAction('call', callAmount);
        });
        $('#thBetRaiseBtn')?.addEventListener('click', () => {
            if (!currentState || !mySeat) return;
            const amount = parseFloat($('#thBetSlider').value);
            const p = currentState.players[mySeat];
            const callAmount = currentState.hand.current_bet - p.current_bet;
            if (callAmount <= 0) sendAction('bet', amount);
            else sendAction('raise', amount);
        });
        $('#thAllInBtn')?.addEventListener('click', () => sendAction('all_in'));

        $('#thBetSlider')?.addEventListener('input', (e) => {
            $('#thBetVal').textContent = fmtCrypto(parseFloat(e.target.value));
        });

        // Overlay clicks to close modals
        $$('.th-modal-overlay').forEach(el => {
            el.addEventListener('click', () => {
                el.parentElement.classList.add('hidden');
            });
        });
    }

    // ═══════════════════════════════════════════════
    // VIEW ROUTING
    // ═══════════════════════════════════════════════
    function onViewActivate() {
        connectSocket();
        myUserId = getUserId();
        if (socket && socket.connected) {
            socket.emit('join_lobby');
        }
    }

    function onViewDeactivate() {
        if (socket) {
            socket.emit('leave_lobby');
        }
    }

    // ═══════════════════════════════════════════════
    // UTILS
    // ═══════════════════════════════════════════════
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showToast(msg, type) {
        if (window.showToast) window.showToast(msg, type);
    }

    // ═══════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════
    initEvents();

    // Observe when texas-holdem view becomes active
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            if (m.target.dataset?.view === 'texas-holdem') {
                if (m.target.classList.contains('active')) {
                    onViewActivate();
                } else {
                    onViewDeactivate();
                }
            }
        });
    });
    document.querySelectorAll('.view[data-view="texas-holdem"]').forEach(v => {
        observer.observe(v, { attributes: true, attributeFilter: ['class'] });
    });
})();
