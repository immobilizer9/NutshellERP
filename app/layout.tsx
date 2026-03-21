import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nutshell ERP",
  description: "School book distribution management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
