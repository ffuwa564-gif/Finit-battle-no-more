export { VisualNovel, NovelLibrary } from './VisualNovel';
export { FairyGuide, FairyGuideButton } from './FairyGuide';
export { XRGacha } from './XRGacha';
import { tr, localize } from '../locales/i18n';
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Crown, Diamond, X } from 'lucide-react';
import type { CharacterDef, Rarity } from '../domain/types';
import { roleName } from '../content';
import { emitUISound, type UISound } from './interaction';
import { NoticeSurface } from './NoticeSurface';
import { PortraitArt } from './PortraitArt';
import { RarityFrame } from './RarityFrame';
import './styles.css';
import './screens.css';
import './home.css';
import './battle.css';
import './enemy-carousel.css';
import './game-frame.css';
import './materials.css';
import './typography.css';
import './close-button.css';
export { EnemyCarousel } from './EnemyCarousel';
export { MenuEmblem } from './MenuEmblem';
export { SceneEffects } from './SceneEffects';
export { SceneAtmosphere } from './SceneAtmosphere';
export { LivingBattleFrame } from './LivingBattleFrame';
export { TownNavigation } from './TownNavigation';
export { CommandEmblem } from './CommandEmblem';
export { MotionSettingsProvider } from './animation-settings';
export { StoryAwakening } from './StoryAwakening';
export { EventDungeons } from './EventDungeons';
export { CharacterArtwork } from './CharacterArtwork';
export { AnimatedIllustration } from './AnimatedIllustration';
export { GachaShowcase } from './GachaShowcase';
export { CombatFeedback } from './CombatFeedback';
export { NoticeSurface } from './NoticeSurface';
export { BattleControlPad } from './BattleControlPad';
export { PortraitArt } from './PortraitArt';
export { CurrencyEmblem, EncounterCrest } from './Sigils';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'icon';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg'; selected?: boolean; sound?: UISound | false }

/** All interactive controls share this visual and sound boundary. */
export function Button({ variant = 'primary', size = 'md', selected, className = '', sound = 'confirm', onClick, children, type = 'button', ...props }: ButtonProps) {
  return <button {...props} type={type} aria-pressed={selected} className={`button button--${variant} button--${size}${selected ? ' is-selected' : ''} ${className}`} onClick={(event) => {
    // Unlock audio before a synchronous command error or view change can occur.
    if (sound) emitUISound(sound);
    onClick?.(event);
  }}>{localize(children)}</button>;
}

export function IconButton({ label, children, ...props }: Omit<ButtonProps, 'variant'> & { label: string }) {
  return <Button {...props} variant="icon" aria-label={tr(label)} title={tr(label)}>{localize(children)}</Button>;
}

export function Panel({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`panel ${className}`}>{localize(children)}</div>;
}

export function Stack({ children, className = '', gap = 'md', horizontal = false, ...props }: HTMLAttributes<HTMLDivElement> & { gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; horizontal?: boolean }) {
  return <div {...props} className={`stack stack--${gap}${horizontal ? ' stack--horizontal' : ''} ${className}`}>{localize(children)}</div>;
}

export function Grid({ children, className = '', columns = 3, ...props }: HTMLAttributes<HTMLDivElement> & { columns?: 2 | 3 | 4 }) {
  return <div {...props} className={`grid grid--${columns} ${className}`}>{localize(children)}</div>;
}

export function Container({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`container ${className}`}>{localize(children)}</div>;
}

export function Header({ title, subtitle, children, eyebrow }: { title: string; subtitle?: string; children?: ReactNode; eyebrow?: string }) {
  return <header className="page-header"><div>{localize(eyebrow && <p className="eyebrow">{localize(eyebrow)}</p>)}<h1>{localize(title)}</h1>{localize(subtitle && <p className="page-subtitle">{localize(subtitle)}</p>)}</div>{localize(children && <div className="header-actions">{localize(children)}</div>)}</header>;
}

export function SectionTitle({ children, subtitle, action }: { children: ReactNode; subtitle?: string; action?: ReactNode }) {
  return <div className="section-heading"><div><h2>{localize(children)}</h2>{localize(subtitle && <p>{localize(subtitle)}</p>)}</div>{localize(action)}</div>;
}

export function StatBadge({ icon, label, value }: { icon?: ReactNode; label?: string; value: ReactNode }) {
  return <span className="stat-badge">{localize(icon && <span className="stat-badge__icon" aria-hidden="true">{localize(icon)}</span>)}{localize(label && <span className="stat-badge__label">{localize(label)}</span>)}<strong>{localize(value)}</strong></span>;
}

export function HPBar({ hp: hpInput, maxHp: maxInput, value, max, showNumbers = false, label = 'HP' }: { hp?: number; maxHp?: number; value?: number; max?: number; showNumbers?: boolean; label?: string }) {
  const hp = hpInput ?? value ?? 0;
  const maxHp = maxInput ?? max ?? 1;
  const ratio = maxHp > 0 ? Math.max(0, Math.min(100, hp / maxHp * 100)) : 0;
  return <div className={`hp-meter${ratio <= 25 ? ' hp-meter--low' : ''}`}>
    {localize(showNumbers && <div className="hp-meter__numbers"><span>{localize(label)}</span><span>{localize(Math.max(0, hp))} <small>/ {localize(maxHp)}</small></span></div>)}
    <div className="hp-bar" role="progressbar" aria-label={tr(label)} aria-valuenow={Math.max(0, hp)} aria-valuemin={0} aria-valuemax={maxHp}><span style={{ width: `${ratio}%` }} /></div>
  </div>;
}

