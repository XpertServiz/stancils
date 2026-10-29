// Procedural, original stencil artwork. Every design is an SVG (viewBox 0 0 400 400)
// whose painted areas use the layer fills; bridges are applied with a mask so the
// result is cut-ready (no floating islands).

type Rng = () => number;

export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: Rng, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const f = (n: number) => Math.round(n * 100) / 100;
const C = 200;

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [f(cx + r * Math.cos(a)), f(cy + r * Math.sin(a))];
}

function petal(cx: number, cy: number, r0: number, r1: number, width: number, deg: number) {
  const [x0, y0] = polar(cx, cy, r0, deg);
  const [x1, y1] = polar(cx, cy, r1, deg);
  const [lx, ly] = polar(cx, cy, (r0 + r1) / 2, deg - width);
  const [rx, ry] = polar(cx, cy, (r0 + r1) / 2, deg + width);
  return `M${x0} ${y0} Q${lx} ${ly} ${x1} ${y1} Q${rx} ${ry} ${x0} ${y0}Z`;
}

function star(cx: number, cy: number, n: number, ro: number, ri: number, rot = 0) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const [x, y] = polar(cx, cy, i % 2 ? ri : ro, rot + (i * 180) / n);
    pts.push(`${x} ${y}`);
  }
  return `M${pts.join(" L")}Z`;
}

function circle(cx: number, cy: number, r: number) {
  return `M${f(cx - r)} ${f(cy)} a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0 a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
}

function ring(cx: number, cy: number, r: number, w: number) {
  return circle(cx, cy, r) + circle(cx, cy, r - w);
}

const heart = (cx: number, cy: number, s: number) =>
  `M${cx} ${f(cy + s * 0.9)} C${f(cx - s * 1.6)} ${f(cy - s * 0.1)} ${f(cx - s * 0.7)} ${f(cy - s * 1.2)} ${cx} ${f(cy - s * 0.45)} C${f(cx + s * 0.7)} ${f(cy - s * 1.2)} ${f(cx + s * 1.6)} ${f(cy - s * 0.1)} ${cx} ${f(cy + s * 0.9)}Z`;

const leaf = (x: number, y: number, len: number, w: number, deg: number) => {
  const [x1, y1] = polar(x, y, len, deg);
  const [ax, ay] = polar(x, y, len / 2, deg - w);
  const [bx, by] = polar(x, y, len / 2, deg + w);
  return `M${f(x)} ${f(y)} Q${ax} ${ay} ${x1} ${y1} Q${bx} ${by} ${f(x)} ${f(y)}Z`;
};

// ───────────── bridges ─────────────

function radialBridges(id: string, n: number, w = 3) {
  const lines = Array.from({ length: n }, (_, i) => {
    const [x, y] = polar(C, C, 290, (i * 360) / n);
    return `<line x1="${C}" y1="${C}" x2="${x}" y2="${y}" stroke="black" stroke-width="${w}"/>`;
  }).join("");
  return `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400"><rect width="400" height="400" fill="white"/>${lines}</mask>`;
}

function barBridges(id: string, spacing: number, w = 3, angle = 0) {
  let bars = "";
  for (let x = -400; x < 800; x += spacing) bars += `<rect x="${x}" y="-200" width="${w}" height="800" fill="black"/>`;
  return `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400"><rect width="400" height="400" fill="white"/><g transform="rotate(${angle} 200 200)">${bars}</g></mask>`;
}

