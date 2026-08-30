import type { ReactNode } from "react";
import { themeScript } from "@i258/ui";
import "./globals.css";

export const metadata = {
  title: "Service Catalog — graph",
  description: "Read-only graph browser for a software catalog",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript() }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
