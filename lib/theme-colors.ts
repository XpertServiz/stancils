// Default layer colours were stored as hex; map them to the active theme so they follow theme changes.
const MAP: Record<string, string> = {
  "#FF7A59": "rgb(var(--accent))",
  "#5EE6C0": "rgb(var(--accent-2))",
  "#F5C451": "rgb(var(--accent-3))",
};
export const themed = (c: string) => MAP[c.toUpperCase()] ?? c;
