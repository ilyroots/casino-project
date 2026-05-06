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


def create_transaction(user_id, tx_type, currency, amount, wallet_address='', tx_hash=''):
    conn = get_db()
    c = conn.cursor()
    now = datetime.utcnow().isoformat()
    c.execute(
        'INSERT INTO transactions (user_id, type, currency, amount, status, tx_hash, wallet_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        (user_id, tx_type, currency, amount, 'pending', tx_hash, wallet_address, now)
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


# Initialize DB on import
init_db()
