// Client-side stencil processing: threshold → islands → auto-bridges → detail check.
// Mask convention: 1 = cut (paint goes through), 0 = sheet material.

export type Mask = { w: number; h: number; data: Uint8Array };

export function imageToMask(img: CanvasImageSource, srcW: number, srcH: number, opts: { maxPx: number; threshold: number; invert: boolean; blur: number; marginPx: number }): Mask {
  const scale = Math.min(1, opts.maxPx / Math.max(srcW, srcH));
  const iw = Math.max(1, Math.round(srcW * scale));
  const ih = Math.max(1, Math.round(srcH * scale));
  const m = opts.marginPx;
  const w = iw + m * 2;
  const h = ih + m * 2;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  if (opts.blur > 0) ctx.filter = `blur(${opts.blur}px)`;
  ctx.drawImage(img, m, m, iw, ih);
  ctx.filter = "none";
  const px = ctx.getImageData(0, 0, w, h).data;
  const data = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = px[i * 4 + 3] / 255;
    // composite on white, luminance
    const r = px[i * 4] * a + 255 * (1 - a);
    const g = px[i * 4 + 1] * a + 255 * (1 - a);
    const b = px[i * 4 + 2] * a + 255 * (1 - a);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    let cut = lum < opts.threshold ? 1 : 0;
    if (opts.invert) cut = 1 - cut;
    const x = i % w;
    const y = (i / w) | 0;
    if (x < m || y < m || x >= w - m || y >= h - m) cut = 0; // solid border
    data[i] = cut;
  }
  return { w, h, data };
}

/** Label connected regions of sheet material (value 0). Label 1 = the outer sheet. */
export function labelMaterial(mask: Mask) {
  const { w, h, data } = mask;
  const labels = new Int32Array(w * h);
  let next = 0;
  const stack = new Int32Array(w * h);
  const sizes: number[] = [0];
  for (let i = 0; i < w * h; i++) {
    if (data[i] !== 0 || labels[i] !== 0) continue;
    next++;
    let sp = 0;
    stack[sp++] = i;
    labels[i] = next;
    let size = 0;
    while (sp > 0) {
      const p = stack[--sp];
      size++;
      const x = p % w;
      const y = (p / w) | 0;
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const q of nb) {
        if (q >= 0 && data[q] === 0 && labels[q] === 0) {
          labels[q] = next;
          stack[sp++] = q;
        }
      }
    }
    sizes.push(size);
  }
  return { labels, count: next, sizes };
}

/**
 * Adds bridges until every material island is connected to the outer sheet.
 * Bridges are straight strips (H or V) of `bridgePx` width, chosen as the shortest crossing.
 */
export function autoBridge(mask: Mask, bridgePx: number, maxIter = 400): { mask: Mask; islands: number; bridges: { x0: number; y0: number; x1: number; y1: number }[] } {
  const out: Mask = { w: mask.w, h: mask.h, data: new Uint8Array(mask.data) };
  const { w, h, data } = out;
  const bridges: { x0: number; y0: number; x1: number; y1: number }[] = [];
  let first = -1;
  for (let iter = 0; iter < maxIter; iter++) {
    const { labels, count, sizes } = labelMaterial(out);
    if (first < 0) first = Math.max(0, count - 1);
    if (count <= 1) break;
    // pick the smallest island first (cheap & keeps detail)
    let target = 2;
    for (let l = 2; l <= count; l++) if (sizes[l] < sizes[target]) target = l;
    if (sizes[target] < 4) {
      // tiny speck: merge into the cut area instead of bridging
      for (let i = 0; i < w * h; i++) if (labels[i] === target) data[i] = 1;
      continue;
    }
    let best: { len: number; x: number; y: number; dx: number; dy: number } | null = null;
    const step = Math.max(1, Math.floor(Math.sqrt(sizes[target]) / 6));
    for (let i = 0; i < w * h; i += 1) {
      if (labels[i] !== target) continue;
      const x = i % w;
      const y = (i / w) | 0;
      if ((x + y) % step !== 0) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let cx = x + dx;
        let cy = y + dy;
        let len = 0;
        // must step into cut first
        if (cx < 0 || cy < 0 || cx >= w || cy >= h || data[cy * w + cx] !== 1) continue;
        while (cx >= 0 && cy >= 0 && cx < w && cy < h && data[cy * w + cx] === 1) {
          cx += dx;
          cy += dy;
          len++;
          if (best && len >= best.len) break;
        }
        if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
        const lab = labels[cy * w + cx];
        if (lab === target || lab === 0) continue;
        if (!best || len < best.len) best = { len, x, y, dx, dy };
      }
    }
    if (!best) break;
    const half = Math.max(1, Math.floor(bridgePx / 2));
    const x1 = best.x + best.dx * (best.len + 1);
    const y1 = best.y + best.dy * (best.len + 1);
    for (let k = 0; k <= best.len + 1; k++) {
      const bx = best.x + best.dx * k;
      const by = best.y + best.dy * k;
      for (let o = -half; o <= half; o++) {
        const px = bx + (best.dy !== 0 ? o : 0);
        const py = by + (best.dx !== 0 ? o : 0);
        if (px >= 0 && py >= 0 && px < w && py < h) data[py * w + px] = 0;
      }
    }
    bridges.push({ x0: best.x, y0: best.y, x1, y1 });
  }
  return { mask: out, islands: first, bridges };
}

