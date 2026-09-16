import assert from "node:assert/strict";
import test from "node:test";
import { csvCell } from "../lib/csv-export.ts";

test("exportação CSV impede execução de fórmula e mantém células delimitadas", () => {
  assert.equal(csvCell('=HYPERLINK("https://example.com", "Abrir")'), '"\t=HYPERLINK(""https://example.com"", ""Abrir"")"');
  assert.equal(csvCell('  @SUM(1,2)'), '"\t  @SUM(1,2)"');
  assert.equal(csvCell('＝1+2'), '"\t＝1+2"');
  assert.equal(csvCell('Ana";=1+2'), '"Ana"";=1+2"');
  assert.equal(csvCell('linha\r\n=1+2'), '"linha  =1+2"');
  assert.equal(csvCell(12500), '"12500"');
});
