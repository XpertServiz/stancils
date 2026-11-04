export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="rgb(var(--surface-2))" />
      <path fill="rgb(var(--accent))" fillRule="evenodd" d="M32 10a22 22 0 1 0 0 44 22 22 0 0 0 0-44Zm0 9a13 13 0 0 1 11.3 6.6l-7 4A5 5 0 1 0 36.3 38l7 4A13 13 0 1 1 32 19Z" />
      <rect x="30.5" y="8" width="3" height="48" fill="rgb(var(--surface-2))" />
    </svg>
  );
}
