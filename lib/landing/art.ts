// Original artwork for the homepage (drawn here, not taken from any other site).
// The owner can replace the illustrated woman with a real model photo in Admin → Website → Homepage.

/** A woman holding up a cut stencil sheet; the cut-outs show her top through the holes. */
export const WOMAN_SVG = `<svg viewBox="0 0 420 540" role="img" aria-label="Woman holding up a cut stencil sheet" xmlns="http://www.w3.org/2000/svg">
<defs>
  <mask id="wCut"><rect x="96" y="372" width="228" height="150" fill="#fff"/>
    <g fill="#000"><circle cx="210" cy="447" r="13"/>
      <g transform="translate(210 447)"><ellipse cx="0" cy="-33" rx="7" ry="17"/><ellipse cx="0" cy="-33" rx="7" ry="17" transform="rotate(45)"/><ellipse cx="0" cy="-33" rx="7" ry="17" transform="rotate(90)"/><ellipse cx="0" cy="-33" rx="7" ry="17" transform="rotate(135)"/><ellipse cx="0" cy="-33" rx="7" ry="17" transform="rotate(180)"/><ellipse cx="0" cy="-33" rx="7" ry="17" transform="rotate(225)"/><ellipse cx="0" cy="-33" rx="7" ry="17" transform="rotate(270)"/><ellipse cx="0" cy="-33" rx="7" ry="17" transform="rotate(315)"/></g>
      <circle cx="122" cy="394" r="6"/><circle cx="298" cy="394" r="6"/><circle cx="122" cy="500" r="6"/><circle cx="298" cy="500" r="6"/>
      <circle cx="150" cy="447" r="4"/><circle cx="270" cy="447" r="4"/><circle cx="210" cy="393" r="4"/><circle cx="210" cy="501" r="4"/></g></mask>
  <linearGradient id="wTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0629a"/><stop offset="1" stop-color="#d63a74"/></linearGradient>
</defs>
<path d="M118 205C98 120 158 66 214 68C276 68 332 122 308 215C320 290 326 348 300 392L128 392C104 348 110 290 118 205Z" fill="#33232a"/>
<path d="M62 540C66 440 108 372 172 352L252 352C316 372 356 440 360 540Z" fill="url(#wTop)"/>
<path d="M186 296L234 296L238 362C220 376 202 376 182 362Z" fill="#e6b592"/>
<path d="M176 352L210 408L246 352Z" fill="#e6b592"/>
<ellipse cx="211" cy="228" rx="56" ry="68" fill="#f3cdae"/>
<path d="M153 216C150 158 190 138 216 140C252 140 278 166 270 216C252 190 226 176 202 176C184 176 166 190 153 216Z" fill="#33232a"/>
<ellipse cx="190" cy="238" rx="4.5" ry="5.5" fill="#2b1f22"/><ellipse cx="233" cy="238" rx="4.5" ry="5.5" fill="#2b1f22"/>
<path d="M180 224Q190 218 200 223M223 223Q233 218 243 224" stroke="#33232a" stroke-width="3" fill="none" stroke-linecap="round"/>
<circle cx="177" cy="258" r="9" fill="#f08a8a" opacity=".45"/><circle cx="246" cy="258" r="9" fill="#f08a8a" opacity=".45"/>
<path d="M193 268Q212 286 231 268Q212 274 193 268Z" fill="#c4415f" stroke="#c4415f" stroke-width="3" stroke-linejoin="round"/>
<circle cx="155" cy="262" r="5" fill="#e7bb59"/><circle cx="268" cy="262" r="5" fill="#e7bb59"/>
<path d="M94 404C74 424 76 456 88 476L116 468C112 444 120 424 134 402Z" fill="#c92f69"/>
<path d="M326 404C346 424 344 456 332 476L304 468C308 444 300 424 286 402Z" fill="#c92f69"/>
<g transform="rotate(-5 210 447)">
  <rect x="96" y="372" width="228" height="150" rx="10" fill="#fff8ef" fill-opacity=".95" stroke="#e7d9c6" mask="url(#wCut)"/>
  <rect x="96" y="372" width="228" height="150" rx="10" fill="none" stroke="#eadbc7" stroke-width="2"/>
  <ellipse cx="98" cy="452" rx="14" ry="21" fill="#f3cdae"/><ellipse cx="322" cy="452" rx="14" ry="21" fill="#f3cdae"/>
  <path d="M104 440q-10 10 0 24M316 440q10 10 0 24" stroke="#e0b38f" stroke-width="3" fill="none" stroke-linecap="round"/>
</g>
</svg>`;

