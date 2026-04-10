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

export default function BDOrdersPage() {
  const [orders, setOrders]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<any>(null);
  const [acting, setActing]       = useState(false);

  // Filters & sort
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [search, setSearch]             = useState("");
  const [sortField, setSortField]       = useState("date");
  const [sortDir, setSortDir]           = useState<"asc"|"desc">("desc");

  // Bulk selection
  const [checked, setChecked] = useState<string[]>([]);

  // Reject reason modal
  const [rejectTarget, setRejectTarget] = useState<string | null>(null); // orderId or "bulk"
  const [rejectReason, setRejectReason] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    const res  = await fetch("/api/orders/list?limit=200", { credentials: "include" });
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : (data?.orders ?? []));
    setChecked([]);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const approve = async (orderIds: string[]) => {
    setActing(true);
    await Promise.all(orderIds.map((orderId) =>
      fetch("/api/bd/approve-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ orderId }),
      })
    ));
    setSelected(null); setChecked([]);
    setActing(false);
    fetchOrders();
  };

  const reject = async (orderIds: string[], reason: string) => {
    setActing(true);
    await Promise.all(orderIds.map((orderId) =>
      fetch("/api/bd/reject-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ orderId, reason }),
      })
    ));
    setSelected(null); setChecked([]); setRejectTarget(null); setRejectReason("");
    setActing(false);
    fetchOrders();
  };

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let r = [...orders];
    if (statusFilter !== "ALL") r = r.filter((o) => o.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((o) =>
        o.school?.name?.toLowerCase().includes(q) ||
        o.createdBy?.name?.toLowerCase().includes(q)
      );
    }
    r.sort((a, b) => {
      let va: any, vb: any;
      if (sortField === "amount") { va = a.netAmount;    vb = b.netAmount; }
      else                        { va = new Date(a.createdAt); vb = new Date(b.createdAt); }
      return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return r;
  }, [orders, statusFilter, search, sortField, sortDir]);

  const pending   = orders.filter((o) => o.status === "PENDING");
  const approved  = orders.filter((o) => o.status === "APPROVED");
  const rejected  = orders.filter((o) => o.status === "REJECTED");

  const allPendingChecked = checked.length > 0 && checked.every((id) =>
    orders.find((o) => o.id === id)?.status === "PENDING"
  );

  const SortIcon = ({ field }: { field: string }) => (
    <span style={{ marginLeft: 4, opacity: sortField === field ? 1 : 0.3, fontSize: 10 }}>
      {sortField === field ? (sortDir === "asc" ? "▲" : "▼") : "▼"}
    </span>
  );

  return (
    <>
      <div className="page-header">
        <h1>Orders</h1>
        <p>Review and approve orders from your team</p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Pending",  value: pending.length,  color: "var(--yellow)", filter: "PENDING"  },
          { label: "Approved", value: approved.length, color: "var(--green)",  filter: "APPROVED" },
          { label: "Rejected", value: rejected.length, color: "var(--red)",    filter: "REJECTED" },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ cursor: "pointer", outline: statusFilter === s.filter ? "2px solid var(--accent)" : "none" }}
            onClick={() => setStatusFilter(s.filter)}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Controls ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <input className="input" placeholder="Search school or rep..." value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 140 }}>
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* ── Bulk actions bar ── */}
      {checked.length > 0 && (
        <div style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: "var(--radius-lg)", padding: "10px 16px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>{checked.length} selected</span>
          <div style={{ display: "flex", gap: 8 }}>
            {allPendingChecked && (
              <>
                <button className="btn btn-success" disabled={acting} style={{ fontSize: 12 }}
                  onClick={() => approve(checked)}>
                  {acting ? "..." : `Approve ${checked.length}`}
                </button>
                <button className="btn btn-danger" disabled={acting} style={{ fontSize: 12 }}
                  onClick={() => { setRejectTarget("bulk"); setRejectReason(""); }}>
                  Reject {checked.length}
                </button>
              </>
            )}
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setChecked([])}>Clear</button>
          </div>
        </div>
      )}

      {/* ── Orders Table ── */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>
            {statusFilter === "ALL" ? "All Orders" : `${statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()} Orders`}
            <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>({filtered.length})</span>
          </h2>
        </div>
        {loading ? (
          <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>No orders match your filters</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" style={{ accentColor: "var(--accent)" }}
                      checked={checked.length === filtered.filter((o) => o.status === "PENDING").length && filtered.some((o) => o.status === "PENDING")}
                      onChange={(e) => setChecked(e.target.checked ? filtered.filter((o) => o.status === "PENDING").map((o) => o.id) : [])} />
                  </th>
                  <th>School</th>
                  <th>Sales Rep</th>
                  <th>Product</th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("amount")}>
                    Net <SortIcon field="amount" />
                  </th>
                  <th>Approval</th>
                  <th>Payment</th>
                  <th>Delivery</th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("date")}>
                    Date <SortIcon field="date" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id} style={{ cursor: "pointer" }} onClick={() => setSelected(order)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      {order.status === "PENDING" && (
                        <input type="checkbox" style={{ accentColor: "var(--accent)" }}
                          checked={checked.includes(order.id)}
                          onChange={(e) => setChecked((p) => e.target.checked ? [...p, order.id] : p.filter((x) => x !== order.id))} />
                      )}
                    </td>
                    <td style={{ fontWeight: 500 }}>{order.school?.name ?? "—"}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{order.createdBy?.name ?? "—"}</td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{PRODUCT_LABELS[order.productType] ?? order.productType}</td>
                    <td style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 13 }}>₹{order.netAmount.toLocaleString()}</td>
                    <td><Badge status={order.status} /></td>
                    <td><Badge status={order.paymentStatus ?? "UNPAID"} /></td>
                    <td><Badge status={order.deliveryStatus ?? "PENDING"} /></td>
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

      {/* ── Order Detail Modal ── */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="fade-in" style={{ background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 24px 48px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0 }}>{selected.school?.name ?? "Order"}</h2>
                <p style={{ color: "var(--text-muted)", fontSize: 12.5, margin: "3px 0 0" }}>
                  {new Date(selected.createdAt).toLocaleString()}
                </p>
              </div>
              <Badge status={selected.status} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Sales Rep",    value: selected.createdBy?.name },
                { label: "Product",      value: PRODUCT_LABELS[selected.productType] ?? selected.productType },
                { label: "Order Type",   value: selected.type },
                { label: "Gross",        value: `₹${selected.grossAmount?.toLocaleString()}` },
                { label: "Net",          value: `₹${selected.netAmount?.toLocaleString()}` },
                { label: "Order Date",   value: selected.orderDate ? new Date(selected.orderDate).toLocaleDateString() : "—" },
                { label: "Delivery Due", value: selected.deliveryDate ? new Date(selected.deliveryDate).toLocaleDateString() : "—" },
                { label: "Payment",      value: <Badge status={selected.paymentStatus ?? "UNPAID"} /> },
              ].map((row) => (
                <div key={row.label} style={{ background: "var(--bg)", borderRadius: "var(--radius)", padding: "10px 12px" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 3px" }}>{row.label}</p>
                  <p style={{ fontWeight: 600, margin: 0 }}>{row.value as any}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <a href={`/orders/${selected.id}`} className="btn btn-ghost" style={{ fontSize: 12, textDecoration: "none" }}>
                View Full →
              </a>
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              {selected.status === "PENDING" && (
                <>
                  <button className="btn btn-success" disabled={acting} onClick={() => approve([selected.id])}>
                    {acting ? "..." : "Approve"}
                  </button>
                  <button className="btn btn-danger" disabled={acting}
                    onClick={() => { setRejectTarget(selected.id); setRejectReason(""); }}>
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Reason Modal ── */}
      {rejectTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setRejectTarget(null); }}>
          <div className="fade-in" style={{ background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 24px 48px rgba(0,0,0,0.22)" }}>
            <h2 style={{ marginBottom: 6 }}>Reject Order{rejectTarget === "bulk" ? `s (${checked.length})` : ""}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>Optionally provide a reason for rejection.</p>
            <textarea className="input" rows={3} placeholder="Reason (optional)..."
              value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              style={{ resize: "vertical", marginBottom: 14 }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setRejectTarget(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={acting}
                onClick={() => reject(rejectTarget === "bulk" ? checked : [rejectTarget], rejectReason)}>
                {acting ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
