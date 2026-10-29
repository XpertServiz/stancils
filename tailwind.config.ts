import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        s1: v("surface-1"),
        s2: v("surface-2"),
        stone: v("band-stone"),
        "stone-ink": v("stone-ink"),
        line: v("line"),
        ink: v("ink"),
        ink2: v("ink-2"),
        ink3: v("ink-3"),
        accent: v("accent"),
        mint: v("accent-2"),
        mustard: v("accent-3"),
        danger: v("danger"),
        onaccent: v("on-accent"),
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: { card: "18px", ctl: "12px" },
      boxShadow: { glow: "0 0 0 1px rgb(var(--accent) / .35), 0 0 40px rgb(var(--accent) / .18)" },
      transitionTimingFunction: { brand: "cubic-bezier(.2,.8,.2,1)" },
    },
  },
  plugins: [],
} satisfies Config;
