import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell/AppShell";
import { getPublicAppConfig } from "@/lib/env/public-config";
import "./globals.css";

const config = getPublicAppConfig();

export const metadata: Metadata = {
  title: {
    default: config.appName,
    template: `%s · ${config.appName}`,
  },
  description:
    "Kelly’s daily campaign operating system — where to be, when to leave, what to know next.",
  applicationName: config.appName,
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f4c5c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
