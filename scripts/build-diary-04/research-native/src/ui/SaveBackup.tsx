import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { content } from '../content';
import { tr } from '../locales/i18n';
import { decodeBackup, downloadBackup, downloadMigrationBackup, restoreBackup, MAX_BACKUP_BYTES, type SaveBackupFile } from '../platform/save-backup';
import { Button, Modal, Panel } from './index';

export function SaveBackup({ revision }: { revision: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [candidate, setCandidate] = useState<SaveBackupFile | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const report = (error: unknown) => setError(error instanceof Error ? error.message : 'バックアップ操作に失敗しました。');
  async function choose(file?: File) {
    setError(''); if (!file) return;
    try { if (file.size > MAX_BACKUP_BYTES) throw new Error('バックアップファイルが大きすぎます。'); setCandidate(decodeBackup(await file.text(), content)); } catch (error) { report(error); }
  }
  async function restore() {
    if (!candidate || busy) return;
    setBusy(true); setError('');
    try { await restoreBackup(candidate, content, revision); location.reload(); } catch (error) { report(error); setBusy(false); }
  }
  return <Panel><h3>{tr('セーブのバックアップ')}</h3><p className="backup-description">{tr('ファイルに保存して別の端末や配信サイトへ進行を移せます。ブラウザーのデータを消す前にも保存してください。')}</p>
    <div className="toolbar"><Button variant="secondary" onClick={() => { setError(''); void downloadBackup(content).catch(report); }}><Download size={16} />{tr('バックアップを保存')}</Button><Button variant="secondary" onClick={() => input.current?.click()}><Upload size={16} />{tr('バックアップを読み込む')}</Button></div>
    <details><summary>{tr('更新前の保存データ')}</summary><p className="subtle">{tr('1.0から更新したときの元データは、通常のバックアップとは別に保持しています。')}</p><Button variant="secondary" onClick={() => { setError(''); void downloadMigrationBackup().catch(report); }}><Download size={16} />{tr('1.0の元データを保存')}</Button></details>
    <input ref={input} type="file" accept=".json,application/json" hidden aria-label={tr('バックアップファイル')} onChange={event => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
    {error && <p className="backup-error" role="alert">{tr(error)}</p>}
    <Modal open={!!candidate} title={tr('このバックアップを復元しますか？')} onClose={() => { if (!busy) setCandidate(null); }}>
      {candidate && <>{candidate.legacySource && <p>{tr('1.0の保存データを1.10へ変換して復元します。旧探索は終了し、確保済みの戦利品を引き継ぎます。')}</p>}<p>{tr('現在の進行を、選択したバックアップの内容に置き換えます。')}</p><dl className="backup-summary"><dt>{tr('保存日時')}</dt><dd>{new Date(candidate.exportedAt).toLocaleString()}</dd><dt>{tr('ゴールド')}</dt><dd>{candidate.save.gold}</dd><dt>{tr('祈願石')}</dt><dd>{candidate.save.stones}</dd><dt>{tr('仲間の数')}</dt><dd>{candidate.save.ownedIds.length}</dd><dt>{tr('進行')}</dt><dd>{tr(candidate.save.battle ? '探索途中' : '街に滞在中')}</dd></dl><p>{tr('必要なら先に現在のバックアップを保存してください。')}</p>
      {error && <p className="backup-error" role="alert">{tr(error)}</p>}<div className="toolbar"><Button disabled={busy} onClick={() => void restore()}>{tr('この内容で復元')}</Button><Button variant="secondary" disabled={busy} onClick={() => setCandidate(null)}>{tr('取消')}</Button></div></>}
    </Modal>
  </Panel>;
}

export function BackupExportButton() {
  const [error,setError] = useState('');
  return <><Button variant="secondary" onClick={() => { setError(''); void downloadBackup(content).catch(error => setError(error instanceof Error ? error.message : 'バックアップ操作に失敗しました。')); }}><Download size={16} />{tr('バックアップを保存')}</Button>{error && <p role="alert" className="backup-error">{tr(error)}</p>}</>;
}
