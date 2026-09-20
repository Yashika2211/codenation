export type NavItem = {
  href: string;
  label: string;
  /** Short form for the mobile tab bar. */
  short: string;
  /** Sub-routes that should still light the pill. */
  match?: string[];
};

export const PRIMARY_NAV: NavItem[] = [
  { href: "/city", label: "City", short: "City" },
  { href: "/arena", label: "Arena", short: "Arena", match: ["/arena", "/duel"] },
  { href: "/tech", label: "Tech", short: "Tech" },
  { href: "/forge", label: "Forge", short: "Forge" },
  { href: "/atlas", label: "Atlas", short: "Atlas", match: ["/atlas", "/n"] },
  { href: "/events", label: "Events", short: "Events" },
];

/** The five tabs that fit a 390px viewport. */
export const MOBILE_NAV: NavItem[] = [
  { href: "/city", label: "City", short: "City" },
  { href: "/arena", label: "Arena", short: "Arena", match: ["/arena", "/duel"] },
  { href: "/events", label: "Events", short: "Events" },
  { href: "/atlas", label: "Atlas", short: "Atlas", match: ["/atlas", "/n"] },
  { href: "/me", label: "You", short: "You", match: ["/me", "/u"] },
];

export function isActive(pathname: string, item: NavItem): boolean {
  const roots = item.match ?? [item.href];
  return roots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}
