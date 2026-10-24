import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { walk } from './fingerprint';
import english from '../src/locales/en.json';
const messages: Record<string,string> = english;
const missing = new Set<string>();
for (const path of walk('src').filter(p => /\.tsx?$/.test(p) && !p.includes('/locales/'))) {
  const source = ts.createSourceFile(path, readFileSync(path,'utf8'), ts.ScriptTarget.Latest, true, path.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function check(text: string) {
    if (/[\u3040-\u30ff\u3400-\u9fff]/.test(text) && !Object.hasOwn(messages,text) && !Object.hasOwn(messages,text.trim())) missing.add(text);
  }
  function visit(node: ts.Node) {
    if (ts.isStringLiteralLike(node) || ts.isJsxText(node)) check(node.text);
    if (ts.isTemplateExpression(node)) { let text=node.head.text; node.templateSpans.forEach((span,i)=>{text+=`{${i}}${span.literal.text}`;}); check(text); }
    ts.forEachChild(node,visit);
  }
  visit(source);
}
if (missing.size) { console.error('Missing English messages:\n'+[...missing].map(t=>JSON.stringify(t)).join('\n')); process.exitCode=1; }
else console.log(`Locale check passed: ${Object.keys(messages).length} English messages.`);
