import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { approvalFingerprint } from './fingerprint';

const report = approvalFingerprint();
mkdirSync('.reports', { recursive: true });
writeFileSync('.reports/content-review.json', `${JSON.stringify(report, null, 2)}\n`);
const approvalPath = 'content-approval.json';
if (process.argv.includes('--report')) {
  console.log(`Review fingerprint: ${report.fingerprint}\nOpen the common preview, inspect the listed content and listen to the event sounds. No approval has been recorded.`);
} else {
  let valid = false;
  if (existsSync(approvalPath)) {
    const approval = JSON.parse(readFileSync(approvalPath, 'utf8')) as Record<string, unknown>;
    valid = approval.contentVersion === report.contentVersion && approval.fingerprint === report.fingerprint && approval.visualConfirmed === true && approval.audioConfirmed === true && typeof approval.reviewer === 'string' && approval.reviewer.trim().length > 0 && typeof approval.confirmedAt === 'string' && !Number.isNaN(Date.parse(approval.confirmedAt));
  }
  if (!valid) {
    console.error('Release blocked: visual/audio approval is missing or stale. See .reports/content-review.json and docs/implementation.md. Development builds remain available.');
    process.exitCode = 1;
  } else console.log(`Release approval matches content ${report.contentVersion} and all implementation/asset hashes.`);
}
