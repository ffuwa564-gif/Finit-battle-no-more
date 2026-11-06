import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { tr } from '../locales/i18n';
import { InventoryIllustration, type InventoryPanelKind } from './InventoryArts';
import './inventory-section.css';

/** Long inventory content has one owner and always starts collapsed. */
export interface InventorySectionProps {
  id: string;
  title: string;
  count?: number;
  tone?: 'paper' | 'night';
  children: ReactNode;
  art?: InventoryPanelKind;
}

export function InventorySection({ id, title, count, tone = 'paper', children, art }: InventorySectionProps) {
  return <details className={`inventory-section inventory-section--${tone}${art ? ' inventory-section--illustrated' : ''}`} data-inventory-art={art} data-inventory-section={id}>
    <summary aria-label={tr(title)}><span>{tr(title)}</span>{count !== undefined && <span className="inventory-section__count">{count}</span>}<ChevronDown size={18} aria-hidden="true" /></summary>
    <div className="inventory-section__body">{art&&<div className="inventory-section__illustration"><InventoryIllustration kind={art}/></div>}{children}</div>
  </details>;
}
