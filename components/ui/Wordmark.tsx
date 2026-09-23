import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** The rotated flux diamond plus the letterspaced wordmark. */
export function Wordmark({
  className,
  href = "/",
  size = 20,
}: {
  className?: string;
  href?: string;
  size?: number;
}) {
  return (
    <Link href={href} className={cn("group inline-flex min-h-[44px] items-center gap-[11px]", className)}>
      <span
        aria-hidden
        className="block rotate-45 rounded-[2px] transition-shadow duration-300 group-hover:shadow-[0_0_22px_-1px_rgb(59_232_176/0.95)]"
        style={{
          width: size,
          height: size,
          border: "1.5px solid var(--color-flux)",
          boxShadow: "0 0 14px -2px rgb(59 232 176 / 0.85)",
        }}
      />
      <span className="font-display text-[15px] font-extrabold tracking-[0.16em] text-text">
        CODENATION
      </span>
    </Link>
  );
}
