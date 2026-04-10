"use client";

import { useEffect, useMemo, useState } from "react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function pct(achieved: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.round((achieved / target) * 100));
}

export default function TargetsPage() {
  const now = new Date();
  const [modules, setModules]   = useState<string[]>([]);
  const [team, setTeam]         = useState<any[]>([]);
  const [targets, setTargets]   = useState<any[]>([]);
  const [orders, setOrders]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [month, setMonth]       = useState(now.getMonth() + 1);
  const [year, setYear]         = useState(now.getFullYear());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState({ userId: "", revenueTarget: "", ordersTarget: "" });
  const [msg, setMsg]             = useState({ text: "", ok: false });
  const [submitting, setSubmitting] = useState(false);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d?.user?.modules) setModules(d.user.modules); });
  }, []);

  const isManager = modules.includes("TEAM_MANAGEMENT");

  const fetchAll = async () => {
    setLoading(true);
    const proms: Promise<any>[] = [
      fetch(`/api/targets?month=${month}&year=${year}`, { credentials: "include" }).then((r) => r.json()),
      fetch("/api/orders/list?limit=200", { credentials: "include" }).then((r) => r.json()),
    ];
    if (isManager) {
      proms.push(fetch("/api/bd/team", { credentials: "include" }).then((r) => r.json()));
    }
    const results = await Promise.all(proms);
    setTargets(Array.isArray(results[0]) ? results[0] : []);
    setOrders(Array.isArray(results[1]) ? results[1] : (results[1]?.orders ?? []));
    if (isManager && results[2]) setTeam(Array.isArray(results[2]) ? results[2] : []);
    setLoading(false);
  };

  useEffect(() => {
    if (modules.length > 0) fetchAll();
  }, [modules, month, year]);

  const targetMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const t of targets) m[t.userId] = t;
    return m;
  }, [targets]);

  const monthOrders = useMemo(() =>
    orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getMonth() + 1 === month && d.getFullYear() === year && o.status === "APPROVED";
    }), [orders, month, year]);

  const submitTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setMsg({ text: "", ok: false });
    try {
      const res = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, month, year }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg({ text: "Target saved!", ok: true });
      setEditingId(null);
      await fetchAll();
    } catch (err: any) {
      setMsg({ text: err.message, ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && modules.length === 0) {
    return <div className="page-header"><h1>Targets</h1></div>;
  }

  // ─── BD / Admin view: manage team targets ───────────────────────
  if (isManager) {
    return (
      <>
        <div className="page-header">
          <h1>Monthly Targets</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <select className="input" style={{ width: "auto" }} value={month} onChange={(e) => setMonth(+e.target.value)}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select className="input" style={{ width: "auto" }} value={year} onChange={(e) => setYear(+e.target.value)}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {msg.text && (
          <div className={`alert ${msg.ok ? "alert-success" : "alert-error"}`} style={{ marginBottom: 16 }}>
            {msg.text}
          </div>
        )}

        {loading ? (
          <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rep</th>
                  <th>Revenue Target</th>
                  <th>Orders Target</th>
                  <th>Achieved Revenue</th>
                  <th>Achieved Orders</th>
                  <th>Progress</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {team.map((member) => {
                  const t = targetMap[member.id];
                  const memberOrders = monthOrders.filter((o) => o.createdById === member.id);
                  const achieved = memberOrders.reduce((s: number, o: any) => s + o.netAmount, 0);
                  const achievedOrders = memberOrders.length;
                  const revPct = pct(achieved, t?.revenueTarget ?? 0);

                  if (editingId === member.id) {
                    return (
                      <tr key={member.id}>
                        <td colSpan={7}>
                          <form onSubmit={submitTarget} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0" }}>
                            <span style={{ fontWeight: 500, minWidth: 120 }}>{member.name}</span>
                            <input className="input" placeholder="Revenue target" type="number" value={form.revenueTarget}
                              onChange={(e) => setForm((f) => ({ ...f, revenueTarget: e.target.value }))} style={{ width: 140 }} />
                            <input className="input" placeholder="Orders target" type="number" value={form.ordersTarget}
                              onChange={(e) => setForm((f) => ({ ...f, ordersTarget: e.target.value }))} style={{ width: 120 }} />
                            <button type="submit" className="btn btn-primary" disabled={submitting}>Save</button>
                            <button type="button" className="btn" onClick={() => setEditingId(null)}>Cancel</button>
                          </form>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={member.id}>
                      <td style={{ fontWeight: 500 }}>{member.name}</td>
                      <td>₹{(t?.revenueTarget ?? 0).toLocaleString("en-IN")}</td>
                      <td>{t?.ordersTarget ?? "—"}</td>
                      <td>₹{achieved.toLocaleString("en-IN")}</td>
                      <td>{achievedOrders}</td>
                      <td style={{ minWidth: 100 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 4,
                              width: `${revPct}%`,
                              background: revPct >= 100 ? "var(--green)" : revPct >= 75 ? "var(--yellow)" : "var(--red)",
                            }} />
                          </div>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 30 }}>{revPct}%</span>
                        </div>
                      </td>
                      <td>
                        <button className="btn" onClick={() => {
                          setEditingId(member.id);
                          setForm({ userId: member.id, revenueTarget: t?.revenueTarget ?? "", ordersTarget: t?.ordersTarget ?? "" });
                          setMsg({ text: "", ok: false });
                        }}>
                          {t ? "Edit" : "Set"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  // ─── Sales view: own targets ─────────────────────────────────────
  const myTarget = targets[0] ?? null;
  const myRevenue = monthOrders.reduce((s, o) => s + (o.netAmount || 0), 0);
  const myOrderCount = monthOrders.length;
  const revPct  = pct(myRevenue, myTarget?.revenueTarget ?? 0);
  const ordPct  = pct(myOrderCount, myTarget?.ordersTarget ?? 0);

  return (
    <>
      <div className="page-header">
        <h1>My Targets</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <select className="input" style={{ width: "auto" }} value={month} onChange={(e) => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="input" style={{ width: "auto" }} value={year} onChange={(e) => setYear(+e.target.value)}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
      ) : myTarget ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Revenue */}
          <div className="card">
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Revenue Target</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>₹{myRevenue.toLocaleString("en-IN")}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>of ₹{myTarget.revenueTarget.toLocaleString("en-IN")}</div>
            <div style={{ marginTop: 12, height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 4, width: `${revPct}%`,
                background: revPct >= 100 ? "var(--green)" : revPct >= 75 ? "var(--yellow)" : "var(--red)",
              }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600,
              color: revPct >= 100 ? "var(--green)" : revPct >= 75 ? "var(--yellow)" : "var(--red)" }}>
              {revPct}% achieved
            </div>
          </div>

          {/* Orders */}
          <div className="card">
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Orders Target</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{myOrderCount}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>of {myTarget.ordersTarget} orders</div>
            <div style={{ marginTop: 12, height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 4, width: `${ordPct}%`,
                background: ordPct >= 100 ? "var(--green)" : ordPct >= 75 ? "var(--yellow)" : "var(--red)",
              }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600,
              color: ordPct >= 100 ? "var(--green)" : ordPct >= 75 ? "var(--yellow)" : "var(--red)" }}>
              {ordPct}% achieved
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          No target set for {MONTHS[month - 1]} {year}. Contact your manager.
        </div>
      )}
    </>
  );
}
