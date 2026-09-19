/**
 * CSV serialisation for municipal exports.
 *
 * Two separate concerns are handled here, and conflating them is the usual bug:
 *
 *  - RFC 4180 quoting, so that commas, quotes and newlines inside citizen text
 *    cannot break the column structure of the file.
 *  - Formula neutralisation, so that a spreadsheet cannot execute
 *    citizen-supplied text. A report beginning `=HYPERLINK(...)` or `+cmd|...`
 *    is data, but Excel and Calc treat a leading =, +, - or @ as a formula.
 *    Quoting alone does not prevent this, because the quotes are removed when
 *    the cell is parsed; the value itself has to be made inert.
 */

/** Characters a spreadsheet may treat as the start of a formula. */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  // Prefixing with an apostrophe makes the cell a literal string. It is applied
  // before quoting so the guard survives the quoting step.
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",");
}

/**
 * A complete CSV document. The byte-order mark is deliberate: without it Excel
 * on Windows reads the file in the system codepage and renders Greek and
 * Cyrillic report text as mojibake.
 */
export function csvDocument(header: readonly string[], rows: unknown[][]): string {
  return `﻿${[header.join(","), ...rows.map(csvRow)].join("\r\n")}\r\n`;
}
