"""
DONK CASINO Flask Backend
Real crypto balances, deposits, withdrawals, JWT auth.
"""

import os
import sys
import io
import json
import base64
import random
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import jwt
import qrcode

sys.path.insert(0, os.path.dirname(__file__))
import db
import poker_engine

app = Flask(__name__, static_folder='..')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='gevent', logger=False, engineio_logger=False)


@app.after_request
def add_cache_headers(response):
    """Prevent aggressive caching of dynamic responses."""
    if request.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response

SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    import warnings
    warnings.warn('SECRET_KEY not set! Using fallback. Set SECRET_KEY env var for production.')
    SECRET_KEY = 'donk-casino-secret-key-change-in-production'


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
# POKER
# ═══════════════════════════════════════════════

@app.route('/api/poker/bet', methods=['POST'])
@token_required
def poker_bet():
    data = request.get_json() or {}
    user_id = request.user['id']
    currency = data.get('currency', 'BTC').upper()
    amount = float(data.get('amount', 0))
    action = data.get('action', 'deduct')  # 'deduct' or 'credit'

    if currency not in db.CURRENCIES:
        return jsonify({'error': 'Invalid currency'}), 400
    if amount <= 0:
        return jsonify({'error': 'Amount must be greater than 0'}), 400

    balances = db.get_balances(user_id)
    current = balances.get(currency, 0.0)

    if action == 'deduct':
        if amount > current:
            return jsonify({'error': f'Insufficient {currency} balance'}), 400
        db.update_balance(user_id, currency, -amount)
        db.create_transaction(user_id, 'poker_bet', currency, -amount, 'poker_bet', status='complete')
    elif action == 'credit':
        db.update_balance(user_id, currency, amount)
        db.create_transaction(user_id, 'poker_win', currency, amount, 'poker_win', status='complete')

    new_balance = db.get_balances(user_id).get(currency, 0.0)
    return jsonify({'success': True, 'new_balance': new_balance, 'currency': currency})


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
    response = send_from_directory(app.static_folder, 'index.html')
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response


@app.route('/<path:path>')
def static_files(path):
    # Never serve API paths as static files — return JSON 404
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    # Try to serve the file; fall back to index.html for SPA routing
    import os as _os
    full = _os.path.join(app.static_folder, path)
    if _os.path.isfile(full):
        response = send_from_directory(app.static_folder, path)
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response
    # SPA fallback: return index.html so hash-router can handle the view
    response = send_from_directory(app.static_folder, 'index.html')
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response


# ═══════════════════════════════════════════════
# SOCKETIO POKER EVENTS
# ═══════════════════════════════════════════════

def get_user_from_socket(auth):
    token = auth.get('token', '') if auth else ''
    if not token:
        return None
    data = decode_token(token)
    if not data:
        return None
    return db.get_user_by_id(data['user_id'])


@socketio.on('connect')
def handle_connect(auth):
    emit('connected', {'status': 'ok'})


@socketio.on('disconnect')
def handle_disconnect():
    pass


@socketio.on('join_lobby')
def handle_join_lobby():
    join_room('lobby')
    tables = []
    for t in poker_engine.table_manager.list_tables():
        players = db.get_table_players(t.table_id)
        tables.append({
            'id': t.table_id,
            'name': t.name,
            'status': t.status,
            'small_blind': t.small_blind,
            'big_blind': t.big_blind,
            'min_buyin': t.min_buyin,
            'max_buyin': t.max_buyin,
            'currency': t.currency,
            'max_seats': t.max_seats,
            'players': len(players),
        })
    emit('lobby_state', {'tables': tables})


@socketio.on('leave_lobby')
def handle_leave_lobby():
    leave_room('lobby')


