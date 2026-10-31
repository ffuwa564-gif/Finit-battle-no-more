import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { tr } from '../locales/i18n';
import './inventory-section.css';

/** Long inventory content has one owner and always starts collapsed. */
export interface InventorySectionProps {
  id: string;
  title: string;
  count?: number;
  tone?: 'paper' | 'night';
  children: ReactNode;
}

export function InventorySection({ id, title, count, tone = 'paper', children }: InventorySectionProps) {
  return <details className={`inventory-section inventory-section--${tone}`} data-inventory-section={id}>
    <summary aria-label={tr(title)}><span>{tr(title)}</span>{count !== undefined && <span className="inventory-section__count">{count}</span>}<ChevronDown size={18} aria-hidden="true" /></summary>
    <div className="inventory-section__body">{children}</div>
  </details>;
}
