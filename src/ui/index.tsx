import { useEffect, useId, useRef, type ButtonHTMLAttributes, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Crown, Diamond, X } from 'lucide-react';
import type { CharacterDef, Rarity } from '../domain/types';
import { roleName } from '../content';
import { PortraitArt } from './PortraitArt';
import './styles.css';
import './screens.css';
import './home.css';
import './battle.css';
import './enemy-carousel.css';
import './game-frame.css';
export { EnemyCarousel } from './EnemyCarousel';
export { MenuEmblem } from './MenuEmblem';
export { SceneEffects } from './SceneEffects';
export { TownNavigation } from './TownNavigation';
export { CommandEmblem } from './CommandEmblem';
export { StrategyDial } from './StrategyDial';
export { PortraitArt } from './PortraitArt';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'icon';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg'; selected?: boolean }

/** All interactive controls share this visual and sound boundary. */
export function Button({ variant = 'primary', size = 'md', selected, className = '', onClick, children, type = 'button', ...props }: ButtonProps) {
  return <button {...props} type={type} aria-pressed={selected} className={`button button--${variant} button--${size}${selected ? ' is-selected' : ''} ${className}`} onClick={(event) => {
    onClick?.(event);
    if (!event.defaultPrevented) window.dispatchEvent(new CustomEvent('game:ui', { detail: { kind: 'confirm' } }));
  }}>{children}</button>;
}

export function IconButton({ label, children, ...props }: Omit<ButtonProps, 'variant'> & { label: string }) {
  return <Button {...props} variant="icon" aria-label={label} title={label}>{children}</Button>;
}

export function Panel({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`panel ${className}`}>{children}</div>;
}

export function Stack({ children, className = '', gap = 'md', horizontal = false, ...props }: HTMLAttributes<HTMLDivElement> & { gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; horizontal?: boolean }) {
  return <div {...props} className={`stack stack--${gap}${horizontal ? ' stack--horizontal' : ''} ${className}`}>{children}</div>;
}

export function Grid({ children, className = '', columns = 3, ...props }: HTMLAttributes<HTMLDivElement> & { columns?: 2 | 3 | 4 }) {
  return <div {...props} className={`grid grid--${columns} ${className}`}>{children}</div>;
}

export function Container({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`container ${className}`}>{children}</div>;
}

export function Header({ title, subtitle, children, eyebrow }: { title: string; subtitle?: string; children?: ReactNode; eyebrow?: string }) {
  return <header className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{subtitle && <p className="page-subtitle">{subtitle}</p>}</div>{children && <div className="header-actions">{children}</div>}</header>;
}

