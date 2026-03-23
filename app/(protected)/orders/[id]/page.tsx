"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Badge from "@/app/components/Badge";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  ANNUAL:               "Annual",
  PAPERBACKS_PLAINS:    "Paperbacks — Plains",
  PAPERBACKS_HILLS:     "Paperbacks — Hills",
  NUTSHELL_ANNUAL:      "Nutshell — Annual",
  NUTSHELL_PAPERBACKS:  "Nutshell — Paperbacks",
};

export default function OrderDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [me, setMe]           = useState<any>(null);

  // Returns form state
  const [returnForm, setReturnForm]           = useState<{ itemId: string; quantity: string; reason: string } | null>(null);
  const [returnMsg, setReturnMsg]             = useState({ text: "", ok: false });
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Edit order state
  const [editOpen, setEditOpen]     = useState(false);
  const [editItems, setEditItems]   = useState<any[]>([]);
  const [editMsg, setEditMsg]       = useState({ text: "", ok: false });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Payment / delivery state
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrder = () =>
    fetch(`/api/orders/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (data.error) setError(data.error); else setOrder(data); })
      .catch(() => setError("Failed to load order."))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (id) fetchOrder();
    fetch("/api/auth/me", { credentials: "include" }).then((r) => r.json()).then((d) => setMe(d?.user));
  }, [id]);

  const updateOrderStatus = async (patch: Record<string, any>) => {
    setUpdatingStatus(true);
    await fetch("/api/orders/update-status", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ orderId: id, ...patch }),
    });
    await fetchOrder();
    setUpdatingStatus(false);
  };

  const submitReturn = async () => {
    if (!returnForm) return;
    const qty = parseInt(returnForm.quantity);
    if (!qty || qty <= 0) { setReturnMsg({ text: "Enter a valid quantity.", ok: false }); return; }
    setSubmittingReturn(true);
    setReturnMsg({ text: "", ok: false });
    const res  = await fetch("/api/orders/return", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ orderId: id, itemId: returnForm.itemId, quantity: qty, reason: returnForm.reason || undefined }),
    });
    const data = await res.json();
    if (data.success) {
      setReturnMsg({ text: `Return logged. New net: ₹${data.newNetAmount.toLocaleString()}`, ok: true });
      setReturnForm(null);
      fetchOrder();
    } else {
      setReturnMsg({ text: data.error || "Failed to log return.", ok: false });
    }
    setSubmittingReturn(false);
  };

  const openEdit = () => {
    setEditItems(order.items?.map((i: any) => ({ ...i })) ?? []);
    setEditMsg({ text: "", ok: false });
    setEditOpen(true);
  };

  const submitEdit = async () => {
    setSubmittingEdit(true);
    setEditMsg({ text: "", ok: false });
    const res = await fetch(`/api/orders/${id}/edit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ items: editItems.map((i) => ({ id: i.id, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })) }),
    });
    const data = await res.json();
    if (data.error) {
      setEditMsg({ text: data.error, ok: false });
    } else {
      setEditMsg({ text: "Order updated.", ok: true });
      setEditOpen(false);
      fetchOrder();
    }
    setSubmittingEdit(false);
  };

  if (loading) return <div style={{ color: "var(--text-muted)", padding: "40px 0" }}>Loading...</div>;
  if (error)   return <div className="alert alert-error">{error}</div>;

  const totalReturned = order.grossAmount - order.netAmount;
  const discount = order.items?.reduce((s: number, i: any) => s + (i.mrp - i.unitPrice) * i.quantity, 0) ?? 0;

  return (
    <>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>{order.school?.name}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "4px 0 0", fontFamily: "monospace" }}>{order.id}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Badge status={order.type} />
          <Badge status={order.productType} />
          <Badge status={order.status} />
          {order.status === "PENDING" && me?.id === order.createdById && (
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={openEdit}>
              Edit Order
            </button>
          )}
          {order.pdfUrl && (
            <a href={order.pdfUrl} target="_blank" rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ fontSize: 12.5, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 14, height: 14 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v3"/>
              </svg>
              Download PDF
            </a>
          )}
        </div>
      </div>

      {/* ── Rejection Reason Banner ── */}
      {order.status === "REJECTED" && order.rejectionReason && (
        <div style={{
          background: "var(--red-bg, #fff5f5)", border: "1px solid var(--red-border, #fca5a5)",
          borderRadius: "var(--radius-lg)", padding: "12px 16px", marginBottom: 20,
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <span style={{ color: "var(--red)", fontSize: 18, lineHeight: 1 }}>✕</span>
          <div>
            <p style={{ fontWeight: 600, color: "var(--red)", margin: "0 0 3px", fontSize: 13.5 }}>Order Rejected</p>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: 13 }}>{order.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>

        {/* ── LEFT COLUMN — main content ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Order Items */}
          <div className="card">
            <h2 style={{ marginBottom: 14 }}>Order Items</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th style={{ textAlign: "center" }}>Qty</th>
                    <th style={{ textAlign: "right" }}>MRP</th>
                    <th style={{ textAlign: "right" }}>Agreed</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.className}</td>
                      <td style={{ textAlign: "center" }}>{item.quantity}</td>
                      <td style={{ fontFamily: "monospace", color: "var(--text-muted)", textAlign: "right" }}>₹{item.mrp}</td>
                      <td style={{ fontFamily: "monospace", textAlign: "right" }}>
                        ₹{item.unitPrice}
                        {item.unitPrice < item.mrp && (
                          <span style={{ fontSize: 11, color: "var(--green)", marginLeft: 5 }}>
                            −₹{(item.mrp - item.unitPrice) * item.quantity} saved
                          </span>
                        )}
                      </td>
                      <td style={{ fontFamily: "monospace", fontWeight: 600, textAlign: "right" }}>₹{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--border)" }}>
                    <td colSpan={4} style={{ padding: "10px 16px", fontWeight: 600, textAlign: "right", color: "var(--text-secondary)" }}>
                      Gross Total
                    </td>
                    <td style={{ padding: "10px 16px", fontWeight: 700, fontFamily: "monospace", textAlign: "right", color: "var(--accent)", fontSize: "1rem" }}>
                      ₹{order.grossAmount.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Returns */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ margin: 0 }}>Returns</h2>
              {order.status === "APPROVED" && !returnForm && (
                <button className="btn btn-secondary" style={{ fontSize: 12 }}
                  onClick={() => { setReturnForm({ itemId: order.items?.[0]?.id ?? "", quantity: "", reason: "" }); setReturnMsg({ text: "", ok: false }); }}>
                  + Log Return
                </button>
              )}
            </div>

            {order.returns?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {order.returns.map((ret: any, i: number) => (
                  <div key={ret.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < order.returns.length - 1 ? "1px solid var(--border-soft)" : "none" }}>
                    <div>
                      <p style={{ fontWeight: 500, margin: 0 }}>{ret.item?.className}</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "2px 0 0" }}>
                        Qty: {ret.quantity}{ret.reason && ` · "${ret.reason}"`}
                      </p>
                    </div>
                    <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--red)" }}>
                      − ₹{ret.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              !returnForm && <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>No returns logged.</p>
            )}

            {/* Log Return Form */}
            {returnForm && (
              <div style={{ marginTop: order.returns?.length ? 14 : 0, paddingTop: order.returns?.length ? 14 : 0, borderTop: order.returns?.length ? "1px solid var(--border)" : "none" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>New Return</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
                  <div>
                    <label className="form-label">Item (Class)</label>
                    <select className="input" value={returnForm.itemId} onChange={(e) => setReturnForm({ ...returnForm, itemId: e.target.value })}>
                      {order.items?.map((item: any) => {
                        const returned = order.returns?.filter((r: any) => r.itemId === item.id).reduce((s: number, r: any) => s + r.quantity, 0) ?? 0;
                        const remaining = item.quantity - returned;
                        return (
                          <option key={item.id} value={item.id} disabled={remaining <= 0}>
                            {item.className} (max {remaining})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Quantity</label>
                    <input className="input" type="number" min={1} placeholder="Qty"
                      value={returnForm.quantity} onChange={(e) => setReturnForm({ ...returnForm, quantity: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Reason</label>
                    <input className="input" placeholder="Optional" value={returnForm.reason}
                      onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })} />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-primary" disabled={submittingReturn} onClick={submitReturn} style={{ fontSize: 12 }}>
                      {submittingReturn ? "..." : "Submit"}
                    </button>
                    <button className="btn btn-ghost" onClick={() => { setReturnForm(null); setReturnMsg({ text: "", ok: false }); }} style={{ fontSize: 12 }}>
                      Cancel
                    </button>
                  </div>
                </div>
                {returnMsg.text && (
                  <div className={`alert ${returnMsg.ok ? "alert-success" : "alert-error"}`} style={{ marginTop: 10 }}>
                    {returnMsg.text}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Points of Contact */}
          {order.pocs?.length > 0 && (
            <div className="card">
              <h2 style={{ marginBottom: 14 }}>Points of Contact</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {order.pocs.map((poc: any) => (
                  <div key={poc.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "12px 14px" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 7px" }}>
                      {poc.role}
                    </p>
                    {poc.name  && <p style={{ fontWeight: 500, margin: "0 0 2px", fontSize: 13.5 }}>{poc.name}</p>}
                    {poc.phone && <p style={{ color: "var(--text-muted)", fontSize: 12.5, margin: "0 0 2px" }}>📞 {poc.phone}</p>}
                    {poc.email && <p style={{ color: "var(--text-muted)", fontSize: 12.5, margin: 0 }}>✉ {poc.email}</p>}
                    {!poc.name && !poc.phone && !poc.email && (
                      <p style={{ color: "var(--text-muted)", fontSize: 12.5, fontStyle: "italic", margin: 0 }}>No contact info</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN — sticky info panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 28 }}>

          {/* Financial Summary */}
          <div className="card">
            <h2 style={{ marginBottom: 14 }}>Summary</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              {/* Net amount hero */}
              <div style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)", borderRadius: "var(--radius-lg)", padding: "14px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Net Amount</p>
                <p style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent)", margin: 0, letterSpacing: "-0.03em" }}>
                  ₹{order.netAmount.toLocaleString()}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Gross</span>
                  <span style={{ fontFamily: "monospace" }}>₹{order.grossAmount.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Discount</span>
                    <span style={{ fontFamily: "monospace", color: "var(--green)" }}>−₹{discount.toLocaleString()}</span>
                  </div>
                )}
                {totalReturned > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Returns</span>
                    <span style={{ fontFamily: "monospace", color: "var(--red)" }}>−₹{totalReturned.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Books ordered</span>
                  <span style={{ fontWeight: 600 }}>
                    {order.items?.reduce((s: number, i: any) => s + i.quantity, 0)} copies
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Classes</span>
                  <span style={{ fontWeight: 600 }}>{order.items?.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="card">
            <h2 style={{ marginBottom: 12 }}>Order Info</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Product",      value: PRODUCT_TYPE_LABELS[order.productType] ?? order.productType },
                { label: "Type",         value: order.type },
                { label: "Status",       value: <Badge status={order.status} /> },
                { label: "Created by",   value: order.createdBy?.name },
                { label: "Order date",   value: order.orderDate    ? new Date(order.orderDate).toLocaleDateString()    : "—" },
                { label: "Delivery due", value: order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : "—" },
                { label: "Created at",   value: new Date(order.createdAt).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ fontWeight: 500, textAlign: "right", maxWidth: 160 }}>{value as any}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Status */}
          {me?.roles?.includes("BD_HEAD") || me?.roles?.includes("ADMIN") ? (
            <div className="card">
              <h2 style={{ marginBottom: 12 }}>Payment</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label className="form-label">Status</label>
                  <select className="input" value={order.paymentStatus ?? "UNPAID"} disabled={updatingStatus}
                    onChange={(e) => updateOrderStatus({ paymentStatus: e.target.value })}>
                    <option value="UNPAID">Unpaid</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>
                {order.paymentStatus === "PARTIAL" && (
                  <div>
                    <label className="form-label">Amount Paid (₹)</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input className="input" type="number" defaultValue={order.paidAmount ?? 0}
                        onBlur={(e) => updateOrderStatus({ paidAmount: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>
                )}
                {order.paymentStatus === "PAID" && (
                  <p style={{ fontSize: 12, color: "var(--green)", margin: 0 }}>Fully paid · ₹{order.netAmount.toLocaleString()}</p>
                )}
                {order.paymentStatus === "PARTIAL" && order.paidAmount > 0 && (
                  <p style={{ fontSize: 12, color: "var(--yellow)", margin: 0 }}>
                    Paid ₹{order.paidAmount.toLocaleString()} · Balance ₹{(order.netAmount - order.paidAmount).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <h2 style={{ marginBottom: 12 }}>Payment</h2>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)" }}>Status</span>
                <Badge status={order.paymentStatus ?? "UNPAID"} />
              </div>
              {order.paymentStatus === "PARTIAL" && order.paidAmount > 0 && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "8px 0 0" }}>
                  Paid ₹{order.paidAmount.toLocaleString()} / ₹{order.netAmount.toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Delivery Status */}
          {me?.roles?.includes("BD_HEAD") || me?.roles?.includes("ADMIN") ? (
            <div className="card">
              <h2 style={{ marginBottom: 12 }}>Delivery</h2>
              <div>
                <label className="form-label">Status</label>
                <select className="input" value={order.deliveryStatus ?? "PENDING"} disabled={updatingStatus}
                  onChange={(e) => updateOrderStatus({ deliveryStatus: e.target.value })}>
                  <option value="PENDING">Pending</option>
                  <option value="DISPATCHED">Dispatched</option>
                  <option value="DELIVERED">Delivered</option>
                </select>
              </div>
              {order.deliveredAt && (
                <p style={{ fontSize: 12, color: "var(--green)", margin: "8px 0 0" }}>
                  Delivered on {new Date(order.deliveredAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <div className="card">
              <h2 style={{ marginBottom: 12 }}>Delivery</h2>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)" }}>Status</span>
                <Badge status={order.deliveryStatus ?? "PENDING"} />
              </div>
              {order.deliveredAt && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "8px 0 0" }}>
                  Delivered {new Date(order.deliveredAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* School Contact */}
          {(order.schoolPhone || order.schoolEmail || order.address1) && (
            <div className="card">
              <h2 style={{ marginBottom: 12 }}>School Contact</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13 }}>
                {order.address1 && (
                  <p style={{ margin: 0, color: "var(--text-secondary)" }}>
                    {order.address1}{order.address2 ? `, ${order.address2}` : ""}{order.pincode ? ` — ${order.pincode}` : ""}
                  </p>
                )}
                {order.schoolPhone && <p style={{ margin: 0 }}>📞 {order.schoolPhone}</p>}
                {order.schoolEmail && <p style={{ margin: 0 }}>✉ {order.schoolEmail}</p>}
              </div>
            </div>
          )}

          {/* Vendor */}
          {order.vendorName && (
            <div className="card">
              <h2 style={{ marginBottom: 12 }}>Vendor</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13 }}>
                <p style={{ fontWeight: 600, margin: "0 0 4px" }}>{order.vendorName}</p>
                {order.vendorPhone   && <p style={{ margin: 0 }}>📞 {order.vendorPhone}</p>}
                {order.vendorEmail   && <p style={{ margin: 0 }}>✉ {order.vendorEmail}</p>}
                {order.vendorAddress && <p style={{ margin: 0, color: "var(--text-secondary)" }}>{order.vendorAddress}</p>}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Edit Order Modal ── */}
      {editOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditOpen(false); }}>
          <div className="fade-in" style={{ background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 48px rgba(0,0,0,0.18)" }}>
            <h2 style={{ marginBottom: 6 }}>Edit Order</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 18 }}>Update quantities or agreed prices before approval.</p>

            <div className="table-wrap" style={{ marginBottom: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th style={{ textAlign: "center" }}>Qty</th>
                    <th style={{ textAlign: "right" }}>Agreed Price (₹)</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {editItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.className}</td>
                      <td style={{ textAlign: "center" }}>
                        <input type="number" min={0} className="input" style={{ width: 70, textAlign: "center", padding: "4px 8px" }}
                          value={item.quantity}
                          onChange={(e) => setEditItems((prev) => prev.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <input type="number" min={0} step="0.01" className="input" style={{ width: 100, textAlign: "right", padding: "4px 8px" }}
                          value={item.unitPrice}
                          onChange={(e) => setEditItems((prev) => prev.map((x, i) => i === idx ? { ...x, unitPrice: e.target.value } : x))} />
                      </td>
                      <td style={{ fontFamily: "monospace", textAlign: "right", fontWeight: 600 }}>
                        ₹{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--border)" }}>
                    <td colSpan={3} style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)" }}>New Gross</td>
                    <td style={{ padding: "10px 16px", fontFamily: "monospace", fontWeight: 700, textAlign: "right", color: "var(--accent)" }}>
                      ₹{editItems.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {editMsg.text && (
              <div className={`alert ${editMsg.ok ? "alert-success" : "alert-error"}`} style={{ marginBottom: 12 }}>
                {editMsg.text}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={submittingEdit} onClick={submitEdit}>
                {submittingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
