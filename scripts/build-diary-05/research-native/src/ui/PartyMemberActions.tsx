import { Check, Plus } from 'lucide-react';
import { tr } from '../locales/i18n';
import { Button } from './index';
import './party-member-actions.css';

export interface PartyMemberActionsProps {
  membership: 'available' | 'member' | 'leader';
  toggleDisabled: boolean;
  leaderDisabled: boolean;
  onToggle: () => void;
  onLeader: () => void;
}

/** Roster cards own one fixed action layout. Labels never compete for flex width;
 * callers cannot forward a toolbar, inline layout or arbitrary children. */
export function PartyMemberActions({ membership, toggleDisabled, leaderDisabled, onToggle, onLeader }: PartyMemberActionsProps) {
  const active = membership !== 'available';
  return <div className="party-member-actions">
    <Button variant={active ? 'primary' : 'secondary'} disabled={toggleDisabled} onClick={onToggle}>
      {active ? <Check size={14} /> : <Plus size={14} />}<span className="party-member-actions__label">{tr(active ? '編成中' : '編成する')}</span>
    </Button>
    <Button variant="secondary" disabled={leaderDisabled} onClick={onLeader}>
      <span className="party-member-actions__label">{tr(membership === 'leader' ? 'リーダー' : 'リーダーにする')}</span>
    </Button>
  </div>;
}
