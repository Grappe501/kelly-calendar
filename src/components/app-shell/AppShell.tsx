import type { ReactNode } from "react";
import { BottomNav } from "@/components/navigation/BottomNav";
import { DevStageBanner } from "@/components/status/DevStageBanner";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header>
        <DevStageBanner />
      </header>
      <main id="main-content" className="app-main">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
