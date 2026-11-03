import { useSyncExternalStore, type ReactNode } from 'react';
import english from './en.json';

export type Language = 'ja' | 'en';
const storageKey = 'stillveil-language';
function initialLanguage(): Language {
  try { const stored = localStorage.getItem(storageKey); if (stored === 'ja' || stored === 'en') return stored; } catch { /* Private storage may be unavailable. */ }
  return typeof navigator !== 'undefined' && navigator.language.startsWith('ja') ? 'ja' : 'en';
}
let language = initialLanguage();
const listeners = new Set<() => void>();
export function getLanguage(): Language { return language; }
export function setLanguage(next: Language): void {
  language = next;
  try { localStorage.setItem(storageKey, next); } catch { /* Language changes still work for this session. */ }
  listeners.forEach(listener => listener());
}
export function useLanguage(): Language {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, getLanguage, () => 'ja');
}
const messages: Record<string, string> = english;
const japaneseKeys: Record<string, string> = { 'status.regen': '再生' };
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const templates = Object.entries(messages).filter(([key]) => /\{\d+\}/.test(key)).sort(([a], [b]) => b.replace(/\{\d+\}/g, '').length - a.replace(/\{\d+\}/g, '').length).map(([key, value]) => {
  const slots: string[] = [];
  const pattern = key.split(/(\{\d+\})/).map(part => /^\{\d+\}$/.test(part) ? (slots.push(part), key === '{0}の{1}' ? '(.+)' : '(.+?)') : escape(part)).join('');
  return { expression: new RegExp(`^${pattern}$`, 's'), value, slots };
});
const words = Object.keys(messages).filter(key => /[\u3040-\u30ff\u3400-\u9fff]/.test(key) && !/\{\d+\}/.test(key)).sort((a,b) => b.length-a.length);
const sentences = words.filter(key => key.length > 10 && key.endsWith('。'));
const fragments = new RegExp(words.map(escape).join('|'), 'g');

/** Translate only presentation text. Stable IDs, saves, and replay text remain unchanged. */
export function tr(value: string | number | null | undefined, locale = language, depth = 0): string {
  const text = value == null ? '' : String(value);
  if (locale === 'ja') return japaneseKeys[text] ?? text;
  if (Object.hasOwn(messages, text)) return messages[text];
  if (!/[\u3040-\u30ff\u3400-\u9fff]/.test(text)) return text;
  const core = text.trim();
  if (core !== text) return text.slice(0,text.indexOf(core)) + tr(core,locale,depth+1) + text.slice(text.indexOf(core)+core.length);
  if (depth < 8) {
    for (const sentence of sentences) {
      const suffix = ' ' + sentence;
      if (text.endsWith(suffix)) return tr(text.slice(0,-suffix.length),locale,depth+1) + ' ' + messages[sentence];
    }
    const suffixes = text.split(/(（障壁が\d+軽減）|（HP\d+吸収）|（障壁\d+を破壊）|（状態異常を防いだ）|（障壁を解いて攻勢）|（協撃）|（[^（）]+を付与）)/).filter(Boolean);
    if (suffixes.length > 1) return suffixes.map(part => tr(part,locale,depth+1)).join(' ');
    for (const template of templates) {
      const match = text.match(template.expression);
      if (match) {
        const values = Object.fromEntries(template.slots.map((slot,i) => [slot, tr(match[i+1],locale,depth+1)]));
        return template.value.replace(/\{\d+\}/g, slot => values[slot] ?? slot);
      }
    }
  }
  return text.replace(fragments, word => messages[word]);
}
export function localize(value: ReactNode): ReactNode {
  return typeof value === 'string' ? tr(value) : Array.isArray(value) ? value.map(localize) : value;
}
