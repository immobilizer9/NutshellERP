"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Badge from "@/app/components/Badge";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function ReturnsPage() {
  const now  = new Date();
  const [month,   setMonth]   = useState(now.getMonth() + 1);
  const [year,    setYear]    = useState(now.getFullYear());
  const [search,  setSearch]  = useState("");
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      month:  String(month),
      year:   String(year),
      search: search.trim(),
    });
    const res    = await fetch(`/api/admin/returns?${params}`, { credentials: "include" });
    const result = await res.json();
    setData(result.error ? null : result);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [month, year]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(fetchData, 350);
    return () => clearTimeout(t);
  }, [search]);

  const returns = data?.returns ?? [];

  return (
    <>
      <div className="page-header">
        <h1>Returns Management</h1>
        <p>Track all product returns across orders</p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Total Returns</div>
          <div className="stat-value">{data?.returns?.length ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Qty Returned</div>
          <div className="stat-value">{data?.totalQty ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Amount</div>
          <div className="stat-value" style={{ fontFamily: "monospace", color: "var(--red)" }}>
            ₹{(data?.totalAmount ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 150 }}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 100 }}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <input
          className="input"
          placeholder="Search school..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180, maxWidth: 280 }}
        />
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
      ) : returns.length === 0 ? (
        <div className="empty-state">
          <p>No returns found</p>
          <p>No returns recorded for the selected period</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Order</th>
                  <th>Class</th>
                  <th>Qty Returned</th>
                  <th>Original Qty</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Sales Rep</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>
                      {r.order?.school?.name ?? "—"}
                      {r.order?.school?.city && (
                        <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", fontWeight: 400 }}>
                          {r.order.school.city}
                        </span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/orders/${r.order?.id}`}
                        style={{ color: "var(--accent)", fontFamily: "monospace", fontSize: 12.5 }}
                      >
                        {r.order?.id?.slice(0, 8)}…
                      </Link>
                    </td>
                    <td style={{ fontWeight: 500 }}>{r.item?.className ?? "—"}</td>
                    <td style={{ color: "var(--red)", fontWeight: 600 }}>–{r.quantity}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{r.item?.quantity ?? "—"}</td>
                    <td style={{ fontFamily: "monospace", color: "var(--red)", fontWeight: 600 }}>
                      ₹{r.amount.toLocaleString()}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 12.5 }}>
                      {r.reason ?? <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12.5 }}>{r.order?.createdBy?.name ?? "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