function wrap(id: string, layers: string[], mask: string) {
  const groups = layers
    .map((d, i) => `<g data-layer="${i + 1}" style="fill:var(--l${i + 1},currentColor)"><path fill-rule="evenodd" d="${d}"/></g>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs>${mask}</defs><g mask="url(#${id})">${groups}</g></svg>`;
}

function wrapText(id: string, text: string, size: number, mask: string, extra = "", font = "'Arial Black', 'Arial', sans-serif") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs>${mask}</defs><g mask="url(#${id})"><g data-layer="1" style="fill:var(--l1,currentColor)">${extra}<text x="200" y="${200 + size * 0.35}" text-anchor="middle" font-family="${font}" font-weight="900" font-size="${size}" letter-spacing="2">${escapeXml(text)}</text></g></g></svg>`;
}

const escapeXml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// ───────────── generators ─────────────

export type Design = { svg: string; layers: number; motif: string };

export function mandala(seed: number, layered = false): Design {
  const r = rng(seed);
  const id = `m${seed}`;
  const n = pick(r, [8, 10, 12, 16, 18, 24]);
  const outer: string[] = [];
  const mid: string[] = [];
  const inner: string[] = [];
  const w1 = 6 + r() * 8;
  for (let i = 0; i < n; i++) {
    const a = (i * 360) / n;
    outer.push(petal(C, C, 120, 185, w1, a));
    mid.push(petal(C, C, 70, 118, w1 * 1.4, a + 180 / n));
    if (r() > 0.3) {
      const [x, y] = polar(C, C, 192, a + 180 / n);
      outer.push(circle(x, y, 5));
    }
  }
  inner.push(star(C, C, pick(r, [6, 8, 12]), 60, 30 + r() * 15), ring(C, C, 24, 8), circle(C, C, 9));
  const layers = layered ? [outer.join(""), mid.join(""), inner.join("")] : [outer.join("") + mid.join("") + inner.join("")];
  return { svg: wrap(id, layers, radialBridges(id, n, 3)), layers: layers.length, motif: "mandala" };
}

export function geometric(seed: number): Design {
  const r = rng(seed);
  const id = `g${seed}`;
  const kind = pick(r, ["diamond", "hex", "dots", "tri", "chevron", "scallop"] as const);
  const step = pick(r, [40, 50, 57, 66, 80]);
  const s = step * (0.32 + r() * 0.12);
  let d = "";
  for (let y = -step; y < 400 + step; y += step) {
    for (let x = -step; x < 400 + step; x += step) {
      const ox = (Math.round(y / step) % 2) * (step / 2);
      const cx = x + ox;
      const cy = y;
      if (kind === "diamond") d += `M${f(cx)} ${f(cy - s)} L${f(cx + s)} ${f(cy)} L${f(cx)} ${f(cy + s)} L${f(cx - s)} ${f(cy)}Z`;
      if (kind === "hex") d += star(cx, cy, 3, s, s * 0.866, 30);
      if (kind === "dots") d += circle(cx, cy, s * 0.8);
      if (kind === "tri") d += `M${f(cx)} ${f(cy - s)} L${f(cx + s)} ${f(cy + s * 0.8)} L${f(cx - s)} ${f(cy + s * 0.8)}Z`;
      if (kind === "chevron") d += `M${f(cx - s)} ${f(cy)} L${f(cx)} ${f(cy - s * 0.6)} L${f(cx + s)} ${f(cy)} L${f(cx + s)} ${f(cy + s * 0.35)} L${f(cx)} ${f(cy - s * 0.25)} L${f(cx - s)} ${f(cy + s * 0.35)}Z`;
      if (kind === "scallop") d += `M${f(cx - s)} ${f(cy)} A${f(s)} ${f(s)} 0 0 1 ${f(cx + s)} ${f(cy)} L${f(cx + s * 0.7)} ${f(cy)} A${f(s * 0.7)} ${f(s * 0.7)} 0 0 0 ${f(cx - s * 0.7)} ${f(cy)}Z`;
    }
  }
  return { svg: wrap(id, [d], barBridges(id, 1000)), layers: 1, motif: kind };
}

export function moroccan(seed: number): Design {
  const r = rng(seed);
  const id = `r${seed}`;
  const step = pick(r, [80, 100, 133]);
  const k = 0.38 + r() * 0.1;
  let d = "";
  for (let y = 0; y <= 400; y += step) {
    for (let x = 0; x <= 400; x += step) {
      const s = step * k;
      // quatrefoil / ogee motif
      d += circle(x - s / 2, y, s / 2) + circle(x + s / 2, y, s / 2) + circle(x, y - s / 2, s / 2) + circle(x, y + s / 2, s / 2);
      d += star(x + step / 2, y + step / 2, 4, step * 0.18, step * 0.07, 45);
    }
  }
  return { svg: wrap(id, [d], barBridges(id, step / 2, 3, 45)), layers: 1, motif: "lattice" };
}

export function floral(seed: number, layered = false): Design {
  const r = rng(seed);
  const id = `f${seed}`;
  const heads: string[] = [];
  const stems: string[] = [];
  const count = 1 + Math.floor(r() * 3);
  for (let i = 0; i < count; i++) {
    const cx = 200 + (i - (count - 1) / 2) * 110 + (r() - 0.5) * 20;
    const cy = 130 + r() * 60;
    const petals = pick(r, [5, 6, 8, 12]);
    for (let p = 0; p < petals; p++) heads.push(petal(cx, cy, 10, 55 + r() * 15, 18, (p * 360) / petals));
    heads.push(circle(cx, cy, 9));
    stems.push(`M${f(cx - 3)} ${f(cy + 50)} L${f(cx + 3)} ${f(cy + 50)} L${f(200 + 4)} 380 L${f(200 - 4)} 380Z`);
    for (let l = 0; l < 2; l++) {
      const t = 0.4 + l * 0.25;
      const lx = cx + (200 - cx) * t;
      const ly = cy + 50 + (330 - cy) * t;
      stems.push(leaf(lx, ly, 55 + r() * 20, 28, l % 2 ? 60 : -60));
    }
  }
  const layers = layered ? [heads.join(""), stems.join("")] : [heads.join("") + stems.join("")];
  return { svg: wrap(id, layers, radialBridges(id, 1, 0)), layers: layers.length, motif: "floral" };
}

export function nature(seed: number): Design {
  const r = rng(seed);
  const id = `n${seed}`;
  const kind = pick(r, ["palm", "fern", "waves", "mountains", "birds", "feather"] as const);
  let d = "";
  if (kind === "palm" || kind === "fern") {
    const fronds = kind === "palm" ? 9 : 14;
    d += `M197 390 L203 390 L203 60 L197 60Z`;
    for (let i = 0; i < fronds; i++) {
      const y = 80 + i * (290 / fronds);
      const len = (kind === "palm" ? 150 : 110) * (1 - i / (fronds * 1.6));
      d += leaf(200, y, len, 14, 300 - i * 2) + leaf(200, y, len, 14, 60 + i * 2);
    }
  } else if (kind === "waves") {
    for (let row = 0; row < 6; row++) {
      const y = 60 + row * 60;
      let p = `M0 ${y}`;
      for (let x = 0; x <= 400; x += 50) p += ` Q${x + 25} ${y - 28} ${x + 50} ${y}`;
      p += ` L400 ${y + 14}`;
      for (let x = 400; x >= 0; x -= 50) p += ` Q${x - 25} ${y - 14} ${x - 50} ${y + 14}`;
      d += p + "Z";
    }
  } else if (kind === "mountains") {
    const peaks = 3 + Math.floor(r() * 3);
    for (let i = 0; i < peaks; i++) {
      const x = (i + 0.5) * (400 / peaks) + (r() - 0.5) * 30;
      const h = 140 + r() * 140;
      d += `M${f(x - 110)} 340 L${f(x)} ${f(340 - h)} L${f(x + 110)} 340Z`;
    }
    d += circle(300, 90, 34);
  } else if (kind === "birds") {
    for (let i = 0; i < 7; i++) {
      const x = 60 + r() * 280;
      const y = 60 + r() * 260;
      const s = 18 + r() * 22;
      d += `M${f(x - s)} ${f(y)} Q${f(x - s / 2)} ${f(y - s * 0.7)} ${f(x)} ${f(y)} Q${f(x + s / 2)} ${f(y - s * 0.7)} ${f(x + s)} ${f(y)} Q${f(x + s / 2)} ${f(y - s * 0.35)} ${f(x)} ${f(y + 4)} Q${f(x - s / 2)} ${f(y - s * 0.35)} ${f(x - s)} ${f(y)}Z`;
    }
  } else {
    d += `M198 380 L202 380 L202 40 L198 40Z`;
    for (let i = 0; i < 22; i++) {
      const y = 60 + i * 13;
      const len = 70 * Math.sin((Math.PI * (i + 2)) / 26);
      d += leaf(200, y, len, 6, 300) + leaf(200, y, len, 6, 60);
    }
  }
  return { svg: wrap(id, [d], radialBridges(id, 1, 0)), layers: 1, motif: kind };
}

const COFFEE = ["heart", "rosetta", "star", "snowflake", "smile", "paw", "crown", "moon", "flower", "cup"] as const;

export function coffee(seed: number, motif?: (typeof COFFEE)[number]): Design {
  const r = rng(seed);
  const id = `c${seed}`;
  const m = motif ?? pick(r, COFFEE);
  let d = "";
  if (m === "heart") d = heart(200, 190, 110);
  if (m === "rosetta") {
    d = `M196 340 L204 340 L204 60 L196 60Z`;
    for (let i = 0; i < 8; i++) d += leaf(200, 300 - i * 30, 120 - i * 10, 20, 290 + i * 3) + leaf(200, 300 - i * 30, 120 - i * 10, 20, 70 - i * 3);
  }
  if (m === "star") d = star(200, 205, 5, 160, 65);
  if (m === "snowflake") {
    for (let i = 0; i < 6; i++) {
      const a = i * 60;
      const [x, y] = polar(C, C, 160, a);
      d += `M${polar(C, C, 6, a - 90).join(" ")} L${x} ${y} L${polar(C, C, 6, a + 90).join(" ")}Z`;
      d += leaf(...(polar(C, C, 90, a) as [number, number]), 50, 10, a - 40) + leaf(...(polar(C, C, 90, a) as [number, number]), 50, 10, a + 40);
    }
    d += circle(C, C, 22);
  }
  if (m === "smile") d = ring(200, 200, 160, 26) + circle(145, 160, 22) + circle(255, 160, 22) + `M120 230 Q200 320 280 230 L262 222 Q200 290 138 222Z`;
  if (m === "paw") d = circle(200, 245, 70) + circle(110, 150, 32) + circle(170, 110, 34) + circle(230, 110, 34) + circle(290, 150, 32);
  if (m === "crown") d = `M80 300 L80 140 L140 210 L200 110 L260 210 L320 140 L320 300Z` + circle(80, 128, 16) + circle(200, 96, 18) + circle(320, 128, 16);
  if (m === "moon") d = `M250 60 A150 150 0 1 0 250 340 A120 120 0 1 1 250 60Z` + star(300, 140, 5, 40, 16);
  if (m === "flower") for (let i = 0; i < 6; i++) d += petal(200, 200, 30, 170, 24, i * 60) + circle(200, 200, 26);
  if (m === "cup") d = `M90 150 L290 150 L270 330 L110 330Z M290 180 A45 45 0 1 1 290 270 L290 248 A24 24 0 1 0 290 202Z` + leaf(160, 130, 70, 18, 350) + leaf(220, 130, 70, 18, 10);
  return { svg: wrap(id, [d], radialBridges(id, m === "smile" ? 4 : 1, m === "smile" ? 4 : 0)), layers: 1, motif: m };
}

const SEASONAL = ["tree", "pumpkin", "eid", "snow", "egg", "hearts"] as const;

export function seasonal(seed: number, motif?: (typeof SEASONAL)[number]): Design {
  const r = rng(seed);
  const id = `s${seed}`;
  const m = motif ?? pick(r, SEASONAL);
  let d = "";
  if (m === "tree") {
    for (let i = 0; i < 4; i++) d += `M200 ${50 + i * 55} L${290 + i * 15} ${130 + i * 60} L${110 - i * 15} ${130 + i * 60}Z`;
    d += `M185 330 L215 330 L215 370 L185 370Z` + star(200, 42, 5, 26, 11);
  }
  if (m === "pumpkin") {
    for (let i = -2; i <= 2; i++) d += `M${200 + i * 42} 110 A${70 - Math.abs(i) * 8} 120 0 1 0 ${200 + i * 42} 350 A${70 - Math.abs(i) * 8} 120 0 1 0 ${200 + i * 42} 110Z`;
    d += `M195 115 L205 115 L215 60 L200 60Z`;
  }
  if (m === "eid") d = `M230 70 A140 140 0 1 0 230 330 A110 110 0 1 1 230 70Z` + star(285, 190, 5, 50, 20) + `M140 330 L260 330 L260 345 L140 345Z`;
  if (m === "snow") for (let i = 0; i < 9; i++) {
    const x = 70 + (i % 3) * 130;
    const y = 70 + Math.floor(i / 3) * 130;
    d += star(x + (r() - 0.5) * 20, y + (r() - 0.5) * 20, 6, 38, 10);
  }
  if (m === "egg") {
    d = `M200 40 C300 40 330 200 330 260 C330 330 270 370 200 370 C130 370 70 330 70 260 C70 200 100 40 200 40Z`;
    d += `M80 200 L320 200 L320 214 L80 214Z M75 270 L325 270 L325 284 L75 284Z`;
  }
  if (m === "hearts") for (let i = 0; i < 7; i++) d += heart(60 + r() * 280, 60 + r() * 280, 24 + r() * 30);
  const mask = m === "egg" || m === "pumpkin" ? barBridges(id, 1000) : radialBridges(id, 1, 0);
  return { svg: wrap(id, [d], mask), layers: 1, motif: m };
}

export function kids(seed: number): Design {
  const r = rng(seed);
  const id = `k${seed}`;
  const kind = pick(r, ["rainbow", "rocket", "clouds", "stars"] as const);
  let d = "";
  if (kind === "rainbow") for (let i = 0; i < 4; i++) d += `M${40 + i * 30} 300 A${160 - i * 30} ${160 - i * 30} 0 0 1 ${360 - i * 30} 300 L${340 - i * 30} 300 A${140 - i * 30} ${140 - i * 30} 0 0 0 ${60 + i * 30} 300Z`;
  if (kind === "rocket") d = `M200 40 C260 100 260 220 240 300 L160 300 C140 220 140 100 200 40Z M160 230 L110 320 L160 300Z M240 230 L290 320 L240 300Z M180 310 L220 310 L200 370Z` + circle(200, 160, 22);
  if (kind === "clouds") for (let i = 0; i < 3; i++) {
    const x = 90 + i * 110;
    const y = 120 + (i % 2) * 120;
    d += circle(x, y, 34) + circle(x + 36, y - 16, 40) + circle(x + 72, y, 32) + `M${x} ${y + 10} L${x + 72} ${y + 10} L${x + 72} ${y + 32} L${x} ${y + 32}Z`;
  }
  if (kind === "stars") for (let i = 0; i < 10; i++) d += star(40 + r() * 320, 40 + r() * 320, 5, 16 + r() * 22, 8 + r() * 6, r() * 70);
  return { svg: wrap(id, [d], kind === "rocket" ? radialBridges(id, 2, 3) : radialBridges(id, 1, 0)), layers: 1, motif: kind };
}

export function lettering(seed: number, text: string, size?: number): Design {
  const id = `t${seed}`;
  const s = size ?? Math.max(36, Math.min(130, 520 / Math.max(3, text.length)));
  return { svg: wrapText(id, text, s, barBridges(id, s * 0.55, Math.max(2, s / 28))), layers: 1, motif: "lettering" };
}

export function alphabet(seed: number, chars: string): Design {
  const id = `a${seed}`;
  const cols = Math.ceil(Math.sqrt(chars.length));
  const cell = 400 / cols;
  const size = cell * 0.78;
  const texts = [...chars]
    .map((ch, i) => `<text x="${f(((i % cols) + 0.5) * cell)}" y="${f((Math.floor(i / cols) + 0.5) * cell + size * 0.35)}" text-anchor="middle" font-family="'Arial Black', Arial, sans-serif" font-weight="900" font-size="${f(size)}">${escapeXml(ch)}</text>`)
    .join("");
  const mask = barBridges(id, cell / 2, Math.max(2, size / 26));
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs>${mask}</defs><g mask="url(#${id})"><g data-layer="1" style="fill:var(--l1,currentColor)">${texts}</g></g></svg>`,
    layers: 1,
    motif: "alphabet",
  };
}

export function sign(seed: number, text: string): Design {
  const id = `sg${seed}`;
  const frame = `<path fill-rule="evenodd" d="M20 90 L380 90 L380 310 L20 310Z M34 104 L366 104 L366 296 L34 296Z"/>`;
  const s = Math.max(40, Math.min(110, 560 / Math.max(3, text.length)));
  return { svg: wrapText(id, text, s, barBridges(id, s * 0.6, 3), frame), layers: 1, motif: "sign" };
}

/** Swap the svg's ids so several copies can live on one page. */
export function uniqueSvg(svg: string, suffix: string) {
  return svg.replace(/id="([^"]+)"/g, `id="$1-${suffix}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${suffix})`);
}
