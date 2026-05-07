/* ═══════════════════════════════════════════════
   POKER HUB + MULTI-GAME ENGINE
   Video Poker | Three Card | Ultimate Hold'em | Casino Hold'em
   ═══════════════════════════════════════════════ */

(function() {
    'use strict';
    console.log('[POKER] poker.js loaded v2');
    if (!window.api) console.error('[POKER] window.api is MISSING');
    if (!window.getToken) console.error('[POKER] window.getToken is MISSING');
    if (!window.showToast) console.error('[POKER] window.showToast is MISSING');

    // ═══════════════════════════════════════════════
    // SHARED CARD UTILITIES
    // ═══════════════════════════════════════════════
    const SUITS = ['♠','♥','♦','♣'];
    const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    const RANK_VAL = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };

    function createDeck() {
        const d = [];
        for (const s of SUITS) for (const r of RANKS) d.push({ rank:r, suit:s, value:RANK_VAL[r] });
        return d;
    }
    function shuffle(d) {
        for (let i = d.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [d[i],d[j]] = [d[j],d[i]]; }
        return d;
    }
    function formatCrypto(v) {
        if (v >= 1000) return v.toFixed(2);
        if (v >= 1) return v.toFixed(4);
        return v.toFixed(6);
    }
    function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
    function showToast(msg, type) { if (window.showToast) window.showToast(msg, type); }
    async function apiDeduce(amt) {
        const curr = localStorage.getItem('selectedCurrency') || 'BTC';
        const d = await window.api('/api/poker/bet', { method:'POST', body:JSON.stringify({currency:curr, amount:amt, action:'deduct'}) });
        if (d.error) throw new Error(d.error); return d;
    }
    async function apiCredit(amt) {
        const curr = localStorage.getItem('selectedCurrency') || 'BTC';
        const d = await window.api('/api/poker/bet', { method:'POST', body:JSON.stringify({currency:curr, amount:amt, action:'credit'}) });
        if (d.error) throw new Error(d.error); return d;
    }
    async function getBal() {
        const curr = localStorage.getItem('selectedCurrency') || 'BTC';
        const d = await window.api('/api/balance?currency='+curr); return d.amount||0;
    }
    function updateBalEl(id) {
        getBal().then(b => { const el = document.getElementById(id); if (el) el.textContent = formatCrypto(b)+' '+(localStorage.getItem('selectedCurrency')||'BTC').toUpperCase(); }).catch(()=>{});
    }

    // Hand evaluation (shared)
    function evaluate(cards) {
        const sorted = [...cards].sort((a,b)=>b.value-a.value);
        const suitCounts = {};
        for (const c of sorted) suitCounts[c.suit] = (suitCounts[c.suit]||0)+1;
        const flushSuit = Object.entries(suitCounts).find(([s,n])=>n>=3)?.[0] || null; // 3+ for 3-card
        const uniqVals = [...new Set(sorted.map(c=>c.value))].sort((a,b)=>b-a);
        let straightHigh = null;
        if (uniqVals.length >= 3) {
            for (let i=0; i<=uniqVals.length-3; i++) { if (uniqVals[i]-uniqVals[i+2]===2) { straightHigh = uniqVals[i]; break; } }
            if (!straightHigh && uniqVals.includes(14) && uniqVals.includes(3) && uniqVals.includes(2)) straightHigh = 3; // A-2-3
        }
        const counts = {};
        for (const c of sorted) counts[c.value] = (counts[c.value]||0)+1;
        const groups = Object.entries(counts).map(([v,c])=>({value:+v,count:c})).sort((a,b)=>b.count-a.count||b.value-a.value);

        if (flushSuit && straightHigh) return {rank:10,name:'Straight Flush',tb:[straightHigh]};
        if (groups[0].count===3) return {rank:9,name:'Three of a Kind',tb:[groups[0].value]};
        if (flushSuit) return {rank:8,name:'Flush',tb:sorted.filter(c=>c.suit===flushSuit).slice(0,3).map(c=>c.value)};
        if (straightHigh) return {rank:7,name:'Straight',tb:[straightHigh]};
        if (groups[0].count===2) return {rank:6,name:'Pair',tb:[groups[0].value]};
        return {rank:1,name:'High Card',tb:sorted.slice(0,3).map(c=>c.value)};
    }
    function evaluate5(cards) {
        // Full 5-7 card evaluation for Hold'em
        const sorted = [...cards].sort((a,b)=>b.value-a.value);
        const suitCounts = {}; for (const c of sorted) suitCounts[c.suit]=(suitCounts[c.suit]||0)+1;
        const flushSuit = Object.entries(suitCounts).find(([s,n])=>n>=5)?.[0]||null;
        const uniqVals = [...new Set(sorted.map(c=>c.value))].sort((a,b)=>b-a);
        let straightHigh = null;
        if (uniqVals.length>=5) {
            for (let i=0;i<=uniqVals.length-5;i++){ if (uniqVals[i]-uniqVals[i+4]===4){ straightHigh=uniqVals[i]; break; } }
            if (!straightHigh && uniqVals.includes(14)&&uniqVals.includes(5)&&uniqVals.includes(4)&&uniqVals.includes(3)&&uniqVals.includes(2)) straightHigh=5;
        }
        const counts = {}; for (const c of sorted) counts[c.value]=(counts[c.value]||0)+1;
        const groups = Object.entries(counts).map(([v,c])=>({value:+v,count:c})).sort((a,b)=>b.count-a.count||b.value-a.value);

        if (flushSuit && straightHigh && straightHigh===14) return {rank:10,name:'Royal Flush',tb:[14]};
        if (flushSuit && straightHigh) return {rank:9,name:'Straight Flush',tb:[straightHigh]};
        if (groups[0].count===4) return {rank:8,name:'Four of a Kind',tb:[groups[0].value,groups[1]?.value||0]};
        if (groups[0].count===3 && groups[1].count>=2) return {rank:7,name:'Full House',tb:[groups[0].value,groups[1].value]};
        if (flushSuit) return {rank:6,name:'Flush',tb:sorted.filter(c=>c.suit===flushSuit).slice(0,5).map(c=>c.value)};
        if (straightHigh) return {rank:5,name:'Straight',tb:[straightHigh]};
        if (groups[0].count===3) return {rank:4,name:'Three of a Kind',tb:[groups[0].value,...groups.slice(1).map(g=>g.value)]};
        if (groups[0].count===2 && groups[1].count===2) return {rank:3,name:'Two Pair',tb:[groups[0].value,groups[1].value,groups[2]?.value||0]};
        if (groups[0].count===2) return {rank:2,name:'One Pair',tb:[groups[0].value,...groups.slice(1).map(g=>g.value)]};
        return {rank:1,name:'High Card',tb:sorted.slice(0,5).map(c=>c.value)};
    }
    function best5From7(cards) {
        let best = null;
        for (let a=0;a<3;a++)for(let b=a+1;b<4;b++)for(let c=b+1;c<5;c++)for(let d=c+1;d<6;d++)for(let e=d+1;e<7;e++){
            const h = evaluate5([cards[a],cards[b],cards[c],cards[d],cards[e]]);
            if (!best || cmpHand(h,best)>0) best=h;
        }
        return best;
    }
    function cmpHand(h1,h2) {
        if (h1.rank!==h2.rank) return h1.rank-h2.rank;
        for (let i=0;i<h1.tb.length;i++) if (h1.tb[i]!==h2.tb[i]) return h1.tb[i]-h2.tb[i];
        return 0;
    }

    // ═══════════════════════════════════════════════
    // HUB NAVIGATION
    // ═══════════════════════════════════════════════
    function showScreen(name) {
        console.log('[POKER] showScreen:', name);
        const hub = document.getElementById('pokerHub');
        if (hub) hub.style.display = name==='hub'?'block':'none';
        ['videopoker','threecard','ultimate','casino'].forEach(s=>{
            const el = document.getElementById('pokerScreen-'+s);
            if (el) el.style.display = s===name?'block':'none';
        });
        if (name!=='hub') {
            try {
                if (name==='videopoker') initVideoPoker();
                if (name==='threecard') initThreeCard();
                if (name==='ultimate') initUltimate();
                if (name==='casino') initCasinoHoldem();
            } catch (e) {
                console.error('[POKER] init error:', e);
            }
        }
    }
    document.querySelectorAll('.poker-hub-card[data-poker]').forEach(card=>{
        card.addEventListener('click',()=>{
            try {
                const game = card.dataset.poker;
                console.log('[POKER] clicked:', game);
                if (['videopoker','threecard','ultimate','casino'].includes(game)) showScreen(game);
                else showToast('Coming soon!','info');
            } catch (e) { console.error('[POKER] click error:', e); }
        });
    });
    document.getElementById('vpBack')?.addEventListener('click',()=>showScreen('hub'));
    document.getElementById('tcpBack')?.addEventListener('click',()=>showScreen('hub'));
    document.getElementById('uthBack')?.addEventListener('click',()=>showScreen('hub'));
    document.getElementById('chBack')?.addEventListener('click',()=>showScreen('hub'));

    // ═══════════════════════════════════════════════
    // VIDEO POKER — Jacks or Better
    // ═══════════════════════════════════════════════
    const VP_PAYOUTS = {
        10: [250,500,750,1000,4000], // Royal Flush (800x with max coins = 4000)
        9:  [50,100,150,200,250],
        8:  [25,50,75,100,125],
        7:  [9,18,27,36,45],
        6:  [6,12,18,24,30],
        5:  [4,8,12,16,20],
        4:  [3,6,9,12,15],
        3:  [2,4,6,8,10],
        2:  [1,2,3,4,5],
    };
    const VP_HAND_NAMES = {
        10:'Royal Flush',9:'Straight Flush',8:'Four of a Kind',7:'Full House',
        6:'Flush',5:'Straight',4:'Three of a Kind',3:'Two Pair',2:'Jacks or Better'
    };
    let vpDeck=[], vpHand=[], vpHeld=[], vpCoins=2, vpState='idle';

    function initVideoPoker() {
        renderVPPaytable();
        updateBalEl('vpBalance');
        document.getElementById('vpDeal').onclick = vpDeal;
        document.getElementById('vpDraw').onclick = vpDraw;
        document.querySelectorAll('.vp-coin').forEach(btn=>{
            btn.onclick = () => { document.querySelectorAll('.vp-coin').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); vpCoins = +btn.dataset.coins; renderVPPaytable(); };
        });
    }
    function renderVPPaytable() {
        const el = document.getElementById('vpPaytable');
        el.innerHTML = Object.entries(VP_HAND_NAMES).map(([rank,name])=>{
            const pay = VP_PAYOUTS[rank][vpCoins-1];
            return `<div class="vp-pt-row ${vpCoins>0?'':'}"><span>${name}</span><span>${pay}</span></div>`;
        }).reverse().join('');
    }
    async function vpDeal() {
        if (vpState!=='idle') return;
        if (!window.getToken||!window.getToken()){ showToast('Login required','error'); window.showAuthModal?.('login'); return; }
        const bet = vpCoins * 0.1; // 0.1 per coin
        try { await apiDeduce(bet); } catch(e){ showToast(e.message,'error'); return; }
        if (window.loadBalances) window.loadBalances();
        updateBalEl('vpBalance');
        vpState='dealt'; vpDeck=shuffle(createDeck()); vpHand=[vpDeck.pop(),vpDeck.pop(),vpDeck.pop(),vpDeck.pop(),vpDeck.pop()]; vpHeld=[false,false,false,false,false];
        document.getElementById('vpResult').textContent=''; document.getElementById('vpDraw').style.display='inline-block'; document.getElementById('vpDeal').style.display='none';
        renderVPCards();
    }
    function renderVPCards() {
        const container = document.getElementById('vpCards'); container.innerHTML='';
        vpHand.forEach((card,i)=>{
            const isRed = card.suit==='♥'||card.suit==='♦';
            const held = vpHeld[i];
            const el = document.createElement('div');
            el.className = `vp-card ${isRed?'red':''} ${held?'held':''}`;
            el.innerHTML = `<div class="vp-card-inner"><div class="card-rank">${card.rank}</div><div class="card-suit">${card.suit}</div></div><div class="vp-hold-label">HELD</div>`;
            if (vpState==='dealt') el.onclick = () => { vpHeld[i]=!vpHeld[i]; renderVPCards(); };
            container.appendChild(el);
        });
    }
    async function vpDraw() {
        if (vpState!=='dealt') return;
        vpState='done';
        for (let i=0;i<5;i++) if (!vpHeld[i]) vpHand[i]=vpDeck.pop();
        renderVPCards();
        // Evaluate
        const hand = evaluate5(vpHand);
        let win = 0, msg = hand.name;
        if (hand.rank>=2) {
            win = (VP_PAYOUTS[hand.rank]||[0,0,0,0,0])[vpCoins-1] * 0.1;
            msg += ` — Win ${formatCrypto(win)}!`;
            await apiCredit(win);
            if (window.loadBalances) window.loadBalances();
            showToast('Video Poker: '+msg,'success');
        } else {
            msg += ' — No win';
            showToast('Video Poker: '+msg,'info');
        }
        document.getElementById('vpResult').textContent = msg;
        document.getElementById('vpDraw').style.display='none'; document.getElementById('vpDeal').style.display='inline-block';
        updateBalEl('vpBalance');
        vpState='idle';
    }


    // ═══════════════════════════════════════════════
    // THREE CARD POKER
    // ═══════════════════════════════════════════════
    const TCP_PAIRPLUS = { 10:40, 9:30, 8:6, 7:3, 6:1 };
    let tcpDeck=[], tcpPlayer=[], tcpDealer=[], tcpAnte=0, tcpPair=0, tcpState='idle';

    function initThreeCard() {
        updateBalEl('tcpBalance');
        document.getElementById('tcpDeal').onclick = tcpDeal;
        document.getElementById('tcpPlay').onclick = ()=>tcpAction('play');
        document.getElementById('tcpFold').onclick = ()=>tcpAction('fold');
        document.getElementById('tcpClear').onclick = tcpReset;
        document.querySelectorAll('.tcp-chip').forEach(c=>{
            c.onclick = () => { document.querySelectorAll('.tcp-chip').forEach(x=>x.classList.remove('active')); c.classList.add('active'); };
        });
        tcpReset();
    }
    function tcpReset() {
        tcpState='idle'; tcpAnte=0; tcpPair=0;
        document.getElementById('tcpAnteVal').textContent='0.00';
        document.getElementById('tcpPairVal').textContent='0.00';
        document.getElementById('tcpPlayerCards').innerHTML='';
        document.getElementById('tcpDealerCards').innerHTML='';
        document.getElementById('tcpStatus').textContent='Place Ante bet and click Deal';
        setTCPButtons(['deal']);
    }
    async function tcpDeal() {
        if (tcpState!=='idle') return;
        if (!window.getToken||!window.getToken()){ showToast('Login required','error'); return; }
        const chipVal = parseFloat(document.querySelector('.tcp-chip.active')?.dataset.val||0.5);
        tcpAnte = chipVal;
        const total = tcpAnte + tcpPair;
        try { await apiDeduce(total); } catch(e){ showToast(e.message,'error'); return; }
        if (window.loadBalances) window.loadBalances();
        updateBalEl('tcpBalance');
        tcpState='dealt'; tcpDeck=shuffle(createDeck());
        tcpPlayer=[tcpDeck.pop(),tcpDeck.pop(),tcpDeck.pop()];
        tcpDealer=[tcpDeck.pop(),tcpDeck.pop(),tcpDeck.pop()];
        document.getElementById('tcpAnteVal').textContent=formatCrypto(tcpAnte);
        document.getElementById('tcpPlayerCards').innerHTML='';
        document.getElementById('tcpDealerCards').innerHTML='';
        for (let i=0;i<3;i++) { await delay(200); await tcpAnimCard(document.getElementById('tcpPlayerCards'),tcpPlayer[i]); }
        for (let i=0;i<3;i++) { await delay(200); await tcpAnimCard(document.getElementById('tcpDealerCards'),tcpDealer[i],true); }
        const ph = evaluate(tcpPlayer);
        document.getElementById('tcpStatus').textContent = `Your hand: ${ph.name}. Play or Fold?`;
        setTCPButtons(['play','fold']);
    }
    async function tcpAnimCard(container,card,faceDown=false) {
        const el=document.createElement('div');
        el.className='tcp-card'+(faceDown?' face-down':'');
        if (!faceDown) { const isRed=card.suit==='♥'||card.suit==='♦'; el.classList.add(isRed?'red':'black'); el.innerHTML=`<div class="tcp-rank">${card.rank}</div><div class="tcp-suit">${card.suit}</div>`; }
        else el.innerHTML='<div class="tcp-back"></div>';
        el.style.opacity='0'; el.style.transform='translateY(-30px)';
        container.appendChild(el);
        await delay(30);
        el.style.transition='all 0.35s cubic-bezier(0.34,1.56,0.64,1)';
        el.style.opacity='1'; el.style.transform='translateY(0)';
        await delay(350);
    }
    async function tcpAction(action) {
        if (tcpState!=='dealt') return;
        tcpState='done';
        // Reveal dealer
        const dCards = document.getElementById('tcpDealerCards').querySelectorAll('.tcp-card.face-down');
        dCards.forEach((el,i)=>{
            const c=tcpDealer[i]; const isRed=c.suit==='♥'||c.suit==='♦';
            el.classList.remove('face-down'); el.classList.add(isRed?'red':'black');
            el.innerHTML=`<div class="tcp-rank">${c.rank}</div><div class="tcp-suit">${c.suit}</div>`;
        });
        await delay(500);
        const pHand = evaluate(tcpPlayer); const dHand = evaluate(tcpDealer);
        let win=0, msg='';
        if (action==='fold') {
            msg = `Folded. Lost ${formatCrypto(tcpAnte)}.`;
            showToast('Three Card: '+msg,'info');
        } else {
            // Dealer needs Queen high or better to qualify
            const dealerQualifies = dHand.rank>=6 || (dHand.rank===1 && dHand.tb[0]>=12);
            const cmp = cmpHand(pHand,dHand);
            if (!dealerQualifies) {
                win = tcpAnte * 2; // Ante wins even money, play pushes
                msg = `Dealer doesn't qualify! Won ${formatCrypto(tcpAnte)}.`;
            } else if (cmp>0) {
                win = tcpAnte * 4; // Ante + Play both win even money
                msg = `You win! ${pHand.name} beats ${dHand.name}. Won ${formatCrypto(tcpAnte*2)}.`;
            } else if (cmp<0) {
                msg = `Dealer wins with ${dHand.name}.`;
            } else {
                win = tcpAnte * 2; // Push
                msg = 'Push! Bets returned.';
            }
            if (win>0) { await apiCredit(win); if(window.loadBalances)window.loadBalances(); showToast('Three Card: '+msg,'success'); }
            else showToast('Three Card: '+msg,'info');
        }
        document.getElementById('tcpStatus').textContent = msg;
        updateBalEl('tcpBalance');
        setTCPButtons(['deal','clear']);
    }
    function setTCPButtons(active) {
        const map={deal:document.getElementById('tcpDeal'),play:document.getElementById('tcpPlay'),fold:document.getElementById('tcpFold'),clear:document.getElementById('tcpClear')};
        for (const [k,btn] of Object.entries(map)) { if(!btn)continue; btn.disabled=!active.includes(k); btn.style.opacity=active.includes(k)?'1':'0.35'; btn.style.pointerEvents=active.includes(k)?'auto':'none'; }
    }

    // ═══════════════════════════════════════════════
    // ULTIMATE TEXAS HOLD'EM
    // ═══════════════════════════════════════════════
    const UTH_BLIND = { 10:500, 9:50, 8:10, 7:3, 6:1.5, 5:1 };
    let uthDeck=[], uthPlayer=[], uthDealer=[], uthCommunity=[], uthPot={ante:0,play:0,blind:0}, uthChip=0.5, uthState='idle';

    function initUltimate() {
        updateBalEl('uthBalance'); uthReset();
        document.getElementById('uthDeal').onclick = uthDeal;
        document.getElementById('uthCheck').onclick = ()=>uthAction('check');
        document.getElementById('uthBet').onclick = ()=>uthAction('bet');
        document.getElementById('uthFold').onclick = ()=>uthAction('fold');
        document.getElementById('uthClear').onclick = uthReset;
        document.querySelectorAll('.uth-chip').forEach(c=>{
            c.onclick = () => { document.querySelectorAll('.uth-chip').forEach(x=>x.classList.remove('active')); c.classList.add('active'); uthChip=parseFloat(c.dataset.val); };
        });
    }
    function uthReset() {
        uthState='idle'; uthPot={ante:0,play:0,blind:0};
        document.getElementById('uthPlayerCards').innerHTML='';
        document.getElementById('uthDealerCards').innerHTML='';
        document.getElementById('uthCommunity').innerHTML='';
        document.getElementById('uthPot').textContent='0.00';
        document.getElementById('uthStatus').textContent='Place your bet and click Deal';
        setUTHButtons(['deal','clear']);
    }
    async function uthDeal() {
        if (uthState!=='idle') return;
        if (!window.getToken||!window.getToken()){ showToast('Login required','error'); return; }
        uthChip = parseFloat(document.querySelector('.uth-chip.active')?.dataset.val||0.5);
        const total = uthChip + uthChip*0.5; // ante + blind
        try { await apiDeduce(total); } catch(e){ showToast(e.message,'error'); return; }
        if (window.loadBalances) window.loadBalances();
        updateBalEl('uthBalance');
        uthState='dealing'; uthPot={ante:uthChip,play:0,blind:uthChip*0.5};
        document.getElementById('uthPot').textContent = formatCrypto(uthPot.ante+uthPot.play+uthPot.blind);
        setUTHButtons(['none']); document.getElementById('uthStatus').textContent='Dealing...';
        uthDeck=shuffle(createDeck()); uthPlayer=[uthDeck.pop(),uthDeck.pop()]; uthDealer=[uthDeck.pop(),uthDeck.pop()]; uthCommunity=[];
        document.getElementById('uthPlayerCards').innerHTML=''; document.getElementById('uthDealerCards').innerHTML=''; document.getElementById('uthCommunity').innerHTML='';
        await uthAnimCard(document.getElementById('uthPlayerCards'),uthPlayer[0]); await delay(100);
        await uthAnimCard(document.getElementById('uthDealerCards'),uthDealer[0],true); await delay(100);
        await uthAnimCard(document.getElementById('uthPlayerCards'),uthPlayer[1]); await delay(100);
        await uthAnimCard(document.getElementById('uthDealerCards'),uthDealer[1],true);
        uthState='preflop';
        document.getElementById('uthStatus').textContent = `Pre-Flop: Check or Bet ${formatCrypto(uthChip*2)}`;
        setUTHButtons(['check','bet','fold']);
    }
    async function uthAnimCard(container,card,faceDown=false) {
        const el=document.createElement('div');
        el.className='poker-card'+(faceDown?' face-down':'');
        if (!faceDown) { const isRed=card.suit==='♥'||card.suit==='♦'; el.classList.add(isRed?'red':'black'); el.innerHTML=`<div class="card-rank">${card.rank}</div><div class="card-suit">${card.suit}</div>`; }
        else el.innerHTML='<div class="card-back"></div>';
        el.style.opacity='0'; el.style.transform='translateY(-40px) rotateY(90deg)';
        container.appendChild(el); await delay(50);
        el.style.transition='all 0.35s cubic-bezier(0.34,1.56,0.64,1)';
        el.style.opacity='1'; el.style.transform='translateY(0) rotateY(0)';
        await delay(350);
    }
    async function uthAction(action) {
        if (action==='check' && uthState==='preflop') {
            setUTHButtons(['none']); document.getElementById('uthStatus').textContent='You checked. Dealing flop...';
            await delay(600); await uthDealFlop();
            uthState='flop'; document.getElementById('uthStatus').textContent=`Flop: Check or Bet ${formatCrypto(uthChip)}`; setUTHButtons(['check','bet','fold']);
        } else if (action==='bet' && uthState==='preflop') {
            const bet=uthChip*2; uthPot.play+=bet;
            document.getElementById('uthPot').textContent=formatCrypto(uthPot.ante+uthPot.play+uthPot.blind);
            setUTHButtons(['none']); document.getElementById('uthStatus').textContent=`Bet ${formatCrypto(bet)}. Dealing...`;
            await delay(600); await uthDealFlop(); await delay(300); await uthDealTurnRiver(); await uthShowdown();
        } else if (action==='check' && uthState==='flop') {
            setUTHButtons(['none']); document.getElementById('uthStatus').textContent='Checking... Dealing turn & river';
            await delay(600); await uthDealTurnRiver(); await uthShowdown();
        } else if (action==='bet' && uthState==='flop') {
            const bet=uthChip; uthPot.play+=bet;
            document.getElementById('uthPot').textContent=formatCrypto(uthPot.ante+uthPot.play+uthPot.blind);
            setUTHButtons(['none']); document.getElementById('uthStatus').textContent=`Bet ${formatCrypto(bet)}. Dealing...`;
            await delay(600); await uthDealTurnRiver(); await uthShowdown();
        } else if (action==='fold') {
            setUTHButtons(['none']); document.getElementById('uthStatus').textContent='Folded. Dealer wins.';
            await delay(800); await uthRevealDealer(); await uthEnd('dealer');
        }
    }
    async function uthDealFlop() { uthCommunity.push(uthDeck.pop(),uthDeck.pop(),uthDeck.pop()); for(const c of uthCommunity.slice(0,3)) await uthAnimCard(document.getElementById('uthCommunity'),c); }
    async function uthDealTurnRiver() { uthCommunity.push(uthDeck.pop()); await uthAnimCard(document.getElementById('uthCommunity'),uthCommunity[3]); await delay(200); uthCommunity.push(uthDeck.pop()); await uthAnimCard(document.getElementById('uthCommunity'),uthCommunity[4]); }
    async function uthShowdown() {
        uthState='showdown'; document.getElementById('uthStatus').textContent='Showdown!';
        await uthRevealDealer(); await delay(800);
        const pb = best5From7([...uthPlayer,...uthCommunity]);
        const db = best5From7([...uthDealer,...uthCommunity]);
        const cmp = cmpHand(pb,db);
        document.getElementById('uthStatus').textContent=`You: ${pb.name} vs Dealer: ${db.name}`; await delay(1200);
        if (cmp>0) await uthEnd('player',pb,db); else if (cmp<0) await uthEnd('dealer',pb,db); else await uthEnd('push',pb,db);
    }
    async function uthRevealDealer() {
        document.getElementById('uthDealerCards').querySelectorAll('.poker-card.face-down').forEach((el,i)=>{
            const c=uthDealer[i]; const isRed=c.suit==='♥'||c.suit==='♦';
            el.classList.remove('face-down'); el.classList.toggle('red',isRed);
            el.innerHTML=`<div class="card-rank">${c.rank}</div><div class="card-suit">${c.suit}</div>`;
        });
    }
    async function uthEnd(winner,ph,dh) {
        const curr = localStorage.getItem('selectedCurrency')||'BTC'; let win=0, msg='';
        if (winner==='player') {
            const dq = dh.rank>=2 && dh.tb[0]>=4;
            if (dq) { win = uthPot.ante*2 + uthPot.play*2 + uthPot.blind*2; msg=`Win! ${ph.name} beats ${dh.name}. Won ${formatCrypto(win)}!`; }
            else { const bp = UTH_BLIND[ph.rank]||0; win = uthPot.play*2 + uthPot.blind*(1+bp); msg=`Dealer doesn't qualify! Won ${formatCrypto(win)}!`; }
            if (win>0) { await apiCredit(win); if(window.loadBalances)window.loadBalances(); showToast(msg,'success'); }
        } else if (winner==='push') {
            win = uthPot.ante+uthPot.play+uthPot.blind; await apiCredit(win); if(window.loadBalances)window.loadBalances();
            msg='Push! Bets returned.'; showToast(msg,'info');
        } else { msg=`Dealer wins with ${dh.name}.`; showToast(msg,'info'); }
        document.getElementById('uthStatus').textContent=msg; updateBalEl('uthBalance');
        setUTHButtons(['deal','clear']); uthState='idle';
    }
    function setUTHButtons(active) {
        const map={deal:document.getElementById('uthDeal'),check:document.getElementById('uthCheck'),bet:document.getElementById('uthBet'),fold:document.getElementById('uthFold'),clear:document.getElementById('uthClear')};
        for (const [k,btn] of Object.entries(map)) { if(!btn)continue; btn.disabled=!active.includes(k); btn.style.opacity=active.includes(k)?'1':'0.35'; btn.style.pointerEvents=active.includes(k)?'auto':'none'; }
    }

    // ═══════════════════════════════════════════════
    // CASINO HOLD'EM (Simplified)
    // ═══════════════════════════════════════════════
    let chDeck=[], chPlayer=[], chDealer=[], chCommunity=[], chPot={ante:0,call:0}, chChip=0.5, chState='idle';

    function initCasinoHoldem() {
        updateBalEl('chBalance'); chReset();
        document.getElementById('chDeal').onclick = chDeal;
        document.getElementById('chCall').onclick = ()=>chAction('call');
        document.getElementById('chFold').onclick = ()=>chAction('fold');
        document.getElementById('chClear').onclick = chReset;
        document.querySelectorAll('.ch-chip').forEach(c=>{
            c.onclick = () => { document.querySelectorAll('.ch-chip').forEach(x=>x.classList.remove('active')); c.classList.add('active'); chChip=parseFloat(c.dataset.val); };
        });
    }
    function chReset() {
        chState='idle'; chPot={ante:0,call:0};
        document.getElementById('chPlayerCards').innerHTML='';
        document.getElementById('chDealerCards').innerHTML='';
        document.getElementById('chCommunity').innerHTML='';
        document.getElementById('chPot').textContent='0.00';
        document.getElementById('chStatus').textContent='Place Ante + Call bets, then click Deal';
        setCHButtons(['deal','clear']);
    }
    async function chDeal() {
        if (chState!=='idle') return;
        if (!window.getToken||!window.getToken()){ showToast('Login required','error'); return; }
        chChip = parseFloat(document.querySelector('.ch-chip.active')?.dataset.val||0.5);
        const total = chChip + chChip; // ante + call
        try { await apiDeduce(total); } catch(e){ showToast(e.message,'error'); return; }
        if (window.loadBalances) window.loadBalances();
        updateBalEl('chBalance');
        chState='dealt'; chPot={ante:chChip,call:chChip};
        document.getElementById('chPot').textContent = formatCrypto(chPot.ante+chPot.call);
        setCHButtons(['none']); document.getElementById('chStatus').textContent='Dealing...';
        chDeck=shuffle(createDeck()); chPlayer=[chDeck.pop(),chDeck.pop()]; chDealer=[chDeck.pop(),chDeck.pop()]; chCommunity=[];
        document.getElementById('chPlayerCards').innerHTML=''; document.getElementById('chDealerCards').innerHTML=''; document.getElementById('chCommunity').innerHTML='';
        await chAnimCard(document.getElementById('chPlayerCards'),chPlayer[0]); await delay(100);
        await chAnimCard(document.getElementById('chDealerCards'),chDealer[0],true); await delay(100);
        await chAnimCard(document.getElementById('chPlayerCards'),chPlayer[1]); await delay(100);
        await chAnimCard(document.getElementById('chDealerCards'),chDealer[1],true); await delay(200);
        // Deal flop
        chCommunity.push(chDeck.pop(),chDeck.pop(),chDeck.pop());
        for (const c of chCommunity) await chAnimCard(document.getElementById('chCommunity'),c); await delay(200);
        // Deal turn & river
        chCommunity.push(chDeck.pop()); await chAnimCard(document.getElementById('chCommunity'),chCommunity[3]); await delay(200);
        chCommunity.push(chDeck.pop()); await chAnimCard(document.getElementById('chCommunity'),chCommunity[4]);
        chState='decision';
        document.getElementById('chStatus').textContent = 'Call 1x or Fold?';
        setCHButtons(['call','fold']);
    }
    async function chAnimCard(container,card,faceDown=false) {
        const el=document.createElement('div');
        el.className='poker-card'+(faceDown?' face-down':'');
        if (!faceDown) { const isRed=card.suit==='♥'||card.suit==='♦'; el.classList.add(isRed?'red':'black'); el.innerHTML=`<div class="card-rank">${card.rank}</div><div class="card-suit">${card.suit}</div>`; }
        else el.innerHTML='<div class="card-back"></div>';
        el.style.opacity='0'; el.style.transform='translateY(-40px) rotateY(90deg)';
        container.appendChild(el); await delay(50);
        el.style.transition='all 0.35s cubic-bezier(0.34,1.56,0.64,1)';
        el.style.opacity='1'; el.style.transform='translateY(0) rotateY(0)';
        await delay(350);
    }
    async function chAction(action) {
        if (action==='fold') {
            setCHButtons(['none']); document.getElementById('chStatus').textContent='Folded. Lost ante.';
            await delay(800); await chRevealDealer(); chEnd('dealer');
        } else if (action==='call') {
            setCHButtons(['none']); document.getElementById('chStatus').textContent='Calling...';
            await delay(600); await chRevealDealer(); await delay(400);
            const pb = best5From7([...chPlayer,...chCommunity]);
            const db = best5From7([...chDealer,...chCommunity]);
            const cmp = cmpHand(pb,db);
            document.getElementById('chStatus').textContent=`You: ${pb.name} vs Dealer: ${db.name}`; await delay(1000);
            if (cmp>0) chEnd('player',pb,db); else if (cmp<0) chEnd('dealer',pb,db); else chEnd('push',pb,db);
        }
    }
    async function chRevealDealer() {
        document.getElementById('chDealerCards').querySelectorAll('.poker-card.face-down').forEach((el,i)=>{
            const c=chDealer[i]; const isRed=c.suit==='♥'||c.suit==='♦';
            el.classList.remove('face-down'); el.classList.toggle('red',isRed);
            el.innerHTML=`<div class="card-rank">${c.rank}</div><div class="card-suit">${c.suit}</div>`;
        });
    }
    async function chEnd(winner,ph,dh) {
        const curr = localStorage.getItem('selectedCurrency')||'BTC'; let win=0, msg='';
        if (winner==='player') {
            const dq = dh.rank>=2 && dh.tb[0]>=4; // pair of 4s+
            if (dq) { win = chPot.ante*2 + chPot.call*2; msg=`Win! ${ph.name} beats ${dh.name}. Won ${formatCrypto(win)}!`; }
            else { win = chPot.call*2; msg=`Dealer doesn't qualify! Won ${formatCrypto(win)}!`; }
            if (win>0) { await apiCredit(win); if(window.loadBalances)window.loadBalances(); showToast(msg,'success'); }
        } else if (winner==='push') {
            win = chPot.ante+chPot.call; await apiCredit(win); if(window.loadBalances)window.loadBalances();
            msg='Push! Bets returned.'; showToast(msg,'info');
        } else { msg=`Dealer wins with ${dh.name}.`; showToast(msg,'info'); }
        document.getElementById('chStatus').textContent=msg; updateBalEl('chBalance');
        setCHButtons(['deal','clear']); chState='idle';
    }
    function setCHButtons(active) {
        const map={deal:document.getElementById('chDeal'),call:document.getElementById('chCall'),fold:document.getElementById('chFold'),clear:document.getElementById('chClear')};
        for (const [k,btn] of Object.entries(map)) { if(!btn)continue; btn.disabled=!active.includes(k); btn.style.opacity=active.includes(k)?'1':'0.35'; btn.style.pointerEvents=active.includes(k)?'auto':'none'; }
    }

    // ═══════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════
    const observer = new MutationObserver((mutations)=>{
        mutations.forEach(m=>{
            if (m.target.dataset?.view==='poker' && m.target.classList?.contains('active')) {
                // Hub is default
            }
        });
    });
    document.querySelectorAll('.view[data-view="poker"]').forEach(v=>observer.observe(v,{attributes:true,attributeFilter:['class']}));
})();
