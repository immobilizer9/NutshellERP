"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STATUS_BADGE: Record<string, string> = {
  DRAFT:       "badge-gray",
  SUBMITTED:   "badge-yellow",
  APPROVED:    "badge-green",
  REJECTED:    "badge-red",
  DESIGN_SENT: "badge-indigo",
  PUBLISHED:   "badge-blue",
  OPEN:        "badge-blue",
  IN_PROGRESS: "badge-yellow",
  COMPLETED:   "badge-green",
};

export default function ContentDashboardPage() {
  const [user,   setUser]   = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [docs,   setDocs]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me",          { credentials: "include" }).then((r) => r.json()),
      fetch("/api/content/topics",   { credentials: "include" }).then((r) => r.json()),
      fetch("/api/content/documents",{ credentials: "include" }).then((r) => r.json()),
    ])
      .then(([me, t, d]) => {
        setUser(me?.user ?? null);
        setTopics(Array.isArray(t) ? t : []);
        setDocs(Array.isArray(d) ? d : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading...</p>;

  const drafts    = docs.filter((d) => d.status === "DRAFT").length;
  const submitted = docs.filter((d) => d.status === "SUBMITTED").length;
  const approved  = docs.filter((d) => d.status === "APPROVED").length;
  const rejected  = docs.filter((d) => d.status === "REJECTED").length;
  const recentDocs = docs.slice(0, 8);

  return (
    <>
      <div className="page-header">
        <h1>Content Dashboard</h1>
        <p>Welcome back{user?.name ? `, ${user.name}` : ""}. Here's your content overview.</p>
      </div>

      {/* Stat cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Assigned Topics</div>
          <div className="stat-value">{topics.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Drafts</div>
          <div className="stat-value">{drafts}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Review</div>
          <div className="stat-value" style={{ color: "var(--yellow)" }}>{submitted}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approved</div>
          <div className="stat-value" style={{ color: "var(--green)" }}>{approved}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rejected</div>
          <div className="stat-value" style={{ color: rejected > 0 ? "var(--red)" : "var(--text-primary)" }}>{rejected}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Topics table */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2>My Topics</h2>
            <Link href="/content/topics" className="btn btn-ghost" style={{ fontSize: 13 }}>View All</Link>
          </div>
          {topics.length === 0 ? (
            <div className="empty-state"><p>No topics assigned yet</p></div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Product</th>
                    <th>Docs</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.slice(0, 6).map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.title}</td>
                      <td>
                        <span className="badge badge-blue" style={{ fontSize: 11 }}>{t.productType}</span>
                      </td>
                      <td>{t._count?.documents ?? 0}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[t.status] ?? "badge-gray"}`}>{t.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent documents */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2>Recent Documents</h2>
            <Link href="/content/topics" className="btn btn-ghost" style={{ fontSize: 13 }}>View Topics</Link>
          </div>
          {recentDocs.length === 0 ? (
            <div className="empty-state"><p>No documents yet</p></div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Topic</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocs.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <Link href={`/content/documents/${d.id}`} style={{ color: "var(--accent)", fontWeight: 500 }}>
                          {d.title}
                        </Link>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{d.topic?.title}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[d.status] ?? "badge-gray"}`}>{d.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