/** Small floating stencil sheets (cut-out shapes) used as 3D hero decoration. */
export function sheet(kind: "flower" | "leaf" | "geo", id: string, tint: string) {
  const holes: Record<string, string> = {
    flower: `<circle cx="60" cy="60" r="9"/><g transform="translate(60 60)"><ellipse cy="-24" rx="7" ry="14"/><ellipse cy="-24" rx="7" ry="14" transform="rotate(60)"/><ellipse cy="-24" rx="7" ry="14" transform="rotate(120)"/><ellipse cy="-24" rx="7" ry="14" transform="rotate(180)"/><ellipse cy="-24" rx="7" ry="14" transform="rotate(240)"/><ellipse cy="-24" rx="7" ry="14" transform="rotate(300)"/></g>`,
    leaf: `<path d="M60 18C88 36 92 74 60 102C28 74 32 36 60 18Z"/><path d="M60 102V26" stroke="#fff" stroke-width="3" fill="none"/><circle cx="24" cy="26" r="5"/><circle cx="96" cy="26" r="5"/>`,
    geo: `<path d="M60 18L102 60L60 102L18 60Z"/><circle cx="60" cy="60" r="14" fill="#fff"/><circle cx="60" cy="60" r="6"/>`,
  };
  return `<svg viewBox="0 0 120 120" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs><mask id="${id}"><rect width="120" height="120" fill="#fff"/><g fill="#000">${holes[kind]}</g></mask></defs><rect x="4" y="4" width="112" height="112" rx="14" fill="${tint}" mask="url(#${id})"/><rect x="4" y="4" width="112" height="112" rx="14" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/></svg>`;
}

/** Splash: a laser traces a flower on a 3D sheet, then paint fills the cut. */
export const SPLASH_SVG = `<svg viewBox="0 0 200 200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="spG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ed4f85"/><stop offset=".55" stop-color="#ee6a73"/><stop offset="1" stop-color="#7c82d9"/></linearGradient></defs>
<g transform="translate(100 100)">
<g class="spFill" fill="url(#spG)"><circle r="16"/><ellipse cy="-46" rx="15" ry="30"/><ellipse cy="-46" rx="15" ry="30" transform="rotate(60)"/><ellipse cy="-46" rx="15" ry="30" transform="rotate(120)"/><ellipse cy="-46" rx="15" ry="30" transform="rotate(180)"/><ellipse cy="-46" rx="15" ry="30" transform="rotate(240)"/><ellipse cy="-46" rx="15" ry="30" transform="rotate(300)"/></g>
<g class="spCut" fill="none" stroke="#d63a74" stroke-width="2.4" pathLength="1"><circle r="16" pathLength="1"/><ellipse cy="-46" rx="15" ry="30" pathLength="1"/><ellipse cy="-46" rx="15" ry="30" transform="rotate(60)" pathLength="1"/><ellipse cy="-46" rx="15" ry="30" transform="rotate(120)" pathLength="1"/><ellipse cy="-46" rx="15" ry="30" transform="rotate(180)" pathLength="1"/><ellipse cy="-46" rx="15" ry="30" transform="rotate(240)" pathLength="1"/><ellipse cy="-46" rx="15" ry="30" transform="rotate(300)" pathLength="1"/></g>
</g></svg>`;
