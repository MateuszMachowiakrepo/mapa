import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Mapa", description: "Moje miejsca i trasy" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
