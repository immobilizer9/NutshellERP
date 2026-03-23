"use client";

import { useEffect, useState, useMemo } from "react";
import Badge from "@/app/components/Badge";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function SalesTargetsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [target, setTarget]   = useState<any>(null);
  const [orders, setOrders]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const fetchAll = async () => {
    setLoading(true);
    const [tRes, oRes] = await Promise.all([
      fetch(`/api/targets?month=${month}&year=${year}`, { credentials: "include" }).then((r) => r.json()),
      fetch("/api/orders/list", { credentials: "include" }).then((r) => r.json()),
    ]);
    const targetsArr = Array.isArray(tRes) ? tRes : [];
    setTarget(targetsArr.length > 0 ? targetsArr[0] : null);
    setOrders(Array.isArray(oRes) ? oRes : []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [month, year]);

  // Orders in selected month (all statuses — for stats row)
  const allMonthOrders = useMemo(() =>
    orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    }), [orders, month, year]);

  // Approved orders in selected month — for achievement
  const approvedMonthOrders = useMemo(() =>
    allMonthOrders.filter((o) => o.status === "APPROVED"),
    [allMonthOrders]);

  const achievedRevenue = useMemo(() =>
    approvedMonthOrders.reduce((sum, o) => sum + (o.netAmount || 0), 0),
    [approvedMonthOrders]);

  const achievedOrders = approvedMonthOrders.length;

  const revPct = target?.revenueTarget > 0
    ? Math.min(100, Math.round((achievedRevenue / target.revenueTarget) * 100))
    : null;

  const ordPct = target?.ordersTarget > 0
    ? Math.min(100, Math.round((achievedOrders / target.ordersTarget) * 100))
    : null;

  const progressColor = (pct: number | null) => {
    if (pct === null) return "var(--accent)";
    if (pct >= 100) return "var(--green)";
    if (pct >= 75)  return "var(--accent)";
    return "var(--yellow)";
  };

  // Stats from ALL orders (not filtered by month)
  const totalOrders    = orders.length;
  const approvedOrders = orders.filter((o) => o.status === "APPROVED").length;
  const pendingOrders  = orders.filter((o) => o.status === "PENDING").length;
  const rejectedOrders = orders.filter((o) => o.status === "REJECTED").length;

  return (
    <>
      <div className="page-header">
        <h1>My Targets</h1>
        <p>Track your monthly performance</p>
      </div>

      {/* Period selector */}
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
      ) : !target ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 24px", color: "var(--text-muted)" }}>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No target set for this month</p>
          <p style={{ fontSize: 13 }}>Contact your BD Head to set a target for {MONTHS[month - 1]} {year}.</p>
        </div>
      ) : (
        <>
          {/* Hero cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            {/* Revenue */}
            <div className="card">
              <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Revenue
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: 4 }}>
                ₹{achievedRevenue.toLocaleString()}
                <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text-muted)" }}>
                  {" "}/ ₹{target.revenueTarget.toLocaleString()}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden", marginBottom: 6 }}>
                <div style={{
                  height: "100%", borderRadius: 4,
                  width: `${revPct ?? 0}%`,
                  background: progressColor(revPct),
                  transition: "width 0.4s",
                }} />
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {revPct ?? 0}% achieved
              </div>
            </div>

            {/* Orders */}
            <div className="card">
              <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Orders
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: 4 }}>
                {achievedOrders}
                <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text-muted)" }}>
                  {" "}/ {target.ordersTarget}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden", marginBottom: 6 }}>
                <div style={{
                  height: "100%", borderRadius: 4,
                  width: `${ordPct ?? 0}%`,
                  background: progressColor(ordPct),
                  transition: "width 0.4s",
                }} />
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {ordPct ?? 0}% achieved
              </div>
            </div>
          </div>

          {/* Stats row — all orders, all time */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Total Orders",    value: totalOrders,    color: "var(--text-primary)" },
              { label: "Approved",        value: approvedOrders, color: "var(--green)" },
              { label: "Pending",         value: pendingOrders,  color: "var(--yellow)" },
              { label: "Rejected",        value: rejectedOrders, color: "var(--red)" },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Orders this month table */}
          <div className="card">
            <h2 style={{ marginBottom: 14 }}>My Orders This Month</h2>
            {allMonthOrders.length === 0 ? (
              <div className="empty-state">
                <p>No orders this month</p>
                <p>Orders you create in {MONTHS[month - 1]} {year} will appear here</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>School</th>
                      <th>Net Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allMonthOrders.slice(0, 20).map((order) => (
                      <tr key={order.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => window.location.href = `/orders/${order.id}`}>
                        <td style={{ fontWeight: 500 }}>{order.school?.name ?? "—"}</td>
                        <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                          ₹{(order.netAmount || 0).toLocaleString()}
                        </td>
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
        </>
      )}
    </>
  );
}
