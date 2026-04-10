"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@/app/components/Badge";

const PRODUCT_LABELS: Record<string, string> = {
  ANNUAL:              "Annual",
  PAPERBACKS_PLAINS:   "Plains",
  PAPERBACKS_HILLS:    "Hills",
  NUTSHELL_ANNUAL:     "Nutshell Annual",
  NUTSHELL_PAPERBACKS: "Nutshell PB",
};

type Filter = "PENDING" | "APPROVED" | "REJECTED";

export default function ApprovalsPage() {
  const [orders, setOrders]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<Filter>("PENDING");
  const [acting, setActing]   = useState(false);

  // Per-card inline reject state
  const [rejectingId, setRejectingId]   = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    const res  = await fetch("/api/orders/list?limit=200", { credentials: "include" });
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : (data?.orders ?? []));
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const pending  = orders.filter((o) => o.status === "PENDING");
  const approved = orders.filter((o) => o.status === "APPROVED");
  const rejected = orders.filter((o) => o.status === "REJECTED");

  const displayed = useMemo(() => {
    if (filter === "PENDING")  return pending;
    if (filter === "APPROVED") return approved;
    return rejected;
  }, [orders, filter]);

  const approve = async (orderIds: string[]) => {
    setActing(true);
    await Promise.all(orderIds.map((orderId) =>
      fetch("/api/bd/approve-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ orderId }),
      })
    ));
    setActing(false);
    fetchOrders();
  };

  const reject = async (orderId: string, reason: string) => {
    setActing(true);
    await fetch("/api/bd/reject-order", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ orderId, reason }),
    });
    setRejectingId(null);
    setRejectReason("");
    setActing(false);
    fetchOrders();
  };

  const emptyMessages: Record<Filter, string> = {
    PENDING:  "No pending orders — all caught up!",
    APPROVED: "No approved orders yet",
    REJECTED: "No rejected orders",
  };

  return (
    <>
      <div className="page-header">
        <h1>Approvals</h1>
        <p>Review and action pending orders</p>
      </div>

      {/* ── Stats row (clickable to filter) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {(
          [
            { label: "Pending",  count: pending.length,  color: "var(--yellow)", key: "PENDING"  },
            { label: "Approved", count: approved.length, color: "var(--green)",  key: "APPROVED" },
            { label: "Rejected", count: rejected.length, color: "var(--red)",    key: "REJECTED" },
          ] as { label: string; count: number; color: string; key: Filter }[]
        ).map((s) => (
          <div
            key={s.key}
            className="stat-card"
            style={{ cursor: "pointer", outline: filter === s.key ? "2px solid var(--accent)" : "none" }}
            onClick={() => setFilter(s.key)}
          >
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* ── Filter tabs + Approve All ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {(["PENDING", "APPROVED", "REJECTED"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "7px 18px",
                borderRadius: "var(--radius-lg)",
                border: "2px solid",
                borderColor: filter === f
                  ? (f === "PENDING" ? "var(--yellow)" : f === "APPROVED" ? "var(--green)" : "var(--red)")
                  : "var(--border)",
                background: filter === f
                  ? (f === "PENDING" ? "var(--yellow)" : f === "APPROVED" ? "var(--green)" : "var(--red)") + "22"
                  : "transparent",
                color: filter === f
                  ? (f === "PENDING" ? "var(--yellow)" : f === "APPROVED" ? "var(--green)" : "var(--red)")
                  : "var(--text-muted)",
                fontWeight: filter === f ? 700 : 400,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        {filter === "PENDING" && pending.length > 0 && (
          <button
            className="btn btn-success"
            disabled={acting}
            onClick={() => approve(pending.map((o) => o.id))}
          >
            {acting ? "Approving..." : `Approve All Pending (${pending.length})`}
          </button>
        )}
      </div>

      {/* ── Order Cards ── */}
      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <p>{emptyMessages[filter]}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {displayed.map((order) => (
            <div key={order.id} className="card" style={{ padding: 20 }}>
              {/* ── Card header: school + date ── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <a
                  href={`/orders/${order.id}`}
                  style={{ fontWeight: 700, fontSize: 16, color: "inherit", textDecoration: "none" }}
                >
                  {order.school?.name ?? "—"}
                </a>
                <span style={{ color: "var(--text-muted)", fontSize: 12.5, marginLeft: 12, whiteSpace: "nowrap" }}>
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* ── Rep / product / type ── */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>
                <span>{order.createdBy?.name ?? "—"}</span>
                <span style={{ color: "var(--border)" }}>·</span>
                <span>{PRODUCT_LABELS[order.productType] ?? order.productType}</span>
                <span style={{ color: "var(--border)" }}>·</span>
                <span>{order.type}</span>
              </div>

              {/* ── Net amount ── */}
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)", fontFamily: "monospace", marginBottom: 12 }}>
                ₹{(order.netAmount ?? 0).toLocaleString()}
              </div>

              {/* ── Payment + Delivery badges ── */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: order.status === "PENDING" || (order.status === "REJECTED" && order.rejectionReason) ? 14 : 0 }}>
                <Badge status={order.paymentStatus  ?? "UNPAID"} />
                <Badge status={order.deliveryStatus ?? "PENDING"} />
              </div>

              {/* ── Rejection reason ── */}
              {order.status === "REJECTED" && order.rejectionReason && (
                <p style={{ fontSize: 12.5, color: "var(--red)", fontStyle: "italic", margin: "0 0 10px", padding: "8px 12px", background: "rgba(220,38,38,0.06)", borderRadius: "var(--radius)" }}>
                  Reason: {order.rejectionReason}
                </p>
              )}

              {/* ── PENDING actions ── */}
              {order.status === "PENDING" && (
                <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 12 }}>
                  {rejectingId === order.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <textarea
                        className="input"
                        rows={2}
                        placeholder="Reason for rejection (optional)..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") { setRejectingId(null); setRejectReason(""); }
                        }}
                        style={{ resize: "vertical" }}
                        autoFocus
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn btn-danger"
                          disabled={acting}
                          onClick={() => reject(order.id, rejectReason)}
                          style={{ fontSize: 13 }}
                        >
                          {acting ? "Rejecting..." : "Confirm Reject"}
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={() => { setRejectingId(null); setRejectReason(""); }}
                          style={{ fontSize: 13 }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn btn-success"
                        disabled={acting}
                        onClick={() => approve([order.id])}
                        style={{ fontSize: 13 }}
                      >
                        {acting ? "..." : "Approve"}
                      </button>
                      <button
                        className="btn btn-danger"
                        disabled={acting}
                        onClick={() => { setRejectingId(order.id); setRejectReason(""); }}
                        style={{ fontSize: 13 }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
