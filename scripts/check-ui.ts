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
// Inventory collections are always closed initially, through the shared contract.
const inventorySource = ts.createSourceFile('src/ui/InventorySection.tsx', readFileSync('src/ui/InventorySection.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function checkInventoryDefaults(node: ts.Node): void {
  if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(inventorySource) === 'details') {
    if (node.attributes.properties.some(prop => ts.isJsxSpreadAttribute(prop) || ts.isJsxAttribute(prop) && ['open', 'defaultOpen'].includes(prop.name.getText(inventorySource)))) report('src/ui/InventorySection.tsx', node, inventorySource, 'Inventory sections must start collapsed; do not forward open state or arbitrary attributes.');
  }
  ts.forEachChild(node, checkInventoryDefaults);
}
checkInventoryDefaults(inventorySource);
for (const [file, functionName] of [['src/screens/GameViews.tsx', 'BagView'], ['src/ui/MemoryGems.tsx', 'MemoryGems'], ['src/ui/IvoryTower.tsx', 'IvoryTower']]) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node: ts.Node, inInventory = false, collapsed = false): void {
    const scope = inInventory || ts.isFunctionDeclaration(node) && node.name?.text === functionName;
    const section = ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === 'InventorySection';
    if (scope && !collapsed && ts.isJsxOpeningElement(node)) {
      const className = node.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText(source) === 'className') as ts.JsxAttribute | undefined;
      if (className?.initializer && ts.isStringLiteral(className.initializer) && ['resource-list', 'memory-gems__grid', 'memory-gems__recipes', 'memory-gems__sources', 'ivory-tower__floors'].includes(className.initializer.text)) report(file, node, source, 'Long inventory collections must be inside InventorySection.');
    }
    ts.forEachChild(node, child => visit(child, scope, collapsed || section));
  }
  visit(source);
}
// Ready-state UI must consume public gestures, never the engine's private commitments.
for (const file of [...walk('src/ui'), ...walk('src/screens')].filter(path => /\.tsx?$/.test(path))) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node) && ['companionCommitments', 'coordinationPlan'].includes(node.text)) report(file, node, source, 'Private companion commands must not be read by the presentation layer; use public companion signals.');
    ts.forEachChild(node, visit);
  };
  visit(source);
}
if (errors.length) {
  console.error(`UI contract gate failed:\n${errors.map(error => `- ${error}`).join('\n')}`);
  process.exitCode = 1;
} else console.log(`UI contract gate passed: ${files.length} screen/composition files. Static checks cover known bypasses, not visual correctness.`);
