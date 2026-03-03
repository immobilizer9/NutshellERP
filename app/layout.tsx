import "./globals.css";
import { ReactNode } from "react";
import {Toaster} from "sonner";
export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-900">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}