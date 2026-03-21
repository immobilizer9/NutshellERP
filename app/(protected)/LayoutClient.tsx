"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ICONS = {
  dashboard: "M3 10.5L10 3l7 7.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1v-6.5z",
  pipeline:  "M2 10h16M2 5h16M2 15h10",
  orders:    "M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  schools:   "M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z",
  tasks:     "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  reports:   "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  timeline:  "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  users:     "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197",
  analytics: "M3 17l4-8 4 4 3-6 3 10",
  targets:     "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  competitors: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  audit:     "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  metrics:   "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  neworder:  "M12 4v16m8-8H4",
  signout:   "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
};

const NAV_ADMIN = [
  {
    section: "Overview",
    links: [
      { href: "/dashboard",       label: "Dashboard", icon: ICONS.dashboard },
      { href: "/pipeline",        label: "Pipeline",  icon: ICONS.pipeline  },
      { href: "/analytics",       label: "Analytics", icon: ICONS.analytics },
    ],
  },
  {
    section: "Sales",
    links: [
      { href: "/orders",          label: "Orders",    icon: ICONS.orders  },
      { href: "/bd/schools",      label: "Schools",   icon: ICONS.schools },
    ],
  },
  {
    section: "Admin",
    links: [
      { href: "/admin/users",     label: "Users",        icon: ICONS.users    },
      { href: "/admin/audit-log", label: "Audit Log",    icon: ICONS.audit    },
      { href: "/admin/import",    label: "Import CSV",   icon: ICONS.orders   },
      { href: "/admin/metrics",   label: "Sys. Metrics", icon: ICONS.metrics  },
    ],
  },
];

const NAV_BD = [
  {
    section: "Overview",
    links: [
      { href: "/bd/dashboard",    label: "Dashboard", icon: ICONS.dashboard },
      { href: "/pipeline",        label: "Pipeline",  icon: ICONS.pipeline  },
      { href: "/analytics",       label: "Analytics", icon: ICONS.analytics },
    ],
  },
  {
    section: "Sales",
    links: [
      { href: "/bd/orders",       label: "Orders",      icon: ICONS.orders      },
      { href: "/bd/schools",      label: "Schools",     icon: ICONS.schools     },
      { href: "/bd/competitors",  label: "Competitors", icon: ICONS.competitors },
      { href: "/orders/new",      label: "New Order",   icon: ICONS.neworder    },
    ],
  },
  {
    section: "Team",
    links: [
      { href: "/bd/tasks",        label: "Tasks",     icon: ICONS.tasks    },
      { href: "/bd/targets",      label: "Targets",   icon: ICONS.targets  },
      { href: "/bd/reports",      label: "Reports",   icon: ICONS.reports  },
      { href: "/bd/timeline",     label: "Timeline",  icon: ICONS.timeline },
    ],
  },
];

const NAV_SALES = [
  {
    section: "Overview",
    links: [
      { href: "/sales",           label: "Dashboard", icon: ICONS.dashboard },
      { href: "/pipeline",        label: "Pipeline",  icon: ICONS.pipeline  },
      { href: "/analytics",       label: "Analytics", icon: ICONS.analytics },
    ],
  },
  {
    section: "Sales",
    links: [
      { href: "/orders",          label: "My Orders", icon: ICONS.orders   },
      { href: "/orders/new",      label: "New Order", icon: ICONS.neworder },
    ],
  },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ width: 16, height: 16, flexShrink: 0, opacity: 0.7 }}
    >
      <path d={d} />
    </svg>
  );
}

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.roles) setRoles(data.user.roles);
      });
  }, []);

  const nav =
    roles.includes("ADMIN")   ? NAV_ADMIN :
    roles.includes("BD_HEAD") ? NAV_BD    :
    roles.includes("SALES")   ? NAV_SALES : [];

  const isActive = (href: string) =>
    pathname === href ||
    (href.length > 1 &&
      pathname.startsWith(href) &&
      !(href === "/orders" && pathname === "/orders/new"));

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)", alignItems: "flex-start" }}>

      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>Nutshell</span>
          <sub>ERP · Book Distribution</sub>
        </div>

        <nav className="sidebar-nav">
          {nav.map((group) => (
            <div key={group.section}>
              <div className="sidebar-section">{group.section}</div>
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`sidebar-link ${isActive(link.href) ? "active" : ""}`}
                >
                  <NavIcon d={link.icon} />
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/" className="sidebar-link" style={{ fontSize: 13 }}>
            <NavIcon d={ICONS.signout} />
            Sign out
          </Link>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, minHeight: "100vh" }}>
        <div className="page fade-in">{children}</div>
      </main>

    </div>
  );
}
