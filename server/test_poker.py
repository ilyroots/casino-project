import requests, socketio, time

r1 = requests.post('http://localhost:5001/api/auth/login', json={'email':'p1@test.com','password':'password123'})
t1 = r1.json()['token']
r2 = requests.post('http://localhost:5001/api/auth/login', json={'email':'p2@test.com','password':'password123'})
t2 = r2.json()['token']

h = {'Authorization': f'Bearer {t1}'}
r = requests.post('http://localhost:5001/api/poker/tables', headers=h, json={'name':'Test','small_blind':0.01,'big_blind':0.02,'min_buyin':1,'max_buyin':10,'currency':'BTC','max_seats':2})
table_id = r.json()['table_id']
print('Table:', table_id)

class Player:
    def __init__(self, token, name):
        self.token = token
        self.name = name
        self.seat = None
        self.s = socketio.Client()
        self.my_turn = False
        self._setup()

    def _setup(self):
        @self.s.on('joined_table')
        def on_jt(data):
            self.seat = data['seat']
            print(f'{self.name} joined seat {self.seat}')

        @self.s.on('table_state')
        def on_ts(data):
            hand = data.get('hand')
            if hand and hand.get('active_seat') == self.seat and hand.get('street') != 'complete':
                if not self.my_turn:
                    self.my_turn = True
                    time.sleep(0.5)
                    print(f'{self.name} calling...')
                    self.s.emit('player_action', {'table_id': table_id, 'action': 'call', 'amount': 0})
            else:
                self.my_turn = False

        @self.s.on('hand_complete')
        def on_hc(data):
            print(f'{self.name} hand complete, winners: {data.get("winners")}')

        @self.s.on('game_ended')
        def on_ge(data):
            print(f'{self.name} GAME ENDED: {data}')
            self.s.disconnect()

        @self.s.on('error')
        def on_err(data):
            print(f'{self.name} ERROR: {data}')

p1 = Player(t1, 'P1')
p2 = Player(t2, 'P2')

p1.s.connect(f'http://localhost:5001?token={p1.token}')
p2.s.connect(f'http://localhost:5001?token={p2.token}')

time.sleep(0.5)
p1.s.emit('join_table', {'table_id': table_id, 'buyin': 2})
time.sleep(0.5)
p2.s.emit('join_table', {'table_id': table_id, 'buyin': 2})

time.sleep(2)
p2.s.emit('start_game', {'table_id': table_id})

time.sleep(15)
print('Test complete')
p1.s.disconnect()
p2.s.disconnect()
