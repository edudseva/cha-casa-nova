// CSV reports are opened in spreadsheet applications. Keep untrusted text as text.
export function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ");
  const safe = /^[\s\uFEFF]*[=+\-@＝＋－＠]/u.test(text) ? `\t${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
