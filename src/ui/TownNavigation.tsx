import { Backpack, Compass, House, Settings, Users } from 'lucide-react';
import { Button } from './index';
import './town-navigation.css';

const destinations = [
  { id: 'home', label: 'ホーム', icon: House },
  { id: 'dungeons', label: 'ダンジョン', icon: Compass },
  { id: 'party', label: 'パーティ', icon: Users },
  { id: 'bag', label: 'カバン・道具', icon: Backpack },
  { id: 'settings', label: '設定', icon: Settings },
] as const;
export type TownDestination = typeof destinations[number]['id'];

/** The same navigation is inset into the home frame and docked on other town screens. */
export function TownNavigation({ active, onNavigate, disabled = false, embedded = false }: {
  active: string; onNavigate: (page: TownDestination) => void; disabled?: boolean; embedded?: boolean;
}) {
  return <nav className={`town-navigation ${embedded ? 'hub-navigation' : 'mobile-nav'}`} aria-label={embedded ? 'ホームのメニュー' : 'モバイルメニュー'}>
    {destinations.map(item => <Button variant={active === item.id && !disabled ? 'primary' : 'secondary'} key={item.id}
      aria-current={active === item.id && !disabled ? 'page' : undefined} disabled={disabled} onClick={() => onNavigate(item.id)}>
      <item.icon size={22} strokeWidth={1.35} /><span>{item.label}</span>
    </Button>)}
  </nav>;
}