/** Fraction of cut pixels that would vanish under an opening with radius r (features thinner than 2r). */
export function thinFeatureRatio(mask: Mask, r: number) {
  if (r < 1) return 0;
  const { w, h, data } = mask;
  const erode = (src: Uint8Array) => {
    const o = new Uint8Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let v = 1;
        for (let k = -r; k <= r && v; k++) {
          const xx = x + k;
          const yy = y + k;
          if (xx < 0 || xx >= w || !src[y * w + xx] || yy < 0 || yy >= h || !src[yy * w + x]) v = 0;
        }
        o[y * w + x] = v;
      }
    return o;
  };
  const dilate = (src: Uint8Array) => {
    const o = new Uint8Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let v = 0;
        for (let k = -r; k <= r && !v; k++) {
          const xx = x + k;
          const yy = y + k;
          if ((xx >= 0 && xx < w && src[y * w + xx]) || (yy >= 0 && yy < h && src[yy * w + x])) v = 1;
        }
        o[y * w + x] = v;
      }
    return o;
  };
  const opened = dilate(erode(data));
  let cut = 0;
  let lost = 0;
  for (let i = 0; i < w * h; i++) {
    if (data[i]) {
      cut++;
      if (!opened[i]) lost++;
    }
  }
  return cut ? lost / cut : 0;
}

export function edgeLengthPx(mask: Mask) {
  const { w, h, data } = mask;
  let n = 0;
  for (let y = 1; y < h; y++)
    for (let x = 1; x < w; x++) {
      const v = data[y * w + x];
      if (v !== data[y * w + x - 1]) n++;
      if (v !== data[(y - 1) * w + x]) n++;
    }
  return n;
}

export function cutRatio(mask: Mask) {
  let n = 0;
  for (let i = 0; i < mask.data.length; i++) n += mask.data[i];
  return n / mask.data.length;
}

/** Render mask: sheet colour, cut colour, optional bridge highlight. */
export function renderMask(mask: Mask, opts: { sheet: [number, number, number, number]; cut: [number, number, number, number]; original?: Mask; bridge?: [number, number, number, number] }) {
  const c = document.createElement("canvas");
  c.width = mask.w;
  c.height = mask.h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(mask.w, mask.h);
  for (let i = 0; i < mask.data.length; i++) {
    let col = mask.data[i] ? opts.cut : opts.sheet;
    if (opts.bridge && opts.original && opts.original.data[i] === 1 && mask.data[i] === 0) col = opts.bridge;
    img.data.set(col, i * 4);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** PNG for tracing: black = cut, white = sheet. */
export function maskToPng(mask: Mask) {
  return renderMask(mask, { sheet: [255, 255, 255, 255], cut: [0, 0, 0, 255] }).toDataURL("image/png");
}
