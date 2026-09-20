"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { MOBILE_NAV, isActive } from "@/lib/design/nav";
import {
  IconCube,
  IconSwords,
  IconSpark,
  IconGlobe,
  IconUsers,
} from "./Icon";

const ICONS: Record<string, (props: { size?: number }) => React.ReactElement> = {
  "/city": IconCube,
  "/arena": IconSwords,
  "/events": IconSpark,
  "/atlas": IconGlobe,
  "/me": IconUsers,
};

/** Fixed bottom bar. Only rendered under `lg`, where the TopNav pills hide. */
export function MobileTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-[rgb(9_11_18/0.94)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-[600px] grid-cols-5">
        {MOBILE_NAV.map((item) => {
          const active = isActive(pathname, item);
          const Icon = ICONS[item.href] ?? IconCube;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-[5px] transition-colors",
                  active ? "text-flux" : "text-ghost",
                )}
              >
                <Icon size={19} />
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em]">
                  {item.short}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
