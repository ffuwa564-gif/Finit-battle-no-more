import { House } from 'lucide-react';
import { Button } from './index';
import { CommandEmblem } from './CommandEmblem';
import { MenuEmblem } from './MenuEmblem';
import './town-navigation.css';

const destinations = [
  { id: 'home', label: 'ホーム' },
  { id: 'dungeons', label: 'ダンジョン' },
  { id: 'party', label: 'パーティ' },
  { id: 'bag', label: 'カバン・道具' },
  { id: 'settings', label: '設定' },
] as const;
export type TownDestination = typeof destinations[number]['id'];

/** The same navigation is inset into the home frame and docked on other town screens. */
export function TownNavigation({ active, onNavigate, disabled = false, embedded = false }: {
  active: string; onNavigate: (page: TownDestination) => void; disabled?: boolean; embedded?: boolean;
}) {
  return <nav className={`town-navigation ${embedded ? 'hub-navigation' : 'mobile-nav'}`} aria-label={embedded ? 'ホームのメニュー' : 'モバイルメニュー'}>
    {destinations.map(item => <Button variant={active === item.id && !disabled ? 'primary' : 'secondary'} key={item.id}
      aria-current={active === item.id && !disabled ? 'page' : undefined} disabled={disabled} onClick={() => onNavigate(item.id)}>
      {item.id === 'party' ? <MenuEmblem kind="party" /> : item.id === 'bag' ? <MenuEmblem kind="bag" /> : item.id === 'settings' ? <MenuEmblem kind="settings" /> : item.id === 'dungeons' ? <CommandEmblem kind="balanced" /> : <House size={25} strokeWidth={1.5} fill="currentColor" fillOpacity={.18} aria-hidden="true" />}<span>{item.label}</span>
    </Button>)}
  </nav>;
}
