"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const ACCENT = "rgb(255 122 89)";
const tipStyle = { background: "rgb(var(--surface-2))", border: "1px solid rgb(var(--line))", borderRadius: 10, color: "rgb(var(--ink))", fontSize: 12 };

export function RevenueChart({ data, currency }: { data: { day: string; value: number; orders: number }[]; currency: string }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Daily revenue">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgb(var(--line) / .35)" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "rgb(var(--ink-3))", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={{ fill: "rgb(var(--ink-3))", fontSize: 11 }} tickLine={false} axisLine={false} width={64} tickFormatter={(v) => Intl.NumberFormat("en", { notation: "compact" }).format(v)} />
          <Tooltip contentStyle={tipStyle} cursor={{ stroke: "rgb(var(--ink-3))", strokeDasharray: 3 }} formatter={(v: number, k) => (k === "value" ? [`${currency} ${v.toLocaleString()}`, "Revenue"] : [v, "Orders"])} />
          <Area type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} fill="url(#rev)" activeDot={{ r: 5, stroke: "rgb(var(--surface-1))", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBar({ data, currency, label }: { data: { name: string; value: number }[]; currency?: string; label: string }) {
  return (
    <div className="w-full" style={{ height: Math.max(120, data.length * 34) }} role="img" aria-label={label}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={6}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={{ fill: "rgb(var(--ink-2))", fontSize: 12 }} width={110} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tipStyle} cursor={{ fill: "rgb(var(--surface-2) / .5)" }} formatter={(v: number) => [currency ? `${currency} ${v.toLocaleString()}` : v.toLocaleString(), label]} />
          <Bar dataKey="value" fill={ACCENT} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
