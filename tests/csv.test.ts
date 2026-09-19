import test from "node:test";
import assert from "node:assert/strict";
import { csvCell, csvRow, csvDocument } from "../src/lib/csv";

test("citizen text cannot break the column structure", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell("has, comma"), '"has, comma"');
  assert.equal(csvCell('has "quotes"'), '"has ""quotes"""');
  assert.equal(csvCell("line\nbreak"), '"line\nbreak"');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(undefined), "");
  assert.equal(csvCell(0), "0");
});

test("a report cannot smuggle a spreadsheet formula into an export", () => {
  // Quoting alone does not help: the quotes are stripped when the cell is
  // parsed, so the value itself has to be made inert.
  for (const attack of [
    "=1+1",
    '=HYPERLINK("http://evil.example","click")',
    "+1234",
    "-1+1",
    "@SUM(A1)",
    "\tstarts with tab",
  ]) {
    const cell = csvCell(attack);
    const unquoted = cell.startsWith('"') ? cell.slice(1, -1) : cell;
    assert.ok(
      unquoted.startsWith("'"),
      `${JSON.stringify(attack)} was not neutralised: ${cell}`,
    );
  }
});

test("ordinary text that merely contains an operator is left alone", () => {
  // Only a LEADING operator is dangerous; mangling normal prose would corrupt
  // the export for the reader.
  assert.equal(csvCell("2+2 potholes"), "2+2 potholes");
  assert.equal(csvCell("road A-12"), "road A-12");
  assert.equal(csvCell("email me@example.com"), "email me@example.com");
});

test("Greek and Russian report text survives a round trip", () => {
  const greek = "Μεγάλη λακκούβα, Λεωφόρος Αποστόλου Παύλου";
  const russian = "Большая яма на дороге";
  assert.equal(csvCell(greek), `"${greek}"`);
  assert.equal(csvCell(russian), russian);
});

test("rows and documents use CRLF and a byte-order mark", () => {
  assert.equal(csvRow(["a", "b,c"]), 'a,"b,c"');
  const doc = csvDocument(["one", "two"], [["x", "y"]]);
  // The BOM is what makes Excel read the file as UTF-8 rather than the system
  // codepage, which is what turns Greek text into mojibake.
  assert.ok(doc.startsWith("﻿"), "missing byte-order mark");
  assert.equal(doc, "﻿one,two\r\nx,y\r\n");
});
