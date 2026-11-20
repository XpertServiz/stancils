"use client";
import { useRef, useState } from "react";

export type SizeRow = { id?: string; name: string; price: string };
type Row = SizeRow & { key: string };

let seq = 0;
const nextKey = () => `n${++seq}`;

/**
 * The sizes of a product as editable rows: name + price, drag (⠿) or ▲▼ to re-order, "+ Add a size" for as many as you like.
 * mode "edit": rows with an `id` are existing sizes (Remove checkbox = hide), rows without are new.
 *   Fields: vname_/vprice_/vdel_<id>, newsize_name_/newsize_price_<scope>_<key>, and order_<scope> = "v:<id>" | "n:<key>" in display order.
 * mode "create": plain size_name_<i> / size_price_<i> in display order.
 * Every price is typed by hand; nothing is calculated from another size.
 */
export function SizeRows({ scope, initial, base, mode, blankRows = 0 }: { scope: string; initial: SizeRow[]; base: string; mode: "edit" | "create"; blankRows?: number }) {
  const [rows, setRows] = useState<Row[]>(() => [...initial as SizeRow[], ...Array.from({ length: blankRows }, (): SizeRow => ({ name: "", price: "" }))].map((r: SizeRow) => ({ ...r, key: r.id ?? nextKey() })));
  const [over, setOver] = useState<number | null>(null);
  const from = useRef<number | null>(null);

  const move = (a: number, b: number) => {
    if (a === b || a < 0 || b < 0 || a >= rows.length || b >= rows.length) return;
    setRows((r) => { const n = [...r]; const [x] = n.splice(a, 1); n.splice(b, 0, x); return n; });
  };

  return (
    <div className="space-y-2">
      {mode === "edit" && rows.map((r) => <input key={`o-${r.key}`} type="hidden" name={`order_${scope}`} value={r.id ? `v:${r.id}` : `n:${r.key}`} />)}
      {rows.map((r, i) => {
        const isNew = !r.id;
        const nm = mode === "create" ? `size_name_${i}` : isNew ? `newsize_name_${scope}_${r.key}` : `vname_${r.id}`;
        const pr = mode === "create" ? `size_price_${i}` : isNew ? `newsize_price_${scope}_${r.key}` : `vprice_${r.id}`;
        return (
          <div
            key={r.key}
            onDragOver={(e) => { e.preventDefault(); setOver(i); }}
            onDrop={(e) => { e.preventDefault(); if (from.current !== null) move(from.current, i); from.current = null; setOver(null); }}
            className={`flex items-center gap-2 rounded-lg ${over === i && from.current !== null && from.current !== i ? "bg-mustard/15 ring-1 ring-mustard" : ""}`}
          >
            <span
              draggable
              onDragStart={(e) => { from.current = i; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); }}
              onDragEnd={() => { from.current = null; setOver(null); }}
              title="Drag to move this size"
              aria-label="Drag to re-order"
              className="cursor-grab select-none px-1 text-lg leading-none text-ink3 active:cursor-grabbing"
            >⠿</span>
            <span className="flex flex-col leading-none">
              <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move up" className="px-1 text-[10px] text-ink3 disabled:opacity-30">▲</button>
              <button type="button" onClick={() => move(i, i + 1)} disabled={i === rows.length - 1} aria-label="Move down" className="px-1 text-[10px] text-ink3 disabled:opacity-30">▼</button>
            </span>
            <input name={nm} defaultValue={r.name} placeholder="Size, e.g. 12 × 12 in or XL" aria-label="Size name" className="input min-w-0 flex-1 !py-1.5" />
            <span className="text-xs text-ink3">{base}</span>
            <input name={pr} defaultValue={r.price} inputMode="decimal" placeholder="Price" aria-label={`Price for ${r.name || "size"}`} className="input !w-24 !py-1.5" />
            {mode === "edit" && !isNew ? (
              <label className="flex w-[66px] items-center gap-1 text-xs text-danger"><input type="checkbox" name={`vdel_${r.id}`} />Remove</label>
            ) : (
              <button type="button" onClick={() => setRows((x) => x.filter((_, k) => k !== i))} aria-label="Remove this size" className="w-[66px] text-left text-sm text-danger">✕ Remove</button>
            )}
          </div>
        );
      })}
      <button type="button" onClick={() => setRows((r) => [...r, { key: nextKey(), name: "", price: "" }])} className="btn btn-ghost btn-sm">+ Add a size</button>
    </div>
  );
}
