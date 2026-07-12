import type { ReactNode } from "react";

/**
 * Light formatting for co-pilot messages.
 * Claude often returns Markdown (**bold**, - lists); the chat UI is plain text,
 * so we parse the common bits instead of showing raw asterisks.
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    parts.push(
      <strong key={`${keyPrefix}-b-${i++}`} className="font-medium text-ink-primary">
        {match[1]}
      </strong>,
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length > 0 ? parts : [text];
}

export function ChatText({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  return (
    <div className={className ?? "space-y-2 text-small leading-relaxed text-ink-secondary"}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        const listMatch = trimmed.match(/^[-*•]\s+(.*)$/);
        if (listMatch) {
          return (
            <div key={idx} className="flex gap-2 pl-0.5">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-tertiary" aria-hidden />
              <p className="min-w-0 flex-1">{renderInline(listMatch[1], `l${idx}`)}</p>
            </div>
          );
        }

        return (
          <p key={idx} className="whitespace-pre-wrap">
            {renderInline(trimmed, `p${idx}`)}
          </p>
        );
      })}
    </div>
  );
}
