export type NavItem = {
  href: string;
  label: string;
  id: "today" | "calendar" | "add" | "search" | "more";
  prominent?: boolean;
};

export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { id: "today", href: "/", label: "Today" },
  { id: "calendar", href: "/calendar", label: "Calendar" },
  { id: "add", href: "/add", label: "Add", prominent: true },
  { id: "search", href: "/search", label: "Search" },
  { id: "more", href: "/more", label: "More" },
];

export function resolveActiveNavId(pathname: string): NavItem["id"] {
  if (pathname === "/") return "today";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/add")) return "add";
  if (pathname.startsWith("/search")) return "search";
  if (
    pathname.startsWith("/more") ||
    pathname.startsWith("/system") ||
    pathname.startsWith("/brief") ||
    pathname.startsWith("/command") ||
    pathname.startsWith("/field") ||
    pathname.startsWith("/counties") ||
    pathname.startsWith("/volunteers") ||
    pathname.startsWith("/communications") ||
    pathname.startsWith("/logistics") ||
    pathname.startsWith("/finance") ||
    pathname.startsWith("/compliance") ||
    pathname.startsWith("/intelligence") ||
    pathname.startsWith("/constituents") ||
    pathname.startsWith("/candidate") ||
    pathname.startsWith("/debate-media")
  ) {
    return "more";
  }
  return "today";
}
