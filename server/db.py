"""
DONK CASINO Database Layer
SQLite with real user accounts, balances, and transactions.
"""

import sqlite3
import os
import secrets
import hashlib
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'casino.db')

CURRENCIES = ['BTC', 'ETH', 'SOL', 'USDT', 'LTC']

# Mock USD rates (in production these would come from a price API)
USD_RATES = {
    'BTC': 94500.00,
    'ETH': 3450.00,
    'SOL': 142.00,
    'USDT': 1.00,
    'LTC': 85.00,
}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()

    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            btc_address TEXT DEFAULT '',
            eth_address TEXT DEFAULT '',
            sol_address TEXT DEFAULT '',
            usdt_address TEXT DEFAULT '',
            ltc_address TEXT DEFAULT ''
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS balances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            currency TEXT NOT NULL,
            amount REAL DEFAULT 0.0,
            updated_at TEXT NOT NULL,
            UNIQUE(user_id, currency)
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            currency TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            tx_hash TEXT DEFAULT '',
            wallet_address TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS poker_tables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            status TEXT DEFAULT 'waiting',
            small_blind REAL NOT NULL,
            big_blind REAL NOT NULL,
            min_buyin REAL NOT NULL,
            max_buyin REAL NOT NULL,
            currency TEXT NOT NULL,
            max_seats INTEGER DEFAULT 6,
            pot REAL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS poker_table_players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            seat INTEGER NOT NULL,
            chips REAL DEFAULT 0,
            status TEXT DEFAULT 'active',
            UNIQUE(table_id, seat),
            UNIQUE(table_id, user_id)
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS poker_hands (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_id INTEGER NOT NULL,
            hand_number INTEGER NOT NULL,
            dealer_seat INTEGER,
            sb_seat INTEGER,
            bb_seat INTEGER,
            community_cards TEXT DEFAULT '',
            pot REAL DEFAULT 0,
            status TEXT DEFAULT 'dealing',
            winner_ids TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            ended_at TEXT
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS poker_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hand_id INTEGER NOT NULL,
            player_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            amount REAL DEFAULT 0,
            street TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')

    conn.commit()
    conn.close()


def generate_address(currency):
    """Generate a mock deposit address. In production, these come from your wallet provider."""
    prefix = {
        'BTC': 'bc1q',
        'ETH': '0x',
        'SOL': '',
        'USDT': 'T',
        'LTC': 'ltc1q',
    }.get(currency, '')
    suffix = secrets.token_hex(16 if currency in ('ETH', 'SOL') else 20)
    if currency == 'SOL':
        return suffix[:32] + secrets.token_hex(4)
    return prefix + suffix


def hash_password(password):
    import bcrypt
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(password, hashed):
    import bcrypt
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_user(username, email, password):
    conn = get_db()
    c = conn.cursor()
    now = datetime.utcnow().isoformat()

    # Create user
    c.execute(
        'INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
        (username, email, hash_password(password), now)
    )
    user_id = c.lastrowid

    # Generate deposit addresses
    for curr in CURRENCIES:
        addr = generate_address(curr)
        c.execute(
            f'UPDATE users SET {curr.lower()}_address = ? WHERE id = ?',
            (addr, user_id)
        )

    # Initialize zero balances for all currencies
    for curr in CURRENCIES:
        c.execute(
            'INSERT INTO balances (user_id, currency, amount, updated_at) VALUES (?, ?, 0.0, ?)',
            (user_id, curr, now)
        )

    conn.commit()
    conn.close()
    return user_id


def get_user_by_email(email):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE email = ?', (email,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None


def get_balances(user_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT currency, amount FROM balances WHERE user_id = ?', (user_id,))
    rows = c.fetchall()
    conn.close()
    return {r['currency']: r['amount'] for r in rows}


def update_balance(user_id, currency, amount):
    conn = get_db()
    c = conn.cursor()
    now = datetime.utcnow().isoformat()
    c.execute(
        'UPDATE balances SET amount = amount + ?, updated_at = ? WHERE user_id = ? AND currency = ?',
        (amount, now, user_id, currency)
    )
    conn.commit()
    conn.close()


def create_transaction(user_id, tx_type, currency, amount, wallet_address='', tx_hash='', status='pending'):
    conn = get_db()
    c = conn.cursor()
    now = datetime.utcnow().isoformat()
    c.execute(
        'INSERT INTO transactions (user_id, type, currency, amount, status, tx_hash, wallet_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        (user_id, tx_type, currency, amount, status, tx_hash, wallet_address, now)
    )
    tx_id = c.lastrowid
    conn.commit()
    conn.close()
    return tx_id


def get_transactions(user_id, limit=50):
    conn = get_db()
    c = conn.cursor()
    c.execute(
        'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        (user_id, limit)
    )
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def confirm_transaction(tx_id, tx_hash=''):
    """Admin confirms a deposit or processes a withdrawal."""
    conn = get_db()
    c = conn.cursor()
    now = datetime.utcnow().isoformat()
    c.execute(
        'UPDATE transactions SET status = ?, tx_hash = ?, created_at = ? WHERE id = ?',
        ('completed', tx_hash, now, tx_id)
    )
    conn.commit()
    conn.close()


def get_user_deposit_addresses(user_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT btc_address, eth_address, sol_address, usdt_address, ltc_address FROM users WHERE id = ?', (user_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return {}
    return {
        'BTC': row['btc_address'],
        'ETH': row['eth_address'],
        'SOL': row['sol_address'],
        'USDT': row['usdt_address'],
        'LTC': row['ltc_address'],
    }


def get_total_usd_value(balances):
    total = 0.0
    for curr, amount in balances.items():
        total += amount * USD_RATES.get(curr, 0)
    return round(total, 2)


# ═══════════════════════════════════════════════
# POKER DB HELPERS
# ═══════════════════════════════════════════════

def create_poker_table(name, small_blind, big_blind, min_buyin, max_buyin, currency, max_seats=6):
    conn = get_db()
    c = conn.cursor()
    now = datetime.utcnow().isoformat()
    c.execute(
        'INSERT INTO poker_tables (name, small_blind, big_blind, min_buyin, max_buyin, currency, max_seats, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        (name, small_blind, big_blind, min_buyin, max_buyin, currency, max_seats, now, now)
    )
    table_id = c.lastrowid
    conn.commit()
    conn.close()
    return table_id


def get_poker_table(table_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM poker_tables WHERE id = ?', (table_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None


def get_all_poker_tables():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM poker_tables ORDER BY created_at DESC')
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_poker_table_status(table_id, status):
    conn = get_db()
    c = conn.cursor()
    now = datetime.utcnow().isoformat()
    c.execute('UPDATE poker_tables SET status = ?, updated_at = ? WHERE id = ?', (status, now, table_id))
    conn.commit()
    conn.close()


def delete_poker_table(table_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM poker_actions WHERE hand_id IN (SELECT id FROM poker_hands WHERE table_id = ?)', (table_id,))
    c.execute('DELETE FROM poker_hands WHERE table_id = ?', (table_id,))
    c.execute('DELETE FROM poker_table_players WHERE table_id = ?', (table_id,))
    c.execute('DELETE FROM poker_tables WHERE id = ?', (table_id,))
    conn.commit()
    conn.close()


def add_player_to_table(table_id, user_id, seat, chips=0):
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute(
            'INSERT INTO poker_table_players (table_id, user_id, seat, chips) VALUES (?, ?, ?, ?)',
            (table_id, user_id, seat, chips)
        )
        conn.commit()
        player_id = c.lastrowid
    except sqlite3.IntegrityError:
        player_id = None
    conn.close()
    return player_id


def get_table_players(table_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT ptp.*, u.username FROM poker_table_players ptp JOIN users u ON ptp.user_id = u.id WHERE ptp.table_id = ? ORDER BY ptp.seat', (table_id,))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_table_player(table_id, user_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT ptp.*, u.username FROM poker_table_players ptp JOIN users u ON ptp.user_id = u.id WHERE ptp.table_id = ? AND ptp.user_id = ?', (table_id, user_id))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None


def update_table_player_chips(table_id, user_id, chips):
    conn = get_db()
    c = conn.cursor()
    c.execute('UPDATE poker_table_players SET chips = ? WHERE table_id = ? AND user_id = ?', (chips, table_id, user_id))
    conn.commit()
    conn.close()


def update_table_player_status(table_id, user_id, status):
    conn = get_db()
    c = conn.cursor()
    c.execute('UPDATE poker_table_players SET status = ? WHERE table_id = ? AND user_id = ?', (status, table_id, user_id))
    conn.commit()
    conn.close()


def remove_player_from_table(table_id, user_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM poker_table_players WHERE table_id = ? AND user_id = ?', (table_id, user_id))
    conn.commit()
    conn.close()


def create_poker_hand(table_id, hand_number, dealer_seat, sb_seat, bb_seat):
    conn = get_db()
    c = conn.cursor()
    now = datetime.utcnow().isoformat()
    c.execute(
        'INSERT INTO poker_hands (table_id, hand_number, dealer_seat, sb_seat, bb_seat, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        (table_id, hand_number, dealer_seat, sb_seat, bb_seat, now)
    )
    hand_id = c.lastrowid
    conn.commit()
    conn.close()
    return hand_id


def update_poker_hand(hand_id, community_cards=None, pot=None, status=None, winner_ids=None, ended_at=None):
    conn = get_db()
    c = conn.cursor()
    fields = []
    values = []
    if community_cards is not None:
        fields.append('community_cards = ?')
        values.append(community_cards)
    if pot is not None:
        fields.append('pot = ?')
        values.append(pot)
    if status is not None:
        fields.append('status = ?')
        values.append(status)
    if winner_ids is not None:
        fields.append('winner_ids = ?')
        values.append(winner_ids)
    if ended_at is not None:
        fields.append('ended_at = ?')
        values.append(ended_at)
    if fields:
        values.append(hand_id)
        c.execute(f"UPDATE poker_hands SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()
    conn.close()


def record_poker_action(hand_id, player_id, action, amount, street):
    conn = get_db()
    c = conn.cursor()
    now = datetime.utcnow().isoformat()
    c.execute(
        'INSERT INTO poker_actions (hand_id, player_id, action, amount, street, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        (hand_id, player_id, action, amount, street, now)
    )
    conn.commit()
    conn.close()


# Initialize DB on import
init_db()
