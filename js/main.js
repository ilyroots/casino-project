/**
 * STAKE.US — Neon-Void Casino
 * Full SPA Router + Auth Engine
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════
    // GAME DATASET
    // ═══════════════════════════════════════════════
    const GAME_DATA = {
        trending: [
            { name: 'Sweet Bonanza', provider: 'Pragmatic Play', emoji: '🍭', badge: 'hot' },
            { name: 'Gates of Olympus', provider: 'Pragmatic Play', emoji: '⚡', badge: '' },
            { name: 'Sugar Rush', provider: 'Pragmatic Play', emoji: '🍬', badge: 'new' },
            { name: 'Big Bass Bonanza', provider: 'Reel Kingdom', emoji: '🎣', badge: '' },
            { name: 'Wanted Dead or Wild', provider: 'Hacksaw', emoji: '🤠', badge: '' },
            { name: 'Zeus vs Hades', provider: 'Pragmatic Play', emoji: '⚔️', badge: 'hot' },
            { name: 'Starlight Princess', provider: 'Pragmatic Play', emoji: '👸', badge: '' },
            { name: 'Hand of Anubis', provider: 'Hacksaw', emoji: '🐺', badge: '' },
        ],
        'trending-full': [
            { name: 'Sweet Bonanza', provider: 'Pragmatic Play', emoji: '🍭', badge: 'hot' },
            { name: 'Gates of Olympus', provider: 'Pragmatic Play', emoji: '⚡', badge: '' },
            { name: 'Sugar Rush', provider: 'Pragmatic Play', emoji: '🍬', badge: 'new' },
            { name: 'Big Bass Bonanza', provider: 'Reel Kingdom', emoji: '🎣', badge: '' },
            { name: 'Wanted Dead or Wild', provider: 'Hacksaw', emoji: '🤠', badge: '' },
            { name: 'Zeus vs Hades', provider: 'Pragmatic Play', emoji: '⚔️', badge: 'hot' },
            { name: 'Starlight Princess', provider: 'Pragmatic Play', emoji: '👸', badge: '' },
            { name: 'Hand of Anubis', provider: 'Hacksaw', emoji: '🐺', badge: '' },
            { name: 'Fruit Party 2', provider: 'Pragmatic Play', emoji: '🍓', badge: '' },
            { name: 'Chaos Crew', provider: 'Hacksaw', emoji: '😺', badge: '' },
            { name: 'Madame Destiny', provider: 'Pragmatic Play', emoji: '🔮', badge: '' },
            { name: 'RIP City', provider: 'Hacksaw', emoji: '🐱', badge: 'new' },
            { name: 'Wolf Gold', provider: 'Pragmatic Play', emoji: '🐺', badge: '' },
            { name: 'Dork Unit', provider: 'Hacksaw', emoji: '🤓', badge: '' },
            { name: 'Book of Dead', provider: "Play'n GO", emoji: '📖', badge: '' },
            { name: 'Benny the Beer', provider: 'Hacksaw', emoji: '🍺', badge: '' },
        ],
        originals: [
            { name: 'Dice', provider: 'Stake Originals', emoji: '🎲', badge: '' },
            { name: 'Plinko', provider: 'Stake Originals', emoji: '🔵', badge: 'hot' },
            { name: 'Mines', provider: 'Stake Originals', emoji: '💣', badge: '' },
            { name: 'Crash', provider: 'Stake Originals', emoji: '🚀', badge: '' },
            { name: 'Limbo', provider: 'Stake Originals', emoji: '📉', badge: 'new' },
            { name: 'Keno', provider: 'Stake Originals', emoji: '🎯', badge: '' },
            { name: 'Roulette', provider: 'Stake Originals', emoji: '🔴', badge: '' },
            { name: 'Hilo', provider: 'Stake Originals', emoji: '🃏', badge: '' },
        ],
        'originals-full': [
            { name: 'Dice', provider: 'Stake Originals', emoji: '🎲', badge: '' },
            { name: 'Plinko', provider: 'Stake Originals', emoji: '🔵', badge: 'hot' },
            { name: 'Mines', provider: 'Stake Originals', emoji: '💣', badge: '' },
            { name: 'Crash', provider: 'Stake Originals', emoji: '🚀', badge: '' },
            { name: 'Limbo', provider: 'Stake Originals', emoji: '📉', badge: 'new' },
            { name: 'Keno', provider: 'Stake Originals', emoji: '🎯', badge: '' },
            { name: 'Roulette', provider: 'Stake Originals', emoji: '🔴', badge: '' },
            { name: 'Hilo', provider: 'Stake Originals', emoji: '🃏', badge: '' },
            { name: 'Wheel', provider: 'Stake Originals', emoji: '🎡', badge: '' },
            { name: 'Diamonds', provider: 'Stake Originals', emoji: '💎', badge: '' },
            { name: 'Baccarat', provider: 'Stake Originals', emoji: '🃏', badge: '' },
            { name: 'Video Poker', provider: 'Stake Originals', emoji: '🎰', badge: '' },
        ],
        'new-releases': [
            { name: 'Le Bandit', provider: 'Hacksaw', emoji: '🦝', badge: 'new' },
            { name: 'RIP City', provider: 'Hacksaw', emoji: '🐱', badge: 'new' },
            { name: 'Zeus vs Hades', provider: 'Pragmatic Play', emoji: '⚔️', badge: 'hot' },
            { name: 'Benny the Beer', provider: 'Hacksaw', emoji: '🍺', badge: 'new' },
            { name: 'Sugar Rush', provider: 'Pragmatic Play', emoji: '🍬', badge: 'new' },
            { name: 'Stormforged', provider: 'Hacksaw', emoji: '⚡', badge: 'new' },
            { name: 'Densho', provider: 'Hacksaw', emoji: '⛩️', badge: 'new' },
            { name: 'Dragon Tribe', provider: 'Nolimit City', emoji: '🐉', badge: 'new' },
            { name: 'Keep Em Cool', provider: 'Hacksaw', emoji: '🧊', badge: 'new' },
            { name: 'Bloodthirst', provider: 'Hacksaw', emoji: '🧛', badge: 'new' },
            { name: 'Fish Eye', provider: 'Pragmatic Play', emoji: '🐟', badge: '' },
            { name: 'Dork Unit', provider: 'Hacksaw', emoji: '🤓', badge: '' },
        ],
        'feature-buy': [
            { name: 'Sweet Bonanza', provider: 'Pragmatic Play', emoji: '🍭', badge: '' },
            { name: 'Gates of Olympus', provider: 'Pragmatic Play', emoji: '⚡', badge: '' },
            { name: 'Big Bass Bonanza', provider: 'Reel Kingdom', emoji: '🎣', badge: '' },
            { name: 'Madame Destiny', provider: 'Pragmatic Play', emoji: '🔮', badge: '' },
            { name: 'Sugar Rush', provider: 'Pragmatic Play', emoji: '🍬', badge: '' },
            { name: 'Fruit Party 2', provider: 'Pragmatic Play', emoji: '🍓', badge: '' },
            { name: 'Starlight Princess', provider: 'Pragmatic Play', emoji: '👸', badge: '' },
            { name: 'Zeus vs Hades', provider: 'Pragmatic Play', emoji: '⚔️', badge: 'hot' },
            { name: 'Wolf Gold', provider: 'Pragmatic Play', emoji: '🐺', badge: '' },
            { name: 'Chaos Crew', provider: 'Hacksaw', emoji: '😺', badge: '' },
            { name: 'Hand of Anubis', provider: 'Hacksaw', emoji: '🐺', badge: '' },
            { name: 'RIP City', provider: 'Hacksaw', emoji: '🐱', badge: '' },
        ],
        slots: [
            { name: 'Book of Dead', provider: "Play'n GO", emoji: '📖', badge: '' },
            { name: 'Wolf Gold', provider: 'Pragmatic Play', emoji: '🐺', badge: '' },
            { name: 'Money Train 4', provider: 'Relax Gaming', emoji: '🚂', badge: 'hot' },
            { name: 'Deadwood', provider: 'Nolimit City', emoji: '🤠', badge: '' },
            { name: 'San Quentin', provider: 'Nolimit City', emoji: '🏢', badge: '' },
            { name: 'Temple Tumble', provider: 'Relax Gaming', emoji: '🏛️', badge: '' },
            { name: 'Razor Returns', provider: 'Push Gaming', emoji: '🦈', badge: 'new' },
            { name: 'Le Bandit', provider: 'Hacksaw', emoji: '🦝', badge: '' },
        ],
        'slots-full': [
            { name: 'Book of Dead', provider: "Play'n GO", emoji: '📖', badge: '' },
            { name: 'Wolf Gold', provider: 'Pragmatic Play', emoji: '🐺', badge: '' },
            { name: 'Money Train 4', provider: 'Relax Gaming', emoji: '🚂', badge: 'hot' },
            { name: 'Deadwood', provider: 'Nolimit City', emoji: '🤠', badge: '' },
            { name: 'San Quentin', provider: 'Nolimit City', emoji: '🏢', badge: '' },
            { name: 'Temple Tumble', provider: 'Relax Gaming', emoji: '🏛️', badge: '' },
            { name: 'Razor Returns', provider: 'Push Gaming', emoji: '🦈', badge: 'new' },
            { name: 'Le Bandit', provider: 'Hacksaw', emoji: '🦝', badge: '' },
            { name: 'Sweet Bonanza', provider: 'Pragmatic Play', emoji: '🍭', badge: '' },
            { name: 'Gates of Olympus', provider: 'Pragmatic Play', emoji: '⚡', badge: '' },
            { name: 'Big Bass Bonanza', provider: 'Reel Kingdom', emoji: '🎣', badge: '' },
            { name: 'Wanted Dead or Wild', provider: 'Hacksaw', emoji: '🤠', badge: '' },
            { name: 'Chaos Crew', provider: 'Hacksaw', emoji: '😺', badge: '' },
            { name: 'Hand of Anubis', provider: 'Hacksaw', emoji: '🐺', badge: '' },
            { name: 'Dork Unit', provider: 'Hacksaw', emoji: '🤓', badge: '' },
            { name: 'Fruit Party 2', provider: 'Pragmatic Play', emoji: '🍓', badge: '' },
        ],
        live: [
            { name: 'Lightning Roulette', provider: 'Evolution', emoji: '⚡', badge: 'hot' },
            { name: 'Crazy Time', provider: 'Evolution', emoji: '🎡', badge: '' },
            { name: 'Blackjack VIP', provider: 'Pragmatic Live', emoji: '♠️', badge: '' },
            { name: 'Monopoly Live', provider: 'Evolution', emoji: '🎩', badge: '' },
            { name: 'Speed Baccarat', provider: 'Evolution', emoji: '🃏', badge: '' },
            { name: 'Dream Catcher', provider: 'Evolution', emoji: '💫', badge: '' },
            { name: 'Deal or No Deal', provider: 'Evolution', emoji: '📦', badge: '' },
            { name: 'Mega Ball', provider: 'Evolution', emoji: '🔴', badge: 'new' },
        ],
        'live-full': [
            { name: 'Lightning Roulette', provider: 'Evolution', emoji: '⚡', badge: 'hot' },
            { name: 'Crazy Time', provider: 'Evolution', emoji: '🎡', badge: '' },
            { name: 'Blackjack VIP', provider: 'Pragmatic Live', emoji: '♠️', badge: '' },
            { name: 'Monopoly Live', provider: 'Evolution', emoji: '🎩', badge: '' },
            { name: 'Speed Baccarat', provider: 'Evolution', emoji: '🃏', badge: '' },
            { name: 'Dream Catcher', provider: 'Evolution', emoji: '💫', badge: '' },
            { name: 'Deal or No Deal', provider: 'Evolution', emoji: '📦', badge: '' },
            { name: 'Mega Ball', provider: 'Evolution', emoji: '🔴', badge: 'new' },
            { name: 'Lightning Dice', provider: 'Evolution', emoji: '⚡', badge: '' },
            { name: 'Football Studio', provider: 'Evolution', emoji: '⚽', badge: '' },
            { name: 'Teen Patti', provider: 'Evolution', emoji: '🃏', badge: '' },
            { name: 'Andar Bahar', provider: 'Evolution', emoji: '🎯', badge: '' },
        ],
        table: [
            { name: 'Blackjack Classic', provider: 'Pragmatic Play', emoji: '♠️', badge: '' },
            { name: 'European Roulette', provider: 'Pragmatic Play', emoji: '🔴', badge: '' },
            { name: 'Baccarat Deluxe', provider: 'PG Soft', emoji: '💎', badge: '' },
            { name: 'Texas Hold\'em', provider: 'Evolution', emoji: '🤠', badge: '' },
            { name: 'Sic Bo', provider: 'Evolution', emoji: '🎲', badge: '' },
            { name: 'Dragon Tiger', provider: 'Evolution', emoji: '🐉', badge: '' },
            { name: 'Caribbean Stud', provider: 'Evolution', emoji: '🏝️', badge: '' },
            { name: 'Three Card Poker', provider: 'Evolution', emoji: '🃏', badge: '' },
        ],
        'table-full': [
            { name: 'Blackjack Classic', provider: 'Pragmatic Play', emoji: '♠️', badge: '' },
            { name: 'European Roulette', provider: 'Pragmatic Play', emoji: '🔴', badge: '' },
            { name: 'Baccarat Deluxe', provider: 'PG Soft', emoji: '💎', badge: '' },
            { name: 'Texas Hold\'em', provider: 'Evolution', emoji: '🤠', badge: '' },
            { name: 'Sic Bo', provider: 'Evolution', emoji: '🎲', badge: '' },
            { name: 'Dragon Tiger', provider: 'Evolution', emoji: '🐉', badge: '' },
            { name: 'Caribbean Stud', provider: 'Evolution', emoji: '🏝️', badge: '' },
            { name: 'Three Card Poker', provider: 'Evolution', emoji: '🃏', badge: '' },
            { name: 'American Roulette', provider: 'Pragmatic Play', emoji: '🔵', badge: '' },
            { name: 'Blackjack Party', provider: 'Evolution', emoji: '🎉', badge: '' },
            { name: 'Casino Hold\'em', provider: 'Evolution', emoji: '♣️', badge: '' },
            { name: 'Oasis Poker', provider: 'Evolution', emoji: '🌴', badge: '' },
        ],
        'game-shows': [
            { name: 'Crazy Time', provider: 'Evolution', emoji: '🎡', badge: 'hot' },
            { name: 'Monopoly Live', provider: 'Evolution', emoji: '🎩', badge: '' },
            { name: 'Deal or No Deal', provider: 'Evolution', emoji: '📦', badge: '' },
            { name: 'Dream Catcher', provider: 'Evolution', emoji: '💫', badge: '' },
            { name: 'Mega Ball', provider: 'Evolution', emoji: '🔴', badge: '' },
            { name: 'Funky Time', provider: 'Evolution', emoji: '🕺', badge: 'new' },
            { name: 'Cash or Crash', provider: 'Evolution', emoji: '🚀', badge: '' },
            { name: 'Gonzo\'s Treasure Hunt', provider: 'Evolution', emoji: '🗺️', badge: '' },
            { name: 'Lightning Dice', provider: 'Evolution', emoji: '⚡', badge: '' },
            { name: 'Football Studio', provider: 'Evolution', emoji: '⚽', badge: '' },
            { name: 'Side Bet City', provider: 'Evolution', emoji: '🏙️', badge: '' },
            { name: 'Extra Chilli', provider: 'Evolution', emoji: '🌶️', badge: '' },
        ],
        blackjack: [
            { name: 'Blackjack VIP', provider: 'Evolution', emoji: '♠️', badge: 'hot' },
            { name: 'Blackjack Party', provider: 'Evolution', emoji: '🎉', badge: '' },
            { name: 'Speed Blackjack', provider: 'Evolution', emoji: '⚡', badge: '' },
            { name: 'Infinite Blackjack', provider: 'Evolution', emoji: '∞', badge: '' },
            { name: 'Free Bet Blackjack', provider: 'Evolution', emoji: '🆓', badge: '' },
            { name: 'Power Blackjack', provider: 'Evolution', emoji: '💪', badge: '' },
            { name: 'Blackjack Classic', provider: 'Pragmatic Play', emoji: '🃏', badge: '' },
            { name: 'One Blackjack', provider: 'Pragmatic Play', emoji: '1️⃣', badge: '' },
            { name: 'Blackjack Azure', provider: 'Pragmatic Play', emoji: '💎', badge: '' },
            { name: 'VIP Blackjack', provider: 'Playtech', emoji: '👑', badge: '' },
        ],
        roulette: [
            { name: 'Lightning Roulette', provider: 'Evolution', emoji: '⚡', badge: 'hot' },
            { name: 'European Roulette', provider: 'Pragmatic Play', emoji: '🔴', badge: '' },
            { name: 'American Roulette', provider: 'Pragmatic Play', emoji: '🔵', badge: '' },
            { name: 'Immersive Roulette', provider: 'Evolution', emoji: '🎥', badge: '' },
            { name: 'Speed Roulette', provider: 'Evolution', emoji: '⚡', badge: '' },
            { name: 'Auto Roulette', provider: 'Evolution', emoji: '🤖', badge: '' },
            { name: 'Double Ball Roulette', provider: 'Evolution', emoji: '⚪', badge: '' },
            { name: 'French Roulette', provider: 'Evolution', emoji: '🇫🇷', badge: '' },
            { name: 'Hindi Roulette', provider: 'Evolution', emoji: '🇮🇳', badge: '' },
            { name: 'Turkish Roulette', provider: 'Evolution', emoji: '🇹🇷', badge: '' },
        ],
        baccarat: [
            { name: 'Speed Baccarat', provider: 'Evolution', emoji: '⚡', badge: '' },
            { name: 'Baccarat Squeeze', provider: 'Evolution', emoji: '🤏', badge: '' },
            { name: 'No Commission Baccarat', provider: 'Evolution', emoji: '💰', badge: '' },
            { name: 'Lightning Baccarat', provider: 'Evolution', emoji: '⚡', badge: 'hot' },
            { name: 'Baccarat Control Squeeze', provider: 'Evolution', emoji: '🎮', badge: '' },
            { name: 'Baccarat Deluxe', provider: 'PG Soft', emoji: '💎', badge: '' },
            { name: 'Peek Baccarat', provider: 'Evolution', emoji: '👀', badge: '' },
            { name: 'Golden Wealth Baccarat', provider: 'Evolution', emoji: '👑', badge: '' },
        ],
        'video-poker': [
            { name: 'Jacks or Better', provider: 'Stake Originals', emoji: '🃏', badge: '' },
            { name: 'Deuces Wild', provider: 'Stake Originals', emoji: '2️⃣', badge: '' },
            { name: 'Joker Poker', provider: 'Stake Originals', emoji: '🤡', badge: '' },
            { name: 'Aces & Faces', provider: 'Stake Originals', emoji: '👑', badge: '' },
            { name: 'Tens or Better', provider: 'Stake Originals', emoji: '🔟', badge: '' },
            { name: 'Bonus Poker', provider: 'Stake Originals', emoji: '🎁', badge: '' },
            { name: 'Double Bonus', provider: 'Stake Originals', emoji: '2️⃣', badge: '' },
            { name: 'All American', provider: 'Stake Originals', emoji: '🇺🇸', badge: '' },
        ],
        'scratch-cards': [
            { name: 'Scratch a Million', provider: 'Hacksaw', emoji: '💰', badge: 'hot' },
            { name: 'Shave the Beard', provider: 'Hacksaw', emoji: '🧔', badge: '' },
            { name: 'Scratch Gold', provider: 'Hacksaw', emoji: '🏆', badge: '' },
            { name: 'Lucky Scratch', provider: 'Hacksaw', emoji: '🍀', badge: '' },
            { name: 'Koi Cash', provider: 'Hacksaw', emoji: '🐟', badge: '' },
            { name: 'Cash Vault', provider: 'Hacksaw', emoji: '🏦', badge: '' },
            { name: 'Break the Ice', provider: 'Hacksaw', emoji: '🧊', badge: '' },
            { name: 'Chaos Crew Scratch', provider: 'Hacksaw', emoji: '😺', badge: 'new' },
        ],
    };

    const CHALLENGES_DATA = [
        { icon: '🎰', title: 'Slot Warrior', desc: 'Wager 500,000 GC on any slot game', prize: '50 SC', progress: 72, total: '360K / 500K' },
        { icon: '🎲', title: 'Originals Master', desc: 'Hit 10x multiplier on any Stake Original', prize: '25 SC', progress: 40, total: '4 / 10' },
        { icon: '🚀', title: 'Crash Survivor', desc: 'Cash out at 5x or higher 5 times', prize: '30 SC', progress: 60, total: '3 / 5' },
        { icon: '⚡', title: 'Lightning Strike', desc: 'Win 3 consecutive Lightning Roulette bets', prize: '100 SC', progress: 33, total: '1 / 3' },
        { icon: '🎣', title: 'Big Bass Hunter', desc: 'Trigger the bonus round on Big Bass Bonanza', prize: '15 SC', progress: 100, total: 'Complete!' },
        { icon: '💣', title: 'Mine Sweeper', desc: 'Reveal 10 gems in a single Mines game', prize: '40 SC', progress: 50, total: '5 / 10' },
    ];

    const GAMEPLAY_DATA = [
        { game: 'Plinko', emoji: '🔵', bet: '1,000', multiplier: '12.5x', payout: '12,500', result: 'win', time: '2 min ago' },
        { game: 'Sweet Bonanza', emoji: '🍭', bet: '2,500', multiplier: '0x', payout: '0', result: 'loss', time: '5 min ago' },
        { game: 'Crash', emoji: '🚀', bet: '500', multiplier: '3.2x', payout: '1,600', result: 'win', time: '12 min ago' },
        { game: 'Mines', emoji: '💣', bet: '1,000', multiplier: '2.1x', payout: '2,100', result: 'win', time: '18 min ago' },
        { game: 'Gates of Olympus', emoji: '⚡', bet: '5,000', multiplier: '45x', payout: '225,000', result: 'win', time: '32 min ago' },
        { game: 'Blackjack VIP', emoji: '♠️', bet: '2,000', multiplier: '2x', payout: '4,000', result: 'win', time: '45 min ago' },
        { game: 'Dice', emoji: '🎲', bet: '1,000', multiplier: '0x', payout: '0', result: 'loss', time: '1 hr ago' },
        { game: 'Lightning Roulette', emoji: '⚡', bet: '500', multiplier: '0x', payout: '0', result: 'loss', time: '1 hr ago' },
        { game: 'Sugar Rush', emoji: '🍬', bet: '3,000', multiplier: '120x', payout: '360,000', result: 'win', time: '2 hr ago' },
        { game: 'Limbo', emoji: '📉', bet: '800', multiplier: '0x', payout: '0', result: 'loss', time: '3 hr ago' },
    ];

    const SHOWDOWNS_DATA = [
        { icon: '🎰', title: 'Slots Showdown Sunday', desc: 'Highest multiplier on Pragmatic Play slots wins', prize: '$5,000 SC', status: 'live', time: 'Ends in 4h 22m' },
        { icon: '🎲', title: 'Originals Weekly War', desc: 'Most profit on Stake Originals this week', prize: '$10,000 SC', status: 'live', time: 'Ends in 2 days' },
        { icon: '🚀', title: 'Crash Championship', desc: 'Highest single cashout multiplier wins', prize: '$3,000 SC', status: 'live', time: 'Ends in 8h 15m' },
        { icon: '⚡', title: 'Lightning Roulette Rumble', desc: 'Most consecutive wins on Lightning Roulette', prize: '$2,500 SC', status: 'upcoming', time: 'Starts tomorrow' },
        { icon: '🃏', title: 'Blackjack Battle', desc: 'Best win streak in Blackjack VIP', prize: '$4,000 SC', status: 'upcoming', time: 'Starts in 3 days' },
        { icon: '🎣', title: 'Big Bass Bonanza Brawl', desc: 'Biggest win on Big Bass Bonanza', prize: '$1,500 SC', status: 'live', time: 'Ends in 12h 30m' },
    ];

    const SPONSORS_DATA = [
        { emoji: '⚽', name: 'Premier League', type: 'Sports' },
        { emoji: '🏎', name: 'F1 Racing', type: 'Motorsport' },
        { emoji: '🥊', name: 'UFC', type: 'MMA' },
        { emoji: '🎮', name: 'FaZe Clan', type: 'Esports' },
        { emoji: '⚾', name: 'MLB', type: 'Sports' },
        { emoji: '🏀', name: 'NBA', type: 'Sports' },
        { emoji: '🏈', name: 'NFL', type: 'Sports' },
        { emoji: '⛓', name: 'Drake', type: 'Ambassador' },
    ];

    const FAQ_DATA = [
        { q: 'How do I redeem Stake Cash for prizes?', a: 'Once you have accumulated at least 30 eligible Stake Cash and completed the 3x playthrough requirement, you can submit a redemption request through the Wallet page. Redemptions are typically processed within 24-48 hours after identity verification.' },
        { q: 'Is Stake.us available in my state?', a: 'Stake.us is available in most US states except Washington, Idaho, Nevada, Michigan, and Kentucky. You must be 21 years or older to play. Availability is subject to change based on local regulations.' },
        { q: 'How does the welcome bonus work?', a: 'New players receive 560,000 Gold Coins and 56 Stake Cash FREE upon registration. No purchase is necessary. The Stake Cash is subject to a 3x playthrough requirement before redemption.' },
        { q: 'What are Gold Coins vs Stake Cash?', a: 'Gold Coins (GC) are for fun play only and cannot be redeemed. Stake Cash (SC) can be used to play games and redeemed for real prizes after meeting playthrough requirements. You can earn SC through login bonuses, promotions, and gameplay.' },
        { q: 'How do I verify my account?', a: 'Go to your profile settings and submit a government-issued ID and proof of address. Verification is required before redeeming prizes and typically takes 24-48 hours.' },
        { q: 'Are the games fair?', a: 'Yes. Stake Originals use provably fair technology allowing you to verify every game outcome. Third-party games use certified Random Number Generators (RNG) audited by independent testing agencies.' },
        { q: 'Can I play on mobile?', a: 'Absolutely. Stake.us is fully optimized for mobile browsers on iOS and Android. No app download is required — simply visit stake.us on your mobile browser.' },
        { q: 'How do I contact support?', a: 'You can reach our support team 24/7 via Live Chat (fastest response), email at support@stake.us, or through our Twitter/X @StakeSupport.' },
    ];

    const GC_PACKAGES = [
        { amount: '50,000', bonus: '+ 5 SC FREE', price: '$4.99', popular: false },
        { amount: '150,000', bonus: '+ 15 SC FREE', price: '$9.99', popular: false },
        { amount: '400,000', bonus: '+ 40 SC FREE', price: '$19.99', popular: true },
        { amount: '1,000,000', bonus: '+ 100 SC FREE', price: '$49.99', popular: false },
        { amount: '2,500,000', bonus: '+ 250 SC FREE', price: '$99.99', popular: false },
        { amount: '5,000,000', bonus: '+ 500 SC FREE', price: '$199.99', popular: false },
    ];

    const WALLET_TXS = [
        { type: 'bonus', desc: 'Daily Login Bonus', amount: '+10,000 GC', date: 'Today', time: '09:00 AM' },
        { type: 'bonus', desc: 'Welcome Bonus', amount: '+560,000 GC', date: 'Today', time: '08:45 AM' },
        { type: 'bonus', desc: 'Welcome Bonus', amount: '+56.00 SC', date: 'Today', time: '08:45 AM' },
        { type: 'purchase', desc: 'Gold Coin Package', amount: '+150,000 GC', date: 'Yesterday', time: '03:22 PM' },
        { type: 'purchase', desc: 'Gold Coin Package', amount: '+15.00 SC', date: 'Yesterday', time: '03:22 PM' },
        { type: 'redeem', desc: 'Stake Cash Redemption', amount: '-30.00 SC', date: 'May 4', time: '11:15 AM' },
        { type: 'bonus', desc: 'Weekly Raffle Win', amount: '+25,000 GC', date: 'May 3', time: '08:00 PM' },
        { type: 'purchase', desc: 'Gold Coin Package', amount: '+50,000 GC', date: 'May 2', time: '02:10 PM' },
        { type: 'purchase', desc: 'Gold Coin Package', amount: '+5.00 SC', date: 'May 2', time: '02:10 PM' },
        { type: 'bonus', desc: 'Challenge Reward', amount: '+15.00 SC', date: 'May 1', time: '06:30 PM' },
    ];

    const BLOG_DATA = [
        { emoji: '🎰', category: 'News', title: 'New Game Releases: May 2026', excerpt: 'Explore the latest additions to our slots collection including RIP City, Stormforged, and Dragon Tribe from top providers.', date: 'May 5, 2026', readTime: '4 min read' },
        { emoji: '⚡', category: 'Strategy', title: 'Mastering Lightning Roulette', excerpt: 'Learn the optimal betting strategies to maximize your chances on Evolution\'s most electrifying roulette variant.', date: 'May 3, 2026', readTime: '6 min read' },
        { emoji: '🎁', category: 'Promotions', title: 'Daily Races: How to Win Big', excerpt: 'A complete guide to climbing the daily race leaderboard and claiming your share of the $50,000 prize pool.', date: 'May 1, 2026', readTime: '5 min read' },
        { emoji: '🚀', category: 'Originals', title: 'Crash Strategy Guide 2026', excerpt: 'Advanced techniques for the popular Stake Original including auto-cashout settings and bankroll management.', date: 'Apr 28, 2026', readTime: '7 min read' },
        { emoji: '🏆', category: 'Community', title: 'Biggest Wins of April', excerpt: 'This month\'s most incredible wins including a 5,000x multiplier on Plinko and a massive slot jackpot.', date: 'Apr 25, 2026', readTime: '3 min read' },
        { emoji: '🛡', category: 'Safety', title: 'Responsible Gaming Tips', excerpt: 'Important advice for keeping your gaming experience fun and safe, including how to use our built-in limit tools.', date: 'Apr 22, 2026', readTime: '4 min read' },
    ];

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
        'Just hit a <span class="win">500x</span> on Plinko! 🎉',
        'Anyone playing Sweet Bonanza right now?',
        'Lost 50k but we go again 😤',
        'The new Hacksaw games are insane 🔥',
        'Just redeemed <span class="amount">$500</span> in Stake Cash!',
        'RIP my balance, all in on roulette',
        'Crash is so rigged today lol',
        'GG to everyone in the daily race',
        'Mines is actually paying out today',
        'Got the max win on Gates of Olympus! <span class="win">⚡⚡⚡</span>',
        'Is the chat always this dead?',
        'Just joined, this site is fire',
        'Waiting for my verification...',
        '<span class="win">W</span> streak on blackjack!',
        'RIP 10x in a row on dice',
        'The live dealers are so entertaining',
        'Can someone explain how showdowns work?',
        'First time redeeming, wish me luck',
        'How do you get VIP status?',
        'Best slots for wagering?',
    ];

    // ═══════════════════════════════════════════════
    // DOM UTILS
    // ═══════════════════════════════════════════════
    const $ = (s, el = document) => el.querySelector(s);
    const $$ = (s, el = document) => el.querySelectorAll(s);

    // ═══════════════════════════════════════════════
    // AUTH ENGINE
    // ═══════════════════════════════════════════════
    const AUTH_KEY = 'stake_auth';

    function getAuth() {
        try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || null; }
        catch { return null; }
    }

    function setAuth(data) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(data));
    }

    function clearAuth() {
        localStorage.removeItem(AUTH_KEY);
    }

    function isLoggedIn() {
        return !!getAuth();
    }

    function showToast(message, type = 'success') {
        const container = $('#toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : '✕'}</span><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('out');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    function updateHeaderAuth() {
        const auth = getAuth();
        const loggedOut = $('#headerActions');
        const loggedIn = $('#userActions');
        if (!loggedOut || !loggedIn) return;

        if (auth) {
            loggedOut.classList.add('hidden');
            loggedIn.classList.remove('hidden');

            const letter = auth.username?.[0]?.toUpperCase() || 'U';
            $('.avatar-letter').textContent = letter;
            $('#dropdownLetter').textContent = letter;
            $('#dropdownName').textContent = auth.username;

            // Update profile fields
            const pUser = $('#profileUsername');
            const pEmail = $('#profileEmail');
            if (pUser) pUser.value = auth.username;
            if (pEmail) pEmail.value = auth.email;
        } else {
            loggedOut.classList.remove('hidden');
            loggedIn.classList.add('hidden');
        }
    }

    function initAuth() {
        // Modals
        const loginModal = $('#loginModal');
        const signupModal = $('#signupModal');

        function openModal(modal) {
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
        function closeModal(modal) {
            modal.classList.remove('open');
            document.body.style.overflow = '';
            // Clear errors
            modal.querySelectorAll('.form-error').forEach(el => el.textContent = '');
            modal.querySelectorAll('input').forEach(el => el.classList.remove('invalid'));
        }

        $('#loginBtn')?.addEventListener('click', () => openModal(loginModal));
        $('#signupBtn')?.addEventListener('click', () => openModal(signupModal));
        $('#loginClose')?.addEventListener('click', () => closeModal(loginModal));
        $('#signupClose')?.addEventListener('click', () => closeModal(signupModal));
        $('#switchToSignup')?.addEventListener('click', () => { closeModal(loginModal); openModal(signupModal); });
        $('#switchToLogin')?.addEventListener('click', () => { closeModal(signupModal); openModal(loginModal); });

        // Close on overlay click
        $$('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal(overlay);
            });
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                $$('.modal-overlay.open').forEach(m => closeModal(m));
            }
        });

        // User dropdown
        const userMenu = $('#userMenu');
        $('#userAvatar')?.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!userMenu?.contains(e.target)) userMenu?.classList.remove('open');
        });

        // Logout
        $('#logoutBtn')?.addEventListener('click', () => {
            clearAuth();
            updateHeaderAuth();
            showToast('Logged out successfully', 'success');
            navigateTo('home');
        });

        // Login form
        $('#loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = $('#loginEmail').value.trim();
            const password = $('#loginPassword').value;
            const emailErr = $('#loginEmailError');
            const passErr = $('#loginPasswordError');

            emailErr.textContent = '';
            passErr.textContent = '';
            $('#loginEmail').classList.remove('invalid');
            $('#loginPassword').classList.remove('invalid');

            // Simulate lookup from stored users
            const users = JSON.parse(localStorage.getItem('stake_users') || '[]');
            const user = users.find(u => u.email === email);

            if (!email || !email.includes('@')) {
                emailErr.textContent = 'Please enter a valid email';
                $('#loginEmail').classList.add('invalid');
                return;
            }
            if (!user) {
                emailErr.textContent = 'No account found with this email';
                $('#loginEmail').classList.add('invalid');
                return;
            }
            if (user.password !== password) {
                passErr.textContent = 'Incorrect password';
                $('#loginPassword').classList.add('invalid');
                return;
            }

            setAuth({ username: user.username, email: user.email });
            updateHeaderAuth();
            closeModal(loginModal);
            showToast(`Welcome back, ${user.username}!`);
            $('#loginForm').reset();
        });

        // Signup form
        $('#signupForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = $('#signupUsername').value.trim();
            const email = $('#signupEmail').value.trim();
            const password = $('#signupPassword').value;
            const confirm = $('#signupConfirm').value;
            const dob = $('#signupDob').value;
            const terms = $('#signupTerms').checked;

            // Clear errors
            ['Username', 'Email', 'Password', 'Confirm', 'Dob', 'Terms'].forEach(field => {
                $(`#signup${field}Error`).textContent = '';
                $(`#signup${field === 'Confirm' ? 'Confirm' : field === 'Dob' ? 'Dob' : field === 'Terms' ? 'Terms' : field}`)?.classList.remove('invalid');
            });

            let valid = true;

            if (username.length < 3) {
                $('#signupUsernameError').textContent = 'Username must be at least 3 characters';
                $('#signupUsername').classList.add('invalid');
                valid = false;
            }
            if (!email || !email.includes('@')) {
                $('#signupEmailError').textContent = 'Please enter a valid email';
                $('#signupEmail').classList.add('invalid');
                valid = false;
            }
            if (password.length < 8) {
                $('#signupPasswordError').textContent = 'Password must be at least 8 characters';
                $('#signupPassword').classList.add('invalid');
                valid = false;
            }
            if (password !== confirm) {
                $('#signupConfirmError').textContent = 'Passwords do not match';
                $('#signupConfirm').classList.add('invalid');
                valid = false;
            }
            if (!dob) {
                $('#signupDobError').textContent = 'Please enter your date of birth';
                $('#signupDob').classList.add('invalid');
                valid = false;
            } else {
                const birth = new Date(dob);
                const age = (new Date() - birth) / (365.25 * 24 * 60 * 60 * 1000);
                if (age < 21) {
                    $('#signupDobError').textContent = 'You must be 21 or older';
                    $('#signupDob').classList.add('invalid');
                    valid = false;
                }
            }
            if (!terms) {
                $('#signupTermsError').textContent = 'You must agree to the terms';
                valid = false;
            }

            if (!valid) return;

            // Check if email exists
            const users = JSON.parse(localStorage.getItem('stake_users') || '[]');
            if (users.some(u => u.email === email)) {
                $('#signupEmailError').textContent = 'An account with this email already exists';
                $('#signupEmail').classList.add('invalid');
                return;
            }

            // Save user
            users.push({ username, email, password, dob });
            localStorage.setItem('stake_users', JSON.stringify(users));

            // Auto login
            setAuth({ username, email });
            updateHeaderAuth();
            closeModal(signupModal);
            showToast(`Welcome, ${username}! Your account is ready.`);
            $('#signupForm').reset();
        });

        // Init header state
        updateHeaderAuth();
    }

    // ═══════════════════════════════════════════════
    // RENDER FUNCTIONS
    // ═══════════════════════════════════════════════
    function createGameCard(game, i) {
        const badgeHtml = game.badge ? `<div class="game-card-badge ${game.badge}">${game.badge}</div>` : '';
        return `
            <div class="game-card" style="animation: cardFadeIn 0.5s var(--ease-out-expo) ${i * 0.04}s both">
                <div class="game-thumb">${game.emoji}</div>
                <div class="game-card-info">
                    <div class="game-card-title">${game.name}</div>
                    <div class="game-card-provider">${game.provider}</div>
                </div>
                ${badgeHtml}
                <div class="holographic-shimmer"></div>
            </div>
        `;
    }

    function renderGameGrid(container, games) {
        if (!container) return;
        container.innerHTML = games.map((g, i) => createGameCard(g, i)).join('');
    }

    function renderAllGameGrids() {
        $$('[data-render]').forEach(el => {
            const key = el.dataset.render;
            const games = GAME_DATA[key];
            if (games) renderGameGrid(el, games);
        });
    }

    function renderChallenges() {
        const grid = $('#challengesGrid');
        if (!grid) return;
        grid.innerHTML = CHALLENGES_DATA.map((c, i) => `
            <div class="challenge-card" style="animation: cardFadeIn 0.5s var(--ease-out-expo) ${i * 0.08}s both">
                <div class="challenge-header">
                    <div class="challenge-icon">${c.icon}</div>
                    <div class="challenge-title">${c.title}</div>
                </div>
                <div class="challenge-desc">${c.desc}</div>
                <div class="challenge-prize">🏆 ${c.prize}</div>
                <div class="challenge-progress-wrap">
                    <div class="challenge-progress"><div class="challenge-progress-fill" style="width: ${c.progress}%"></div></div>
                    <span class="challenge-progress-text">${c.total}</span>
                </div>
            </div>
        `).join('');
    }

    function renderGameplay() {
        const table = $('#gameplayTable');
        if (!table) return;
        table.innerHTML = `
            <thead><tr><th>Game</th><th>Bet</th><th>Multiplier</th><th>Payout</th><th>Result</th><th>Time</th></tr></thead>
            <tbody>
                ${GAMEPLAY_DATA.map(row => `
                    <tr>
                        <td><div class="gp-game"><span class="gp-emoji">${row.emoji}</span>${row.game}</div></td>
                        <td>${row.bet}</td>
                        <td class="gp-multiplier">${row.multiplier}</td>
                        <td class="${row.result === 'win' ? 'gp-win' : 'gp-loss'}">${row.payout}</td>
                        <td class="${row.result === 'win' ? 'gp-win' : 'gp-loss'}">${row.result.toUpperCase()}</td>
                        <td>${row.time}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
    }

    function renderShowdowns() {
        const list = $('#showdownsList');
        if (!list) return;
        list.innerHTML = SHOWDOWNS_DATA.map((s, i) => `
            <div class="showdown-card" style="animation: cardFadeIn 0.5s var(--ease-out-expo) ${i * 0.06}s both">
                <div class="showdown-icon">${s.icon}</div>
                <div class="showdown-info">
                    <h4>${s.title}</h4>
                    <p>${s.desc}</p>
                    <div class="showdown-status">
                        <span class="status-dot ${s.status}"></span>
                        ${s.time}
                    </div>
                </div>
                <div class="showdown-prize">
                    <span class="amount">${s.prize}</span>
                    <span class="label">Prize Pool</span>
                </div>
                <button class="btn showdown-btn">${s.status === 'live' ? 'Join Now' : 'Remind Me'}</button>
            </div>
        `).join('');
    }

    function renderPromotions() {
        const container = $('#promoCards');
        if (!container) return;
        container.innerHTML = `
            <div class="promo-card">
                <div class="promo-card-badge">Live</div>
                <div class="promo-card-title">Daily Races</div>
                <div class="promo-card-desc">Compete every day for a share of the massive prize pool.</div>
                <div class="promo-card-prize">$50,000 SC</div>
            </div>
            <div class="promo-card">
                <div class="promo-card-badge">Weekly</div>
                <div class="promo-card-title">Weekly Raffle</div>
                <div class="promo-card-desc">Earn tickets playing your favorite games. Big GC giveaway every Sunday.</div>
                <div class="promo-card-prize">10,000,000 GC</div>
            </div>
            <div class="promo-card">
                <div class="promo-card-badge">Hot</div>
                <div class="promo-card-title">Multiplier Drops</div>
                <div class="promo-card-desc">Hit huge multipliers on selected games for bonus Stake Cash drops.</div>
                <div class="promo-card-prize">$25,000 SC</div>
            </div>
            <div class="promo-card">
                <div class="promo-card-badge">VIP</div>
                <div class="promo-card-title">VIP Club</div>
                <div class="promo-card-desc">Exclusive rakeback, weekly bonuses, dedicated host, and luxury gifts.</div>
                <div class="promo-card-prize">Exclusive</div>
            </div>
        `;
    }

    function renderSponsors() {
        const grid = $('#sponsorGrid');
        if (!grid) return;
        grid.innerHTML = SPONSORS_DATA.map((s, i) => `
            <div class="sponsor-card" style="animation: cardFadeIn 0.5s var(--ease-out-expo) ${i * 0.06}s both">
                <div class="sponsor-logo">${s.emoji}</div>
                <div class="sponsor-name">${s.name}</div>
                <div class="sponsor-type">${s.type}</div>
            </div>
        `).join('');
    }

    function renderFAQ() {
        const list = $('#faqList');
        if (!list) return;
        list.innerHTML = FAQ_DATA.map((f, i) => `
            <div class="faq-item" data-faq="${i}">
                <div class="faq-question">
                    ${f.q}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="faq-answer">${f.a}</div>
            </div>
        `).join('');

        $$('.faq-item').forEach(item => {
            item.querySelector('.faq-question').addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                $$('.faq-item').forEach(i => i.classList.remove('open'));
                if (!isOpen) item.classList.add('open');
            });
        });
    }

    function renderBlog() {
        const grid = $('#blogGrid');
        if (!grid) return;
        grid.innerHTML = BLOG_DATA.map((b, i) => `
            <div class="blog-card" style="animation: cardFadeIn 0.5s var(--ease-out-expo) ${i * 0.08}s both">
                <div class="blog-thumb">${b.emoji}</div>
                <div class="blog-info">
                    <div class="blog-category">${b.category}</div>
                    <div class="blog-title">${b.title}</div>
                    <div class="blog-excerpt">${b.excerpt}</div>
                    <div class="blog-meta"><span>${b.date}</span><span>${b.readTime}</span></div>
                </div>
            </div>
        `).join('');
    }

    function renderWallet() {
        const packages = $('#gcPackages');
        if (packages) {
            packages.innerHTML = GC_PACKAGES.map((pkg, i) => `
                <div class="gc-package ${pkg.popular ? 'popular' : ''}" style="animation: cardFadeIn 0.5s var(--ease-out-expo) ${i * 0.06}s both">
                    <div class="gc-package-amount">${pkg.amount}</div>
                    <div class="gc-package-bonus">${pkg.bonus}</div>
                    <div class="gc-package-price">${pkg.price}</div>
                    <button class="btn btn-buy-gc" data-price="${pkg.price}" data-amount="${pkg.amount}">Purchase</button>
                </div>
            `).join('');

            $$('.btn-buy-gc').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (!isLoggedIn()) {
                        showToast('Please log in to purchase', 'error');
                        $('#signupModal')?.classList.add('open');
                        return;
                    }
                    showToast(`Purchased ${btn.dataset.amount} GC for ${btn.dataset.price}!`);
                });
            });
        }

        const table = $('#walletTable');
        if (table) {
            table.innerHTML = `
                <thead><tr><th>Type</th><th>Description</th><th>Amount</th><th>Date</th><th>Time</th></tr></thead>
                <tbody>
                    ${WALLET_TXS.map(tx => `
                        <tr>
                            <td class="tx-type ${tx.type}">${tx.type.toUpperCase()}</td>
                            <td>${tx.desc}</td>
                            <td class="tx-amount">${tx.amount}</td>
                            <td>${tx.date}</td>
                            <td>${tx.time}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
        }

        $('#buyGcBtn')?.addEventListener('click', () => {
            const walletSection = $('#gcPackages');
            if (walletSection) walletSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        $('#redeemScBtn')?.addEventListener('click', () => {
            if (!isLoggedIn()) {
                showToast('Please log in to redeem', 'error');
                $('#signupModal')?.classList.add('open');
                return;
            }
            const redeemForm = $('.redeem-form');
            if (redeemForm) redeemForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        $('#redeemSubmit')?.addEventListener('click', () => {
            const amount = parseFloat($('#redeemAmount')?.value || 0);
            if (!amount || amount < 30) {
                showToast('Minimum redemption is 30 SC', 'error');
                return;
            }
            showToast(`Redemption request for ${amount} SC submitted! Processing within 24-48 hours.`);
            $('#redeemAmount').value = '';
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
    // CURSOR GLOW
    // ═══════════════════════════════════════════════
    function initCursorGlow() {
        const glow = $('#cursorGlow');
        if (!glow || window.matchMedia('(pointer: coarse)').matches) return;
        let mx = 0, my = 0, cx = 0, cy = 0;
        document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
        function animate() { cx += (mx - cx) * 0.08; cy += (my - cy) * 0.08; glow.style.left = cx + 'px'; glow.style.top = cy + 'px'; requestAnimationFrame(animate); }
        animate();
    }

    // ═══════════════════════════════════════════════
    // SIDEBAR
    // ═══════════════════════════════════════════════
    function initSidebar() {
        const sidebar = $('#sidebarLeft');
        const toggle = $('#sidebarToggle');
        const mobileBtn = $('#mobileMenuBtn');
        toggle?.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
        mobileBtn?.addEventListener('click', () => sidebar.classList.toggle('open'));
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 900 && !sidebar.contains(e.target) && !mobileBtn?.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }

    // ═══════════════════════════════════════════════
    // CHAT
    // ═══════════════════════════════════════════════
    function initChat() {
        const chat = $('#sidebarRight');
        const closeBtn = $('#chatClose');
        const chatInput = $('#chatInput');
        const chatSend = $('#chatSend');
        const messagesEl = $('#chatMessages');
        closeBtn?.addEventListener('click', () => chat.classList.add('closed'));
        for (let i = 0; i < 8; i++) addChatMessage(messagesEl, true);
        setInterval(() => { if (Math.random() > 0.6) addChatMessage(messagesEl); }, 3500);

        function handleSend() {
            const text = chatInput.value.trim();
            if (!text) return;
            const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const msg = document.createElement('div');
            msg.className = 'chat-message';
            msg.innerHTML = `<div class="chat-msg-header"><div class="chat-avatar" style="background:var(--neon-faint);color:var(--neon)">Y</div><span class="chat-username">You</span><span class="chat-time">${time}</span></div><div class="chat-text">${escapeHtml(text)}</div>`;
            messagesEl.appendChild(msg);
            messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
            chatInput.value = '';
        }
        chatSend?.addEventListener('click', handleSend);
        chatInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSend(); });
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

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ═══════════════════════════════════════════════
    // BALANCE ANIMATION
    // ═══════════════════════════════════════════════
    function initBalanceAnimation() {
        const gcEl = $('#gcBalance');
        const scEl = $('#scBalance');
        if (!gcEl || !scEl) return;
        const targetGC = 560000, targetSC = 56.00, duration = 2000;
        const start = performance.now();
        const easeOutExpo = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        function update(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = easeOutExpo(progress);
            gcEl.textContent = Math.floor(targetGC * eased).toLocaleString();
            scEl.textContent = (targetSC * eased).toFixed(2);
            if (progress < 1) requestAnimationFrame(update);
        }
        setTimeout(() => requestAnimationFrame(update), 1800);
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
    // MODE BUTTONS
    // ═══════════════════════════════════════════════
    function initModeButtons() {
        $$('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    // ═══════════════════════════════════════════════
    // GAMEPLAY TABS
    // ═══════════════════════════════════════════════
    function initGameplayTabs() {
        $$('.gp-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                $$('.gp-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });
    }

    // ═══════════════════════════════════════════════
    // FILTER CHIPS
    // ═══════════════════════════════════════════════
    function initFilterChips() {
        $$('.filter-bar').forEach(bar => {
            const chips = bar.querySelectorAll('.filter-chip');
            chips.forEach(chip => {
                chip.addEventListener('click', () => {
                    chips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                });
            });
        });
    }

    // ═══════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════
    function init() {
        initLoader();
        initCursorGlow();
        initSidebar();
        initChat();
        initAuth();
        initRouter();
        renderAllGameGrids();
        renderChallenges();
        renderGameplay();
        renderShowdowns();
        renderPromotions();
        renderSponsors();
        renderFAQ();
        renderBlog();
        renderWallet();
        initBalanceAnimation();
        initMobileNav();
        initHeroParallax();
        initModeButtons();
        initGameplayTabs();
        initFilterChips();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
