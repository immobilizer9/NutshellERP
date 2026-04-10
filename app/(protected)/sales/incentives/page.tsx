"use client";

import { useEffect, useState, useMemo } from "react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface MonthSummary {
  month: number;
  year: number;
  target: any;
  achievedRevenue: number;
  incentiveEarned: number;
}

export default function SalesIncentivesPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [target, setTarget]   = useState<any>(null);
  const [orders, setOrders]   = useState<any[]>([]);
  const [history, setHistory] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const fetchAll = async () => {
    setLoading(true);

    // Fetch current month target + all orders
    const [tRes, oRes] = await Promise.all([
      fetch(`/api/targets?month=${month}&year=${year}`, { credentials: "include" }).then((r) => r.json()),
      fetch("/api/orders/list?limit=200", { credentials: "include" }).then((r) => r.json()),
    ]);

    const targetsArr = Array.isArray(tRes) ? tRes : [];
    const currentTarget = targetsArr.length > 0 ? targetsArr[0] : null;
    const allOrders     = Array.isArray(oRes) ? oRes : (oRes?.orders ?? []);

    setTarget(currentTarget);
    setOrders(allOrders);

    // Fetch targets for this month + 2 prior months
    const periods: { month: number; year: number }[] = [];
    for (let i = 0; i < 3; i++) {
      let m = month - i;
      let y = year;
      if (m <= 0) { m += 12; y -= 1; }
      periods.push({ month: m, year: y });
    }

    const historicalTargets = await Promise.all(
      periods.map(({ month: m, year: y }) =>
        fetch(`/api/targets?month=${m}&year=${y}`, { credentials: "include" })
          .then((r) => r.json())
          .then((d) => (Array.isArray(d) && d.length > 0 ? d[0] : null))
      )
    );

    const summaries: MonthSummary[] = periods.map(({ month: m, year: y }, i) => {
      const t = historicalTargets[i];
      const rev = allOrders
        .filter((o: any) => {
          const d = new Date(o.createdAt);
          return o.status === "APPROVED" && d.getMonth() + 1 === m && d.getFullYear() === y;
        })
        .reduce((sum: any, o: any) => sum + (o.netAmount || 0), 0);
      const incentive = rev * ((t?.incentivePercent ?? 0) / 100);
      return { month: m, year: y, target: t, achievedRevenue: rev, incentiveEarned: incentive };
    });

    setHistory(summaries);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [month, year]);

  const achievedRevenue = useMemo(() =>
    orders
      .filter((o) => {
        const d = new Date(o.createdAt);
        return o.status === "APPROVED" && d.getMonth() + 1 === month && d.getFullYear() === year;
      })
      .reduce((sum, o) => sum + (o.netAmount || 0), 0),
    [orders, month, year]);

  const incentiveEarned = achievedRevenue * ((target?.incentivePercent ?? 0) / 100);
  const hasIncentive    = target && (target.incentivePercent ?? 0) > 0;

  return (
    <>
      <div className="page-header">
        <h1>My Incentives</h1>
        <p>Track your incentive earnings</p>
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
        <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
      ) : !hasIncentive ? (
        /* Info box — no incentive */
        <div style={{
          padding: "18px 20px", borderRadius: "var(--radius-lg)",
          background: "color-mix(in srgb, var(--accent) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
          color: "var(--text-secondary)", fontSize: 13.5, marginBottom: 20,
        }}>
          <strong style={{ color: "var(--accent)", display: "block", marginBottom: 4, fontSize: 14 }}>
            No incentive target set for this month
          </strong>
          Contact your BD Head to set your incentive rate for {MONTHS[month - 1]} {year}.
        </div>
      ) : (
        <>
          {/* Hero card */}
          <div className="card" style={{ marginBottom: 16, textAlign: "center", padding: "28px 24px" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Incentive Earned — {MONTHS[month - 1]} {year}
            </div>
            <div style={{ fontSize: "2.6rem", fontWeight: 800, color: "var(--accent)", marginBottom: 16 }}>
              ₹{incentiveEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div style={{
              display: "inline-grid", gridTemplateColumns: "auto auto auto", gap: "8px 24px",
              background: "var(--bg)", borderRadius: "var(--radius)", padding: "12px 20px",
              border: "1px solid var(--border)", fontSize: 13, textAlign: "left",
            }}>
              <span style={{ color: "var(--text-muted)" }}>Achieved Revenue</span>
              <span style={{ color: "var(--text-muted)" }}>Incentive Rate</span>
              <span style={{ color: "var(--text-muted)" }}>Calculated</span>
              <span style={{ fontWeight: 600 }}>₹{achievedRevenue.toLocaleString()}</span>
              <span style={{ fontWeight: 600 }}>{target.incentivePercent}%</span>
              <span style={{ fontWeight: 600, color: "var(--accent)" }}>
                ₹{incentiveEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </>
      )}

      {/* How it works */}
      {target && (target.incentivePercent ?? 0) > 0 && (
        <div style={{
          padding: "14px 16px", borderRadius: "var(--radius)",
          background: "var(--surface)", border: "1px solid var(--border-soft)",
          fontSize: 13, color: "var(--text-secondary)", marginBottom: 24,
        }}>
          <strong style={{ color: "var(--text-primary)" }}>How it works: </strong>
          You earn {target.incentivePercent}% of your achieved monthly revenue as incentive pay,
          in addition to your salary.
        </div>
      )}

      {/* Last 3 months summary */}
      <div className="card">
        <h2 style={{ marginBottom: 14 }}>Last 3 Months Summary</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Month / Year</th>
                <th>Revenue Achieved</th>
                <th>Incentive Rate</th>
                <th>Incentive Earned</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={`${row.month}-${row.year}`}>
                  <td style={{ fontWeight: 500 }}>{MONTHS[row.month - 1]} {row.year}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                    ₹{row.achievedRevenue.toLocaleString()}
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>
                    {row.target ? `${row.target.incentivePercent ?? 0}%` : <span style={{ color: "var(--text-muted)" }}>—</span>}
                  </td>
                  <td style={{ fontWeight: 600, color: row.incentiveEarned > 0 ? "var(--accent)" : "var(--text-muted)" }}>
                    {row.target
                      ? `₹${row.incentiveEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
