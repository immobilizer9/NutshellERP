"use client";

import { useEffect, useState } from "react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function IncentivesPage() {
  const now = new Date();
  const [month, setMonth]     = useState(now.getMonth() + 1);
  const [year, setYear]       = useState(now.getFullYear());
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline incentive % editing
  const [editingUserId, setEditingUserId]   = useState<string | null>(null);
  const [editingValue, setEditingValue]     = useState("");
  const [saving, setSaving]                 = useState(false);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const fetchData = async () => {
    setLoading(true);
    const res  = await fetch(`/api/bd/incentives?month=${month}&year=${year}`, { credentials: "include" });
    const json = await res.json();
    setData(Array.isArray(json) ? json : []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [month, year]);

  const saveIncentive = async (userId: string) => {
    setSaving(true);
    await fetch("/api/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId, month, year, incentivePercent: parseFloat(editingValue) || 0 }),
    });
    setEditingUserId(null);
    setEditingValue("");
    setSaving(false);
    fetchData();
  };

  const totalIncentive = data.reduce((sum, m) => sum + (m.incentiveEarned ?? 0), 0);

  return (
    <>
      <div className="page-header">
        <h1>Incentives</h1>
        <p>Track and configure team incentive earnings</p>
      </div>

      {/* ── Month/Year selector ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
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

      {/* ── Info box ── */}
      <div style={{
        background: "var(--accent-soft, #eef2ff)",
        border: "1px solid var(--accent-border, #c7d2fe)",
        borderRadius: "var(--radius-lg)",
        padding: "10px 16px",
        marginBottom: 20,
      }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--accent)" }}>
          Incentive = Achieved Revenue × Incentive Rate %
        </p>
      </div>

      {/* ── Table ── */}
      <div className="card">
        {loading ? (
          <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
        ) : data.length === 0 ? (
          <div className="empty-state">
            <p>No team members found</p>
            <p>Incentive data will appear once targets are set for the selected period</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th style={{ textAlign: "right" }}>Revenue Target (₹)</th>
                  <th style={{ textAlign: "right" }}>Achieved (₹)</th>
                  <th>Achievement %</th>
                  <th style={{ textAlign: "center" }}>Incentive %</th>
                  <th style={{ textAlign: "right" }}>Incentive Earned (₹)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((member) => {
                  const pct = member.achievementPct ?? 0;
                  const barColor = pct >= 100 ? "var(--green)" : pct >= 75 ? "var(--accent)" : "var(--yellow)";
                  return (
                    <tr key={member.userId}>
                      <td style={{ fontWeight: 500 }}>{member.name}</td>
                      <td style={{ fontFamily: "monospace", textAlign: "right", color: "var(--text-muted)" }}>
                        ₹{(member.revenueTarget ?? 0).toLocaleString()}
                      </td>
                      <td style={{ fontFamily: "monospace", fontWeight: 600, textAlign: "right" }}>
                        ₹{(member.achievedRevenue ?? 0).toLocaleString()}
                      </td>
                      <td style={{ minWidth: 130 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                            <div style={{
                              height: "100%",
                              borderRadius: 3,
                              width: `${Math.min(100, pct)}%`,
                              background: barColor,
                              transition: "width 0.35s ease",
                            }} />
                          </div>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {Math.round(pct)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {editingUserId === member.userId ? (
                          <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "center" }}>
                            <input
                              className="input"
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              value={editingValue}
                              style={{ width: 70, padding: "4px 6px", textAlign: "center" }}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")  saveIncentive(member.userId);
                                if (e.key === "Escape") { setEditingUserId(null); setEditingValue(""); }
                              }}
                              onBlur={() => saveIncentive(member.userId)}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontFamily: "monospace" }}>
                              {member.incentivePercent ?? 0}%
                            </span>
                            <button
                              title="Edit incentive %"
                              onClick={() => {
                                setEditingUserId(member.userId);
                                setEditingValue(String(member.incentivePercent ?? 0));
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 13,
                                color: "var(--text-muted)",
                                padding: 0,
                                lineHeight: 1,
                              }}
                            >
                              ✎
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ fontFamily: "monospace", fontWeight: 700, textAlign: "right", color: "var(--green)" }}>
                        ₹{(member.incentiveEarned ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--border)" }}>
                  <td
                    colSpan={5}
                    style={{ padding: "10px 16px", fontWeight: 600, textAlign: "right", color: "var(--text-secondary)" }}
                  >
                    Total Incentives
                  </td>
                  <td style={{ padding: "10px 16px", fontFamily: "monospace", fontWeight: 800, textAlign: "right", color: "var(--green)", fontSize: "1rem" }}>
                    ₹{totalIncentive.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