@socketio.on('create_table')
def handle_create_table(data):
    user = get_user_from_socket(request.args)
    if not user:
        emit('error', {'message': 'Authentication required'})
        return

    name = data.get('name', 'Poker Table').strip()
    sb = float(data.get('small_blind', 0.01))
    bb = float(data.get('big_blind', 0.02))
    min_buy = float(data.get('min_buyin', 1.0))
    max_buy = float(data.get('max_buyin', 100.0))
    currency = data.get('currency', 'BTC').upper()
    max_seats = int(data.get('max_seats', 6))

    if currency not in db.CURRENCIES:
        emit('error', {'message': 'Invalid currency'})
        return
    if sb <= 0 or bb <= 0 or min_buy <= 0 or max_buy < min_buy:
        emit('error', {'message': 'Invalid stakes'})
        return

    table_id = db.create_poker_table(name, sb, bb, min_buy, max_buy, currency, max_seats)
    table = poker_engine.table_manager.create_table(table_id, name, sb, bb, min_buy, max_buy, currency, max_seats)

    emit('table_created', {'table_id': table_id})
    socketio.emit('lobby_update', {'tables': [{
        'id': table_id,
        'name': name,
        'status': 'waiting',
        'small_blind': sb,
        'big_blind': bb,
        'min_buyin': min_buy,
        'max_buyin': max_buy,
        'currency': currency,
        'max_seats': max_seats,
        'players': 0,
    }]}, room='lobby')


@socketio.on('join_table')
def handle_join_table(data):
    user = get_user_from_socket(request.args)
    if not user:
        emit('error', {'message': 'Authentication required'})
        return

    table_id = int(data.get('table_id', 0))
    buyin = float(data.get('buyin', 0))
    table_state = poker_engine.table_manager.get_table(table_id)
    db_table = db.get_poker_table(table_id)

    if not db_table or not table_state:
        emit('error', {'message': 'Table not found'})
        return
    if db_table['status'] == 'ended':
        emit('error', {'message': 'Table has ended'})
        return
    if buyin < db_table['min_buyin'] or buyin > db_table['max_buyin']:
        emit('error', {'message': f'Buy-in must be between {db_table["min_buyin"]} and {db_table["max_buyin"]}'})
        return

    # Check balance
    balances = db.get_balances(user['id'])
    if balances.get(db_table['currency'], 0) < buyin:
        emit('error', {'message': f'Insufficient {db_table["currency"]} balance'})
        return

    # Check if already seated
    existing = db.get_table_player(table_id, user['id'])
    if existing:
        emit('error', {'message': 'Already seated at this table'})
        return

    # Find open seat
    occupied_seats = set(table_state.players.keys())
    open_seats = [s for s in range(1, db_table['max_seats'] + 1) if s not in occupied_seats]
    if not open_seats:
        emit('error', {'message': 'Table is full'})
        return

    seat = open_seats[0]

    # Deduct buy-in
    db.update_balance(user['id'], db_table['currency'], -buyin)
    db.create_transaction(user['id'], 'poker_buyin', db_table['currency'], -buyin, status='complete')

    # Add to DB and memory
    db.add_player_to_table(table_id, user['id'], seat, buyin)
    player = poker_engine.PokerPlayerState(user['id'], user['username'], seat, buyin)
    table_state.players[seat] = player

    join_room(f'table_{table_id}')
    emit('joined_table', {'table_id': table_id, 'seat': seat})
    socketio.emit('table_state', table_state.to_dict(for_user_id=user['id']), room=f'table_{table_id}')
    socketio.emit('lobby_update', {'tables': [{
        'id': table_id,
        'name': db_table['name'],
        'status': table_state.status,
        'small_blind': db_table['small_blind'],
        'big_blind': db_table['big_blind'],
        'min_buyin': db_table['min_buyin'],
        'max_buyin': db_table['max_buyin'],
        'currency': db_table['currency'],
        'max_seats': db_table['max_seats'],
        'players': len(table_state.players),
    }]}, room='lobby')


