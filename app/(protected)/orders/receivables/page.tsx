"use client";

import { useEffect, useMemo, useState } from "react";

const PAY_STATUS_BADGE: Record<string, string> = {
  UNPAID:  "badge-red",
  PARTIAL: "badge-yellow",
  PAID:    "badge-green",
};

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function agingBucket(orderDate: string): { label: string; color: string; days: number } {
  const days = Math.floor((Date.now() - new Date(orderDate).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 30)  return { label: "0–30d",  color: "var(--green)",  days };
  if (days <= 60)  return { label: "31–60d", color: "var(--yellow)", days };
  if (days <= 90)  return { label: "61–90d", color: "#f97316",       days };
  return               { label: "90d+",   color: "var(--red)",    days };
}

export default function ReceivablesPage() {
  const [orders,     setOrders]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filterPay,  setFilterPay]  = useState("OUTSTANDING");
  const [filterRep,  setFilterRep]  = useState("");
  const [filterAging, setFilterAging] = useState("");
  const [payingId,   setPayingId]   = useState<string | null>(null);
  const [payAmt,     setPayAmt]     = useState("");
  const [payStatus,  setPayStatus]  = useState("PARTIAL");
  const [submitting, setSubmitting] = useState(false);
  const [msg,        setMsg]        = useState({ text: "", ok: false });

  const fetchOrders = () => {
    setLoading(true);
    fetch("/api/orders/list?status=APPROVED&limit=200", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setOrders(Array.isArray(d) ? d : (d?.orders ?? [])))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []);

  const reps = useMemo(() => {
    const seen = new Map<string, string>();
    for (const o of orders) if (o.createdBy?.id) seen.set(o.createdBy.id, o.createdBy.name);
    return [...seen.entries()];
  }, [orders]);

  const unpaidOrders = useMemo(() => orders.filter((o) => o.paymentStatus !== "PAID"), [orders]);

  const agingStats = useMemo(() => {
    const buckets = { "0–30d": 0, "31–60d": 0, "61–90d": 0, "90d+": 0 };
    for (const o of unpaidOrders) {
      const { label } = agingBucket(o.createdAt);
      buckets[label as keyof typeof buckets]++;
    }
    return buckets;
  }, [unpaidOrders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filterPay === "OUTSTANDING" && o.paymentStatus === "PAID") return false;
      if (filterPay === "PAID"        && o.paymentStatus !== "PAID") return false;
      if (filterRep && o.createdBy?.id !== filterRep) return false;
      if (filterAging && o.paymentStatus !== "PAID") {
        const { label } = agingBucket(o.createdAt);
        if (label !== filterAging) return false;
      }
      return true;
    });
  }, [orders, filterPay, filterRep, filterAging]);

  const stats = useMemo(() => {
    const totalNet        = orders.reduce((s, o) => s + o.netAmount, 0);
    const totalPaid       = orders.reduce((s, o) => s + (o.paidAmount ?? 0), 0);
    const totalOutstanding = totalNet - totalPaid;
    const unpaidCount     = orders.filter((o) => o.paymentStatus === "UNPAID").length;
    return { totalNet, totalPaid, totalOutstanding, unpaidCount };
  }, [orders]);

  const recordPayment = async (orderId: string) => {
    const amt = parseFloat(payAmt);
    if (isNaN(amt) || amt < 0) { setMsg({ text: "Enter a valid amount.", ok: false }); return; }
    setSubmitting(true); setMsg({ text: "", ok: false });
    const res = await fetch("/api/orders/update-status", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ orderId, paymentStatus: payStatus, paidAmount: amt }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ text: "Payment recorded.", ok: true });
      setPayingId(null); setPayAmt("");
      fetchOrders();
    } else {
      setMsg({ text: data.error || "Failed.", ok: false });
    }
    setSubmitting(false);
  };

  const AGING_BUCKETS = [
    { key: "0–30d",  label: "0–30 days",  color: "var(--green)"  },
    { key: "31–60d", label: "31–60 days", color: "var(--yellow)" },
    { key: "61–90d", label: "61–90 days", color: "#f97316"       },
    { key: "90d+",   label: "90+ days",   color: "var(--red)"    },
  ];

  return (
    <>
      <div className="page-header">
        <h1>Receivables</h1>
        <p>Track payment collection across all approved orders.</p>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-label">Total Billed</div>
          <div className="stat-value">{fmt(stats.totalNet)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Collected</div>
          <div className="stat-value" style={{ color: "var(--green)" }}>{fmt(stats.totalPaid)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Outstanding</div>
          <div className="stat-value" style={{ color: stats.totalOutstanding > 0 ? "var(--red)" : "var(--green)" }}>
            {fmt(stats.totalOutstanding)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Unpaid Orders</div>
          <div className="stat-value" style={{ color: stats.unpaidCount > 0 ? "var(--red)" : undefined }}>
            {stats.unpaidCount}
          </div>
        </div>
      </div>

      {/* Aging buckets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {AGING_BUCKETS.map(({ key, label, color }) => (
          <button key={key} onClick={() => setFilterAging(filterAging === key ? "" : key)}
            className="card"
            style={{
              textAlign: "left", cursor: "pointer", padding: "12px 16px",
              border: filterAging === key ? `2px solid ${color}` : "1px solid var(--border)",
              borderLeft: `4px solid ${color}`, transition: "all 0.15s",
            }}>
            <div style={{ fontSize: 18, fontWeight: 700, color }}>{agingStats[key as keyof typeof agingStats]}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{label} overdue</div>
          </button>
        ))}
      </div>

      {msg.text && (
        <div className={`alert ${msg.ok ? "alert-success" : "alert-error"}`} style={{ marginBottom: 16 }}>
          {msg.text}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { key: "OUTSTANDING", label: "Outstanding" },
            { key: "ALL",         label: "All" },
            { key: "PAID",        label: "Paid" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilterPay(key)} className="btn"
              style={{ fontSize: 12, background: filterPay === key ? "var(--accent)" : undefined, color: filterPay === key ? "#fff" : undefined }}>
              {label}
            </button>
          ))}
        </div>
        {filterAging && (
          <span style={{ fontSize: 12, padding: "3px 10px", background: "rgba(99,102,241,0.1)", borderRadius: 99, color: "var(--accent)" }}>
            Aging: {filterAging}
            <button onClick={() => setFilterAging("")} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 4, color: "var(--accent)" }}>×</button>
          </span>
        )}
        {reps.length > 1 && (
          <select className="input" style={{ width: "auto", fontSize: 13 }}
            value={filterRep} onChange={(e) => setFilterRep(e.target.value)}>
            <option value="">All reps</option>
            {reps.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          No orders match the current filters.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Rep</th>
                  <th>Order Date</th>
                  <th>Net Amount</th>
                  <th>Paid</th>
                  <th>Outstanding</th>
                  <th>Aging</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const outstanding = order.netAmount - (order.paidAmount ?? 0);
                  const isEditing   = payingId === order.id;
                  const aging       = order.paymentStatus !== "PAID" ? agingBucket(order.createdAt) : null;
                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 500 }}>{order.school?.name ?? "—"}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{order.createdBy?.name ?? "—"}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{fmtDate(order.createdAt)}</td>
                      <td>{fmt(order.netAmount)}</td>
                      <td style={{ color: "var(--green)" }}>{fmt(order.paidAmount ?? 0)}</td>
                      <td style={{ color: outstanding > 0 ? "var(--red)" : "var(--text-muted)", fontWeight: outstanding > 0 ? 600 : 400 }}>
                        {fmt(outstanding)}
                      </td>
                      <td>
                        {aging ? (
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: aging.color }}>
                            {aging.label}
                            <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 4 }}>({aging.days}d)</span>
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${PAY_STATUS_BADGE[order.paymentStatus] ?? "badge-gray"}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td>
                        {order.paymentStatus !== "PAID" && !isEditing && (
                          <button className="btn" style={{ fontSize: 12 }}
                            onClick={() => {
                              setPayingId(order.id);
                              setPayAmt(String(order.netAmount - (order.paidAmount ?? 0)));
                              setPayStatus("PAID");
                              setMsg({ text: "", ok: false });
                            }}>
                            Record
                          </button>
                        )}
                        {isEditing && (
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <input type="number" className="input" style={{ width: 100, fontSize: 13 }}
                              value={payAmt}
                              onChange={(e) => {
                                setPayAmt(e.target.value);
                                const amt = parseFloat(e.target.value);
                                setPayStatus(!isNaN(amt) && amt >= order.netAmount ? "PAID" : "PARTIAL");
                              }}
                              placeholder="Amount" min={0} />
                            <select className="input" style={{ width: "auto", fontSize: 12 }}
                              value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
                              <option value="PARTIAL">Partial</option>
                              <option value="PAID">Full</option>
                            </select>
                            <button className="btn btn-primary" style={{ fontSize: 12 }}
                              onClick={() => recordPayment(order.id)} disabled={submitting}>✓</button>
                            <button className="btn" style={{ fontSize: 12 }}
                              onClick={() => { setPayingId(null); setPayAmt(""); }}>✕</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
