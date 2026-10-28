# Battle height and compact controls

The previous variable status tags added 54.7 px at 390 × 844. The frame remains fixed, with a 260 px minimum battlefield and whole-page scrolling on short screens.

The strategy/item/utility row is now bounded to 64 px (previously 92+), and ATTACK is 60 px. A 30 px portrait status slot shows up to three icons, prioritizing negative effects, followed by the overflow count. Tap to open the existing accessible modal with every effect name and description, barrier amount, and remaining turns. Empty slots keep the same height. The persistent ultimate/potion instruction strip and acceleration explanatory sentence are removed; only the current acceleration percentage remains. The character detail also omits the universal charge/booking instructions. Actual skill effects remain available in the character details.

`e2e/battle-height.spec.ts` checks stable positions with eight effects (including sleep and paralysis) on every party member, modal opening/closing, potion selection, and resizing at four viewport sizes. `itch-e2e/battle-height.spec.ts` checks the English nested iframe build.