@socketio.on('leave_table')
def handle_leave_table(data):
    user = get_user_from_socket(request.args)
    if not user:
        emit('error', {'message': 'Authentication required'})
        return

    table_id = int(data.get('table_id', 0))
    table_state = poker_engine.table_manager.get_table(table_id)
    db_table = db.get_poker_table(table_id)

    if not table_state:
        emit('error', {'message': 'Table not found'})
        return

    player = None
    for p in table_state.players.values():
        if p.user_id == user['id']:
            player = p
            break

    if not player:
        emit('error', {'message': 'Not seated at this table'})
        return

    # Return remaining chips
    if player.chips > 0:
        db.update_balance(user['id'], db_table['currency'], player.chips)
        db.create_transaction(user['id'], 'poker_cashout', db_table['currency'], player.chips, status='complete')

    db.remove_player_from_table(table_id, user['id'])
    del table_state.players[player.seat]
    leave_room(f'table_{table_id}')

    emit('left_table', {'table_id': table_id})
    socketio.emit('table_state', table_state.to_dict(), room=f'table_{table_id}')


@socketio.on('start_game')
def handle_start_game(data):
    user = get_user_from_socket(request.args)
    if not user:
        emit('error', {'message': 'Authentication required'})
        return

    table_id = int(data.get('table_id', 0))
    table_state = poker_engine.table_manager.get_table(table_id)

    if not table_state:
        emit('error', {'message': 'Table not found'})
        return

    if table_state.status == 'active':
        emit('error', {'message': 'Game already in progress'})
        return

    active_players = table_state.get_non_eliminated_players()
    if len(active_players) < 2:
        emit('error', {'message': 'Need at least 2 players to start'})
        return

    db.update_poker_table_status(table_id, 'active')
    success = table_state.start_new_hand()
    if success:
        # Persist hand to DB
        hand = table_state.hand
        db_hand_id = db.create_poker_hand(
            table_id, hand.hand_number, hand.dealer_seat, hand.sb_seat, hand.bb_seat
        )
        hand.hand_id_db = db_hand_id
        # Record blind actions
        for p in active_players:
            if p.is_sb:
                db.record_poker_action(db_hand_id, p.user_id, 'sb', p.current_bet, 'preflop')
            elif p.is_bb:
                db.record_poker_action(db_hand_id, p.user_id, 'bb', p.current_bet, 'preflop')

        socketio.emit('table_state', table_state.to_dict(), room=f'table_{table_id}')
        socketio.emit('lobby_update', {'tables': [{
            'id': table_id,
            'name': table_state.name,
            'status': table_state.status,
            'small_blind': table_state.small_blind,
            'big_blind': table_state.big_blind,
            'min_buyin': table_state.min_buyin,
            'max_buyin': table_state.max_buyin,
            'currency': table_state.currency,
            'max_seats': table_state.max_seats,
            'players': len(table_state.players),
        }]}, room='lobby')
    else:
        emit('error', {'message': 'Failed to start hand'})


