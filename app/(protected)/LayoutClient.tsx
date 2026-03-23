"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ICONS = {
  dashboard:   "M3 10.5L10 3l7 7.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1v-6.5z",
  pipeline:    "M2 10h16M2 5h16M2 15h10",
  orders:      "M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  schools:     "M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z",
  tasks:       "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  reports:     "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  timeline:    "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  users:       "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197",
  analytics:   "M3 17l4-8 4 4 3-6 3 10",
  targets:     "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  competitors: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  audit:       "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  metrics:     "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  neworder:    "M12 4v16m8-8H4",
  signout:     "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  financial:   "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  settings:    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  approval:    "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  returns:     "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6",
  permissions: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
  alert:       "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  incentive:   "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  teamperf:    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  visits:      "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
  search:      "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  bell:        "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
};

const NAV_ADMIN = [
  {
    section: "Overview",
    links: [
      { href: "/dashboard",        label: "Dashboard",  icon: ICONS.dashboard  },
      { href: "/pipeline",         label: "Pipeline",   icon: ICONS.pipeline   },
      { href: "/analytics",        label: "Analytics",  icon: ICONS.analytics  },
    ],
  },
  {
    section: "Sales",
    links: [
      { href: "/orders",           label: "Orders",     icon: ICONS.orders     },
      { href: "/admin/schools",    label: "Schools",    icon: ICONS.schools    },
      { href: "/admin/financial",  label: "Financial",  icon: ICONS.financial  },
    ],
  },
  {
    section: "Admin",
    links: [
      { href: "/admin/users",       label: "Users",        icon: ICONS.users       },
      { href: "/admin/returns",     label: "Returns",      icon: ICONS.returns     },
      { href: "/admin/permissions", label: "Permissions",  icon: ICONS.permissions },
      { href: "/admin/audit-log",   label: "Audit Log",    icon: ICONS.audit       },
      { href: "/admin/import",      label: "Import CSV",   icon: ICONS.orders      },
      { href: "/admin/metrics",     label: "Sys. Metrics", icon: ICONS.metrics     },
      { href: "/admin/settings",    label: "Settings",     icon: ICONS.settings    },
    ],
  },
];

const NAV_BD = [
  {
    section: "Overview",
    links: [
      { href: "/bd/dashboard",        label: "Dashboard",   icon: ICONS.dashboard },
      { href: "/pipeline",            label: "Pipeline",    icon: ICONS.pipeline  },
      { href: "/analytics",           label: "Analytics",   icon: ICONS.analytics },
    ],
  },
  {
    section: "Workflow",
    links: [
      { href: "/bd/approvals",        label: "Approvals",     icon: ICONS.approval  },
      { href: "/bd/orders",           label: "All Orders",    icon: ICONS.orders    },
      { href: "/bd/schools",          label: "Schools",       icon: ICONS.schools   },
      { href: "/bd/competitors",      label: "Competitors",   icon: ICONS.competitors },
      { href: "/orders/new",          label: "New Order",     icon: ICONS.neworder  },
    ],
  },
  {
    section: "Team",
    links: [
      { href: "/bd/team-performance",  label: "Performance",       icon: ICONS.teamperf  },
      { href: "/bd/incentives",        label: "Incentives",        icon: ICONS.incentive },
      { href: "/bd/targets",           label: "Targets",           icon: ICONS.targets   },
      { href: "/bd/tasks",             label: "Tasks",             icon: ICONS.tasks     },
      { href: "/bd/reports",           label: "Reports",           icon: ICONS.reports   },
      { href: "/bd/timeline",          label: "Timeline",          icon: ICONS.timeline  },
    ],
  },
  {
    section: "Alerts",
    links: [
      { href: "/bd/delivery-alerts", label: "Delivery Alerts", icon: ICONS.alert  },
      { href: "/bd/visit-alerts",    label: "Visit Alerts",    icon: ICONS.visits },
    ],
  },
];

const NAV_SALES = [
  {
    section: "Overview",
    links: [
      { href: "/sales",           label: "Dashboard",  icon: ICONS.dashboard },
      { href: "/pipeline",        label: "Pipeline",   icon: ICONS.pipeline  },
      { href: "/analytics",       label: "Analytics",  icon: ICONS.analytics },
    ],
  },
  {
    section: "Sales",
    links: [
      { href: "/orders",          label: "My Orders",  icon: ICONS.orders    },
      { href: "/orders/new",      label: "New Order",  icon: ICONS.neworder  },
      { href: "/bd/schools",      label: "Schools",    icon: ICONS.schools   },
      { href: "/sales/visits",    label: "Visits",     icon: ICONS.visits    },
    ],
  },
  {
    section: "Performance",
    links: [
      { href: "/sales/targets",   label: "Targets",    icon: ICONS.targets   },
      { href: "/sales/incentives", label: "Incentives", icon: ICONS.incentive },
    ],
  },
  {
    section: "Alerts",
    links: [
      { href: "/sales/delivery-alerts", label: "Delivery Alerts", icon: ICONS.alert  },
      { href: "/sales/visit-alerts",    label: "Visit Alerts",    icon: ICONS.visits },
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
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.roles) setRoles(data.user.roles);
      });
    // Poll unread notification count every 60s
    const fetchUnread = () =>
      fetch("/api/notifications", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) setUnreadCount(d.filter((n: any) => !n.isRead).length);
        })
        .catch(() => {});
    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
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

        <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 2 }}>
          <Link href="/search" className="sidebar-link" style={{ fontSize: 13 }}>
            <NavIcon d={ICONS.search} />
            Search
          </Link>
          <Link href="/notifications" className="sidebar-link" style={{ fontSize: 13, position: "relative" }}>
            <NavIcon d={ICONS.bell} />
            Notifications
            {unreadCount > 0 && (
              <span style={{
                marginLeft: "auto", background: "var(--red)", color: "#fff",
                borderRadius: "999px", fontSize: 10, fontWeight: 700,
                padding: "1px 6px", lineHeight: "16px",
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
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
