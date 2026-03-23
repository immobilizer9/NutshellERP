"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Badge from "@/app/components/Badge";

const PRODUCT_LABELS: Record<string, string> = {
  ANNUAL:              "Annual",
  PAPERBACKS_PLAINS:   "Plains",
  PAPERBACKS_HILLS:    "Hills",
  NUTSHELL_ANNUAL:     "Nutshell Annual",
  NUTSHELL_PAPERBACKS: "Nutshell PB",
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [query, setQuery]     = useState(searchParams.get("q") ?? "");
  const [results, setResults] = useState<{ schools: any[]; orders: any[]; users: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const doSearch = async (q: string) => {
    if (q.trim().length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { credentials: "include" });
      const data = await res.json();
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setQuery(q);
    if (q.length >= 2) doSearch(q);
  }, []);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") doSearch(query);
  };

  const total = results ? (results.schools.length + results.orders.length + results.users.length) : 0;

  return (
    <>
      <div className="page-header">
        <h1>Search</h1>
        <p>Search across schools, orders, and users</p>
      </div>

      {/* ── Search Input ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="input"
            placeholder="Type to search schools, orders, users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            style={{ flex: 1, fontSize: 15 }}
            autoFocus
          />
          <button className="btn btn-primary" onClick={() => doSearch(query)} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
        {query.length > 0 && query.length < 2 && (
          <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "8px 0 0" }}>Type at least 2 characters to search.</p>
        )}
      </div>

      {results && (
        <>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
            {total === 0 ? `No results for "${query}"` : `${total} result${total !== 1 ? "s" : ""} for "${query}"`}
          </p>

          {/* ── Schools ── */}
          {results.schools.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h2 style={{ marginBottom: 14 }}>
                Schools
                <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>({results.schools.length})</span>
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {results.schools.map((school: any, i: number) => (
                  <a key={school.id} href={`/bd/schools/${school.id}`}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 0", textDecoration: "none", color: "inherit",
                      borderBottom: i < results.schools.length - 1 ? "1px solid var(--border-soft)" : "none",
                    }}>
                    <div>
                      <p style={{ fontWeight: 600, margin: 0, fontSize: 13.5 }}>{school.name}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "2px 0 0" }}>
                        {school.city}, {school.state}
                        {school.assignedTo && ` · ${school.assignedTo.name}`}
                      </p>
                    </div>
                    <Badge status={school.pipelineStage} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Orders ── */}
          {results.orders.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h2 style={{ marginBottom: 14 }}>
                Orders
                <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>({results.orders.length})</span>
              </h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>School</th>
                      <th>Product</th>
                      <th>Net Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.orders.map((order: any) => (
                      <tr key={order.id} style={{ cursor: "pointer" }}
                        onClick={() => window.location.href = `/orders/${order.id}`}>
                        <td style={{ fontWeight: 500 }}>{order.school?.name ?? "—"}</td>
                        <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {PRODUCT_LABELS[order.productType] ?? order.productType}
                        </td>
                        <td style={{ fontFamily: "monospace", fontWeight: 600 }}>₹{order.netAmount?.toLocaleString()}</td>
                        <td><Badge status={order.status} /></td>
                        <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Users ── */}
          {results.users.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h2 style={{ marginBottom: 14 }}>
                Users
                <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>({results.users.length})</span>
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {results.users.map((user: any, i: number) => (
                  <div key={user.id} style={{
                    padding: "10px 0",
                    borderBottom: i < results.users.length - 1 ? "1px solid var(--border-soft)" : "none",
                  }}>
                    <p style={{ fontWeight: 600, margin: 0, fontSize: 13.5 }}>{user.name}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "2px 0 0" }}>{user.email}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {total === 0 && (
            <div className="card">
              <div className="empty-state">
                <p>No results found</p>
                <p>Try different keywords or check the spelling</p>
              </div>
            </div>
          )}
        </>
      )}

      {!results && !loading && (
        <div className="card">
          <div className="empty-state">
            <p>Start typing to search</p>
            <p>Find schools, orders, and team members</p>
          </div>
        </div>
      )}
    </>
  );
}
