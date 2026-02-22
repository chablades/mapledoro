/*
  Single source of truth for top-nav links.
  Edit this file when adding/removing/reordering main navigation entries.
*/
export interface NavLinkItem {
  label: string;
  href: string;
}

export const NAV_LINKS: NavLinkItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "Characters", href: "/characters" },
  { label: "Tools", href: "#" },
  { label: "Community", href: "#" },
];
