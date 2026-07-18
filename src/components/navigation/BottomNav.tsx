"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV_ITEMS, resolveActiveNavId } from "@/lib/navigation/nav-items";

export function BottomNav() {
  const pathname = usePathname() ?? "/";
  const activeId = resolveActiveNavId(pathname);

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {BOTTOM_NAV_ITEMS.map((item) => {
        const isActive = item.id === activeId;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={item.prominent ? "nav-add" : undefined}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
          >
            {item.prominent ? <span aria-hidden="true">+</span> : null}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
