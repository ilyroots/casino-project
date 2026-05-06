"""
DONK CASINO Flask Backend
Real crypto balances, deposits, withdrawals, JWT auth.
"""

import os
import sys
import io
import base64
import random
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import jwt
import qrcode

sys.path.insert(0, os.path.dirname(__file__))
import db

app = Flask(__name__, static_folder='..', static_url_path='')
CORS(app)

SECRET_KEY = os.environ.get('SECRET_KEY', 'donk-casino-secret-key-change-in-production')


def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


def decode_token(token):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing token'}), 401
        token = auth_header.split(' ')[1]
        data = decode_token(token)
        if not data:
            return jsonify({'error': 'Invalid or expired token'}), 401
        user = db.get_user_by_id(data['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 401
        request.user = user
        return f(*args, **kwargs)
    return decorated


# ═══════════════════════════════════════════════
# AUTH ROUTES
# ═══════════════════════════════════════════════

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not username or len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    if not email or '@' not in email:
        return jsonify({'error': 'Invalid email'}), 400
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    existing = db.get_user_by_email(email)
    if existing:
        return jsonify({'error': 'Email already registered'}), 409

    user_id = db.create_user(username, email, password)
    token = generate_token(user_id)

    return jsonify({
        'success': True,
        'token': token,
        'user': {'id': user_id, 'username': username, 'email': email}
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    user = db.get_user_by_email(email)
    if not user:
        return jsonify({'error': 'Invalid email or password'}), 401

    if not db.verify_password(password, user['password_hash']):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = generate_token(user['id'])
    return jsonify({
        'success': True,
        'token': token,
        'user': {'id': user['id'], 'username': user['username'], 'email': user['email']}
    })


@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_me():
    user = request.user
    return jsonify({
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'created_at': user['created_at'],
    })


# ═══════════════════════════════════════════════
# BALANCE ROUTES
# ═══════════════════════════════════════════════

@app.route('/api/balance', methods=['GET'])
@token_required
def get_balance():
    user_id = request.user['id']
    balances = db.get_balances(user_id)
    convert = request.args.get('convert', 'crypto')

    result = {}
    total_usd = 0.0

    for curr in db.CURRENCIES:
        amount = balances.get(curr, 0.0)
        usd_value = round(amount * db.USD_RATES.get(curr, 0), 2)
        total_usd += usd_value

        if convert == 'usd':
            result[curr] = {'usd': usd_value, 'rate': db.USD_RATES.get(curr, 0)}
        else:
            result[curr] = amount

    return jsonify({
        'balances': result,
        'total_usd': round(total_usd, 2),
        'mode': convert,
    })


@app.route('/api/balance/all', methods=['GET'])
@token_required
def get_all_balances():
    user_id = request.user['id']
    balances = db.get_balances(user_id)
    total_usd = 0.0
    result = {}

    for curr in db.CURRENCIES:
        amount = balances.get(curr, 0.0)
        usd_value = round(amount * db.USD_RATES.get(curr, 0), 2)
        total_usd += usd_value
        result[curr] = {
            'crypto': round(amount, 8),
            'usd': usd_value,
            'rate': db.USD_RATES.get(curr, 0),
        }

    return jsonify({
        'balances': result,
        'total_usd': round(total_usd, 2),
    })


# ═══════════════════════════════════════════════
# DEPOSIT ROUTES
# ═══════════════════════════════════════════════

@app.route('/api/deposit/address', methods=['GET'])
@token_required
def get_deposit_address():
    user_id = request.user['id']
    currency = request.args.get('currency', 'BTC').upper()
    if currency not in db.CURRENCIES:
        return jsonify({'error': 'Invalid currency'}), 400

    addresses = db.get_user_deposit_addresses(user_id)
    address = addresses.get(currency, '')

    return jsonify({
        'currency': currency,
        'address': address,
    })


@app.route('/api/deposit/qr', methods=['GET'])
@token_required
def get_deposit_qr():
    user_id = request.user['id']
    currency = request.args.get('currency', 'BTC').upper()
    amount = request.args.get('amount', '')

    if currency not in db.CURRENCIES:
        return jsonify({'error': 'Invalid currency'}), 400

    addresses = db.get_user_deposit_addresses(user_id)
    address = addresses.get(currency, '')

    # Build QR payload (BIP21 style for BTC, simple address for others)
    if currency == 'BTC' and amount:
        qr_data = f"bitcoin:{address}?amount={amount}"
    elif currency == 'ETH' and amount:
        qr_data = f"ethereum:{address}?value={amount}"
    elif currency == 'LTC' and amount:
        qr_data = f"litecoin:{address}?amount={amount}"
    else:
        qr_data = address

    img = qrcode.make(qr_data, box_size=6, border=2)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    img_b64 = base64.b64encode(buf.read()).decode()

    return jsonify({
        'currency': currency,
        'address': address,
        'qr_base64': f'data:image/png;base64,{img_b64}',
    })


@app.route('/api/deposit/request', methods=['POST'])
@token_required
def request_deposit():
    """User creates a deposit request. Admin confirms later."""
    data = request.get_json() or {}
    currency = data.get('currency', 'BTC').upper()
    amount = float(data.get('amount', 0))

    if currency not in db.CURRENCIES:
        return jsonify({'error': 'Invalid currency'}), 400
    if amount <= 0:
        return jsonify({'error': 'Amount must be greater than 0'}), 400

    user_id = request.user['id']
    addresses = db.get_user_deposit_addresses(user_id)
    address = addresses.get(currency, '')

    tx_id = db.create_transaction(
        user_id=user_id,
        tx_type='deposit',
        currency=currency,
        amount=amount,
        wallet_address=address,
    )

    return jsonify({
        'success': True,
        'transaction_id': tx_id,
        'currency': currency,
        'amount': amount,
        'address': address,
        'status': 'pending',
        'message': 'Send the exact amount to the provided address. Your balance will be credited after network confirmation.'
    })


# ═══════════════════════════════════════════════
# WITHDRAWAL ROUTES
# ═══════════════════════════════════════════════

@app.route('/api/withdraw', methods=['POST'])
@token_required
def request_withdrawal():
    data = request.get_json() or {}
    currency = data.get('currency', 'BTC').upper()
    amount = float(data.get('amount', 0))
    wallet_address = data.get('wallet_address', '').strip()

    if currency not in db.CURRENCIES:
        return jsonify({'error': 'Invalid currency'}), 400
    if amount <= 0:
        return jsonify({'error': 'Amount must be greater than 0'}), 400
    if not wallet_address:
        return jsonify({'error': 'Wallet address is required'}), 400

    user_id = request.user['id']
    balances = db.get_balances(user_id)
    current = balances.get(currency, 0.0)

    if amount > current:
        return jsonify({'error': f'Insufficient {currency} balance'}), 400

    # Deduct balance immediately (hold it)
    db.update_balance(user_id, currency, -amount)

    tx_id = db.create_transaction(
        user_id=user_id,
        tx_type='withdraw',
        currency=currency,
        amount=amount,
        wallet_address=wallet_address,
    )

    return jsonify({
        'success': True,
        'transaction_id': tx_id,
        'currency': currency,
        'amount': amount,
        'wallet_address': wallet_address,
        'status': 'pending',
        'message': 'Withdrawal request submitted. Processing typically takes 15-60 minutes.'
    })


# ═══════════════════════════════════════════════
# ROULETTE
# ═══════════════════════════════════════════════

# European roulette payout table
ROULETTE_PAYOUTS = {
    'straight': 35,
    'split': 17,
    'street': 11,
    'corner': 8,
    'sixline': 5,
    'column': 2,
    'dozen': 2,
    'even': 1,
}

RED_NUMS = {1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36}

def calc_roulette_winnings(result, bets):
    """Calculate total payout for a list of bets given the result number."""
    total_win = 0.0
    for bet in bets:
        bet_type = bet.get('type', 'straight')
        nums = bet.get('nums', [])
        amount = float(bet.get('amount', 0))
        if result in nums:
            payout = ROULETTE_PAYOUTS.get(bet_type, 0)
            total_win += amount * (payout + 1)  # stake + winnings
    return total_win

@app.route('/api/roulette/spin', methods=['POST'])
@token_required
def roulette_spin():
    data = request.get_json() or {}
    user_id = request.user['id']
    currency = data.get('currency', 'BTC').upper()
    bets = data.get('bets', [])
    total_bet = sum(float(b.get('amount', 0)) for b in bets)

    if currency not in db.CURRENCIES:
        return jsonify({'error': 'Invalid currency'}), 400
    if total_bet <= 0:
        return jsonify({'error': 'Bet amount must be greater than 0'}), 400
    if len(bets) == 0:
        return jsonify({'error': 'No bets placed'}), 400

    balances = db.get_balances(user_id)
    current = balances.get(currency, 0.0)
    if total_bet > current:
        return jsonify({'error': f'Insufficient {currency} balance'}), 400

    # Deduct bet
    db.update_balance(user_id, currency, -total_bet)
    db.create_transaction(user_id, 'roulette_bet', currency, -total_bet, 'roulette_bet', status='complete')

    # Generate result
    result = random.randint(0, 36)

    # Calculate winnings
    total_win = calc_roulette_winnings(result, bets)
    profit = total_win - total_bet

    # Credit winnings if any
    if total_win > 0:
        db.update_balance(user_id, currency, total_win)
        db.create_transaction(user_id, 'roulette_win', currency, total_win, f'win_{result}', status='complete')

    new_balance = db.get_balances(user_id).get(currency, 0.0)

    return jsonify({
        'success': True,
        'result': result,
        'color': 'green' if result == 0 else ('red' if result in RED_NUMS else 'black'),
        'total_bet': total_bet,
        'total_win': total_win,
        'profit': profit,
        'new_balance': new_balance,
        'currency': currency
    })


# ═══════════════════════════════════════════════
# TRANSACTION HISTORY
# ═══════════════════════════════════════════════

@app.route('/api/transactions', methods=['GET'])
@token_required
def get_transactions():
    user_id = request.user['id']
    txs = db.get_transactions(user_id, limit=100)
    return jsonify({'transactions': txs})


# ═══════════════════════════════════════════════
# STATIC FILES (Serve frontend)
# ═══════════════════════════════════════════════

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(app.static_folder, path)


if __name__ == '__main__':
    print('DONK CASINO Server starting on http://localhost:5000')
    app.run(host='0.0.0.0', port=5000, debug=True)
