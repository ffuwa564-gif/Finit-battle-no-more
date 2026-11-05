import { Sparkles } from 'lucide-react';
import { tr } from '../locales/i18n';
import { Button } from './index';
export interface FieldSkillChoiceProps {
    name: string;
    description: string;
    enabled: boolean;
    disabled: boolean;
    onChange: () => void;
}
export function FieldSkillChoice({ name, description, enabled, disabled, onChange }: FieldSkillChoiceProps) {
    return <div className="field-skill-choice"><Button size="sm" variant="secondary" selected={enabled} disabled={disabled} title={tr(description)} onClick={onChange}><Sparkles size={13}/>{tr(enabled ? '通常技能に戻す' : '研究技能に切替')}</Button><small>{tr(enabled ? name : '研究技能は出発前に選択できます')}</small></div>;
}
