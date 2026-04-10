"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AIChatbot from "@/app/components/AIChatbot";
import { useEffect, useState } from "react";

const ICONS = {
  dashboard:   "M3 10.5L10 3l7 7.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1v-6.5z",
  pipeline:    "M2 10h16M2 5h16M2 15h10",
  orders:      "M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  schools:     "M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z",
  tasks:       "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  reports:     "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  users:       "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197",
  analytics:   "M3 17l4-8 4 4 3-6 3 10",
  targets:     "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  audit:       "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  signout:     "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  search:      "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  bell:        "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  content:     "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  quiz:        "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  training:    "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  teamdash:    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  exports:     "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
  review:      "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
};

// MODULE → NAV LINK MAPPING
// section controls grouping in the sidebar
const MODULE_NAV: Record<string, { href: string; label: string; section: string; icon: string }> = {
  ANALYTICS:         { href: "/analytics",              label: "Analytics",         section: "Overview", icon: ICONS.analytics  },
  ORDERS:            { href: "/orders",                 label: "Orders",            section: "Sales",    icon: ICONS.orders     },
  PIPELINE:          { href: "/pipeline",               label: "Pipeline",          section: "Sales",    icon: ICONS.pipeline   },
  SCHOOLS:           { href: "/bd/schools",             label: "Schools",           section: "Sales",    icon: ICONS.schools    },
  TARGETS:           { href: "/targets",                label: "Targets",           section: "Sales",    icon: ICONS.targets    },
  TEAM_MANAGEMENT:   { href: "/bd/dashboard",           label: "Team Dashboard",    section: "Team",     icon: ICONS.teamdash   },
  TASKS:             { href: "/tasks",                  label: "Tasks",             section: "Team",     icon: ICONS.tasks      },
  DAILY_REPORTS:     { href: "/reports",                label: "Daily Reports",     section: "Team",     icon: ICONS.reports    },
  USER_MANAGEMENT:   { href: "/admin/users",            label: "Users",             section: "Admin",    icon: ICONS.users      },
  AUDIT_LOG:         { href: "/admin/audit-log",        label: "Audit Log",         section: "Admin",    icon: ICONS.audit      },
  EXPORTS:           { href: "/admin/exports",          label: "Exports",           section: "Admin",    icon: ICONS.exports    },
  CONTENT_CREATE:    { href: "/content/topics",          label: "My Topics",         section: "Content",  icon: ICONS.content    },
  CONTENT_ASSIGN:    { href: "/content/topics",         label: "Content Topics",    section: "Content",  icon: ICONS.content    },
  CONTENT_REVIEW:    { href: "/content/review",         label: "Content Review",    section: "Content",  icon: ICONS.review     },
  QUIZ_SESSIONS:     { href: "/content/quiz-sessions",  label: "Quiz Sessions",     section: "Sessions", icon: ICONS.quiz       },
  TRAINING_SESSIONS: { href: "/content/training-sessions", label: "Training Sessions", section: "Sessions", icon: ICONS.training },
  DESIGN_WORK:       { href: "/design",                    label: "Design Tasks",      section: "Design",   icon: ICONS.exports    },
  EVENTS:            { href: "/events",                    label: "Event Manager",     section: "Sales",    icon: ICONS.tasks      },
  RECEIVABLES:       { href: "/orders/receivables",         label: "Receivables",        section: "Sales",    icon: ICONS.orders     },
  SCHOOL_IMPORT:     { href: "/admin/schools/import",         label: "Import Schools",     section: "Admin",    icon: ICONS.exports    },
  SETTINGS:          { href: "/settings",                    label: "Settings",           section: "Admin",    icon: ICONS.audit      },
};

const SECTION_ORDER = ["Overview", "Sales", "Team", "Admin", "Content", "Sessions", "Design"];

