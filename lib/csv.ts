export function toCsv(rows: (string | number | boolean | null | undefined)[][]) {
  return rows
    .map((r) => r.map((v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"` : s;
    }).join(","))
    .join("\r\n");
}

export function csvResponse(name: string, rows: (string | number | boolean | null | undefined)[][]) {
  return new Response("﻿" + toCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
  });
}
