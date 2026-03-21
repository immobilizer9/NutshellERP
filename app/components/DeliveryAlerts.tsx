"use client";

import { useEffect, useState } from "react";
import Badge from "./Badge";

const PRODUCT_LABELS: Record<string, string> = {
  ANNUAL:              "Annual",
  PAPERBACKS_PLAINS:   "Plains",
  PAPERBACKS_HILLS:    "Hills",
  NUTSHELL_ANNUAL:     "Nutshell Annual",
  NUTSHELL_PAPERBACKS: "Nutshell PB",
};

interface DeliveryAlert {
  id:             string;
  school:         { id: string; name: string };
  createdBy:      { id: string; name: string } | null;
  netAmount:      number;
  productType:    string;
  deliveryDate:   string;
  deliveryStatus: string;
  paymentStatus:  string;
  daysLeft:       number;
  isOverdue:      boolean;
}

export default function DeliveryAlerts({ horizonDays = 7 }: { horizonDays?: number }) {
  const [alerts, setAlerts] = useState<DeliveryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/delivery-alerts?days=${horizonDays}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setAlerts(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  }, [horizonDays]);

  if (loading) return null;
  if (alerts.length === 0) return null;

  const shown = expanded ? alerts : alerts.slice(0, 5);
  const overdueCount = alerts.filter((a) => a.isOverdue).length;

  return (
    <div className="card" style={{ marginBottom: 16, border: `1px solid ${overdueCount > 0 ? "var(--red, #dc2626)" : "var(--yellow, #f59e0b)"}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, color: overdueCount > 0 ? "var(--red, #dc2626)" : "var(--yellow, #f59e0b)" }}>
            {overdueCount > 0 ? "🔴" : "⚠"} Delivery Alerts ({alerts.length})
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            {overdueCount > 0 && `${overdueCount} overdue · `}
            Orders due within {horizonDays} days, not yet delivered
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {shown.map((alert) => (
          <a key={alert.id} href={`/orders/${alert.id}`}
            style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "var(--bg)", borderRadius: "var(--radius)",
              border: `1px solid ${alert.isOverdue ? "var(--red-border, #fca5a5)" : "var(--border)"}`,
              padding: "8px 12px", cursor: "pointer",
              transition: "border-color 0.15s",
            }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{alert.school?.name}</span>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                  {PRODUCT_LABELS[alert.productType] ?? alert.productType}
                  {alert.createdBy && ` · ${alert.createdBy.name}`}
                  {" · "}₹{alert.netAmount.toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: alert.isOverdue ? "var(--red, #dc2626)" : alert.daysLeft <= 2 ? "var(--yellow, #f59e0b)" : "var(--text-muted)" }}>
                  {alert.isOverdue
                    ? `${Math.abs(alert.daysLeft)}d overdue`
                    : alert.daysLeft === 0
                    ? "Due today"
                    : `${alert.daysLeft}d left`}
                </span>
                <Badge status={alert.deliveryStatus} />
              </div>
            </div>
          </a>
        ))}
      </div>

      {alerts.length > 5 && (
        <button className="btn btn-ghost" style={{ marginTop: 10, fontSize: 12, width: "100%" }}
          onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Show less" : `Show all ${alerts.length} alerts`}
        </button>
      )}
    </div>
  );
}