export function SectionTitle({ children, subtitle, action }: { children: ReactNode; subtitle?: string; action?: ReactNode }) {
  return <div className="section-heading"><div><h2>{children}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

export function StatBadge({ icon, label, value }: { icon?: ReactNode; label?: string; value: ReactNode }) {
  return <span className="stat-badge">{icon && <span className="stat-badge__icon" aria-hidden="true">{icon}</span>}{label && <span className="stat-badge__label">{label}</span>}<strong>{value}</strong></span>;
}

export function HPBar({ hp: hpInput, maxHp: maxInput, value, max, showNumbers = false, label = 'HP' }: { hp?: number; maxHp?: number; value?: number; max?: number; showNumbers?: boolean; label?: string }) {
  const hp = hpInput ?? value ?? 0;
  const maxHp = maxInput ?? max ?? 1;
  const ratio = maxHp > 0 ? Math.max(0, Math.min(100, hp / maxHp * 100)) : 0;
  return <div className={`hp-meter${ratio <= 25 ? ' hp-meter--low' : ''}`}>
    {showNumbers && <div className="hp-meter__numbers"><span>{label}</span><span>{Math.max(0, hp)} <small>/ {maxHp}</small></span></div>}
    <div className="hp-bar" role="progressbar" aria-label={label} aria-valuenow={Math.max(0, hp)} aria-valuemin={0} aria-valuemax={maxHp}><span style={{ width: `${ratio}%` }} /></div>
  </div>;
}

export interface CharacterPortraitProps { variant?: 'face' | 'card'; character: CharacterDef; selected?: boolean; leader?: boolean; hp?: number; maxHp?: number; onClick?: () => void; disabled?: boolean; compact?: boolean; showRole?: boolean }
export function CharacterPortrait({ character, selected, leader, hp, maxHp, onClick, disabled, compact, variant = 'card', showRole = true }: CharacterPortraitProps) {
  const face = variant === 'face' || compact === true;
  const body = <><div className="portrait-image"><PortraitArt character={character} face={face} />{leader && <span className="leader-mark" title="リーダー"><Crown size={13} /><span className="sr-only">リーダー</span></span>}<span className="portrait-constant">{(character.strength / 10).toFixed(1)}</span></div><div className="portrait-copy"><strong>{character.name}</strong>{showRole && <span>{roleName(character.role)}</span>}</div>{hp !== undefined && maxHp !== undefined && <HPBar hp={hp} maxHp={maxHp} />}</>;
  const classes = `character-portrait${selected ? ' is-selected' : ''}${hp === 0 ? ' is-fallen' : ''}${compact ? ' character-portrait--compact' : ''}${face ? ' character-portrait--face' : ''}`;
  return onClick ? <Button variant="secondary" className={classes} onClick={onClick} disabled={disabled} selected={selected} aria-label={`${character.name}${leader ? '・リーダー' : ''}${hp !== undefined ? ` HP ${hp}/${maxHp}` : ''}`}>{body}</Button> : <div className={classes}>{body}</div>;
}

export function MaterialIcon({ rarity, size = 'md' }: { rarity: Rarity; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`material-icon material-icon--${rarity} material-icon--${size}`} aria-hidden="true"><Diamond strokeWidth={1.2} /><span className="material-icon__glint" /></span>;
}

export function RarityBadge({ rarity }: { rarity: Rarity | 'R' | 'SR' | 'SSR' }) {
  const names: Record<string, string> = { common: '通常', rare: 'レア', epic: '希少', R: 'R', SR: 'SR', SSR: 'SSR' };
  return <span className={`rarity-badge rarity-badge--${rarity}`}>{names[rarity]}</span>;
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return <div className="empty-state">{icon && <span className="empty-state__icon">{icon}</span>}<h3>{title}</h3>{children && <div className="empty-state__copy">{children}</div>}</div>;
}

export function Toast({ children, tone = 'info', onClose }: { children: ReactNode; tone?: 'info' | 'error' | 'success'; onClose?: () => void }) {
  return <div className={`toast toast--${tone}`} role={tone === 'error' ? 'alert' : 'status'}><span>{children}</span>{onClose && <IconButton label="通知を閉じる" onClick={onClose}><X size={16} /></IconButton>}</div>;
}

/** A single accessible dialog with keyboard containment and focus restoration. */
export function Modal({ open = true, title, children, onClose, footer }: { open?: boolean; title: string; children: ReactNode; onClose: () => void; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => [...(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]') ?? [])];
    (focusable()[0] ?? ref.current)?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements.length) { event.preventDefault(); ref.current?.focus(); return; }
      const first = elements[0]; const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, [open]);
  if (!open) return null;
  return createPortal(<div className="modal-backdrop"><div className="modal" ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}><div className="modal__header"><h2 id={titleId}>{title}</h2><IconButton label="閉じる" onClick={onClose}><X size={20} /></IconButton></div><div className="modal__body">{children}</div>{footer && <div className="modal__footer">{footer}</div>}</div></div>, document.body);
}

export function LinkArrow({ children }: { children: ReactNode }) { return <span className="link-arrow">{children}<ChevronRight size={16} aria-hidden="true" /></span>; }

export function ArtBackground({ src, children, className = '' }: { src: string; children?: ReactNode; className?: string }) {
  return <div className={`art-background ${className}`} style={{ '--art-url': `url("${src}")` } as CSSProperties}>{children}</div>;
}
