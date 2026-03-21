"use client";

import { useEffect, useState } from "react";
import Badge from "@/app/components/Badge";

export default function BDOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [acting, setActing] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    const res = await fetch("/api/orders/list", { credentials: "include" });
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const approve = async (orderId: string) => {
    setActing(true);
    await fetch("/api/bd/approve-order", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ orderId }),
    });
    setSelected(null);
    setActing(false);
    fetchOrders();
  };

  const reject = async (orderId: string) => {
    setActing(true);
    await fetch("/api/bd/reject-order", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ orderId }),
    });
    setSelected(null);
    setActing(false);
    fetchOrders();
  };

  const pending   = orders.filter((o) => o.status === "PENDING");
  const approved  = orders.filter((o) => o.status === "APPROVED");
  const rejected  = orders.filter((o) => o.status === "REJECTED");

  return (
    <>
      <div className="page-header">
        <h1>Orders</h1>
        <p>Review and approve orders from your team</p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Pending",  value: pending.length,  color: "var(--yellow)" },
          { label: "Approved", value: approved.length, color: "var(--green)"  },
          { label: "Rejected", value: rejected.length, color: "var(--red)"    },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Pending Approval ── */}
      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginBottom: 14 }}>
            Pending Approval
            <span className="badge badge-yellow" style={{ marginLeft: 8, verticalAlign: "middle" }}>
              {pending.length}
            </span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pending.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelected(order)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 14px", borderRadius: "var(--radius)",
                  border: "1px solid var(--yellow-border)", background: "var(--yellow-bg)",
                  cursor: "pointer", transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                <div>
                  <p style={{ fontWeight: 500, margin: 0 }}>{order.school?.name ?? "Unknown"}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "2px 0 0" }}>
                    by {order.createdBy?.name} · {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontWeight: 600, margin: 0 }}>₹{order.netAmount.toLocaleString()}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "2px 0 0" }}>{order.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All Orders Table ── */}
      <div className="card">
        <h2 style={{ marginBottom: 14 }}>All Team Orders</h2>
        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</p>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <p>No orders yet</p>
            <p>Orders from your team will appear here</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Sales Rep</th>
                  <th>Type</th>
                  <th>Gross</th>
                  <th>Net</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelected(order)}
                  >
                    <td style={{ fontWeight: 500 }}>{order.school?.name ?? "—"}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{order.createdBy?.name ?? "—"}</td>
                    <td><Badge status={order.type} /></td>
                    <td style={{ fontFamily: "monospace", fontSize: 13 }}>₹{order.grossAmount.toLocaleString()}</td>
                    <td style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 13 }}>₹{order.netAmount.toLocaleString()}</td>
                    <td><Badge status={order.status} /></td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selected && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50, padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div
            className="fade-in"
            style={{
              background: "var(--surface)", borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border)", padding: 28, width: "100%",
              maxWidth: 460, boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0 }}>{selected.school?.name ?? "Order"}</h2>
                <p style={{ color: "var(--text-muted)", fontSize: 12.5, margin: "3px 0 0" }}>
                  {new Date(selected.createdAt).toLocaleString()}
                </p>
              </div>
              <Badge status={selected.status} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Sales Rep",    value: selected.createdBy?.name },
                { label: "Order Type",   value: selected.type },
                { label: "Gross Amount", value: `₹${selected.grossAmount.toLocaleString()}` },
                { label: "Net Amount",   value: `₹${selected.netAmount.toLocaleString()}` },
              ].map((row) => (
                <div key={row.label} style={{ background: "var(--bg)", borderRadius: "var(--radius)", padding: "10px 12px" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 3px" }}>{row.label}</p>
                  <p style={{ fontWeight: 600, margin: 0 }}>{row.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              {selected.status === "PENDING" && (
                <>
                  <button className="btn btn-success" disabled={acting} onClick={() => approve(selected.id)}>
                    {acting ? "..." : "Approve"}
                  </button>
                  <button className="btn btn-danger" disabled={acting} onClick={() => reject(selected.id)}>
                    {acting ? "..." : "Reject"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
