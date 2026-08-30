import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Service Catalog — graph",
  description: "Read-only graph browser for a software catalog",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
