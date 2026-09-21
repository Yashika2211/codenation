import { cn } from "@/lib/utils/cn";

/**
 * A small Markdown subset, rendered to React elements.
 *
 * Deliberately not `dangerouslySetInnerHTML` and deliberately not a dependency:
 * problem statements are authored content, and building the nodes directly
 * means there is no HTML injection path at all. Supports headings, paragraphs,
 * fenced code, lists, blockquotes, tables, and inline code/bold/italic/links.
 */

type Props = { content: string; className?: string };

export function Markdown({ content, className }: Props) {
  return (
    <div className={cn("space-y-4", className)}>{renderBlocks(content.replace(/\r\n/g, "\n"))}</div>
  );
}

function renderBlocks(source: string): React.ReactNode[] {
  const lines = source.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Fenced code block
    if (line.trimStart().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").trimStart().startsWith("```")) {
        body.push(lines[i] ?? "");
        i += 1;
      }
      i += 1;
      out.push(
        <pre
          key={key++}
          className="overflow-auto rounded-card border border-line bg-[rgb(6_7_13/0.7)] px-4 py-3 font-mono text-[12.5px] leading-relaxed text-muted"
          data-language={lang || undefined}
        >
          <code>{body.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Heading
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1]?.length ?? 1;
      const text = heading[2] ?? "";
      const sizes = ["text-[22px]", "text-[19px]", "text-[16px]", "text-[14px]"];
      const Tag = (["h2", "h3", "h4", "h5"] as const)[level - 1] ?? "h4";
      out.push(
        <Tag
          key={key++}
          className={cn(
            "font-display font-extrabold tracking-[-0.025em] text-text",
            sizes[level - 1] ?? "text-[14px]",
          )}
        >
          {renderInline(text)}
        </Tag>,
      );
      i += 1;
      continue;
    }

    // Table
    if (line.includes("|") && /^\s*\|?.*\|/.test(line) && isDivider(lines[i + 1])) {
      const header = splitRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && (lines[i] ?? "").includes("|")) {
        rows.push(splitRow(lines[i] ?? ""));
        i += 1;
      }
      out.push(
        <div key={key++} className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {header.map((cell, index) => (
                  <th
                    key={index}
                    className="border-b border-line px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-dim"
                  >
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-b border-line px-3 py-2 text-muted">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const body: string[] = [];
      while (i < lines.length && (lines[i] ?? "").startsWith("> ")) {
        body.push((lines[i] ?? "").slice(2));
        i += 1;
      }
      out.push(
        <blockquote
          key={key++}
          className="rounded-card border border-line bg-glass px-4 py-3 text-[13.5px] leading-relaxed text-dim"
        >
          {renderInline(body.join(" "))}
        </blockquote>,
      );
      continue;
    }

    // Lists
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (bullet || ordered) {
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      while (i < lines.length) {
        const candidate = lines[i] ?? "";
        const match = isOrdered
          ? /^\s*\d+\.\s+(.*)$/.exec(candidate)
          : /^\s*[-*]\s+(.*)$/.exec(candidate);
        if (!match) break;
        items.push(match[1] ?? "");
        i += 1;
      }

      const ListTag = isOrdered ? "ol" : "ul";
      out.push(
        <ListTag key={key++} className="space-y-[6px] pl-1">
          {items.map((item, index) => (
            <li key={index} className="flex gap-[10px] text-[14px] leading-relaxed text-muted">
              <span
                aria-hidden
                className="mt-[9px] block size-[4px] shrink-0 rotate-45 rounded-[1px] bg-flux"
              />
              <span>
                {isOrdered ? (
                  <span className="mr-2 font-mono text-[12px] text-faint">{index + 1}.</span>
                ) : null}
                {renderInline(item)}
              </span>
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }

    // Blank
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Paragraph
    const body: string[] = [];
    while (i < lines.length && (lines[i] ?? "").trim() !== "" && !isBlockStart(lines[i] ?? "")) {
      body.push(lines[i] ?? "");
      i += 1;
    }
    out.push(
      <p key={key++} className="text-[14.5px] leading-relaxed text-muted">
        {renderInline(body.join(" "))}
      </p>,
    );
  }

  return out;
}

function isBlockStart(line: string): boolean {
  return (
    line.trimStart().startsWith("```") ||
    /^#{1,4}\s/.test(line) ||
    /^\s*[-*]\s/.test(line) ||
    /^\s*\d+\.\s/.test(line) ||
    line.startsWith("> ")
  );
}

function isDivider(line: string | undefined): boolean {
  return typeof line === "string" && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes("-");
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** Inline pass: code, bold, italic, links. Tokenised, never regex-replaced into HTML. */
function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)\s]+\))/g;

  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) out.push(text.slice(lastIndex, index));

    const token = match[0];

    if (token.startsWith("`")) {
      out.push(
        <code
          key={key++}
          className="rounded-[5px] border border-line bg-[rgb(6_7_13/0.6)] px-[5px] py-[1px] font-mono text-[12.5px] text-flux"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      out.push(
        <strong key={key++} className="font-bold text-text">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      out.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      const label = link?.[1] ?? token;
      const href = link?.[2] ?? "#";
      // Only http(s) and relative links render as links; anything else is text.
      const safe = /^https?:\/\//.test(href) || href.startsWith("/");
      out.push(
        safe ? (
          <a
            key={key++}
            href={href}
            className="text-flux underline underline-offset-2 hover:text-text"
            {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {label}
          </a>
        ) : (
          <span key={key++}>{label}</span>
        ),
      );
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out;
}
