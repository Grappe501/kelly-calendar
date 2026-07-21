"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/navigation/BottomNav";
import { DevStageBanner } from "@/components/status/DevStageBanner";

type Props = {
  children: ReactNode;
  /** Server-computed; null when Step 8 certified and auth ready. */
  securityBannerMessage?: string | null;
};

export function ShellChrome({ children, securityBannerMessage = null }: Props) {
  const pathname = usePathname() ?? "/";
  const hideChrome = pathname === "/login" || pathname.startsWith("/login/");

  return (
    <div className="app-frame" data-viewport-target="375">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      {!hideChrome ? (
        <header>
          <DevStageBanner message={securityBannerMessage} />
        </header>
      ) : null}
      <main id="main-content" className="app-main">
        {children}
      </main>
      {!hideChrome ? <BottomNav /> : null}
    </div>
  );
}
