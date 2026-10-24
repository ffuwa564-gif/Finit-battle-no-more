import { tr, useLanguage, setLanguage } from '../locales/i18n';
import { Button } from './index';
import './release-prep.css';

export function LanguageSwitch({ className = '' }: { className?: string }) {
  const language = useLanguage();
  return <div className={`language-switch ${className}`} role="group" aria-label={tr('言語')}>
    <Button size="sm" variant="secondary" lang="ja" selected={language === 'ja'} sound={false} onClick={() => setLanguage('ja')}>日本語</Button>
    <Button size="sm" variant="secondary" lang="en" selected={language === 'en'} sound={false} onClick={() => setLanguage('en')}>English</Button>
  </div>;
}
