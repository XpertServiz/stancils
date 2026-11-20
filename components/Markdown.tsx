import { Fragment } from "react";

/** Tiny, safe markdown subset: ## headings, - lists, **bold**, paragraphs. No raw HTML. */
export function Markdown({ text, className = "prose-cc" }: { text: string; className?: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (b.startsWith("## ")) {
          return (
            <Fragment key={i}>
              <h2>{inline(lines[0].slice(3))}</h2>
              {lines.length > 1 && <Block lines={lines.slice(1)} />}
            </Fragment>
          );
        }
        return <Block key={i} lines={lines} />;
      })}
    </div>
  );
}

function Block({ lines }: { lines: string[] }) {
  if (lines.every((l) => l.startsWith("- "))) return <ul>{lines.map((l, i) => <li key={i}>{inline(l.slice(2))}</li>)}</ul>;
  return <p>{lines.map((l, i) => <Fragment key={i}>{i > 0 && <br />}{inline(l)}</Fragment>)}</p>;
}

function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>));
}
