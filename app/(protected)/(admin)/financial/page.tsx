"use client";

import { useEffect, useState } from "react";
import Badge from "@/app/components/Badge";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function FinancialPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [data, setData]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const fetchData = async () => {
    setLoading(true);
    const res    = await fetch(`/api/admin/financial?month=${month}&year=${year}`, { credentials: "include" });
    const result = await res.json();
    setData(result.error ? null : result);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [month, year]);

  const orders = data?.orders ?? [];

  return (
    <>
      <div className="page-header">
        <h1>Financial Overview</h1>
        <p>Payments, deliveries, and outstanding dues</p>
      </div>

      {/* ── Period selector ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <select
          className="input"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          style={{ width: 160 }}
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          className="input"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          style={{ width: 100 }}
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</p>
      ) : !data ? (
        <div className="empty-state">
          <p>No financial data available</p>
          <p>No approved orders found for the selected period</p>
        </div>
      ) : (
        <>
          {/* ── Row 1: Revenue stats ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 14 }}>
            <div className="stat-card">
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value" style={{ fontFamily: "monospace" }}>
                ₹{(data.totalRevenue ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Collected</div>
              <div className="stat-value" style={{ fontFamily: "monospace", color: "var(--green)" }}>
                ₹{(data.collected ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Outstanding</div>
              <div
                className="stat-value"
                style={{
                  fontFamily: "monospace",
                  color: (data.outstanding ?? 0) > 0 ? "var(--red)" : undefined,
                }}
              >
                ₹{(data.outstanding ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Returns</div>
              <div className="stat-value" style={{ fontFamily: "monospace", color: "var(--red)" }}>
                ₹{(data.totalReturns ?? 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* ── Row 2: Payment status counts ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 14 }}>
            <div className="stat-card">
              <div className="stat-label">Paid Orders</div>
              <div className="stat-value" style={{ color: "var(--green)" }}>
                {data.paidCount ?? 0}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Partial</div>
              <div className="stat-value" style={{ color: "var(--yellow)" }}>
                {data.partialCount ?? 0}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Unpaid</div>
              <div className="stat-value" style={{ color: "var(--red)" }}>
                {data.unpaidCount ?? 0}
              </div>
            </div>
          </div>

          {/* ── Row 3: Delivery status counts ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-label">Delivered</div>
              <div className="stat-value" style={{ color: "var(--green)" }}>
                {data.deliveredCount ?? 0}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Dispatched</div>
              <div className="stat-value" style={{ color: "#3b82f6" }}>
                {data.dispatchedCount ?? 0}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending Delivery</div>
              <div className="stat-value" style={{ color: "var(--yellow)" }}>
                {data.pendingDeliveryCount ?? 0}
              </div>
            </div>
          </div>

          {/* ── Recent Approved Orders ── */}
          <div className="card">
            <h2 style={{ marginBottom: 16 }}>Recent Approved Orders</h2>
            {orders.length === 0 ? (
              <div className="empty-state">
                <p>No approved orders this period</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>School</th>
                      <th>Net Amount</th>
                      <th>Paid Amount</th>
                      <th>Payment</th>
                      <th>Delivery</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order: any) => (
                      <tr
                        key={order.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => { window.location.href = `/orders/${order.id}`; }}
                      >
                        <td style={{ fontWeight: 500 }}>{order.school?.name ?? "—"}</td>
                        <td style={{ fontFamily: "monospace", fontWeight: 600 }}>
                          ₹{(order.netAmount ?? 0).toLocaleString()}
                        </td>
                        <td style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>
                          ₹{(order.paidAmount ?? 0).toLocaleString()}
                        </td>
                        <td>
                          <Badge status={order.paymentStatus ?? "UNPAID"} />
                        </td>
                        <td>
                          <Badge status={order.deliveryStatus ?? "PENDING"} />
                        </td>
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
        </>
      )}
    </>
  );
}
