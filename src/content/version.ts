/** Updated renderer with explicitly isolated Sakuya research rules. */
export const PUBLIC_RELEASE={appVersion:'1.12.0',contentVersion:'v1.10-r1',rulesVersion:'2',schemaVersion:1} as const;
export const SAKUYA_RESEARCH_RELEASE={appVersion:'1.12.0-sakuya-research.2',contentVersion:'sakuya-research-v2',rulesVersion:'2-sakuya-research-v2',schemaVersion:1} as const;
const nodeFlag=typeof process==='undefined'?undefined:process.env.VITE_SAKUYA_RESEARCH;
export const SAKUYA_RESEARCH_ENABLED=import.meta.env?.VITE_SAKUYA_RESEARCH==='1'||nodeFlag==='1';
export const MIETTE_RESEARCH_RELEASE={appVersion:'1.12.0-miette-research.3',contentVersion:'miette-research-v3',rulesVersion:'2-miette-research-v3',schemaVersion:1} as const;
const mietteNodeFlag=typeof process==='undefined'?undefined:process.env.VITE_MIETTE_RESEARCH;
export const MIETTE_RESEARCH_ENABLED=import.meta.env?.VITE_MIETTE_RESEARCH==='1'||mietteNodeFlag==='1';
export const TIKKA_RESEARCH_RELEASE={appVersion:'1.12.0-tikka-research.4',contentVersion:'tikka-research-v4',rulesVersion:'2-tikka-research-v4',schemaVersion:1} as const;
const tikkaNodeFlag=typeof process==='undefined'?undefined:process.env.VITE_TIKKA_RESEARCH;
export const TIKKA_RESEARCH_ENABLED=import.meta.env?.VITE_TIKKA_RESEARCH==='1'||tikkaNodeFlag==='1';
if([SAKUYA_RESEARCH_ENABLED,MIETTE_RESEARCH_ENABLED,TIKKA_RESEARCH_ENABLED].filter(Boolean).length>1)throw new Error('研究仕様は同時に有効化できません。');
export const RELEASE=TIKKA_RESEARCH_ENABLED?TIKKA_RESEARCH_RELEASE:MIETTE_RESEARCH_ENABLED?MIETTE_RESEARCH_RELEASE:SAKUYA_RESEARCH_ENABLED?SAKUYA_RESEARCH_RELEASE:PUBLIC_RELEASE;
export const RELEASE_LABEL=SAKUYA_RESEARCH_ENABLED||MIETTE_RESEARCH_ENABLED||TIKKA_RESEARCH_ENABLED?'研究版・未公開仕様':'1.12';
