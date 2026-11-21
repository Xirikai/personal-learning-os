import type { ReactNode } from "react";
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part.startsWith("`") ? <code key={i} className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">{part.slice(1, -1)}</code> : part);
}
/** A small text-only Markdown renderer. Raw HTML is never evaluated. */
export function MarkdownNote({ text }: { text: string }) {
  let inCode = false;
  return <div className="space-y-2 break-words text-sm leading-7 text-slate-700 dark:text-slate-200">{text.split("\n").map((line, i) => {
    if (line.startsWith("```")) { inCode = !inCode; return null; }
    if (inCode) return <pre key={i} className="overflow-x-auto rounded-lg bg-slate-100 px-3 text-xs dark:bg-slate-800">{line || " "}</pre>;
    if (/^#{1,3} /.test(line)) return <h3 key={i} className="pt-3 text-lg font-semibold">{inline(line.replace(/^#+ /, ""))}</h3>;
    if (/^[-*] /.test(line)) return <p key={i} className="pl-3">• {inline(line.slice(2))}</p>;
    if (line.startsWith("> ")) return <blockquote key={i} className="border-l-2 border-indigo-400 pl-3 text-slate-500">{inline(line.slice(2))}</blockquote>;
    return <p key={i} className="whitespace-pre-wrap">{inline(line) || " "}</p>;
  })}</div>;
}
