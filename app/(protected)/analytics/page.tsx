"use client";

import { useEffect, useState } from "react";

const PRODUCT_LABELS: Record<string, string> = {
  ANNUAL:               "Annual",
  PAPERBACKS_PLAINS:    "Paperbacks (Plains)",
  PAPERBACKS_HILLS:     "Paperbacks (Hills)",
  NUTSHELL_ANNUAL:      "Nutshell — Annual",
  NUTSHELL_PAPERBACKS:  "Nutshell — Paperbacks",
};

const STAGE_COLORS: Record<string, string> = {
  LEAD:          "#9ca3af",
  CONTACTED:     "#60a5fa",
  VISITED:       "#a78bfa",
  PROPOSAL_SENT: "#fbbf24",
  NEGOTIATION:   "#fb923c",
  CLOSED_WON:    "#34d399",
  CLOSED_LOST:   "#f87171",
};

// ── Bar chart ──────────────────────────────────────────────────────
function BarChart({ data }: { data: { label: string; revenue: number; orders: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160, padding: "0 4px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", whiteSpace: "nowrap" }}>
            {d.revenue > 0 ? `₹${(d.revenue / 1000).toFixed(0)}k` : ""}
          </div>
          <div
            title={`${d.label}: ₹${d.revenue.toLocaleString()} · ${d.orders} orders`}
            style={{
              width: "100%",
              height: `${Math.max(4, (d.revenue / max) * 120)}px`,
              background: d.revenue > 0 ? "var(--accent)" : "var(--border)",
              borderRadius: "4px 4px 0 0",
              transition: "height 0.5s ease",
              cursor: "pointer",
              opacity: 0.85,
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = "1"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = "0.85"; }}
          />
          <div style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "center", whiteSpace: "nowrap" }}>
            {d.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Donut chart ────────────────────────────────────────────────────
function DonutChart({ segments, centerLabel }: {
  segments: { label: string; value: number; color: string }[];
  centerLabel?: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <div className="empty-state"><p>No data yet</p></div>;

  let offset = 0;
  const r = 60, cx = 80, cy = 80;
  const circ = 2 * Math.PI * r;

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
      <svg width={160} height={160} viewBox="0 0 160 160" style={{ flexShrink: 0 }}>
        {segments.map((seg, i) => {
          const pct  = seg.value / total;
          const dash = pct * circ;
          const gap  = circ - dash;
          const rot  = offset * 360 - 90;
          offset += pct;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={seg.color} strokeWidth={28}
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${rot} ${cx} ${cy})`}
            />
          );
        })}
        <circle cx={cx} cy={cy} r={46} fill="var(--surface)" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={11} fill="var(--text-muted)" fontFamily="DM Sans">{centerLabel ?? "Total"}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={18} fontWeight={700} fill="var(--text-primary)" fontFamily="DM Sans">{total}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.map((seg) => (
          <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
            <span style={{ color: "var(--text-secondary)" }}>{seg.label}</span>
            <span style={{ fontWeight: 600, marginLeft: "auto", paddingLeft: 12 }}>{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Incentive tier helper ───────────────────────────────────────────
function calcIncentive(achieved: number, target: number): { pct: number; rate: number; label: string; color: string } {
  if (!target || target <= 0) return { pct: 0, rate: 0, label: "No target set", color: "var(--text-muted)" };
  const pct = Math.round((achieved / target) * 100);
  if (pct >= 100) return { pct, rate: 12, label: "Tier 4 — 12% incentive (100%+ achieved)", color: "var(--green)" };
  if (pct >= 75)  return { pct, rate: 8,  label: "Tier 3 — 8% incentive (75–100%)",         color: "var(--accent)" };
  if (pct >= 50)  return { pct, rate: 5,  label: "Tier 2 — 5% incentive (50–75%)",          color: "var(--yellow)" };
  return { pct, rate: 0, label: "Tier 1 — No incentive (below 50%)", color: "var(--red)" };
}

// ── Main ───────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [data, setData]         = useState<any>(null);
  const [role, setRole]         = useState<string>("");
  const [targets, setTargets]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    // Detect role first, then fetch appropriate analytics + targets
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((me) => {
        const roles: string[] = me?.user?.roles ?? [];
        const detectedRole =
          roles.includes("ADMIN")   ? "ADMIN"   :
          roles.includes("BD_HEAD") ? "BD_HEAD" : "SALES";
        setRole(detectedRole);

        const endpoint =
          detectedRole === "ADMIN"   ? "/api/admin/analytics"  :
          detectedRole === "BD_HEAD" ? "/api/bd/analytics"     :
          "/api/sales/analytics";

        return Promise.all([
          fetch(endpoint, { credentials: "include" }).then((r) => r.json()),
          fetch(`/api/targets?month=${month}&year=${year}`, { credentials: "include" }).then((r) => r.json()),
        ]);
      })
      .then(([d, t]) => {
        if (d.error) setError(d.error);
        else setData(d);
        setTargets(Array.isArray(t) ? t : []);
      })
      .catch(() => setError("Failed to load analytics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading...</p>;
  if (error)   return <div className="alert alert-error">{error}</div>;

  const isSales = role === "SALES";
  const isBD    = role === "BD_HEAD";
  const isAdmin = role === "ADMIN";

  // ── Build pipeline donut segments ──
  // All roles: SALES returns Record<string,number>, BD/Admin return [{stage,count}]
  const pipelineSegments = Array.isArray(data.pipelineBreakdown)
    ? (data.pipelineBreakdown ?? []).map((s: any) => ({
        label: s.stage.replaceAll("_", " "),
        value: s.count,
        color: STAGE_COLORS[s.stage] ?? "#9ca3af",
      }))
    : Object.entries(data.pipelineBreakdown ?? {}).map(([stage, count]: any) => ({
        label: stage.replaceAll("_", " "),
        value: count,
        color: STAGE_COLORS[stage] ?? "#9ca3af",
      }));

  const productSegments = Object.entries(data.productBreakdown ?? {}).map(([pt, v]: any) => ({
    label: PRODUCT_LABELS[pt] ?? pt,
    value: v.orders,
    color: pt === "ANNUAL" ? "var(--accent)" : pt === "PAPERBACKS_PLAINS" ? "#34d399" : "#fb923c",
  }));

  const pageTitle =
    isAdmin ? "Organisation Analytics" :
    isBD    ? "Team Analytics" :
    "My Performance";

  const pageSubtitle =
    isAdmin ? "Revenue, pipeline health, and sales breakdown across the organisation" :
    isBD    ? "Your team's orders, tasks, and field activity" :
    "Your personal orders, tasks, pipeline, and report history";

  return (
    <>
      <div className="page-header">
        <h1>{pageTitle}</h1>
        <p>{pageSubtitle}</p>
      </div>

      {/* ── Top Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        {isSales && <>
          <div className="stat-card">
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{data.totalOrders ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Approved Revenue</div>
            <div className="stat-value" style={{ color: "var(--green)" }}>₹{(data.totalRevenue ?? 0).toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Approval</div>
            <div className="stat-value" style={{ color: "var(--yellow)" }}>{data.pendingOrders ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Schools Assigned</div>
            <div className="stat-value">{data.totalSchools ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Conversion Rate</div>
            <div className="stat-value" style={{ color: "var(--accent)" }}>{data.conversionRate ?? 0}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Task Completion</div>
            <div className="stat-value" style={{ color: "var(--accent)" }}>{data.completionRate ?? 0}%</div>
          </div>
        </>}

        {isBD && <>
          <div className="stat-card">
            <div className="stat-label">Team Orders</div>
            <div className="stat-value">{data.totalOrders ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Revenue</div>
            <div className="stat-value" style={{ color: "var(--green)" }}>₹{(data.totalRevenue ?? 0).toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Approval</div>
            <div className="stat-value" style={{ color: "var(--yellow)" }}>{data.pendingOrders ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Task Completion</div>
            <div className="stat-value" style={{ color: "var(--accent)" }}>{data.completionRate ?? 0}%</div>
          </div>
        </>}

        {isAdmin && <>
          <div className="stat-card">
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{data.totalOrders ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value" style={{ color: "var(--green)" }}>₹{(data.totalRevenue ?? 0).toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Order Value</div>
            <div className="stat-value" style={{ color: "var(--accent)" }}>
              {data.totalOrders > 0 ? `₹${Math.round(data.totalRevenue / data.totalOrders).toLocaleString()}` : "—"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Schools</div>
            <div className="stat-value">{pipelineSegments.reduce((s: number, seg: any) => s + seg.value, 0)}</div>
          </div>
        </>}
      </div>

      {/* ── Monthly Revenue Chart ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 20 }}>Monthly Revenue — Last 12 Months</h2>
        {(data.monthlyRevenue ?? []).every((m: any) => m.revenue === 0) ? (
          <div className="empty-state">
            <p>No revenue data yet</p>
            <p>{isSales ? "Revenue appears here once your orders are approved" : "Appears here once orders are approved"}</p>
          </div>
        ) : (
          <BarChart data={data.monthlyRevenue ?? []} />
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* ── Pipeline / Stage breakdown ── */}
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>
            {isSales ? "My Pipeline Stages" : "Pipeline Stage Breakdown"}
          </h2>
          {pipelineSegments.length === 0 ? (
            <div className="empty-state"><p>No pipeline data</p></div>
          ) : (
            <DonutChart segments={pipelineSegments} centerLabel="Schools" />
          )}
        </div>

        {/* ── Product type breakdown ── */}
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Orders by Product Type</h2>
          {productSegments.length === 0 ? (
            <div className="empty-state"><p>No orders yet</p></div>
          ) : (
            <>
              <DonutChart segments={productSegments} centerLabel="Orders" />
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                {Object.entries(data.productBreakdown ?? {}).map(([pt, v]: any) => (
                  <div key={pt} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: "var(--text-secondary)" }}>{PRODUCT_LABELS[pt] ?? pt}</span>
                    <span style={{ fontWeight: 600 }}>₹{v.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* ── Top schools ── */}
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Top Schools by Revenue</h2>
          {!data.topSchools?.length ? (
            <div className="empty-state"><p>No revenue data yet</p></div>
          ) : (
            <div>
              {data.topSchools.map((school: any, i: number) => {
                const maxRev = data.topSchools[0].revenue;
                const pct    = (school.revenue / maxRev) * 100;
                return (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 13 }}>
                      <span style={{ fontWeight: 500 }}>{school.name}</span>
                      <span style={{ fontWeight: 600, fontFamily: "monospace" }}>₹{school.revenue.toLocaleString()}</span>
                    </div>
                    <div style={{ background: "var(--border)", borderRadius: 99, height: 4, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", borderRadius: 99, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Task summary ── */}
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Task Summary</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Total",     val: data.totalTasks     ?? 0, color: "var(--text-primary)" },
              { label: "Completed", val: data.completedTasks ?? 0, color: "var(--green)" },
              { label: "Pending",   val: data.pendingTasks   ?? 0, color: "var(--yellow)" },
              { label: "Overdue",   val: data.overdueTasks   ?? 0, color: (data.overdueTasks ?? 0) > 0 ? "var(--red)" : "var(--text-primary)" },
            ].map((s) => (
              <div key={s.label} style={{ background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "var(--border)", borderRadius: 99, height: 6, overflow: "hidden" }}>
            <div style={{ width: `${data.completionRate ?? 0}%`, height: "100%", background: "var(--accent)", borderRadius: 99, transition: "width 0.5s ease" }} />
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>{data.completionRate ?? 0}% completion rate</p>

          {/* Sales-specific: reports summary */}
          {isSales && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>Daily Reports</p>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1, background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>Submitted</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{data.totalReports ?? 0}</div>
                </div>
                <div style={{ flex: 1, background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>Approved</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--green)" }}>{data.approvedReports ?? 0}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Incentive Calculator ── */}
      {isSales && targets.length > 0 && (() => {
        const t = targets[0];
        const inc = calcIncentive(data.totalRevenue ?? 0, t.revenueTarget);
        const incentiveAmt = Math.round((data.totalRevenue ?? 0) * inc.rate / 100);
        return (
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ marginBottom: 14 }}>This Month's Incentive Estimate</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Achievement</div>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: inc.color }}>{inc.pct}%</div>
                <div style={{ fontSize: 12, color: inc.color, marginTop: 2 }}>{inc.label}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ height: 10, borderRadius: 5, background: "var(--border)", overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ height: "100%", width: `${Math.min(100, inc.pct)}%`, background: inc.color, borderRadius: 5, transition: "width 0.5s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)" }}>
                  <span>₹{(data.totalRevenue ?? 0).toLocaleString()} achieved</span>
                  <span>₹{t.revenueTarget.toLocaleString()} target</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Est. Incentive</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 700, color: inc.rate > 0 ? "var(--green)" : "var(--text-muted)" }}>
                  {inc.rate > 0 ? `₹${incentiveAmt.toLocaleString()}` : "—"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{inc.rate}% of approved revenue</div>
              </div>
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
              {[
                { label: "< 50%",   rate: "No incentive", color: "var(--red)"   },
                { label: "50–75%",  rate: "5%",           color: "var(--yellow)"},
                { label: "75–100%", rate: "8%",           color: "var(--accent)"},
                { label: "100%+",   rate: "12%",          color: "var(--green)" },
              ].map((tier) => (
                <div key={tier.label} style={{ flex: 1, background: "var(--bg)", borderRadius: "var(--radius)", padding: "8px 10px", textAlign: "center", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>{tier.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: tier.color }}>{tier.rate}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* BD: show team incentive summary */}
      {isBD && targets.length > 0 && data.salesActivityStatus?.length > 0 && (() => {
        // Match targets to team members using monthly revenue from salesActivityStatus
        // BD analytics returns salesActivityStatus but not individual revenues,
        // so we show each rep's target status if targets exist
        const repTargets = targets.filter((t) => t.userId);
        if (repTargets.length === 0) return null;
        return (
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ marginBottom: 14 }}>Team Incentive Tracker (This Month)</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {repTargets.map((t: any) => {
                const member = data.salesActivityStatus?.find((m: any) => m.userId === t.userId);
                const achieved = member?.monthRevenue ?? 0;
                const inc = calcIncentive(achieved, t.revenueTarget);
                const incentiveAmt = Math.round(achieved * inc.rate / 100);
                return (
                  <div key={t.userId} style={{ background: "var(--bg)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", padding: "12px 14px" }}>
                    <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13.5 }}>{t.user?.name ?? "—"}</div>
                    <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ height: "100%", width: `${Math.min(100, inc.pct)}%`, background: inc.color, borderRadius: 3, transition: "width 0.5s" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: inc.color }}>{inc.pct}% · {inc.rate}%</span>
                      <span style={{ fontWeight: 600 }}>{inc.rate > 0 ? `₹${incentiveAmt.toLocaleString()}` : "—"}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                      ₹{achieved.toLocaleString()} / ₹{t.revenueTarget.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── BD: Team activity / Admin: Top schools ── */}
      {!isSales && (
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>
            {isAdmin ? "Top Schools by Revenue" : "Team Activity Status"}
          </h2>
          {isAdmin ? (
            !data.topSchools?.length ? (
              <div className="empty-state"><p>No revenue data yet</p></div>
            ) : (
              <div>
                {data.topSchools.map((school: any, i: number) => {
                  const maxRev = data.topSchools[0].revenue;
                  const pct    = (school.revenue / maxRev) * 100;
                  return (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 13 }}>
                        <span style={{ fontWeight: 500 }}>{school.name}</span>
                        <span style={{ fontWeight: 600, fontFamily: "monospace" }}>₹{school.revenue.toLocaleString()}</span>
                      </div>
                      <div style={{ background: "var(--border)", borderRadius: 99, height: 4, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", borderRadius: 99, transition: "width 0.5s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            !data.salesActivityStatus?.length ? (
              <div className="empty-state"><p>No team members</p></div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                {data.salesActivityStatus.map((m: any) => (
                  <div key={m.userId} style={{ background: "var(--bg)", borderRadius: "var(--radius-lg)", border: `1px solid ${m.isInactive ? "var(--red-border)" : "var(--border)"}`, padding: "12px 14px" }}>
                    <p style={{ fontWeight: 600, margin: "0 0 3px", fontSize: 13.5 }}>{m.name}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "0 0 8px" }}>
                      {m.lastActivity ? `Last active ${new Date(m.lastActivity).toLocaleDateString()}` : "No activity"}
                    </p>
                    <span className={`badge ${m.isInactive ? "badge-red" : "badge-green"}`}>
                      {m.isInactive ? "Inactive" : "Active"}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </>
  );
}