function getDashboardHref(modules: string[]): string {
  if (modules.includes("USER_MANAGEMENT"))                             return "/dashboard";
  if (modules.includes("TEAM_MANAGEMENT"))                             return "/bd/dashboard";
  if (modules.includes("ORDERS") && !modules.includes("TEAM_MANAGEMENT")) return "/sales";
  if (modules.includes("QUIZ_SESSIONS") && !modules.includes("CONTENT_ASSIGN")) return "/trainer/dashboard";
  if (modules.includes("CONTENT_CREATE"))                              return "/content/dashboard";
  if (modules.includes("DESIGN_WORK"))                                 return "/design";
  return "/";
}

type NavLink = { href: string; label: string; icon: string };
type NavSection = { section: string; links: NavLink[] };

function buildNav(modules: string[], dashboardHref: string): NavSection[] {
  const sectionMap: Record<string, NavLink[]> = {};

  for (const mod of modules) {
    const entry = MODULE_NAV[mod];
    if (!entry) continue;
    if (!sectionMap[entry.section]) sectionMap[entry.section] = [];
    // Avoid duplicates (e.g. multi-role users)
    if (!sectionMap[entry.section].some((l) => l.href === entry.href)) {
      sectionMap[entry.section].push({ href: entry.href, label: entry.label, icon: entry.icon });
    }
  }

  // Inject Dashboard into Overview
  if (!sectionMap["Overview"]) sectionMap["Overview"] = [];
  sectionMap["Overview"].unshift({ href: dashboardHref, label: "Dashboard", icon: ICONS.dashboard });

  return SECTION_ORDER
    .filter((s) => sectionMap[s] && sectionMap[s].length > 0)
    .map((s) => ({ section: s, links: sectionMap[s] }));
}

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
  const router = useRouter();

  // Full-page editor — skip the sidebar layout entirely
  const isFullPageEditor = /^\/content\/workspace\/.+/.test(pathname);
  const [modules, setModules] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.modules) setModules(data.user.modules);
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

    // Fetch upcoming events for schedule in sidebar
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to   = new Date(from.getFullYear(), from.getMonth() + 2, 0);
    fetch(`/api/events?from=${from.toISOString()}&to=${to.toISOString()}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setUpcomingEvents(d); })
      .catch(() => {});

    return () => clearInterval(interval);
  }, []);

  const dashboardHref = getDashboardHref(modules);
  const nav = buildNav(modules, dashboardHref);
  const showEventSchedule = modules.length > 0;

  const isActive = (href: string) =>
    pathname === href ||
    (href.length > 1 &&
      pathname.startsWith(href) &&
      !(href === "/orders" && pathname === "/orders/new"));

  if (isFullPageEditor) {
    return <>{children}</>;
  }

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

        {showEventSchedule && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
            <div className="sidebar-section">Event Schedule</div>
            {upcomingEvents.length === 0 ? (
              <div style={{ padding: "4px 10px", fontSize: 11.5, color: "var(--text-muted)" }}>No upcoming events</div>
            ) : (
              upcomingEvents.slice(0, 5).map((ev: any) => (
                <div key={ev.id} style={{ padding: "4px 10px", display: "flex", gap: 7, alignItems: "flex-start" }}>
                  <span style={{
                    fontSize: 8, marginTop: 4, flexShrink: 0,
                    color: ev.type === "QUIZ" ? "#6366f1" : ev.type === "TEACHER_TRAINING" ? "#22c55e" : "#3b82f6",
                  }}>●</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>
                      {ev.school?.name ?? "Event"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                      {ev.type === "QUIZ" ? "Quiz" : ev.type === "TEACHER_TRAINING" ? "Training" : "Meeting"}
                      {" · "}
                      {new Date(ev.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

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
          <Link href="/profile" className="sidebar-link" style={{ fontSize: 13 }}>
            <NavIcon d={ICONS.users} />
            My Profile
          </Link>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
              router.push("/");
            }}
            className="sidebar-link"
            style={{ fontSize: 13, background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
          >
            <NavIcon d={ICONS.signout} />
            Sign out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, minHeight: "100vh" }}>
        <div className="page fade-in">{children}</div>
      </main>

      <AIChatbot />
    </div>
  );
}
