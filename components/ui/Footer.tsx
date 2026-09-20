import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { Label } from "./Label";

const COLUMNS = [
  {
    title: "World",
    links: [
      { href: "/city", label: "City of Coders" },
      { href: "/atlas", label: "World atlas" },
      { href: "/tech", label: "Tech tree" },
      { href: "/forge", label: "The Forge" },
    ],
  },
  {
    title: "Compete",
    links: [
      { href: "/arena", label: "Arena" },
      { href: "/events", label: "Hackathons" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/fairplay", label: "Integrity charter" },
      { href: "/fairplay#verdicts", label: "Verdict ledger" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-[38ch] text-[13px] leading-relaxed text-dim">
            A persistent world for developers. Real work mints reputation, territory and technology.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <Label as="div">{column.title}</Label>
            <ul className="mt-4 space-y-[10px]">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13.5px] text-muted transition-colors hover:text-flux"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ghost">
            Seeded citizens are marked in the database and excluded from every real count
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ghost">
            Built on Next.js, Supabase and Piston
          </p>
        </div>
      </div>
    </footer>
  );
}
