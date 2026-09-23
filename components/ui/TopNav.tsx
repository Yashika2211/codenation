"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { PRIMARY_NAV, isActive } from "@/lib/design/nav";
import { Wordmark } from "./Wordmark";
import { Avatar } from "./Avatar";
import { ResourceChip } from "./ResourceChip";

export type NavUser = {
  handle: string;
  displayName: string;
  avatarSeed: string;
};

export type NavWallet = {
  compute: number;
  data: number;
  alloy: number;
};

type TopNavProps = {
  user?: NavUser | null;
  wallet?: NavWallet | null;
  reputation?: number;
};

export function TopNav({ user, wallet, reputation }: TopNavProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-[rgb(9_11_18/0.8)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
        <Wordmark />

        <nav aria-label="Primary" className="ml-2 hidden items-center gap-[3px] lg:flex">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-chip border px-[13px] py-2 text-[13px] transition-colors duration-150",
                  active
                    ? "border-[rgb(59_232_176/0.38)] bg-[rgb(59_232_176/0.12)] font-bold text-flux"
                    : "border-transparent text-dim hover:border-line hover:bg-glass hover:text-text",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {wallet ? (
            <div className="hidden items-center gap-[6px] md:flex">
              <ResourceChip resource="compute" value={wallet.compute} />
              <ResourceChip resource="data" value={wallet.data} />
              <span className="hidden xl:inline-flex">
                <ResourceChip resource="alloy" value={wallet.alloy} />
              </span>
            </div>
          ) : null}

          {/*
            Wrapped rather than passing `hidden` to the chip: the chip's own
            `inline-flex` and a `hidden` utility are both display declarations,
            and which one wins depends on their order in the generated
            stylesheet, not on the order in the class attribute. The chip was
            staying visible at 390px and pushing the whole document wider.
          */}
          {typeof reputation === "number" ? (
            <span className="hidden sm:inline-flex">
              <ResourceChip resource="rep" value={reputation} />
            </span>
          ) : null}

          {user ? (
            <Link
              href={`/u/${user.handle}`}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[9px] transition-opacity hover:opacity-85"
              aria-label={`Your profile, ${user.displayName}`}
            >
              <Avatar seed={user.avatarSeed} name={user.displayName} size="sm" />
            </Link>
          ) : (
            <Link
              href="/signin"
              className="inline-flex min-h-[44px] items-center rounded-chip border border-[rgb(59_232_176/0.38)] bg-[rgb(59_232_176/0.12)] px-[15px] text-[13px] font-bold text-flux transition-colors hover:bg-[rgb(59_232_176/0.18)]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
