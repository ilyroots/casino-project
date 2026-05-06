/* ═══════════════════════════════════════════════
   EUROPEAN ROULETTE GAME ENGINE
   ═══════════════════════════════════════════════ */

(function() {
    'use strict';

    // ── Wheel Data ──
    const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
    const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
    const BLACK_NUMS = new Set([2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35]);

    function getColor(n) {
        if (n === 0) return 'green';
        return RED_NUMS.has(n) ? 'red' : 'black';
    }

    // ── Payouts ──
    const PAYOUTS = {
        straight: 35,
        split: 17,
        street: 11,
        corner: 8,
        sixline: 5,
        column: 2,
        dozen: 2,
        even: 1
    };

    // ── State ──
    let canvas, ctx;
    let animId = null;
    let isSpinning = false;
    let currentBets = []; // { type, nums, amount, element }
    let selectedChip = 0.50;
    let history = [];
    let wheelAngle = 0;
    let ballAngle = 0;
    let ballRadius = 0;
    let ballSpeed = 0;
    let ballPhase = 'idle'; // idle, spinning, dropping, settled
    let targetNumber = null;
    let winningBetElements = new Set();

    // ── Canvas constants ──
    const SIZE = 420;
    const CENTER = SIZE / 2;
    const WHEEL_R = 190;
    const POCKET_R = 165;
    const BALL_TRACK_R = 155;
    const BALL_R = 6;

    // ── Initialize ──
    function initRoulette() {
        canvas = document.getElementById('rouletteCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        canvas.width = SIZE;
        canvas.height = SIZE;

        initTable();
        initChips();
        initControls();
        drawWheel();
        updateBalanceDisplay();
        loadHistory();
    }

    // ── Wheel Rendering ──
    function drawWheel() {
        ctx.clearRect(0, 0, SIZE, SIZE);

        // Outer ring
        ctx.beginPath();
        ctx.arc(CENTER, CENTER, WHEEL_R, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Center hub
        ctx.beginPath();
        ctx.arc(CENTER, CENTER, 40, 0, Math.PI * 2);
        const hubGrad = ctx.createRadialGradient(CENTER-10, CENTER-10, 0, CENTER, CENTER, 40);
        hubGrad.addColorStop(0, '#3a3a3a');
        hubGrad.addColorStop(1, '#111');
        ctx.fillStyle = hubGrad;
        ctx.fill();
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Hub logo
        ctx.fillStyle = '#39ff14';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('◈', CENTER, CENTER);

        // Pockets
        const pocketCount = WHEEL_ORDER.length;
        const arc = (Math.PI * 2) / pocketCount;

        for (let i = 0; i < pocketCount; i++) {
            const num = WHEEL_ORDER[i];
            const startAngle = wheelAngle + i * arc - arc / 2 - Math.PI / 2;
            const endAngle = wheelAngle + (i + 1) * arc - arc / 2 - Math.PI / 2;

            // Pocket background
            ctx.beginPath();
            ctx.moveTo(CENTER, CENTER);
            ctx.arc(CENTER, CENTER, POCKET_R, startAngle, endAngle);
            ctx.closePath();

            if (num === 0) {
                ctx.fillStyle = '#39ff14';
            } else if (RED_NUMS.has(num)) {
                ctx.fillStyle = '#dc2626';
            } else {
                ctx.fillStyle = '#1f2937';
            }
            ctx.fill();
            ctx.strokeStyle = '#0a0a0a';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Number text
            const midAngle = (startAngle + endAngle) / 2;
            const textR = POCKET_R * 0.78;
            const tx = CENTER + Math.cos(midAngle) * textR;
            const ty = CENTER + Math.sin(midAngle) * textR;

            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(midAngle + Math.PI / 2);
            ctx.fillStyle = num === 0 ? '#000' : '#fff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(num), 0, 0);
            ctx.restore();
        }

        // Turret (center decoration)
        ctx.beginPath();
        ctx.arc(CENTER, CENTER, 45, 0, Math.PI * 2);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Ball
        if (ballPhase !== 'idle') {
            const bx = CENTER + Math.cos(ballAngle) * ballRadius;
            const by = CENTER + Math.sin(ballAngle) * ballRadius;

            ctx.beginPath();
            ctx.arc(bx, by, BALL_R, 0, Math.PI * 2);
            const ballGrad = ctx.createRadialGradient(bx - 2, by - 2, 0, bx, by, BALL_R);
            ballGrad.addColorStop(0, '#fff');
            ballGrad.addColorStop(0.7, '#ccc');
            ballGrad.addColorStop(1, '#666');
            ctx.fillStyle = ballGrad;
            ctx.fill();
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    }

    // ── Animation ──
    let settleCounter = 0;

    function animateSpin() {
        if (ballPhase === 'idle') return;

        if (ballPhase === 'spinning') {
            wheelAngle += 0.025;
            ballAngle += ballSpeed;
            ballSpeed *= 0.9985;

            if (ballSpeed < 0.08) {
                ballPhase = 'dropping';
            }
        } else if (ballPhase === 'dropping') {
            wheelAngle += 0.015;
            ballAngle += ballSpeed;
            ballSpeed *= 0.995;
            ballRadius += (POCKET_R * 0.75 - ballRadius) * 0.03;

            // Find target pocket angle
            const pocketCount = WHEEL_ORDER.length;
            const arc = (Math.PI * 2) / pocketCount;
            const targetIdx = WHEEL_ORDER.indexOf(targetNumber);
            const targetPocketAngle = targetIdx * arc - arc / 2 - Math.PI / 2;

            // Nudge ball toward target
            let diff = targetPocketAngle - ballAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            ballAngle += diff * 0.02;

            if (ballSpeed < 0.015 && Math.abs(ballRadius - POCKET_R * 0.75) < 2) {
                ballPhase = 'settled';
                ballAngle = targetPocketAngle;
                ballRadius = POCKET_R * 0.75;
                settleCounter = 90; // ~1.5s of slow spin after settle
                onSpinComplete();
            }
        } else if (ballPhase === 'settled') {
            wheelAngle += 0.005;
            const pocketCount = WHEEL_ORDER.length;
            const arc = (Math.PI * 2) / pocketCount;
            const targetIdx = WHEEL_ORDER.indexOf(targetNumber);
            const targetPocketAngle = targetIdx * arc - arc / 2 - Math.PI / 2;
            ballAngle = targetPocketAngle;
            settleCounter--;
            if (settleCounter <= 0) {
                animId = null;
                drawWheel();
                return;
            }
        }

        drawWheel();
        animId = requestAnimationFrame(animateSpin);
    }

    // ── Spin ──
    let spinResultData = null;

    function startSpin() {
        if (isSpinning || currentBets.length === 0) return;

        if (!window.api || !window.getToken()) {
            showRouletteToast('Login required to place bets', 'error');
            window.showAuthModal && window.showAuthModal('login');
            return;
        }

        const currency = localStorage.getItem('selectedCurrency') || 'BTC';
        const betPayload = currentBets.map(b => ({
            type: b.type,
            nums: b.nums,
            amount: b.amount
        }));

        // Call server to place bets and get result
        window.api('/api/roulette/spin', {
            method: 'POST',
            body: JSON.stringify({
                currency: currency,
                bets: betPayload
            })
        })
        .then(data => {
            if (data.error) {
                showRouletteToast(data.error, 'error');
                return;
            }

            spinResultData = data;
            targetNumber = data.result;

            // Clear old highlights
            document.querySelectorAll('.rt-cell, .rt-outside, .rt-col-bet').forEach(el => {
                el.style.boxShadow = '';
                el.style.animation = '';
            });
            document.getElementById('wheelResult').innerHTML = '';

            // Start animation
            isSpinning = true;
            ballPhase = 'spinning';
            ballSpeed = 0.4 + Math.random() * 0.15;
            ballRadius = BALL_TRACK_R;
            ballAngle = Math.random() * Math.PI * 2;

            document.getElementById('rtSpin').disabled = true;
            document.getElementById('rtClear').disabled = true;
            document.getElementById('rtDouble').disabled = true;

            // Lock bets
            document.querySelectorAll('.rt-cell, .rt-outside, .rt-col-bet').forEach(el => {
                el.style.pointerEvents = 'none';
            });

            animateSpin();
            updateBalanceDisplay();
        })
        .catch(err => {
            console.error('Spin error:', err);
            showRouletteToast('Network error. Try again.', 'error');
        });
    }

    function onSpinComplete() {
        isSpinning = false;
        const result = targetNumber;
        const color = getColor(result);
        const data = spinResultData || {};
        const totalWin = data.total_win || 0;
        const profit = data.profit || 0;
        const currency = data.currency || 'BTC';

        // Show result
        const resultEl = document.getElementById('wheelResult');
        resultEl.innerHTML = `<div class="res-number ${color}">${result}</div>`;

        // Highlight winning bets
        winningBetElements.clear();
        currentBets.forEach(bet => {
            if (bet.nums.includes(result) && bet.element) {
                winningBetElements.add(bet.element);
            }
        });

        winningBetElements.forEach(el => {
            el.style.boxShadow = 'inset 0 0 0 3px #39ff14';
            el.style.animation = 'pulse 1s ease 3';
        });

        // Toast
        if (profit > 0) {
            showRouletteToast(`Won ${formatCrypto(totalWin)} ${currency.toUpperCase()}!`, 'success');
        } else if (profit === 0 && totalWin > 0) {
            showRouletteToast(`Break even! Returned ${formatCrypto(totalWin)}`, 'info');
        } else {
            showRouletteToast('No win this time. Try again!', 'info');
        }

        // Update balance display with server-confirmed balance
        const display = document.getElementById('rbValue');
        if (display && data.new_balance !== undefined) {
            display.textContent = `${formatCrypto(data.new_balance)} ${currency.toUpperCase()}`;
        }

        // Refresh global balance too
        if (window.loadBalances) window.loadBalances();

        // Add to history
        addToHistory(result, color);

        // Re-enable controls after delay
        setTimeout(() => {
            document.getElementById('rtSpin').disabled = false;
            document.getElementById('rtClear').disabled = false;
            document.getElementById('rtDouble').disabled = false;
            document.querySelectorAll('.rt-cell, .rt-outside, .rt-col-bet').forEach(el => {
                el.style.pointerEvents = '';
            });
        }, 2500);
    }

    // ── Betting Table ──
    function initTable() {
        document.querySelectorAll('.rt-cell, .rt-outside, .rt-col-bet').forEach(cell => {
            cell.addEventListener('click', (e) => {
                if (isSpinning) return;
                placeBet(cell);
            });
        });
    }

    function placeBet(element) {
        const betData = JSON.parse(element.dataset.bet);
        const currency = localStorage.getItem('selectedCurrency') || 'BTC';

        // Check existing bet on this cell
        const existing = currentBets.find(b => b.element === element);
        if (existing) {
            existing.amount += selectedChip;
            updateChipDisplay(element, existing.amount);
        } else {
            const bet = {
                type: betData.type,
                nums: betData.nums,
                amount: selectedChip,
                element: element
            };
            currentBets.push(bet);
            addChipDisplay(element, selectedChip);
        }

        element.classList.add('has-bet');
        updateTotalBetDisplay();
    }

    function addChipDisplay(element, amount) {
        // Remove existing chip display
        const existing = element.querySelector('.rt-chip-placed');
        if (existing) existing.remove();

        const chip = document.createElement('div');
        chip.className = 'rt-chip-placed';
        chip.textContent = formatChipValue(amount);
        element.appendChild(chip);
    }

    function updateChipDisplay(element, amount) {
        const chip = element.querySelector('.rt-chip-placed');
        if (chip) chip.textContent = formatChipValue(amount);
    }

    function formatChipValue(v) {
        if (v >= 1) return v.toFixed(2);
        if (v >= 0.1) return v.toFixed(2);
        return v.toFixed(2);
    }

    // ── Chips ──
    function initChips() {
        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                selectedChip = parseFloat(chip.dataset.val);
            });
        });
    }

    // ── Controls ──
    function initControls() {
        document.getElementById('rtSpin')?.addEventListener('click', startSpin);

        document.getElementById('rtClear')?.addEventListener('click', () => {
            if (isSpinning) return;
            currentBets = [];
            document.querySelectorAll('.rt-chip-placed').forEach(c => c.remove());
            document.querySelectorAll('.has-bet').forEach(el => {
                el.classList.remove('has-bet');
                el.style.boxShadow = '';
                el.style.animation = '';
            });
            winningBetElements.clear();
            setBalanceLabel('Balance');
            updateBalanceDisplay();
        });

        document.getElementById('rtDouble')?.addEventListener('click', () => {
            if (isSpinning || currentBets.length === 0) return;
            currentBets.forEach(bet => {
                bet.amount *= 2;
                updateChipDisplay(bet.element, bet.amount);
            });
            updateTotalBetDisplay();
        });
    }

    function setBalanceLabel(text) {
        const label = document.querySelector('.rb-label');
        if (label) label.textContent = text;
    }

    function updateTotalBetDisplay() {
        const total = currentBets.reduce((s, b) => s + b.amount, 0);
        const display = document.getElementById('rbValue');
        if (display) {
            const currency = localStorage.getItem('selectedCurrency') || 'BTC';
            display.textContent = `${formatCrypto(total)} ${currency.toUpperCase()}`;
            setBalanceLabel(total > 0 ? 'Total Bet' : 'Balance');
        }
    }

    function updateBalanceDisplay() {
        const currency = localStorage.getItem('selectedCurrency') || 'BTC';
        if (window.api) {
            window.api('/api/balance?currency=' + currency)
                .then(data => {
                    const bal = data.amount || 0;
                    const display = document.getElementById('rbValue');
                    if (display && currentBets.length === 0) {
                        display.textContent = `${formatCrypto(bal)} ${currency.toUpperCase()}`;
                        setBalanceLabel('Balance');
                    } else if (display) {
                        const totalBet = currentBets.reduce((s, b) => s + b.amount, 0);
                        display.textContent = `${formatCrypto(totalBet)} ${currency.toUpperCase()}`;
                        setBalanceLabel('Total Bet');
                    }
                })
                .catch(() => {
                    const display = document.getElementById('rbValue');
                    if (display) display.textContent = '--';
                });
        }
    }

    function formatCrypto(val) {
        if (val >= 1000) return val.toFixed(2);
        if (val >= 1) return val.toFixed(4);
        return val.toFixed(6);
    }

    // ── History ──
    function addToHistory(num, color) {
        history.unshift({ num, color });
        if (history.length > 20) history.pop();
        saveHistory();
        renderHistory();
    }

    function renderHistory() {
        const container = document.getElementById('rhNumbers');
        if (!container) return;
        container.innerHTML = history.map(h =>
            `<div class="rh-num ${h.color}">${h.num}</div>`
        ).join('');
    }

    function loadHistory() {
        const saved = localStorage.getItem('rouletteHistory');
        if (saved) {
            history = JSON.parse(saved);
            renderHistory();
        }
    }

    function saveHistory() {
        localStorage.setItem('rouletteHistory', JSON.stringify(history));
    }

    // ── Toast ──
    function showRouletteToast(msg, type) {
        if (window.showToast) {
            window.showToast(msg, type);
        } else {
            // Fallback
            const t = document.createElement('div');
            t.className = `toast ${type}`;
            t.textContent = msg;
            document.body.appendChild(t);
            requestAnimationFrame(() => t.classList.add('show'));
            setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
        }
    }

    // ── Expose ──
    window.initRoulette = initRoulette;
    window.updateRouletteBalance = updateBalanceDisplay;

    // Auto-init when roulette view becomes active, clear bets when inactive
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            if (m.target.dataset.view !== 'roulette') return;
            const isActive = m.target.classList && m.target.classList.contains('active');
            if (isActive) {
                if (!window._rouletteInit) {
                    initRoulette();
                    window._rouletteInit = true;
                }
                updateBalanceDisplay();
            } else {
                // View became inactive — clear bets
                if (!isSpinning) {
                    currentBets = [];
                    document.querySelectorAll('.rt-chip-placed').forEach(c => c.remove());
                    document.querySelectorAll('.has-bet').forEach(el => {
                        el.classList.remove('has-bet');
                        el.style.boxShadow = '';
                        el.style.animation = '';
                    });
                    winningBetElements.clear();
                    setBalanceLabel('Balance');
                    document.getElementById('wheelResult').innerHTML = '';
                }
            }
        });
    });

    document.querySelectorAll('.view[data-view="roulette"]').forEach(view => {
        observer.observe(view, { attributes: true, attributeFilter: ['class'] });
    });

    // Also try init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.querySelector('.view[data-view="roulette"].active')) {
                initRoulette();
                window._rouletteInit = true;
            }
        });
    }
})();
