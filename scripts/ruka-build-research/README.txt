Ruka exclusive-archetype research — prototype, not a deployed feature

Read docs/research/ruka-exclusive-build/README.md first.

The shipped game's src/ and player saves are untouched. bootstrap.py copies only source text into /tmp/stillveil-ruka-build-lab, patches two native HP-loss paths and native HP-heal writes, and adds a research-only module. The native turn order, actions, cooldowns, ultimates, potions, fairies, flowers and gems still resolve through that copied engine. No changes to main or itch.io are part of this research.

Run from repository root with installed npm dependencies:
  node_modules/.bin/tsx scripts/ruka-build-research/baseline.ts
  python scripts/ruka-build-research/bootstrap.py
  VERSION=v4 node_modules/.bin/tsx scripts/ruka-build-research/experiment.ts
  LIB_ONLY=1 node_modules/.bin/tsx scripts/ruka-build-research/adversarial.ts
  LIB_ONLY=1 node_modules/.bin/tsx scripts/ruka-build-research/timing.ts
  LIB_ONLY=1 node_modules/.bin/tsx scripts/ruka-build-research/variations.ts
  node_modules/.bin/tsx scripts/ruka-build-research/edge-checks.ts
  python scripts/ruka-build-research/certificate.py

Versions v1/v2/v3 of experiment.ts are selectable by VERSION; archived V2 source also preserves the earlier control policy. All versioned data are supplied compressed under docs/research/ruka-exclusive-build/data/. The live src/ must match the source game's pinned commit before interpreting reproduction results. report.py materializes data into documentation and replaces the report template tokens; data can be regenerated without rebuilding the prose.

V1: H1800,300 damage/R,restore every4R, cap always active. It establishes exclusivity but makes T3/T6 progression flat.
V2: cap lifted during wound, HP sensitivity2400/3600/4800; optional two-token leader storage.
V3: H4800/ATK160, native leader skill retained, no new storage. Controller can anticipate publicly known expired barrier state.
V4: same mechanics as V3; emergency healing precedes new self-barrier gem use.
The timing and full-roster adversarial studies retain the V3 policy flags unless explicitly overridden; variations use V4. This distinction matters when comparing exact mean rounds.

The certificate is an independent finite-state over-approximation: without wound, any damage0..300 per round plus invincibility still cannot kill4800HP before each4-round full restoration. Existing direct HP loss and echo loss are both capped. The boss only has attack/drain, so the native overclock self-HP-cost route is absent. Sleep/charm/jam cannot postpone an encounter-clock restoration. These are declared proposal rules, not claims about currently released stages or all future versions.

The final recommendation adds one Ruka personal anti-heal skill, one optional fixed T3 self-barrier gem and one optional trial. It does NOT adopt the experimental new leader storage. Other three party members can change. Story recruitment of Ruka is guaranteed in chapter7; a compulsory gacha gate is not required. Final integration still needs skill contracts, proper pre-decision expiry handling, save/replay state validation, cleanse behavior, UI and global balance/playtesting.
