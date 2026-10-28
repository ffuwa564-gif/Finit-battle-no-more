# Battle height and compact controls

The previous variable status tags added 54.7 px at 390 × 844. The frame remains fixed, with a 260 px minimum battlefield and whole-page scrolling on short screens.

The strategy/item/utility row is now bounded to 112 px (increased from 88 px at the user’s request), and ATTACK remains 76 px. Up to two small status icons, prioritizing negative effects, and the overflow count float over the bottom-right of each portrait. No status row is reserved below the portrait. Tap to open the existing accessible modal with every effect name and description, barrier amount, and remaining turns. Absolute positioning keeps empty and populated states at the same height without consuming space. HP and ultimate meters remain unobstructed. The persistent ultimate/potion instruction strip and acceleration explanatory sentence are removed; the acceleration percentage is also omitted. The character detail also omits the universal charge/booking instructions. Actual skill effects remain available in the character details.

`e2e/battle-height.spec.ts` checks stable positions with eight effects (including sleep and paralysis) on every party member, modal opening/closing, potion selection, and resizing at four viewport sizes. `itch-e2e/battle-height.spec.ts` checks the English nested iframe build.
