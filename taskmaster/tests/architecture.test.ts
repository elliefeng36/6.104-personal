// Checks that concept implementations do not import peers.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const names = ["Authenticating", "Sessioning", "TaskListing", "TaskSetting", "TaskSuggesting"];
for (const name of names) {
  test(`${name} does not import a peer concept or application wiring`, () => {
    const source = readFileSync(new URL(`../src/concepts/${name}.ts`, import.meta.url), "utf8");
    const file = ts.createSourceFile(`${name}.ts`, source, ts.ScriptTarget.Latest, true);
    const imports: string[] = [];
    function visit(node: ts.Node) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const target = node.arguments[0];
        expect(target && ts.isStringLiteral(target)).toBe(true);
        if (target && ts.isStringLiteral(target)) imports.push(target.text);
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
    for (const dependency of imports) {
      expect(dependency).not.toMatch(/(assembly|compositions|storage|concepts\.ts|db\.ts|\.registry)/);
      for (const peer of names.filter(peer => peer !== name)) expect(dependency).not.toContain(peer);
    }
  });
}
