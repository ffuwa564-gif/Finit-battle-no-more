import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { tr } from '../locales/i18n';
import { Button, Modal } from './index';

export function QuickGuide() {
  const [open, setOpen] = useState(false);
  return <><Button className="quick-guide-button" variant="secondary" size="sm" onClick={() => setOpen(true)}><BookOpen size={15} />{tr('遊び方')}</Button>
    <Modal open={open} title={tr('遊び方')} onClose={() => setOpen(false)}>
      <ol className="quick-guide-steps">
        <li><strong>{tr('仲間とリーダーを選ぶ')}</strong><p>{tr('4人まで編成。リーダーの追加効果は生存中に発動します。')}</p></li>
        <li><strong>{tr('作戦を選び、ATTACK')}</strong><p>{tr('1回押すと1ラウンド進行。スキルは状況に応じて自動使用。NEXTは演出の手動送りです。')}</p></li>
        <li><strong>{tr('危ない時は回復薬')}</strong><p>{tr('ラウンドの合間にITEMから仲間を選択。全滅・撤退では今回の仮取得素材を失います。')}</p></li>
        <li><strong>{tr('踏破したら報酬を確定')}</strong><p>{tr('通常の初踏破で石3個、祈願石イベントは毎回1個。石5個で女神の祈願ができます。')}</p></li>
      </ol><p>{tr('自動保存はこのブラウザー内です。設定からバックアップを保存すると、別の端末にも移せます。')}</p>
      <Button onClick={() => setOpen(false)}>{tr('わかった、旅を始める')}</Button>
    </Modal></>;
}