@socketio.on('player_action')
def handle_player_action(data):
    user = get_user_from_socket(request.args)
    if not user:
        emit('error', {'message': 'Authentication required'})
        return

    table_id = int(data.get('table_id', 0))
    action = data.get('action', '')
    amount = float(data.get('amount', 0))

    table_state = poker_engine.table_manager.get_table(table_id)
    if not table_state or not table_state.hand:
        emit('error', {'message': 'No active hand'})
        return

    # Find player's seat
    seat = None
    for s, p in table_state.players.items():
        if p.user_id == user['id']:
            seat = s
            break

    if seat is None:
        emit('error', {'message': 'Not seated at table'})
        return

    # Capture current street before processing (advance_game may change it)
    current_street = table_state.hand.street if table_state.hand else 'preflop'

    success, message = table_state.process_action(seat, action, amount)
    if not success:
        emit('error', {'message': message})
        return

    # Record action in DB
    if table_state.hand and table_state.hand.hand_id_db:
        # Calculate actual amount for this action
        actual_amount = amount if action in ('bet', 'raise', 'all_in') else 0
        if action == 'call':
            actual_amount = amount  # Use the call amount passed (may be clamped by process_action)
        db.record_poker_action(
            table_state.hand.hand_id_db, user['id'], action,
            actual_amount,
            current_street
        )

    # If hand ended, update DB and check tournament end
    if table_state.hand.street == 'complete':
        hand = table_state.hand
        winner_ids = []
        for s in hand.winners:
            p = table_state.players.get(s)
            if p:
                winner_ids.append(p.user_id)
        db.update_poker_hand(
            hand.hand_id_db,
            community_cards=json.dumps([c.to_dict() for c in hand.community_cards]),
            pot=round(hand.pot, 8),
            status='complete',
            winner_ids=json.dumps(winner_ids),
            ended_at=datetime.utcnow().isoformat()
        )

        # Check if tournament ended
        remaining = table_state.get_non_eliminated_players()
        if len(remaining) == 1:
            winner = remaining[0]
            db.update_poker_table_status(table_id, 'ended')
            socketio.emit('game_ended', {
                'winner': {'user_id': winner.user_id, 'username': winner.username, 'seat': winner.seat},
                'table_id': table_id,
            }, room=f'table_{table_id}')
        else:
            # Auto-start next hand after 3 seconds
            pass  # Hand complete, auto-starting next hand
            socketio.emit('hand_complete', {
                'winners': hand.winners,
                'player_cards': {str(s): [c.to_dict() for c in p.hole_cards] for s, p in table_state.players.items() if p.status in ('active', 'all_in', 'folded')},
            }, room=f'table_{table_id}')
            socketio.sleep(3)
            if table_id in poker_engine.table_manager.tables:
                ts = poker_engine.table_manager.get_table(table_id)
                if ts and ts.status == 'active':
                    success = ts.start_new_hand()
                    if success and ts.hand:
                        db_hand_id = db.create_poker_hand(
                            table_id, ts.hand.hand_number, ts.hand.dealer_seat, ts.hand.sb_seat, ts.hand.bb_seat
                        )
                        ts.hand.hand_id_db = db_hand_id
                        for p in ts.get_non_eliminated_players():
                            if p.is_sb:
                                db.record_poker_action(db_hand_id, p.user_id, 'sb', p.current_bet, 'preflop')
                            elif p.is_bb:
                                db.record_poker_action(db_hand_id, p.user_id, 'bb', p.current_bet, 'preflop')
                        socketio.emit('table_state', ts.to_dict(), room=f'table_{table_id}')

    socketio.emit('table_state', table_state.to_dict(), room=f'table_{table_id}')


@socketio.on('get_table_state')
def handle_get_table_state(data):
    user = get_user_from_socket(request.args)
    table_id = int(data.get('table_id', 0))
    table_state = poker_engine.table_manager.get_table(table_id)
    if table_state:
        user_id = user['id'] if user else None
        emit('table_state', table_state.to_dict(for_user_id=user_id))


# ═══════════════════════════════════════════════
# POKER REST ROUTES
# ═══════════════════════════════════════════════

@app.route('/api/poker/tables', methods=['GET'])
def get_poker_tables():
    tables = []
    for t in poker_engine.table_manager.list_tables():
        players = db.get_table_players(t.table_id)
        tables.append({
            'id': t.table_id,
            'name': t.name,
            'status': t.status,
            'small_blind': t.small_blind,
            'big_blind': t.big_blind,
            'min_buyin': t.min_buyin,
            'max_buyin': t.max_buyin,
            'currency': t.currency,
            'max_seats': t.max_seats,
            'players': len(players),
        })
    return jsonify({'tables': tables})


@app.route('/api/poker/tables', methods=['POST'])
@token_required
def create_poker_table_rest():
    data = request.get_json() or {}
    name = data.get('name', 'Poker Table').strip()
    sb = float(data.get('small_blind', 0.01))
    bb = float(data.get('big_blind', 0.02))
    min_buy = float(data.get('min_buyin', 1.0))
    max_buy = float(data.get('max_buyin', 100.0))
    currency = data.get('currency', 'BTC').upper()
    max_seats = int(data.get('max_seats', 6))

    if currency not in db.CURRENCIES:
        return jsonify({'error': 'Invalid currency'}), 400
    if sb <= 0 or bb <= 0 or min_buy <= 0 or max_buy < min_buy:
        return jsonify({'error': 'Invalid stakes'}), 400

    table_id = db.create_poker_table(name, sb, bb, min_buy, max_buy, currency, max_seats)
    poker_engine.table_manager.create_table(table_id, name, sb, bb, min_buy, max_buy, currency, max_seats)
    return jsonify({'success': True, 'table_id': table_id})


