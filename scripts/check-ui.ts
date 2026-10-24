import ts from 'typescript';
import { existsSync, readFileSync } from 'node:fs';
import { walk } from './fingerprint';

// Explicit composition-root exception: App owns the single shared audio event bridge.
// Screens themselves may not import audio APIs. Components own native controls and styles.
const errors: string[] = [];
const files = [...walk('src/screens'), ...(existsSync('src/App.tsx') ? ['src/App.tsx'] : [])].filter(path => /\.tsx?$/.test(path));
if (files.length === 0) errors.push('No screen/composition source was found; the UI gate cannot validate an empty application.');
const report = (file: string, node: ts.Node, source: ts.SourceFile, message: string) => {
  const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
  errors.push(`${file}:${line + 1} ${message}`);
};
for (const file of files) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      if (/\.(?:css|scss|less)$/.test(spec)) report(file, node, source, 'Screen stylesheet imports are forbidden; compose shared UI layout classes.');
      if (/\b(?:tone|gsap|howler|@radix-ui|@mui|antd)\b/.test(spec) || /platform\/audio/.test(spec) && file !== 'src/App.tsx') report(file, node, source, 'Import shared UI/audio public entry points only.');
      if (/\/ui\//.test(spec) && !/\/ui\/index$/.test(spec)) report(file, node, source, 'UI internal imports are forbidden; use the public UI entry point.');
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source);
      const native = /^[a-z]/.test(tag);
      if (native && ['button', 'input', 'select', 'textarea'].includes(tag)) report(file, node, source, `Native ${tag} must use a shared UI control.`);
      for (const prop of node.attributes.properties) {
        if (!ts.isJsxAttribute(prop)) continue;
        const name = prop.name.getText(source);
        if (name === 'style') report(file, prop, source, 'Inline styles are forbidden in screens; use approved UI variants/layout.');
        if (name === 'dangerouslySetInnerHTML') report(file, prop, source, 'Raw HTML content is forbidden.');
        if (native && ['onClick', 'onPointerDown', 'onTouchStart', 'onKeyDown'].includes(name)) report(file, prop, source, 'Interactive native elements bypass shared controls.');
      }
    }
    if (ts.isNewExpression(node) && ['Audio', 'AudioContext', 'webkitAudioContext'].includes(node.expression.getText(source))) report(file, node, source, 'Direct audio creation is forbidden.');
    ts.forEachChild(node, visit);
  };
  visit(source);
}
if (errors.length) {
  console.error(`UI contract gate failed:\n${errors.map(error => `- ${error}`).join('\n')}`);
  process.exitCode = 1;
} else console.log(`UI contract gate passed: ${files.length} screen/composition files. Static checks cover known bypasses, not visual correctness.`);
