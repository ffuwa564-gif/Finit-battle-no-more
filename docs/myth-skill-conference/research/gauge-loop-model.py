"""Abstract, unimplemented bad-design example. This does not modify the game.

Compare turn-time readiness to the existing requirement to reserve an ultimate
before a round. No enemies, damage intake, status, equipment, or target logic.
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
results = {}
rows = []
for model in ('ready_at_action', 'reserve_at_round_start'):
    charge = [100] * 4
    rounds = []
    for round_number in range(1, 9):
        opening = charge.copy()
        reserved = [value >= 100 for value in charge]
        events = []
        for actor in range(4):
            before = charge.copy()
            allowed = charge[actor] >= 100 and (model == 'ready_at_action' or reserved[actor])
            if allowed:
                charge[actor] = 0
                charge = [min(100, value + 30) for value in charge]
                action = 'ultimate'
            else:
                charge[actor] = min(100, charge[actor] + 25)
                action = 'ordinary'
            event = dict(model=model, round=round_number, actor='ABCD'[actor], reservedAtRoundStart=reserved[actor], before=before, action=action, after=charge.copy())
            events.append(event)
            rows.append(event)
        rounds.append(dict(round=round_number, opening=opening, reserved=reserved, ultimates=sum(event['action'] == 'ultimate' for event in events), ending=charge.copy(), events=events))
    results[model] = rounds

scope = ('Abstract model of an unimplemented proposed leader skill: each ultimate gives all four allies 30 charge AFTER paying its own 100. Charge is capped at 100. Fixed A-B-C-D order. No enemies, status, damage intake, cooldowns, role crystal, or equipment. Ordinary action grants self 25. ready_at_action is NOT the current game reservation rule. reserve_at_round_start preserves only the current requirement that an ultimate be reserved when ready before the round; this is still not a full game simulation.')
(ROOT / 'gauge-loop-model.json').write_text(json.dumps(dict(scope=scope, models=results), ensure_ascii=False, indent=2))
with (ROOT / 'gauge-loop-model.csv').open('w', newline='') as output:
    writer = csv.writer(output, lineterminator='\n')
    writer.writerow(['model', 'round', 'actor', 'reservedAtRoundStart', 'before_A', 'before_B', 'before_C', 'before_D', 'action', 'after_A', 'after_B', 'after_C', 'after_D'])
    for row in rows:
        writer.writerow([row['model'], row['round'], row['actor'], row['reservedAtRoundStart'], *row['before'], row['action'], *row['after']])

assert all(row['ultimates'] == 4 for row in results['ready_at_action'])
assert results['ready_at_action'][1]['ending'] == [100, 90, 60, 30]
assert results['reserve_at_round_start'][1]['ultimates'] == 1
for model, rounds in results.items():
    print(model, [(row['round'], row['ultimates'], row['ending']) for row in rounds])