# ═══════════════════════════════════════════════
# HEALTH CHECK
# ═══════════════════════════════════════════════

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'service': 'donk-casino', 'timestamp': datetime.utcnow().isoformat()})


# ═══════════════════════════════════════════════
# ADMIN ENDPOINTS
# ═══════════════════════════════════════════════

ADMIN_KEY = os.environ.get('ADMIN_KEY', '')

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        key = request.headers.get('X-Admin-Key', '')
        if not ADMIN_KEY:
            return jsonify({'error': 'Admin access not configured'}), 503
        if key != ADMIN_KEY:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated


@app.route('/api/admin/seed', methods=['POST'])
@admin_required
def admin_seed():
    """Seed test data: create test users with starting balances."""
    data = request.get_json() or {}
    users_to_seed = data.get('users', [
        {'username': 'roots', 'email': 'roots@test.com', 'password': 'password123', 'balance': 10000},
        {'username': 'test1', 'email': 'test1@test.com', 'password': 'password123', 'balance': 5000},
        {'username': 'test2', 'email': 'test2@test.com', 'password': 'password123', 'balance': 5000},
    ])

    created = []
    for u in users_to_seed:
        existing = db.get_user_by_email(u['email']) or db.get_user_by_username(u['username'])
        if existing:
            user_id = existing['id']
        else:
            try:
                user_id = db.create_user(u['username'], u['email'], u['password'])
                created.append(u['username'])
            except Exception as e:
                print(f"[SEED] Failed to create {u['username']}: {e}")
                continue

        # Set balances for all currencies
        for curr in db.CURRENCIES:
            db.update_balance(user_id, curr, u.get('balance', 10000))

    return jsonify({'success': True, 'created': created, 'message': f'Seeded {len(created)} new users, updated balances for all'})


@app.route('/api/admin/give-balance', methods=['POST'])
@admin_required
def admin_give_balance():
    """Give balance to any user by username."""
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    currency = data.get('currency', 'BTC').upper()
    amount = float(data.get('amount', 0))

    if not username:
        return jsonify({'error': 'Username required'}), 400
    if currency not in db.CURRENCIES:
        return jsonify({'error': 'Invalid currency'}), 400
    if amount <= 0:
        return jsonify({'error': 'Amount must be > 0'}), 400

    user = db.get_user_by_username(username)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    db.update_balance(user['id'], currency, amount)
    db.create_transaction(user['id'], 'admin_credit', currency, amount, status='complete')

    new_bal = db.get_balances(user['id']).get(currency, 0)
    return jsonify({'success': True, 'username': username, 'currency': currency, 'amount': amount, 'new_balance': new_bal})


@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_list_users():
    """List all users with balances."""
    users = db.get_all_users()
    return jsonify({'users': users})


@app.route('/api/admin/tables', methods=['GET'])
@admin_required
def admin_list_tables():
    """List all poker tables with full details."""
    tables = db.get_all_poker_tables()
    return jsonify({'tables': tables})


# ═══════════════════════════════════════════════
# STARTUP INITIALIZATION
# ═══════════════════════════════════════════════

def init_app():
    """Initialize database tables and seed test data if needed."""
    db.init_db()
    print('[INIT] Database initialized')

    # Auto-seed if ROOTS_SEED_BALANCE env is set (for Railway quick start)
    seed_balance = os.environ.get('ROOTS_SEED_BALANCE', '')
    if seed_balance:
        try:
            bal = float(seed_balance)
            user = db.get_user_by_username('roots')
            if not user:
                user_id = db.create_user('roots', 'roots@test.com', 'password123')
                print(f'[INIT] Created roots user (id={user_id})')
            else:
                user_id = user['id']
            for curr in db.CURRENCIES:
                db.update_balance(user_id, curr, bal)
            print(f'[INIT] Seeded roots with {bal} per currency')
        except Exception as e:
            print(f'[INIT] Seed error: {e}')


init_app()


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f'DONK CASINO Server starting on port {port}')
    socketio.run(app, host='0.0.0.0', port=port, debug=False)
