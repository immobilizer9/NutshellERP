"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Badge from "@/app/components/Badge";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  ANNUAL:            "Annual",
  PAPERBACKS_PLAINS: "Paperbacks — Plains",
  PAPERBACKS_HILLS:  "Paperbacks — Hills",
};

export default function OrderDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [order, setOrder]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/orders/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (data.error) setError(data.error); else setOrder(data); })
      .catch(() => setError("Failed to load order."))
      .finally(() => setLoading(false));
  }, [id]);

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
          {order.returns?.length > 0 && (
            <div className="card">
              <h2 style={{ marginBottom: 14 }}>Returns</h2>
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
            </div>
          )}

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
                { label: "Delivery",     value: order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : "—" },
                { label: "Created at",   value: new Date(order.createdAt).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ fontWeight: 500, textAlign: "right", maxWidth: 160 }}>{value as any}</span>
                </div>
              ))}
            </div>
          </div>

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
    </>
  );
}
