import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const sourcePath = "lib/privacy/person-display.ts";
const source = await readFile(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const commonJsModule = { exports: {} };
vm.runInNewContext(compiled, {
  exports: commonJsModule.exports,
  module: commonJsModule,
});

const { formatMinimizedStudentName } = commonJsModule.exports;

assert.equal(
  formatMinimizedStudentName({
    firstName: "Jordan",
    lastName: "Smith",
  }),
  "Jordan S.",
  "student labels expose only the first name and last initial",
);

assert.equal(
  formatMinimizedStudentName({
    firstName: "Alexandra",
    lastName: "Garcia",
    preferredName: "Alex",
  }),
  "Alex G.",
  "the approved preferred name is used when available",
);

assert.equal(
  formatMinimizedStudentName({
    firstName: "  Test  Student ",
    lastName: "  example ",
  }),
  "Test Student E.",
  "display labels normalize surrounding and repeated whitespace",
);

assert.equal(
  formatMinimizedStudentName({
    firstName: "",
    lastName: "",
  }),
  "Student",
  "invalid or incomplete names fail without exposing additional data",
);

console.log("Student PII-minimized display formatting: passed");
