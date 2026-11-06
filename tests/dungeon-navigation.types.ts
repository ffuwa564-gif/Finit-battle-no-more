import { dungeonHash, type DungeonPanel } from '../src/application/dungeon-navigation';
// @ts-expect-error Old list modes cannot be requested by new navigation code.
dungeonHash({kind:'list',mode:'event'});
// @ts-expect-error Category lists are not map overlays.
const legacyPanel: DungeonPanel = 'normal';
void legacyPanel;
