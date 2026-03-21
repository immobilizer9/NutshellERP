"use client";

import dynamic from "next/dynamic";

const LayoutClient = dynamic(() => import("./LayoutClient"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ width: 220, flexShrink: 0, background: "var(--sidebar-bg)" }} />
      <main style={{ flex: 1, minWidth: 0 }} />
    </div>
  ),
});

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <LayoutClient>{children}</LayoutClient>;
}
