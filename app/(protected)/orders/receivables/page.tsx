"use client";

import { useEffect, useMemo, useState } from "react";

const PAY_STATUS_BADGE: Record<string, string> = {
  UNPAID:  "badge-red",
  PARTIAL: "badge-yellow",
  PAID:    "badge-green",
};

function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ReceivablesPage() {
  const [orders,     setOrders]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filterPay,  setFilterPay]  = useState("OUTSTANDING"); // OUTSTANDING | ALL | PAID
  const [filterRep,  setFilterRep]  = useState("");
  const [payingId,   setPayingId]   = useState<string | null>(null);
  const [payAmt,     setPayAmt]     = useState("");
  const [payStatus,  setPayStatus]  = useState("PARTIAL");
  const [submitting, setSubmitting] = useState(false);
  const [msg,        setMsg]        = useState({ text: "", ok: false });

  const fetchOrders = () => {
    setLoading(true);
    fetch("/api/orders/list", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setOrders(Array.isArray(d) ? d.filter((o: any) => o.status === "APPROVED") : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []);

  const reps = useMemo(() => {
    const seen = new Map<string, string>();
    for (const o of orders) {
      if (o.createdBy?.id) seen.set(o.createdBy.id, o.createdBy.name);
    }
    return [...seen.entries()];
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filterPay === "OUTSTANDING") {
        if (o.paymentStatus === "PAID") return false;
      } else if (filterPay === "PAID") {
        if (o.paymentStatus !== "PAID") return false;
      }
      if (filterRep && o.createdBy?.id !== filterRep) return false;
      return true;
    });
  }, [orders, filterPay, filterRep]);

  const stats = useMemo(() => {
    const approved = orders;
    const totalNet        = approved.reduce((s, o) => s + o.netAmount, 0);
    const totalPaid       = approved.reduce((s, o) => s + (o.paidAmount ?? 0), 0);
    const totalOutstanding = totalNet - totalPaid;
    const partial         = approved.filter((o) => o.paymentStatus === "PARTIAL").reduce((s, o) => s + (o.netAmount - (o.paidAmount ?? 0)), 0);
    const unpaidCount     = approved.filter((o) => o.paymentStatus === "UNPAID").length;
    return { totalNet, totalPaid, totalOutstanding, partial, unpaidCount };
  }, [orders]);

  const recordPayment = async (orderId: string) => {
    const amt = parseFloat(payAmt);
    if (isNaN(amt) || amt < 0) {
      setMsg({ text: "Enter a valid amount.", ok: false }); return;
    }
    setSubmitting(true); setMsg({ text: "", ok: false });
    const res = await fetch("/api/orders/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ orderId, paymentStatus: payStatus, paidAmount: amt }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ text: "Payment recorded.", ok: true });
      setPayingId(null); setPayAmt("");
      fetchOrders();
    } else {
      setMsg({ text: data.error || "Failed to record payment.", ok: false });
    }
    setSubmitting(false);
  };

  return (
    <>
      <div className="page-header">
        <h1>Receivables</h1>
        <p>Track payment collection across all approved orders.</p>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
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
              style={{ fontSize: 12, background: filterPay === key ? "var(--accent)" : undefined,
                color: filterPay === key ? "#fff" : undefined }}>
              {label}
            </button>
          ))}
        </div>

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
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          No orders found.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Rep</th>
                  <th>Date</th>
                  <th>Net Amount</th>
                  <th>Paid</th>
                  <th>Outstanding</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const outstanding = order.netAmount - (order.paidAmount ?? 0);
                  const isEditing = payingId === order.id;
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
                            Record Payment
                          </button>
                        )}
                        {isEditing && (
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <input
                              type="number"
                              className="input"
                              style={{ width: 110, fontSize: 13 }}
                              value={payAmt}
                              onChange={(e) => {
                                setPayAmt(e.target.value);
                                const amt = parseFloat(e.target.value);
                                if (!isNaN(amt) && amt >= order.netAmount) setPayStatus("PAID");
                                else setPayStatus("PARTIAL");
                              }}
                              placeholder="Amount"
                              min={0}
                            />
                            <select className="input" style={{ width: "auto", fontSize: 12 }}
                              value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
                              <option value="PARTIAL">Partial</option>
                              <option value="PAID">Paid in Full</option>
                            </select>
                            <button className="btn btn-primary" style={{ fontSize: 12 }}
                              onClick={() => recordPayment(order.id)} disabled={submitting}>
                              Save
                            </button>
                            <button className="btn" style={{ fontSize: 12 }}
                              onClick={() => { setPayingId(null); setPayAmt(""); }}>
                              ✕
                            </button>
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
