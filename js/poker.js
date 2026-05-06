/* ═══════════════════════════════════════════════
   ULTIMATE TEXAS HOLD'EM POKER ENGINE
   ═══════════════════════════════════════════════ */

(function() {
    'use strict';

    // ── Card Data ──
    const SUITS = ['♠','♥','♦','♣'];
    const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const RANK_VALUES = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };

    function createDeck() {
        const deck = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                deck.push({ rank, suit, value: RANK_VALUES[rank] });
            }
        }
        return deck;
    }

    function shuffle(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    // ── Hand Evaluation ──
    function evaluateHand(cards) {
        // cards: array of {rank, suit, value}
        const sorted = [...cards].sort((a,b) => b.value - a.value);
        const isFlush = (() => {
            const suits = {};
            for (const c of sorted) suits[c.suit] = (suits[c.suit]||0)+1;
            for (const s in suits) if (suits[s] >= 5) return s;
            return null;
        })();

        const isStraight = (() => {
            const uniq = [...new Set(sorted.map(c => c.value))];
            if (uniq.length < 5) return null;
            // Check for A-2-3-4-5 straight
            if (uniq.includes(14) && uniq.includes(2) && uniq.includes(3) && uniq.includes(4) && uniq.includes(5)) {
                return 5;
            }
            for (let i = 0; i <= uniq.length - 5; i++) {
                if (uniq[i] - uniq[i+4] === 4) return uniq[i];
            }
            return null;
        })();

        const counts = {};
        for (const c of sorted) counts[c.value] = (counts[c.value]||0)+1;
        const countGroups = Object.entries(counts).map(([v,c]) => ({value:+v, count:c})).sort((a,b) => b.count-a.count || b.value-a.value);

        // Royal flush
        if (isFlush && isStraight === 14) return { rank: 10, name: 'Royal Flush', tiebreak: [14] };
        // Straight flush
        if (isFlush && isStraight) return { rank: 9, name: 'Straight Flush', tiebreak: [isStraight] };
        // Four of a kind
        if (countGroups[0].count === 4) return { rank: 8, name: 'Four of a Kind', tiebreak: [countGroups[0].value, countGroups[1].value] };
        // Full house
        if (countGroups[0].count === 3 && countGroups[1].count >= 2) return { rank: 7, name: 'Full House', tiebreak: [countGroups[0].value, countGroups[1].value] };
        // Flush
        if (isFlush) {
            const flushCards = sorted.filter(c => c.suit === isFlush).slice(0,5);
            return { rank: 6, name: 'Flush', tiebreak: flushCards.map(c => c.value) };
        }
        // Straight
        if (isStraight) return { rank: 5, name: 'Straight', tiebreak: [isStraight] };
        // Three of a kind
        if (countGroups[0].count === 3) return { rank: 4, name: 'Three of a Kind', tiebreak: [countGroups[0].value, ...countGroups.slice(1).map(g=>g.value)] };
        // Two pair
        if (countGroups[0].count === 2 && countGroups[1].count === 2) return { rank: 3, name: 'Two Pair', tiebreak: [countGroups[0].value, countGroups[1].value, countGroups[2].value] };
        // One pair
        if (countGroups[0].count === 2) return { rank: 2, name: 'One Pair', tiebreak: [countGroups[0].value, ...countGroups.slice(1).map(g=>g.value)] };
        // High card
        return { rank: 1, name: 'High Card', tiebreak: sorted.slice(0,5).map(c => c.value) };
    }

    function compareHands(h1, h2) {
        if (h1.rank !== h2.rank) return h1.rank - h2.rank;
        for (let i = 0; i < h1.tiebreak.length; i++) {
            if (h1.tiebreak[i] !== h2.tiebreak[i]) return h1.tiebreak[i] - h2.tiebreak[i];
        }
        return 0;
    }

    function best5From7(cards) {
        let best = null;
        // Check all C(7,5) combinations
        for (let a = 0; a < 3; a++) {
            for (let b = a+1; b < 4; b++) {
                for (let c = b+1; c < 5; c++) {
                    for (let d = c+1; d < 6; d++) {
                        for (let e = d+1; e < 7; e++) {
                            const hand = evaluateHand([cards[a],cards[b],cards[c],cards[d],cards[e]]);
                            if (!best || compareHands(hand, best) > 0) best = hand;
                        }
                    }
                }
            }
        }
        return best;
    }

    // ── Payouts ──
    const BLIND_PAYOUTS = {
        10: 500, 9: 50, 8: 10, 7: 3, 6: 1.5, 5: 1, 4: 0, 3: 0, 2: 0, 1: 0
    };

    // ── State ──
    let gameState = 'idle'; // idle, dealing, preflop, flop, turnriver, showdown
    let deck = [];
    let playerCards = [];
    let dealerCards = [];
    let community = [];
    let pot = { ante: 0, play: 0, blind: 0, trips: 0 };
    let selectedChip = 1.0;
    let history = [];

    // ── DOM refs ──
    let $table, $playerCards, $dealerCards, $community, $potDisplay, $statusMsg;
    let $btnDeal, $btnCheck, $btnBet, $btnFold, $btnClear;

    // ── Init ──
    function initPoker() {
        $table = document.getElementById('pokerTable');
        $playerCards = document.getElementById('pokerPlayerCards');
        $dealerCards = document.getElementById('pokerDealerCards');
        $community = document.getElementById('pokerCommunity');
        $potDisplay = document.getElementById('pokerPot');
        $statusMsg = document.getElementById('pokerStatus');
        $btnDeal = document.getElementById('pokerDeal');
        $btnCheck = document.getElementById('pokerCheck');
        $btnBet = document.getElementById('pokerBet');
        $btnFold = document.getElementById('pokerFold');
        $btnClear = document.getElementById('pokerClear');

        initChips();
        initButtons();
        updateBalanceDisplay();
        loadHistory();
        renderHistory();
    }

    function initChips() {
        document.querySelectorAll('.poker-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.poker-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                selectedChip = parseFloat(chip.dataset.val);
            });
        });
    }

    function initButtons() {
        $btnDeal?.addEventListener('click', startHand);
        $btnCheck?.addEventListener('click', () => playerAction('check'));
        $btnBet?.addEventListener('click', () => playerAction('bet'));
        $btnFold?.addEventListener('click', () => playerAction('fold'));
        $btnClear?.addEventListener('click', resetTable);
    }

    // ── Game Flow ──
    async function startHand() {
        if (gameState !== 'idle') return;
        if (!window.getToken || !window.getToken()) {
            showPokerToast('Login required to play', 'error');
            window.showAuthModal && window.showAuthModal('login');
            return;
        }

        const ante = selectedChip;
        const blind = selectedChip * 0.5;
        const total = ante + blind;
        const currency = localStorage.getItem('selectedCurrency') || 'BTC';

        // Deduct from balance
        const res = await window.api('/api/balance?currency=' + currency);
        const balData = await res.json();
        const bal = balData.amount || 0;
        if (bal < total) {
            showPokerToast('Insufficient balance', 'error');
            return;
        }

        // Deduct via API
        const betRes = await window.api('/api/poker/bet', {
            method: 'POST',
            body: JSON.stringify({ currency, amount: total, action: 'deduct' })
        });
        const bData = await betRes.json();
        if (bData.error) {
            showPokerToast(bData.error, 'error');
            return;
        }

        if (window.loadBalances) window.loadBalances();

        // Setup game
        gameState = 'dealing';
        pot = { ante, play: 0, blind, trips: 0 };
        updatePotDisplay();
        setButtons(['none']);
        setStatus('Dealing...');

        deck = shuffle(createDeck());
        playerCards = [deck.pop(), deck.pop()];
        dealerCards = [deck.pop(), deck.pop()];
        community = [];

        // Clear table
        $playerCards.innerHTML = '';
        $dealerCards.innerHTML = '';
        $community.innerHTML = '';

        // Deal hole cards with animation
        await dealCard($playerCards, playerCards[0], 'player', 0);
        await dealCard($dealerCards, dealerCards[0], 'dealer', 0);
        await dealCard($playerCards, playerCards[1], 'player', 1);
        await dealCard($dealerCards, dealerCards[1], 'dealer', 1);

        gameState = 'preflop';
        setStatus('Pre-Flop: Check or Bet ' + formatCrypto(pot.ante * 2));
        setButtons(['check', 'bet', 'fold']);
        updateBalanceDisplay();
    }

    async function playerAction(action) {
        if (gameState === 'preflop') {
            if (action === 'check') {
                setButtons(['none']);
                setStatus('You checked. Dealing flop...');
                await delay(600);
                await dealFlop();
                gameState = 'flop';
                setStatus('Flop: Check or Bet ' + formatCrypto(pot.ante));
                setButtons(['check', 'bet', 'fold']);
            } else if (action === 'bet') {
                const betAmount = pot.ante * 2;
                pot.play += betAmount;
                updatePotDisplay();
                setButtons(['none']);
                setStatus('You bet ' + formatCrypto(betAmount) + '. Dealing flop...');
                await delay(600);
                await dealFlop();
                await dealTurnRiver();
                await showdown();
            } else if (action === 'fold') {
                setButtons(['none']);
                setStatus('You folded. Dealer wins.');
                await delay(800);
                revealDealerCards();
                await endHand('dealer');
            }
        } else if (gameState === 'flop') {
            if (action === 'check') {
                setButtons(['none']);
                setStatus('You checked. Dealing turn and river...');
                await delay(600);
                await dealTurnRiver();
                await showdown();
            } else if (action === 'bet') {
                const betAmount = pot.ante;
                pot.play += betAmount;
                updatePotDisplay();
                setButtons(['none']);
                setStatus('You bet ' + formatCrypto(betAmount) + '. Dealing turn and river...');
                await delay(600);
                await dealTurnRiver();
                await showdown();
            } else if (action === 'fold') {
                setButtons(['none']);
                setStatus('You folded. Dealer wins.');
                await delay(800);
                revealDealerCards();
                await endHand('dealer');
            }
        }
    }

    async function dealFlop() {
        community.push(deck.pop(), deck.pop(), deck.pop());
        await dealCard($community, community[0], 'community', 0);
        await dealCard($community, community[1], 'community', 1);
        await dealCard($community, community[2], 'community', 2);
    }

    async function dealTurnRiver() {
        community.push(deck.pop());
        await dealCard($community, community[3], 'community', 3);
        community.push(deck.pop());
        await dealCard($community, community[4], 'community', 4);
    }

    async function showdown() {
        gameState = 'showdown';
        setStatus('Showdown!');
        revealDealerCards();
        await delay(800);

        const playerBest = best5From7([...playerCards, ...community]);
        const dealerBest = best5From7([...dealerCards, ...community]);

        // Highlight winning hand
        const cmp = compareHands(playerBest, dealerBest);

        setStatus(`You: ${playerBest.name} vs Dealer: ${dealerBest.name}`);
        await delay(1200);

        if (cmp > 0) {
            await endHand('player', playerBest, dealerBest);
        } else if (cmp < 0) {
            await endHand('dealer', playerBest, dealerBest);
        } else {
            await endHand('push', playerBest, dealerBest);
        }
    }

    async function endHand(winner, playerHand, dealerHand) {
        const currency = localStorage.getItem('selectedCurrency') || 'BTC';
        let winAmount = 0;
        let message = '';

        if (winner === 'player') {
            // Dealer must qualify (pair of 4s or better)
            const dealerQualifies = dealerHand.rank >= 2 && dealerHand.tiebreak[0] >= 4;

            if (dealerQualifies) {
                winAmount = pot.ante + pot.play + pot.blind;
                message = `You win! ${playerHand.name} beats ${dealerHand.name}. Won ${formatCrypto(winAmount)} ${currency.toUpperCase()}!`;
            } else {
                // Ante pushes, play wins even money, blind pays according to hand
                const blindPay = BLIND_PAYOUTS[playerHand.rank] || 0;
                winAmount = pot.play * 2 + pot.blind * (1 + blindPay);
                message = `Dealer doesn't qualify! You win ${formatCrypto(winAmount)} ${currency.toUpperCase()}!`;
            }

            // Credit winnings
            if (winAmount > 0) {
                await window.api('/api/poker/bet', {
                    method: 'POST',
                    body: JSON.stringify({ currency, amount: winAmount, action: 'credit' })
                });
            }
            showPokerToast(message, 'success');
        } else if (winner === 'dealer') {
            message = `Dealer wins with ${dealerHand.name}.`;
            showPokerToast(message, 'info');
        } else {
            // Push - return all bets
            winAmount = pot.ante + pot.play + pot.blind;
            await window.api('/api/poker/bet', {
                method: 'POST',
                body: JSON.stringify({ currency, amount: winAmount, action: 'credit' })
            });
            message = 'Push! Bets returned.';
            showPokerToast(message, 'info');
        }

        if (window.loadBalances) window.loadBalances();
        updateBalanceDisplay();

        // Add to history
        addToHistory({
            result: winner,
            playerHand: playerHand?.name || '',
            dealerHand: dealerHand?.name || '',
            amount: winner === 'player' ? winAmount : (winner === 'push' ? 0 : -(pot.ante + pot.play + pot.blind))
        });

        gameState = 'idle';
        setButtons(['deal', 'clear']);
        setStatus(message);
    }

    function resetTable() {
        gameState = 'idle';
        playerCards = [];
        dealerCards = [];
        community = [];
        pot = { ante: 0, play: 0, blind: 0, trips: 0 };
        $playerCards.innerHTML = '';
        $dealerCards.innerHTML = '';
        $community.innerHTML = '';
        updatePotDisplay();
        setStatus('Place your bet and click Deal');
        setButtons(['deal', 'clear']);
        updateBalanceDisplay();
    }

    // ── UI Helpers ──
    async function dealCard(container, card, owner, index) {
        const el = document.createElement('div');
        const isRed = card.suit === '♥' || card.suit === '♦';
        el.className = `poker-card ${owner} ${isRed ? 'red' : ''}`;
        if (owner === 'dealer' && index === 1 && gameState !== 'showdown' && gameState !== 'idle') {
            // Hole card - face down
            el.classList.add('face-down');
            el.innerHTML = '<div class="card-back"></div>';
        } else {
            el.innerHTML = `<div class="card-rank">${card.rank}</div><div class="card-suit">${card.suit}</div>`;
        }
        container.appendChild(el);

        // Animate
        el.style.opacity = '0';
        el.style.transform = 'translateY(-40px) rotateY(90deg)';
        await delay(50);
        el.style.transition = 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0) rotateY(0)';
        await delay(350);
    }

    function revealDealerCards() {
        const cards = $dealerCards.querySelectorAll('.poker-card.dealer.face-down');
        cards.forEach((el, i) => {
            const card = dealerCards[i];
            const isRed = card.suit === '♥' || card.suit === '♦';
            el.classList.remove('face-down');
            el.classList.toggle('red', isRed);
            el.innerHTML = `<div class="card-rank">${card.rank}</div><div class="card-suit">${card.suit}</div>`;
            el.style.transition = 'transform 0.4s';
            el.style.transform = 'rotateY(180deg)';
            setTimeout(() => { el.style.transform = 'rotateY(0)'; }, 50);
        });
    }

    function setButtons(active) {
        const all = { deal: $btnDeal, check: $btnCheck, bet: $btnBet, fold: $btnFold, clear: $btnClear };
        for (const [name, btn] of Object.entries(all)) {
            if (!btn) continue;
            btn.disabled = !active.includes(name);
            btn.style.opacity = active.includes(name) ? '1' : '0.35';
            btn.style.pointerEvents = active.includes(name) ? 'auto' : 'none';
        }
    }

    function setStatus(msg) {
        if ($statusMsg) $statusMsg.textContent = msg;
    }

    function updatePotDisplay() {
        if ($potDisplay) {
            const total = pot.ante + pot.play + pot.blind + pot.trips;
            $potDisplay.textContent = formatCrypto(total);
        }
    }

    function updateBalanceDisplay() {
        const currency = localStorage.getItem('selectedCurrency') || 'BTC';
        const el = document.getElementById('pokerBalance');
        if (!el || !window.api) return;
        window.api('/api/balance?currency=' + currency)
            .then(r => r.json())
            .then(d => {
                el.textContent = `${formatCrypto(d.amount || 0)} ${currency.toUpperCase()}`;
            })
            .catch(() => { el.textContent = '--'; });
    }

    function formatCrypto(v) {
        if (v >= 1000) return v.toFixed(2);
        if (v >= 1) return v.toFixed(4);
        return v.toFixed(6);
    }

    function delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    function showPokerToast(msg, type) {
        if (window.showToast) window.showToast(msg, type);
    }

    // ── History ──
    function addToHistory(entry) {
        const saved = JSON.parse(localStorage.getItem('pokerHistory') || '[]');
        saved.unshift({ ...entry, time: new Date().toISOString() });
        if (saved.length > 50) saved.pop();
        localStorage.setItem('pokerHistory', JSON.stringify(saved));
        renderHistory();
    }

    function renderHistory() {
        const container = document.getElementById('pokerHistory');
        if (!container) return;
        const saved = JSON.parse(localStorage.getItem('pokerHistory') || '[]');
        container.innerHTML = saved.slice(0, 20).map(h => {
            const isWin = h.result === 'player';
            const isPush = h.result === 'push';
            const cls = isWin ? 'win' : (isPush ? 'push' : 'loss');
            return `<div class="ph-row ${cls}">
                <span>${h.playerHand || ''} vs ${h.dealerHand || ''}</span>
                <span>${isWin ? '+' : (isPush ? '' : '-')}${formatCrypto(Math.abs(h.amount))}</span>
            </div>`;
        }).join('');
    }

    function loadHistory() {
        renderHistory();
    }

    // ── Expose ──
    window.initPoker = initPoker;
    window.updatePokerBalance = updateBalanceDisplay;

    // Auto-init
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            if (m.target.dataset?.view === 'poker' && m.target.classList?.contains('active')) {
                if (!window._pokerInit) { initPoker(); window._pokerInit = true; }
                updateBalanceDisplay();
            }
        });
    });
    document.querySelectorAll('.view[data-view="poker"]').forEach(v => observer.observe(v, { attributes: true, attributeFilter: ['class'] }));

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.querySelector('.view[data-view="poker"].active')) {
                initPoker(); window._pokerInit = true;
            }
        });
    }
})();
