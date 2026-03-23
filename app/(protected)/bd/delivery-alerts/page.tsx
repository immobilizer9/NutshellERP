"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Badge from "@/app/components/Badge";

export default function BdDeliveryAlertsPage() {
  const [alerts,  setAlerts]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/delivery-alerts", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setAlerts(Array.isArray(d) ? d : d.alerts ?? []);
        setLoading(false);
      });
  }, []);

  const overdue  = alerts.filter((a) => a.isOverdue);
  const upcoming = alerts.filter((a) => !a.isOverdue);

  return (
    <>
      <div className="page-header">
        <h1>Delivery Alerts</h1>
        <p>Team orders approaching or past their delivery date</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Overdue</div>
          <div className="stat-value" style={{ color: "var(--red)" }}>{overdue.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Due Soon</div>
          <div className="stat-value" style={{ color: "var(--yellow)" }}>{upcoming.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Alerts</div>
          <div className="stat-value">{alerts.length}</div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</p>
      ) : alerts.length === 0 ? (
        <div className="empty-state">
          <p>No delivery alerts</p>
          <p>All team orders are on track</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Sales Rep</th>
                  <th>Order</th>
                  <th>Net Amount</th>
                  <th>Delivery Date</th>
                  <th>Status</th>
                  <th>Days Left</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a: any) => (
                  <tr key={a.orderId ?? a.id} style={{ cursor: "pointer" }}
                    onClick={() => { window.location.href = `/orders/${a.orderId ?? a.id}`; }}>
                    <td style={{ fontWeight: 500 }}>
                      {a.school?.name ?? a.schoolName ?? "—"}
                      {(a.school?.city ?? a.city) && (
                        <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", fontWeight: 400 }}>
                          {a.school?.city ?? a.city}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                      {a.salesRep?.name ?? a.createdBy?.name ?? "—"}
                    </td>
                    <td>
                      <Link href={`/orders/${a.orderId ?? a.id}`}
                        style={{ color: "var(--accent)", fontFamily: "monospace", fontSize: 12.5 }}
                        onClick={(e) => e.stopPropagation()}>
                        {(a.orderId ?? a.id)?.slice(0, 8)}…
                      </Link>
                    </td>
                    <td style={{ fontFamily: "monospace" }}>₹{(a.netAmount ?? 0).toLocaleString()}</td>
                    <td style={{ fontSize: 12.5 }}>
                      {a.deliveryDate ? new Date(a.deliveryDate).toLocaleDateString() : "—"}
                    </td>
                    <td><Badge status={a.deliveryStatus ?? "PENDING"} /></td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: a.isOverdue ? "var(--red)" : a.daysLeft <= 3 ? "var(--yellow)" : "var(--green)",
                      }}>
                        {a.isOverdue ? `${Math.abs(a.daysLeft)}d overdue` : `${a.daysLeft}d left`}
                      </span>
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