export interface CharacterPortraitProps { label?: string; variant?: 'face' | 'card'; character: CharacterDef; selected?: boolean; leader?: boolean; hp?: number; maxHp?: number; onClick?: () => void; disabled?: boolean; compact?: boolean; showRole?: boolean; showName?: boolean }
export function CharacterPortrait({ character, label, selected, leader, hp, maxHp, onClick, disabled, compact, variant = 'card', showRole = true, showName = true }: CharacterPortraitProps) {
  const face = variant === 'face' || compact === true;
  const body = <><div className="portrait-image"><PortraitArt character={character} face={face} /><RarityFrame rarity={character.rarity} /><RarityBadge rarity={character.rarity} />{localize(leader && <span className="leader-mark" title={tr("リーダー")}><Crown size={13} /><span className="sr-only">{tr("リーダー")}</span></span>)}<span className="portrait-constant">{localize((character.strength / 10).toFixed(1))}</span></div>{localize((showName || showRole) && <div className="portrait-copy">{localize(showName && <strong>{localize(character.name)}</strong>)}{localize(showRole && <span>{localize(roleName(character.role))}</span>)}</div>)}{localize(hp !== undefined && maxHp !== undefined && <HPBar hp={hp} maxHp={maxHp} label={tr(`${character.name}のHP`)} />)}</>;
  const classes = `character-portrait${selected ? ' is-selected' : ''}${hp === 0 ? ' is-fallen' : ''}${compact ? ' character-portrait--compact' : ''}${face ? ' character-portrait--face' : ''}`;
  return onClick ? <Button variant="secondary" className={classes} data-rarity={character.rarity} aria-description={tr(`レアリティ ${character.rarity}`)} onClick={onClick} disabled={disabled} selected={selected} aria-label={tr(label ?? `${character.name}${leader ? '・リーダー' : ''}${hp !== undefined ? ` HP ${hp}/${maxHp}` : ''}`)}>{localize(body)}</Button> : <div className={classes} data-rarity={character.rarity}>{localize(body)}</div>;
}

export function MaterialIcon({ rarity, size = 'md' }: { rarity: Rarity; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`material-icon material-icon--${rarity} material-icon--${size}`} aria-hidden="true"><Diamond strokeWidth={1.2} /><span className="material-icon__glint" /></span>;
}

export function RarityBadge({ rarity }: { rarity: Rarity | 'R' | 'SR' | 'SSR' | 'XR' }) {
  const names: Record<string, string> = { common: '通常', rare: 'レア', epic: '希少', R: 'R', SR: 'SR', SSR: 'SSR', XR: 'XR' };
  return <span className={`rarity-badge rarity-badge--${rarity}`}>{localize(names[rarity])}</span>;
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return <div className="empty-state">{localize(icon && <span className="empty-state__icon">{localize(icon)}</span>)}<h3>{localize(title)}</h3>{localize(children && <div className="empty-state__copy">{localize(children)}</div>)}</div>;
}

export function Toast({ children, tone = 'info', onClose, present = true }: { children: ReactNode; tone?: 'info' | 'error' | 'success'; onClose?: () => void; present?: boolean }) {
  return <NoticeSurface present={present} noticeKey={typeof children === 'string' ? children : undefined} className={`toast toast--${tone}`} role={tone === 'error' ? 'alert' : 'status'} tone={tone}><span>{localize(children)}</span>{localize(onClose && <IconButton className="close-button" label={tr("通知を閉じる")} sound="cancel" onClick={onClose}><X size={16} /></IconButton>)}</NoticeSurface>;
}

/** A single accessible dialog with keyboard containment and focus restoration. */
export function Modal({ open = true, title, children, onClose, footer, className = '' }: { open?: boolean; title: string; children: ReactNode; onClose: () => void; footer?: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    const root = document.getElementById('root');
    const oldRootOverflow = root?.style.overflow;
    if (root) root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    const focusable = () => [...(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]') ?? [])];
    (focusable()[0] ?? ref.current)?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); emitUISound('cancel'); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) { event.preventDefault(); ref.current?.focus(); return; }
      const first = elements[0]; const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = oldOverflow; if (root) root.style.overflow = oldRootOverflow ?? ''; document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [open]);
  if (!open) return null;
  return createPortal(<div className="modal-backdrop"><div className={`modal ${className}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}><div className="modal__header"><h2 id={titleId}>{localize(title)}</h2><IconButton className="close-button" label={tr("閉じる")} sound="cancel" onClick={onClose}><X size={20} /></IconButton></div><div className="modal__body">{localize(children)}</div>{localize(footer && <div className="modal__footer">{localize(footer)}</div>)}</div></div>, document.body);
}

export function LinkArrow({ children }: { children: ReactNode }) { return <span className="link-arrow">{localize(children)}<ChevronRight size={16} aria-hidden="true" /></span>; }

export function ArtBackground({ src, children, className = '' }: { src: string; children?: ReactNode; className?: string }) {
  return <div className={`art-background ${className}`} style={{ '--art-url': `url("${src}")` } as CSSProperties}>{localize(children)}</div>;
}

export { TitleScreen } from './TitleScreen';

export { GachaReveal } from './GachaReveal';

export { UnitEffects } from './UnitEffects';

export { LanguageSwitch } from './LanguageSwitch';
export { QuickGuide } from './QuickGuide';
export { SaveBackup, BackupExportButton } from './SaveBackup';

export { HomeArtwork } from './HomeArtwork';

export { CampaignDungeons } from './CampaignDungeons';

export { CampaignStory } from './CampaignStory';

export { GachaResults } from './GachaResults';

export { GoldExchange } from './GoldExchange';
export { UltimateCutIn } from './UltimateCutIn';
export { UltimateMeter } from './UltimateMeter';
