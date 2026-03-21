"use client";

import { useEffect, useState, useMemo } from "react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function BDTargetsPage() {
  const now = new Date();
  const [team, setTeam]         = useState<any[]>([]);
  const [targets, setTargets]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [month, setMonth]       = useState(now.getMonth() + 1);
  const [year, setYear]         = useState(now.getFullYear());
  const [form, setForm]         = useState({ userId: "", revenueTarget: "", ordersTarget: "" });
  const [msg, setMsg]           = useState({ text: "", ok: false });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [teamRes, targetsRes] = await Promise.all([
      fetch("/api/bd/team",    { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/targets?month=${month}&year=${year}`, { credentials: "include" }).then((r) => r.json()),
    ]);
    setTeam(Array.isArray(teamRes)    ? teamRes    : []);
    setTargets(Array.isArray(targetsRes) ? targetsRes : []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [month, year]);

  const targetMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const t of targets) m[t.userId] = t;
    return m;
  }, [targets]);

  const startEdit = (member: any) => {
    const existing = targetMap[member.id];
    setEditingId(member.id);
    setForm({
      userId:        member.id,
      revenueTarget: existing ? String(existing.revenueTarget) : "",
      ordersTarget:  existing ? String(existing.ordersTarget)  : "",
    });
    setMsg({ text: "", ok: false });
  };

  const submitTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg({ text: "", ok: false });
    try {
      const res = await fetch("/api/targets", {
        method:  "POST",
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

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <>
      <div className="page-header">
        <h1>Monthly Targets</h1>
        <p>Set revenue and order targets for your team members</p>
      </div>

      {/* Period selector */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 160 }}>
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 100 }}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {msg.text && (
        <div style={{ padding: "10px 14px", borderRadius: "var(--radius)", marginBottom: 16,
          background: msg.ok ? "var(--green-soft, #dcfce7)" : "var(--red-soft, #fee2e2)",
          color: msg.ok ? "var(--green, #16a34a)" : "var(--red, #dc2626)", fontSize: 13 }}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</p>
      ) : team.length === 0 ? (
        <div className="empty-state"><p>No team members found</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Team Member</th>
                <th>Revenue Target</th>
                <th>Orders Target</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => {
                const existing = targetMap[member.id];
                const isEditing = editingId === member.id;
                return (
                  <tr key={member.id}>
                    <td style={{ fontWeight: 500 }}>
                      {member.name}
                      <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)" }}>{member.email}</span>
                    </td>
                    {isEditing ? (
                      <>
                        <td>
                          <input
                            className="input"
                            type="number"
                            placeholder="₹ Revenue"
                            value={form.revenueTarget}
                            onChange={(e) => setForm((f) => ({ ...f, revenueTarget: e.target.value }))}
                            style={{ width: 140 }}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            placeholder="# Orders"
                            value={form.ordersTarget}
                            onChange={(e) => setForm((f) => ({ ...f, ordersTarget: e.target.value }))}
                            style={{ width: 100 }}
                          />
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn btn-primary" style={{ fontSize: 12 }}
                              onClick={submitTarget} disabled={submitting}>
                              {submitting ? "Saving..." : "Save"}
                            </button>
                            <button className="btn btn-ghost" style={{ fontSize: 12 }}
                              onClick={() => setEditingId(null)}>
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontFamily: "monospace" }}>
                          {existing ? `₹${existing.revenueTarget.toLocaleString()}` : <span style={{ color: "var(--text-muted)" }}>Not set</span>}
                        </td>
                        <td>
                          {existing ? existing.ordersTarget : <span style={{ color: "var(--text-muted)" }}>Not set</span>}
                        </td>
                        <td>
                          <button className="btn btn-ghost" style={{ fontSize: 12 }}
                            onClick={() => startEdit(member)}>
                            {existing ? "Edit" : "Set Target"}
                          </button>
                        </td>
                      </>
                    )}
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
