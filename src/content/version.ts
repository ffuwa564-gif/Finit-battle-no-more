/** Updated renderer with explicitly isolated Sakuya research rules. */
export const PUBLIC_RELEASE={appVersion:'1.12.0',contentVersion:'v1.10-r1',rulesVersion:'2',schemaVersion:1} as const;
export const SAKUYA_RESEARCH_RELEASE={appVersion:'1.12.0-sakuya-research.2',contentVersion:'sakuya-research-v2',rulesVersion:'2-sakuya-research-v2',schemaVersion:1} as const;
const nodeFlag=typeof process==='undefined'?undefined:process.env.VITE_SAKUYA_RESEARCH;
export const SAKUYA_RESEARCH_ENABLED=import.meta.env?.VITE_SAKUYA_RESEARCH==='1'||nodeFlag==='1';
export const RELEASE=SAKUYA_RESEARCH_ENABLED?SAKUYA_RESEARCH_RELEASE:PUBLIC_RELEASE;
export const RELEASE_LABEL=SAKUYA_RESEARCH_ENABLED?'研究版・未公開仕様':'1.12';
