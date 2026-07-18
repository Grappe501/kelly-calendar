import type { ReactNode } from "react";
import { ShellChrome } from "@/components/app-shell/ShellChrome";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return <ShellChrome>{children}</ShellChrome>;
}
