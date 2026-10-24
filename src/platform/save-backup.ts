import type { Content, GameSave } from '../domain/types';
import { assertSaveCompatibility, loadSave, persistSave } from './save';

export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
export interface SaveBackupFile { format: 'stillveil-save'; formatVersion: 1; exportedAt: string; save: GameSave }
export function encodeBackup(save: GameSave, content: Content, date = new Date()): string {
  assertSaveCompatibility(save, content);
  return JSON.stringify({ format: 'stillveil-save', formatVersion: 1, exportedAt: date.toISOString(), save }, null, 2);
}
export function decodeBackup(text: string, content: Content): SaveBackupFile {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error('バックアップファイルが大きすぎます。');
  let file: unknown;
  try { file = JSON.parse(text); } catch { throw new Error('バックアップのJSONを読み込めません。'); }
  if (!file || typeof file !== 'object' || !('format' in file) || file.format !== 'stillveil-save' || !('formatVersion' in file) || file.formatVersion !== 1 || !('exportedAt' in file) || typeof file.exportedAt !== 'string' || !Number.isFinite(Date.parse(file.exportedAt)) || !('save' in file)) throw new Error('STILLVEILのバックアップではありません。');
  assertSaveCompatibility(file.save as GameSave, content);
  return file as SaveBackupFile;
}
export async function restoreBackup(file: SaveBackupFile, content: Content, expectedRevision: number): Promise<void> {
  assertSaveCompatibility(file.save, content);
  const next = structuredClone(file.save);
  next.revision = expectedRevision + 1;
  await persistSave(next, expectedRevision);
}
export async function downloadBackup(content: Content): Promise<void> {
  const save = await loadSave();
  if (!save) throw new Error('保存データがありません。');
  const blob = new Blob([encodeBackup(save, content)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url;
  link.download = `stillveil-save-${new Date().toISOString().slice(0,10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
