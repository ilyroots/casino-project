"""
DONK CASINO — Texas Hold'em Poker Engine
Full tournament-style multiplayer logic.
"""

import random
import json
from datetime import datetime

# ═══════════════════════════════════════════════
# CARD UTILITIES
# ═══════════════════════════════════════════════

SUITS = ['♠', '♥', '♦', '♣']
RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
RANK_VALUE = {'2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14}


class Card:
    def __init__(self, rank, suit):
        self.rank = rank
        self.suit = suit
        self.value = RANK_VALUE[rank]

    def to_dict(self):
        return {'rank': self.rank, 'suit': self.suit, 'value': self.value}

    @classmethod
    def from_dict(cls, d):
        return cls(d['rank'], d['suit'])

    def __repr__(self):
        return f"{self.rank}{self.suit}"


def create_deck():
    return [Card(r, s) for s in SUITS for r in RANKS]


def shuffle_deck(deck):
    random.shuffle(deck)
    return deck


# ═══════════════════════════════════════════════
# HAND EVALUATION
# ═══════════════════════════════════════════════

def evaluate_5(cards):
    """Evaluate a 5-card hand. Returns dict with rank, name, and tiebreakers."""
    sorted_cards = sorted(cards, key=lambda c: c.value, reverse=True)
    values = [c.value for c in sorted_cards]
    suits = [c.suit for c in sorted_cards]

    # Count suits and values
    suit_counts = {}
    value_counts = {}
    for c in sorted_cards:
        suit_counts[c.suit] = suit_counts.get(c.suit, 0) + 1
        value_counts[c.value] = value_counts.get(c.value, 0) + 1

    is_flush = max(suit_counts.values()) >= 5
    flush_suit = None
    if is_flush:
        for s, count in suit_counts.items():
            if count >= 5:
                flush_suit = s
                break

    # Straight check
    uniq_vals = sorted(list(set(values)), reverse=True)
    straight_high = None
    if len(uniq_vals) >= 5:
        for i in range(len(uniq_vals) - 4):
            if uniq_vals[i] - uniq_vals[i + 4] == 4:
                straight_high = uniq_vals[i]
                break
        # A-2-3-4-5 straight (wheel)
        if straight_high is None and set([14, 5, 4, 3, 2]).issubset(set(uniq_vals)):
            straight_high = 5

    flush_cards = sorted([c for c in sorted_cards if c.suit == flush_suit], key=lambda c: c.value, reverse=True) if is_flush else []

    # Group by count
    groups = sorted([(v, c) for v, c in value_counts.items()], key=lambda x: (x[1], x[0]), reverse=True)

    # Royal Flush / Straight Flush
    if is_flush and straight_high:
        if straight_high == 14:
            return {'rank': 10, 'name': 'Royal Flush', 'tb': [14]}
        return {'rank': 9, 'name': 'Straight Flush', 'tb': [straight_high]}

    # Four of a Kind
    if groups[0][1] == 4:
        kicker = groups[1][0] if len(groups) > 1 else 0
        return {'rank': 8, 'name': 'Four of a Kind', 'tb': [groups[0][0], kicker]}

    # Full House
    if groups[0][1] == 3 and len(groups) > 1 and groups[1][1] >= 2:
        return {'rank': 7, 'name': 'Full House', 'tb': [groups[0][0], groups[1][0]]}

    # Flush
    if is_flush:
        return {'rank': 6, 'name': 'Flush', 'tb': [c.value for c in flush_cards[:5]]}

    # Straight
    if straight_high:
        return {'rank': 5, 'name': 'Straight', 'tb': [straight_high]}

    # Three of a Kind
    if groups[0][1] == 3:
        tb = [groups[0][0]]
        for g in groups[1:]:
            tb.append(g[0])
        return {'rank': 4, 'name': 'Three of a Kind', 'tb': tb[:3]}

    # Two Pair
    if groups[0][1] == 2 and len(groups) > 1 and groups[1][1] == 2:
        tb = [groups[0][0], groups[1][0]]
        for g in groups[2:]:
            tb.append(g[0])
        return {'rank': 3, 'name': 'Two Pair', 'tb': tb[:3]}

    # One Pair
    if groups[0][1] == 2:
        tb = [groups[0][0]]
        for g in groups[1:]:
            tb.append(g[0])
        return {'rank': 2, 'name': 'One Pair', 'tb': tb[:4]}

    # High Card
    return {'rank': 1, 'name': 'High Card', 'tb': values[:5]}


def best_5_from_7(cards):
    """Find best 5-card hand from 7 cards."""
    best = None
    # Generate all C(7,5) = 21 combinations
    for a in range(3):
        for b in range(a + 1, 4):
            for c in range(b + 1, 5):
                for d in range(c + 1, 6):
                    for e in range(d + 1, 7):
                        hand = evaluate_5([cards[a], cards[b], cards[c], cards[d], cards[e]])
                        if best is None or compare_hands(hand, best) > 0:
                            best = hand
    return best


def compare_hands(h1, h2):
    """Return 1 if h1 > h2, -1 if h1 < h2, 0 if equal."""
    if h1['rank'] != h2['rank']:
        return 1 if h1['rank'] > h2['rank'] else -1
    for i in range(min(len(h1['tb']), len(h2['tb']))):
        if h1['tb'][i] != h2['tb'][i]:
            return 1 if h1['tb'][i] > h2['tb'][i] else -1
    return 0


# ═══════════════════════════════════════════════
# SIDE POT CALCULATION
# ═══════════════════════════════════════════════

def calculate_side_pots(players_bets):
    """
    players_bets: dict of player_id -> total amount contributed to pot
    Returns list of dicts: {'amount': total_pot, 'eligible': [player_ids]}
    """
    if not players_bets:
        return []

    # Sort by contribution amount
    sorted_players = sorted(players_bets.items(), key=lambda x: x[1])
    pots = []
    previous_amount = 0

    for i, (player_id, amount) in enumerate(sorted_players):
        if amount > previous_amount:
            contrib = amount - previous_amount
            eligible = [pid for pid, amt in sorted_players[i:]]
            pots.append({'amount': contrib * len(eligible), 'eligible': eligible})
            previous_amount = amount

    return pots


# ═══════════════════════════════════════════════
# IN-MEMORY GAME STATE
# ═══════════════════════════════════════════════

class PokerPlayerState:
    def __init__(self, user_id, username, seat, chips):
        self.user_id = user_id
        self.username = username
        self.seat = seat
        self.chips = chips
        self.hole_cards = []
        self.status = 'active'  # active, folded, all_in, eliminated, sitting_out
        self.current_bet = 0.0
        self.total_bet = 0.0
        self.has_acted = False
        self.is_dealer = False
        self.is_sb = False
        self.is_bb = False

    def to_dict(self, reveal_cards=False, for_user_id=None):
        d = {
            'user_id': self.user_id,
            'username': self.username,
            'seat': self.seat,
            'chips': round(self.chips, 8),
            'status': self.status,
            'current_bet': round(self.current_bet, 8),
            'has_acted': self.has_acted,
            'is_dealer': self.is_dealer,
            'is_sb': self.is_sb,
            'is_bb': self.is_bb,
        }
        if reveal_cards or for_user_id == self.user_id:
            d['hole_cards'] = [c.to_dict() for c in self.hole_cards]
        else:
            d['hole_cards'] = [{'hidden': True}, {'hidden': True}] if self.hole_cards else []
        return d


class PokerHandState:
    def __init__(self, hand_number, dealer_seat, sb_seat, bb_seat, small_blind, big_blind):
        self.hand_number = hand_number
        self.dealer_seat = dealer_seat
        self.sb_seat = sb_seat
        self.bb_seat = bb_seat
        self.small_blind = small_blind
        self.big_blind = big_blind
        self.deck = shuffle_deck(create_deck())
        self.community_cards = []
        self.pot = 0.0
        self.side_pots = []
        self.current_bet = 0.0
        self.street = 'dealing'  # dealing, preflop, flop, turn, river, showdown, complete
        self.active_seat = None
        self.winners = []
        self.hand_id_db = None  # Set when persisted to DB

    def deal_hole_cards(self, players):
        """Deal 2 cards to each active player."""
        for _ in range(2):
            for p in players:
                if p.status not in ('eliminated', 'sitting_out') and len(p.hole_cards) < 2:
                    p.hole_cards.append(self.deck.pop())

    def deal_flop(self):
        self.deck.pop()  # Burn
        for _ in range(3):
            self.community_cards.append(self.deck.pop())
        self.street = 'flop'

    def deal_turn(self):
        self.deck.pop()  # Burn
        self.community_cards.append(self.deck.pop())
        self.street = 'turn'

    def deal_river(self):
        self.deck.pop()  # Burn
        self.community_cards.append(self.deck.pop())
        self.street = 'river'

    def to_dict(self, reveal_all=False, for_user_id=None):
        return {
            'hand_number': self.hand_number,
            'dealer_seat': self.dealer_seat,
            'sb_seat': self.sb_seat,
            'bb_seat': self.bb_seat,
            'community_cards': [c.to_dict() for c in self.community_cards],
            'pot': round(self.pot, 8),
            'side_pots': [{'amount': round(sp['amount'], 8), 'eligible': sp['eligible']} for sp in self.side_pots],
            'current_bet': round(self.current_bet, 8),
            'street': self.street,
            'active_seat': self.active_seat,
            'winners': self.winners,
        }


class PokerTableState:
    def __init__(self, table_id, name, small_blind, big_blind, min_buyin, max_buyin, currency, max_seats=6):
        self.table_id = table_id
        self.name = name
        self.small_blind = small_blind
        self.big_blind = big_blind
        self.min_buyin = min_buyin
        self.max_buyin = max_buyin
        self.currency = currency
        self.max_seats = max_seats
        self.status = 'waiting'  # waiting, active, ended
        self.players = {}  # seat -> PokerPlayerState
        self.hand = None
        self.hand_count = 0
        self.game_log = []
        self.created_at = datetime.utcnow().isoformat()

    def get_active_players(self):
        """Players who are in the current hand (not folded/all-in/eliminated)."""
        return [p for p in self.players.values() if p.status in ('active', 'folded', 'all_in')]

    def get_non_eliminated_players(self):
        return [p for p in self.players.values() if p.status != 'eliminated']

    def get_next_active_seat(self, start_seat):
        """Find next seat with active player (not folded/all-in/eliminated)."""
        occupied = sorted([s for s, p in self.players.items() if p.status not in ('eliminated', 'sitting_out')])
        if not occupied:
            return None
        idx = occupied.index(start_seat) if start_seat in occupied else -1
        for i in range(1, len(occupied) + 1):
            seat = occupied[(idx + i) % len(occupied)]
            p = self.players[seat]
            if p.status == 'active':
                return seat
        return None

    def get_next_non_folded_seat(self, start_seat):
        """Find next seat with player still in hand (active or all_in, not folded)."""
        occupied = sorted([s for s, p in self.players.items() if p.status in ('active', 'all_in')])
        if not occupied:
            return None
        idx = occupied.index(start_seat) if start_seat in occupied else -1
        for i in range(1, len(occupied) + 1):
            seat = occupied[(idx + i) % len(occupied)]
            return seat
        return None

    def start_new_hand(self):
        """Start a new hand. Returns True if successful."""
        active = self.get_non_eliminated_players()
        if len(active) < 2:
            self.status = 'ended'
            return False

        self.hand_count += 1
        occupied = sorted([p.seat for p in active])

        # Rotate dealer
        prev_dealer = max([p.seat for p in active if p.is_dealer], default=occupied[-1])
        dealer_idx = (occupied.index(prev_dealer) + 1) % len(occupied) if prev_dealer in occupied else 0
        dealer_seat = occupied[dealer_idx]

        # Blinds
        if len(occupied) == 2:
            # Heads-up: dealer is SB
            sb_seat = dealer_seat
            sb_idx = occupied.index(dealer_seat)
            bb_idx = (sb_idx + 1) % len(occupied)
            bb_seat = occupied[bb_idx]
        else:
            sb_idx = (occupied.index(dealer_seat) + 1) % len(occupied)
            sb_seat = occupied[sb_idx]
            bb_idx = (sb_idx + 1) % len(occupied)
            bb_seat = occupied[bb_idx]

        # Reset player states for new hand
        for p in active:
            p.hole_cards = []
            p.current_bet = 0.0
            p.total_bet = 0.0
            p.has_acted = False
            p.is_dealer = (p.seat == dealer_seat)
            p.is_sb = (p.seat == sb_seat)
            p.is_bb = (p.seat == bb_seat)
            if p.status == 'folded':
                p.status = 'active'

        self.hand = PokerHandState(self.hand_count, dealer_seat, sb_seat, bb_seat, self.small_blind, self.big_blind)
        self.hand.deal_hole_cards(active)

        # Post blinds
        sb_player = self.players[sb_seat]
        bb_player = self.players[bb_seat]

        sb_amount = min(self.small_blind, sb_player.chips)
        sb_player.chips -= sb_amount
        sb_player.current_bet = sb_amount
        sb_player.total_bet = sb_amount
        if sb_player.chips == 0:
            sb_player.status = 'all_in'
        self.hand.pot += sb_amount

        bb_amount = min(self.big_blind, bb_player.chips)
        bb_player.chips -= bb_amount
        bb_player.current_bet = bb_amount
        bb_player.total_bet = bb_amount
        if bb_player.chips == 0:
            bb_player.status = 'all_in'
        self.hand.pot += bb_amount

        self.hand.current_bet = bb_amount
        self.hand.street = 'preflop'

        # First to act: UTG (after BB), or heads-up: BB acts first preflop? Actually in HU, SB (dealer) acts first preflop.
        if len(occupied) == 2:
            self.hand.active_seat = sb_seat
        else:
            self.hand.active_seat = occupied[(bb_idx + 1) % len(occupied)]

        # If first active player is all-in, advance
        while self.hand.active_seat and self.players[self.hand.active_seat].status != 'active':
            self.hand.active_seat = self.get_next_active_seat(self.hand.active_seat)
            if self.hand.active_seat == bb_seat:
                break

        self.status = 'active'
        self.add_log(f"Hand #{self.hand_count} started. Dealer: seat {dealer_seat}, SB: {sb_seat}, BB: {bb_seat}")
        return True

    def process_action(self, seat, action, amount=0):
        """
        Process a player action.
        Returns (success: bool, message: str)
        """
        if not self.hand:
            return False, "No active hand"
        if self.hand.active_seat != seat:
            return False, "Not your turn"

        player = self.players.get(seat)
        if not player or player.status not in ('active',):
            return False, "Cannot act"

        current_bet = self.hand.current_bet
        call_amount = current_bet - player.current_bet

        if action == 'fold':
            player.status = 'folded'
            player.has_acted = True
            self.add_log(f"{player.username} folds")

        elif action == 'check':
            if call_amount > 0:
                return False, "Cannot check, must call or raise"
            player.has_acted = True
            self.add_log(f"{player.username} checks")

        elif action == 'call':
            call_amount = min(call_amount, player.chips)
            player.chips -= call_amount
            player.current_bet += call_amount
            player.total_bet += call_amount
            self.hand.pot += call_amount
            if player.chips == 0:
                player.status = 'all_in'
            player.has_acted = True
            self.add_log(f"{player.username} calls {call_amount:.8f}")

        elif action == 'bet' or action == 'raise':
            if current_bet > 0 and action == 'bet':
                return False, "Cannot bet, must raise"
            if current_bet == 0 and action == 'raise':
                return False, "Cannot raise, must bet"

            min_raise = current_bet + self.big_blind
            if action == 'raise' and amount < min_raise:
                return False, f"Minimum raise is {min_raise}"
            if amount > player.chips + player.current_bet:
                return False, "Not enough chips"

            total_bet = amount
            add_amount = total_bet - player.current_bet
            player.chips -= add_amount
            player.current_bet = total_bet
            player.total_bet += add_amount
            self.hand.pot += add_amount
            self.hand.current_bet = total_bet
            if player.chips == 0:
                player.status = 'all_in'
            player.has_acted = True
            # Reset has_acted for others since bet changed
            for p in self.players.values():
                if p.seat != seat and p.status == 'active':
                    p.has_acted = False
            self.add_log(f"{player.username} {'bets' if action == 'bet' else 'raises to'} {total_bet:.8f}")

        elif action == 'all_in':
            all_in_amount = player.chips + player.current_bet
            add_amount = player.chips
            self.hand.pot += add_amount
            player.current_bet = all_in_amount
            player.total_bet += add_amount
            player.chips = 0
            if all_in_amount > self.hand.current_bet:
                self.hand.current_bet = all_in_amount
                for p in self.players.values():
                    if p.seat != seat and p.status == 'active':
                        p.has_acted = False
            player.status = 'all_in'
            player.has_acted = True
            self.add_log(f"{player.username} goes all-in for {all_in_amount:.8f}")

        else:
            return False, "Unknown action"

        # Advance to next player or next street
        self.advance_game()
        return True, "OK"

    def advance_game(self):
        """Advance game state after an action."""
        if not self.hand:
            return

        # Check if hand should end (all but one folded)
        active_in_hand = [p for p in self.players.values() if p.status in ('active', 'all_in')]
        if len(active_in_hand) == 1:
            self.end_hand([active_in_hand[0].seat])
            return
        if len(active_in_hand) == 0:
            # Shouldn't happen, but push
            self.end_hand([])
            return

        # Check if betting round is complete
        # Round complete when all active players have acted and bets are equal
        # All-in players don't need to act further
        betting_complete = True
        for p in self.players.values():
            if p.status == 'active':
                if not p.has_acted or p.current_bet != self.hand.current_bet:
                    betting_complete = False
                    break

        if betting_complete:
            self.next_street()
        else:
            # Advance to next player who needs to act
            next_seat = self.get_next_active_seat(self.hand.active_seat)
            # Skip players who have already matched the bet and acted
            while next_seat is not None:
                p = self.players[next_seat]
                if p.status == 'active' and (not p.has_acted or p.current_bet < self.hand.current_bet):
                    break
                if next_seat == self.hand.active_seat:
                    # Looped around
                    break
                next_seat = self.get_next_active_seat(next_seat)
            self.hand.active_seat = next_seat

            # If no valid next player, try to advance street
            if self.hand.active_seat is None or self.hand.active_seat == self.hand.active_seat:
                # Double check if betting is actually complete
                all_matched = all(
                    p.current_bet == self.hand.current_bet or p.status in ('folded', 'all_in', 'eliminated')
                    for p in self.players.values()
                )
                if all_matched:
                    self.next_street()

    def next_street(self):
        """Move to next betting street or showdown."""
        if not self.hand:
            return

        # Reset for new street
        for p in self.players.values():
            p.current_bet = 0.0
            p.has_acted = False
        self.hand.current_bet = 0.0

        if self.hand.street == 'preflop':
            self.hand.deal_flop()
            self.add_log(f"Flop: {self.hand.community_cards}")
        elif self.hand.street == 'flop':
            self.hand.deal_turn()
            self.add_log(f"Turn: {self.hand.community_cards[-1]}")
        elif self.hand.street == 'turn':
            self.hand.deal_river()
            self.add_log(f"River: {self.hand.community_cards[-1]}")
        elif self.hand.street == 'river':
            self.showdown()
            return

        # Set first to act
        occupied = sorted([s for s, p in self.players.items() if p.status in ('active', 'all_in')])
        if not occupied:
            self.showdown()
            return

        if len(occupied) == 2:
            # Heads-up: SB acts first postflop
            sb_seat = self.hand.sb_seat
            self.hand.active_seat = sb_seat if sb_seat in occupied else occupied[0]
        else:
            # First active after dealer
            dealer_seat = self.hand.dealer_seat
            idx = occupied.index(dealer_seat) if dealer_seat in occupied else -1
            self.hand.active_seat = occupied[(idx + 1) % len(occupied)]

        # Skip all-in players
        while self.hand.active_seat and self.players[self.hand.active_seat].status != 'active':
            next_seat = self.get_next_active_seat(self.hand.active_seat)
            if next_seat == self.hand.active_seat:
                # Everyone all-in or folded
                self.auto_deal_remaining()
                return
            self.hand.active_seat = next_seat

    def auto_deal_remaining(self):
        """When all remaining players are all-in, deal remaining cards and go to showdown."""
        if self.hand.street == 'preflop':
            self.hand.deal_flop()
        if self.hand.street == 'flop':
            self.hand.deal_turn()
        if self.hand.street == 'turn':
            self.hand.deal_river()
        self.showdown()

    def showdown(self):
        """Evaluate hands and determine winner(s)."""
        self.hand.street = 'showdown'
        active_players = [p for p in self.players.values() if p.status in ('active', 'all_in')]

        if len(active_players) == 1:
            self.end_hand([active_players[0].seat])
            return

        # Calculate side pots based on total contribution across all streets
        players_bets = {p.seat: p.total_bet for p in active_players}
        side_pots = calculate_side_pots(players_bets)
        self.hand.side_pots = side_pots

        # Evaluate each player's best hand
        best_hands = {}
        for p in active_players:
            all_cards = p.hole_cards + self.hand.community_cards
            best_hands[p.seat] = best_5_from_7(all_cards)

        # Award each pot to best eligible hand
        pot_winners = {}  # seat -> total won
        for sp in side_pots:
            eligible = [s for s in sp['eligible'] if s in best_hands]
            if not eligible:
                continue
            best_seat = eligible[0]
            for s in eligible[1:]:
                if compare_hands(best_hands[s], best_hands[best_seat]) > 0:
                    best_seat = s
            # Check for split pot
            tied = [s for s in eligible if compare_hands(best_hands[s], best_hands[best_seat]) == 0]
            split = sp['amount'] / len(tied)
            for s in tied:
                pot_winners[s] = pot_winners.get(s, 0) + split

        # Award winnings
        for seat, amount in pot_winners.items():
            self.players[seat].chips += amount

        winner_seats = list(pot_winners.keys())
        self.hand.winners = winner_seats
        self.add_log(f"Showdown! Winner(s): {[self.players[s].username for s in winner_seats]}")
        self.end_hand(winner_seats)

    def end_hand(self, winner_seats):
        """End the current hand, check eliminations, start next if possible."""
        self.hand.street = 'complete'

        # Check eliminations
        eliminated = []
        for p in self.players.values():
            if p.status != 'eliminated' and p.chips <= 0:
                p.status = 'eliminated'
                eliminated.append(p.seat)
                self.add_log(f"{p.username} has been eliminated!")

        # Check if tournament is over
        remaining = [p for p in self.players.values() if p.status != 'eliminated']
        if len(remaining) <= 1:
            self.status = 'ended'
            if remaining:
                self.add_log(f"Tournament over! {remaining[0].username} wins!")
            return

        # Start next hand after a delay (caller should handle delay)
        # Don't auto-start here; let the server decide timing

    def add_log(self, message):
        self.game_log.append({'time': datetime.utcnow().isoformat(), 'message': message})

    def to_dict(self, for_user_id=None):
        return {
            'table_id': self.table_id,
            'name': self.name,
            'status': self.status,
            'small_blind': self.small_blind,
            'big_blind': self.big_blind,
            'min_buyin': self.min_buyin,
            'max_buyin': self.max_buyin,
            'currency': self.currency,
            'max_seats': self.max_seats,
            'players': {str(s): p.to_dict(reveal_cards=(self.hand and self.hand.street in ('showdown', 'complete')), for_user_id=for_user_id) for s, p in self.players.items()},
            'hand': self.hand.to_dict(for_user_id=for_user_id) if self.hand else None,
            'hand_count': self.hand_count,
            'game_log': self.game_log[-20:],
        }


# ═══════════════════════════════════════════════
# TABLE MANAGER (in-memory registry)
# ═══════════════════════════════════════════════

class TableManager:
    def __init__(self):
        self.tables = {}  # table_id -> PokerTableState

    def create_table(self, table_id, name, small_blind, big_blind, min_buyin, max_buyin, currency, max_seats=6):
        table = PokerTableState(table_id, name, small_blind, big_blind, min_buyin, max_buyin, currency, max_seats)
        self.tables[table_id] = table
        return table

    def get_table(self, table_id):
        return self.tables.get(table_id)

    def remove_table(self, table_id):
        if table_id in self.tables:
            del self.tables[table_id]

    def list_tables(self):
        return list(self.tables.values())


table_manager = TableManager()
