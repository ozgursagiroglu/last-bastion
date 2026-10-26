# Balance

`balance.test.ts` plays every level on every difficulty with the headless bot (`playLevel`, greedy and `none`),
asserts the difficulty targets and prints the table below. The whole matrix (60 plays) takes about 3 s. Vitest hides
the console output of passing tests by default; run `pnpm test src/game/balance --silent=false` to see the table.

## Targets

- `none` loses every level on every difficulty, before the last wave has spawned on levels 3–10.
- Greedy wins every level on easy (3 stars on levels 1–7) and every level on normal (3 stars on levels 1–3).
- The normal lives-left ratio averages lower on levels 6–10 than on levels 1–5.
- On hard, greedy wins levels 1–3, loses at least three of levels 6–10, and reaches at least ceil(0.4 × waves)
  spawned waves on every level.
- No level lasts longer than 12 simulated minutes on normal for the greedy bot.

## Final table

```
lv | diff   | bot    | res  | * | lives |  time | waves
 1 | easy   | greedy | won  | 3 | 25/25 |  2.2m |   6/6
 1 | easy   | none   | lost | 0 |  0/25 |  1.5m |   4/6
 1 | normal | greedy | won  | 3 | 20/20 |  2.3m |   6/6
 1 | normal | none   | lost | 0 |  0/20 |  1.3m |   4/6
 1 | hard   | greedy | won  | 3 | 10/10 |  2.3m |   6/6
 1 | hard   | none   | lost | 0 |  0/10 |  0.8m |   3/6
 2 | easy   | greedy | won  | 3 | 25/25 |  2.7m |   7/7
 2 | easy   | none   | lost | 0 |  0/25 |  1.6m |   4/7
 2 | normal | greedy | won  | 3 | 20/20 |  2.9m |   7/7
 2 | normal | none   | lost | 0 |  0/20 |  1.1m |   3/7
 2 | hard   | greedy | won  | 2 |  6/10 |  3.3m |   7/7
 2 | hard   | none   | lost | 0 |  0/10 |  0.8m |   2/7
 3 | easy   | greedy | won  | 3 | 25/25 |  3.8m |   8/8
 3 | easy   | none   | lost | 0 |  0/25 |  1.7m |   4/8
 3 | normal | greedy | won  | 3 | 20/20 |  3.9m |   8/8
 3 | normal | none   | lost | 0 |  0/20 |  1.4m |   3/8
 3 | hard   | greedy | won  | 3 | 10/10 |  3.9m |   8/8
 3 | hard   | none   | lost | 0 |  0/10 |  0.8m |   2/8
 4 | easy   | greedy | won  | 3 | 25/25 |  4.2m |   9/9
 4 | easy   | none   | lost | 0 |  0/25 |  1.5m |   4/9
 4 | normal | greedy | won  | 3 | 18/20 |  4.5m |   9/9
 4 | normal | none   | lost | 0 |  0/20 |  1.1m |   3/9
 4 | hard   | greedy | lost | 0 |  0/10 |  4.2m |   9/9
 4 | hard   | none   | lost | 0 |  0/10 |  0.8m |   2/9
 5 | easy   | greedy | won  | 3 | 25/25 |  6.3m | 10/10
 5 | easy   | none   | lost | 0 |  0/25 |  1.4m |  3/10
 5 | normal | greedy | won  | 1 |  9/20 |  6.3m | 10/10
 5 | normal | none   | lost | 0 |  0/20 |  1.0m |  2/10
 5 | hard   | greedy | lost | 0 |  0/10 |  2.7m |  5/10
 5 | hard   | none   | lost | 0 |  0/10 |  0.6m |  1/10
 6 | easy   | greedy | won  | 3 | 25/25 |  4.6m | 10/10
 6 | easy   | none   | lost | 0 |  0/25 |  2.0m |  5/10
 6 | normal | greedy | won  | 2 | 15/20 |  4.7m | 10/10
 6 | normal | none   | lost | 0 |  0/20 |  1.5m |  4/10
 6 | hard   | greedy | lost | 0 |  0/10 |  3.0m |  8/10
 6 | hard   | none   | lost | 0 |  0/10 |  1.0m |  3/10
 7 | easy   | greedy | won  | 3 | 25/25 |  6.6m | 11/11
 7 | easy   | none   | lost | 0 |  0/25 |  1.6m |  3/11
 7 | normal | greedy | won  | 2 | 14/20 |  6.6m | 11/11
 7 | normal | none   | lost | 0 |  0/20 |  1.2m |  2/11
 7 | hard   | greedy | lost | 0 |  0/10 |  4.2m |  7/11
 7 | hard   | none   | lost | 0 |  0/10 |  0.6m |  1/11
 8 | easy   | greedy | won  | 3 | 25/25 |  7.2m | 12/12
 8 | easy   | none   | lost | 0 |  0/25 |  1.8m |  4/12
 8 | normal | greedy | won  | 3 | 19/20 |  7.5m | 12/12
 8 | normal | none   | lost | 0 |  0/20 |  1.7m |  4/12
 8 | hard   | greedy | lost | 0 |  0/10 |  3.5m |  7/12
 8 | hard   | none   | lost | 0 |  0/10 |  1.2m |  3/12
 9 | easy   | greedy | won  | 3 | 25/25 |  9.6m | 13/13
 9 | easy   | none   | lost | 0 |  0/25 |  1.3m |  2/13
 9 | normal | greedy | won  | 2 | 10/20 |  9.7m | 13/13
 9 | normal | none   | lost | 0 |  0/20 |  1.0m |  2/13
 9 | hard   | greedy | lost | 0 |  0/10 |  5.2m |  8/13
 9 | hard   | none   | lost | 0 |  0/10 |  0.7m |  1/13
10 | easy   | greedy | won  | 3 | 25/25 | 11.4m | 15/15
10 | easy   | none   | lost | 0 |  0/25 |  1.3m |  2/15
10 | normal | greedy | won  | 3 | 20/20 | 11.5m | 15/15
10 | normal | none   | lost | 0 |  0/20 |  1.2m |  2/15
10 | hard   | greedy | lost | 0 |  0/10 |  4.4m |  7/15
10 | hard   | none   | lost | 0 |  0/10 |  0.7m |  1/15
```

Normal lives-left ratio: levels 1–5 average 0.87, levels 6–10 average 0.78.

## How the levels are tuned

Income is flat (fixed bounties and start gold) while enemy HP grows 12 % per level, so the levels are shaped around
what a player can afford:

- Waves are long and readable: each spawns over 20–40 s, groups follow each other at the slow end of their kind's
  spawn interval, and every wave stays within ±25 % of its HP target.
- Tough units (shield orcs, trolls) come one or two per group and in later waves, where the player has the towers for
  them.
- On multi-road levels, tough units and Warlords take the road the towers can cover best: road 1 for the level 5 and
  level 10 Warlords, road 2 for the level 9 one.
- The late waves of levels 5 and 10 carry extra goblins and bats (the most bounty per HP), which pays for the upgrades
  the Warlords call for.
- Multi-road levels start with more gold (level 5: 450, level 7: 600, levels 9 and 10: 700), enough to cover every road
  before the second wave; level 7's waves 2–5 are lighter for the same reason.
- The Orc Warlord has 2000 base HP (4160 on level 10, normal); the single-Warlord waves of levels 8 and 9 add goblin
  escorts to keep them inside the HP band.

The result: easy is a comfortable 3-star run, normal tightens from 0.87 to 0.78 lives left between the first and the
second half of the campaign, and hard asks for better than greedy play from level 4 on.
