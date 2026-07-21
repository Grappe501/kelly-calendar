import type { ReactNode } from "react";
import { ShellChrome } from "@/components/app-shell/ShellChrome";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const flags = getSharedAuthFlags();
  let securityBannerMessage: string | null = null;
  if (!flags.authenticationComplete) {
    securityBannerMessage =
      "Authentication is not configured. Set APP_SESSION_SECRET before entering campaign schedule data.";
  } else if (!flags.candidateDataReady) {
    securityBannerMessage =
      "Candidate-data certification incomplete. Real campaign schedule entry remains prohibited.";
  }

  return (
    <ShellChrome securityBannerMessage={securityBannerMessage}>
      {children}
    </ShellChrome>
  );
}
