"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Badge from "@/app/components/Badge";

const PRODUCT_LABELS: Record<string, string> = {
  ANNUAL:              "Annual",
  PAPERBACKS_PLAINS:   "Plains",
  PAPERBACKS_HILLS:    "Hills",
  NUTSHELL_ANNUAL:     "Nutshell Annual",
  NUTSHELL_PAPERBACKS: "Nutshell PB",
};

const STAGE_LABELS: Record<string, string> = {
  LEAD:          "Lead",
  CONTACTED:     "Contacted",
  VISITED:       "Visited",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION:   "Negotiation",
  CLOSED_WON:    "Closed — Won",
  CLOSED_LOST:   "Closed — Lost",
};

const OUTCOME_LABELS: Record<string, string> = {
  INTERESTED:     "Interested",
  FOLLOW_UP:      "Follow Up",
  NOT_INTERESTED: "Not Interested",
  ORDER_PLACED:   "Order Placed",
};

type Tab = "overview" | "orders" | "timeline" | "contacts" | "competitors";

export default function SchoolProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [school,  setSchool]  = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [tab,     setTab]     = useState<Tab>("overview");

  // Competitor form
  const [compForm,   setCompForm]   = useState({ competitor: "", notes: "" });
  const [compSaving, setCompSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/schools/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setSchool(d);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load school."); setLoading(false); });
  }, [id]);

  const saveCompetitor = async () => {
    if (!compForm.competitor.trim()) return;
    setCompSaving(true);
    await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ schoolId: id, ...compForm }),
    });
    // Refresh
    const res  = await fetch(`/api/schools/${id}`, { credentials: "include" });
    const data = await res.json();
    if (!data.error) setSchool(data);
    setCompForm({ competitor: "", notes: "" });
    setCompSaving(false);
  };

  const deleteCompetitor = async (noteId: string) => {
    if (!confirm("Delete this competitor note?")) return;
    await fetch(`/api/competitors?id=${noteId}`, { method: "DELETE", credentials: "include" });
    const res  = await fetch(`/api/schools/${id}`, { credentials: "include" });
    const data = await res.json();
    if (!data.error) setSchool(data);
  };

  if (loading) return (
    <div className="page">
      <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading school profile…</div>
    </div>
  );

  if (error || !school) return (
    <div className="page">
      <div className="alert alert-error">{error || "School not found."}</div>
    </div>
  );

  // ── Computed stats ──
  const approvedOrders  = school.orders.filter((o: any) => o.status === "APPROVED");
  const totalRevenue    = approvedOrders.reduce((s: number, o: any) => s + o.netAmount, 0);
  const totalReturns    = approvedOrders.reduce((s: number, o: any) =>
    s + o.returns.reduce((rs: number, r: any) => rs + r.amount, 0), 0);
  const outstanding     = approvedOrders.reduce((s: number, o: any) =>
    s + (o.netAmount - o.paidAmount), 0);

  // Last activity across all activity types
  const allActivityDates = [
    ...school.visits.map((v: any) => new Date(v.createdAt).getTime()),
    ...school.activities.map((a: any) => new Date(a.scheduledDate).getTime()),
    ...school.quizSessions.map((q: any) => q.completedDate ? new Date(q.completedDate).getTime() : new Date(q.scheduledDate).getTime()),
    ...school.trainingSessions.map((t: any) => t.completedDate ? new Date(t.completedDate).getTime() : new Date(t.scheduledDate).getTime()),
  ];
  const lastActivityTs  = allActivityDates.length ? Math.max(...allActivityDates) : null;
  const daysSinceContact = lastActivityTs
    ? Math.floor((Date.now() - lastActivityTs) / (1000 * 60 * 60 * 24))
    : null;

  // Unified timeline — merge visits, events, activities, quiz/training sessions
  const timeline: any[] = [
    ...school.visits.map((v: any) => ({
      date: new Date(v.createdAt), type: "Visit",
      label: v.outcome ? (OUTCOME_LABELS[v.outcome] ?? v.outcome) : "Visit",
      badge: "badge-blue", who: v.salesUser?.name, notes: v.notes,
    })),
    ...school.events.map((e: any) => ({
      date: new Date(e.date), type: e.type,
      label: e.type === "QUIZ" ? "Quiz" : e.type === "TEACHER_TRAINING" ? "Teacher Training" : "Meeting",
      badge: "badge-purple", who: e.createdBy?.name, notes: e.notes,
    })),
    ...school.activities.map((a: any) => ({
      date: new Date(a.scheduledDate), type: a.type,
      label: `${a.type} — ${a.status}`,
      badge: a.status === "COMPLETED" ? "badge-green" : a.status === "CANCELLED" ? "badge-red" : "badge-yellow",
      who: a.user?.name, notes: a.notes,
    })),
    ...school.quizSessions.map((q: any) => ({
      date: new Date(q.scheduledDate), type: "Quiz Session",
      label: q.title,
      badge: q.status === "COMPLETED" ? "badge-green" : q.status === "CANCELLED" ? "badge-red" : "badge-blue",
      who: q.conductedBy?.name,
      notes: q.overallNotes || (q.participatingStudents ? `${q.participatingStudents} students` : null),
    })),
    ...school.trainingSessions.map((t: any) => ({
      date: new Date(t.scheduledDate), type: "Training",
      label: t.title,
      badge: t.status === "COMPLETED" ? "badge-green" : t.status === "CANCELLED" ? "badge-red" : "badge-yellow",
      who: t.conductedBy?.name,
      notes: t.teachersAttended ? `${t.teachersAttended} teachers attended` : t.overallNotes,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // All POCs from all orders (deduplicated by phone)
  const allPocs: any[] = [];
  const seenPhones = new Set<string>();
  for (const order of school.orders) {
    for (const poc of (order.pocs ?? [])) {
      const key = poc.phone || poc.email || `${poc.name}-${poc.role}`;
      if (!seenPhones.has(key)) {
        seenPhones.add(key);
        allPocs.push({ ...poc, orderDate: order.createdAt });
      }
    }
  }

  const TabBtn = ({ t, label }: { t: Tab; label: string }) => (
    <button
      className={`btn ${tab === t ? "btn-primary" : "btn-ghost"}`}
      style={{ fontSize: 13 }}
      onClick={() => setTab(t)}
    >
      {label}
    </button>
  );

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <a href="/sales" className="btn btn-ghost" style={{ fontSize: 12, textDecoration: "none" }}>← Back</a>
            <span className="badge badge-blue" style={{ fontSize: 12 }}>
              {STAGE_LABELS[school.pipelineStage] ?? school.pipelineStage}
            </span>
            {daysSinceContact !== null && daysSinceContact >= 30 && (
              <span className="badge badge-red" style={{ fontSize: 12 }}>⚠ Dormant {daysSinceContact}d</span>
            )}
          </div>
          <h1 style={{ margin: "0 0 4px" }}>{school.name}</h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13.5 }}>
            {school.address}, {school.city}, {school.state}
            {school.contactPhone && ` · 📞 ${school.contactPhone}`}
            {school.contactPerson && ` · ${school.contactPerson}`}
          </p>
        </div>
        <div style={{ textAlign: "right", fontSize: 13, color: "var(--text-muted)" }}>
          <div>Rep: <strong>{school.assignedTo?.name ?? "Unassigned"}</strong></div>
          {school.assignedTo?.phone && <div>{school.assignedTo.phone}</div>}
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Orders",      value: school.orders.length },
          { label: "Approved Revenue",   value: `₹${totalRevenue.toLocaleString()}` },
          { label: "Returns",            value: totalReturns > 0 ? `−₹${totalReturns.toLocaleString()}` : "None" },
          { label: "Outstanding",        value: outstanding > 0 ? `₹${outstanding.toLocaleString()}` : "₹0" },
          { label: "Days Since Contact", value: daysSinceContact !== null ? `${daysSinceContact}d` : "Never" },
          { label: "Timeline Events",    value: timeline.length },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ fontSize: "1.15rem" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── School Details ── */}
      <div className="card" style={{ marginBottom: 16, padding: "14px 18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px 24px", fontSize: 13 }}>
          {school.classes       && <div><span style={{ color: "var(--text-muted)" }}>Classes: </span><strong>{school.classes}</strong></div>}
          {school.studentStrength && <div><span style={{ color: "var(--text-muted)" }}>Students: </span><strong>{school.studentStrength.toLocaleString()}</strong></div>}
          {school.targetProduct  && <div><span style={{ color: "var(--text-muted)" }}>Target product: </span><strong>{PRODUCT_LABELS[school.targetProduct] ?? school.targetProduct}</strong></div>}
          {school.city           && <div><span style={{ color: "var(--text-muted)" }}>City: </span><strong>{school.city}, {school.state}</strong></div>}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <TabBtn t="overview"    label="Overview" />
        <TabBtn t="orders"      label={`Orders (${school.orders.length})`} />
        <TabBtn t="timeline"    label={`Timeline (${timeline.length})`} />
        <TabBtn t="contacts"    label={`Contacts (${allPocs.length})`} />
        <TabBtn t="competitors" label={`Competitors (${school.competitorNotes.length})`} />
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Recent orders */}
          <div className="card">
            <h3 style={{ marginBottom: 12, fontSize: 14 }}>Recent Orders</h3>
            {school.orders.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>No orders yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {school.orders.slice(0, 5).map((o: any) => (
                  <a key={o.id} href={`/orders/${o.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: "var(--radius)", background: "var(--bg)", border: "1px solid var(--border)" }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{PRODUCT_LABELS[o.productType] ?? o.productType}</div>
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{new Date(o.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 13 }}>₹{o.netAmount.toLocaleString()}</div>
                        <Badge status={o.status} />
                      </div>
                    </div>
                  </a>
                ))}
                {school.orders.length > 5 && (
                  <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setTab("orders")}>
                    View all {school.orders.length} orders →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Recent timeline */}
          <div className="card">
            <h3 style={{ marginBottom: 12, fontSize: 14 }}>Recent Activity</h3>
            {timeline.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>No activity recorded yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {timeline.slice(0, 6).map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <span className={`badge ${item.badge}`} style={{ fontSize: 11 }}>{item.label}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.date.toLocaleDateString()}</span>
                      </div>
                      {item.who && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>by {item.who}</div>}
                      {item.notes && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{item.notes}</div>}
                    </div>
                  </div>
                ))}
                {timeline.length > 6 && (
                  <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setTab("timeline")}>
                    View full timeline →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Competitor snapshot */}
          {school.competitorNotes.length > 0 && (
            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <h3 style={{ marginBottom: 12, fontSize: 14 }}>Competitor Intelligence</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {school.competitorNotes.filter((c: any) => c.isActive).slice(0, 4).map((c: any) => (
                  <div key={c.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 14px", minWidth: 160 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.competitor}</div>
                    {c.notes && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{c.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ORDERS TAB ── */}
      {tab === "orders" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {school.orders.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <p>No orders placed for this school yet.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Rep</th>
                  <th style={{ textAlign: "right" }}>Gross</th>
                  <th style={{ textAlign: "right" }}>Net</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Delivery</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {school.orders.map((o: any) => (
                  <tr key={o.id}>
                    <td style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td style={{ fontSize: 12.5 }}>{PRODUCT_LABELS[o.productType] ?? o.productType}</td>
                    <td style={{ fontSize: 12.5 }}>{o.createdBy?.name ?? "—"}</td>
                    <td style={{ fontFamily: "monospace", textAlign: "right", fontSize: 12.5 }}>₹{o.grossAmount.toLocaleString()}</td>
                    <td style={{ fontFamily: "monospace", fontWeight: 600, textAlign: "right" }}>₹{o.netAmount.toLocaleString()}</td>
                    <td><Badge status={o.status} /></td>
                    <td><Badge status={o.paymentStatus ?? "UNPAID"} /></td>
                    <td><Badge status={o.deliveryStatus ?? "PENDING"} /></td>
                    <td>
                      <a href={`/orders/${o.id}`} className="btn btn-ghost" style={{ fontSize: 11, padding: "2px 8px", textDecoration: "none" }}>
                        View →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--border)" }}>
                  <td colSpan={3} style={{ padding: "10px 16px", fontWeight: 600, color: "var(--text-secondary)", textAlign: "right" }}>Total approved revenue</td>
                  <td colSpan={5} style={{ padding: "10px 16px", fontFamily: "monospace", fontWeight: 700, color: "var(--accent)" }}>
                    ₹{totalRevenue.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* ── TIMELINE TAB ── */}
      {tab === "timeline" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {timeline.length === 0 ? (
            <div className="card empty-state"><p>No activity recorded yet.</p></div>
          ) : (
            timeline.map((item, i) => (
              <div key={i} className="card" style={{ padding: "12px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", background: "var(--accent-soft)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  fontSize: 16,
                }}>
                  {item.type === "Visit" ? "🚶" : item.type === "QUIZ" || item.type === "Quiz Session" ? "📝" :
                   item.type === "TEACHER_TRAINING" || item.type === "Training" ? "🎓" : "📅"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                    <span className={`badge ${item.badge}`} style={{ fontSize: 11.5 }}>{item.label}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {item.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {item.who && <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>· {item.who}</span>}
                  </div>
                  {item.notes && <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>{item.notes}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── CONTACTS TAB ── */}
      {tab === "contacts" && (
        <div>
          {allPocs.length === 0 ? (
            <div className="card empty-state"><p>No contacts captured from orders yet.</p></div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              {allPocs.map((poc: any, i) => (
                <div key={i} className="card" style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    {poc.role}
                  </div>
                  {poc.name  && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{poc.name}</div>}
                  {poc.phone && <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>📞 {poc.phone}</div>}
                  {poc.email && <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>✉ {poc.email}</div>}
                  {!poc.name && !poc.phone && !poc.email && (
                    <div style={{ color: "var(--text-muted)", fontSize: 12, fontStyle: "italic" }}>No contact info recorded</div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                    from order · {new Date(poc.orderDate).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COMPETITORS TAB ── */}
      {tab === "competitors" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <h3 style={{ marginBottom: 14, fontSize: 14 }}>Log Competitor</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 10, alignItems: "end" }}>
              <div>
                <label className="form-label">Competitor *</label>
                <input className="input" placeholder="e.g. Oxford, S.Chand"
                  value={compForm.competitor}
                  onChange={(e) => setCompForm({ ...compForm, competitor: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Notes / Intel</label>
                <input className="input" placeholder="Products? Price? Penetration?"
                  value={compForm.notes}
                  onChange={(e) => setCompForm({ ...compForm, notes: e.target.value })} />
              </div>
              <button className="btn btn-primary" onClick={saveCompetitor}
                disabled={compSaving || !compForm.competitor.trim()}>
                {compSaving ? "Saving…" : "Add"}
              </button>
            </div>
          </div>

          {school.competitorNotes.length === 0 ? (
            <div className="card empty-state"><p>No competitor notes yet. Add intelligence above.</p></div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Competitor</th>
                    <th>Notes</th>
                    <th>Status</th>
                    <th>Logged By</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {school.competitorNotes.map((c: any) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.competitor}</td>
                      <td style={{ fontSize: 12.5, color: "var(--text-secondary)", maxWidth: 240 }}>{c.notes ?? "—"}</td>
                      <td>
                        <span className={`badge ${c.isActive ? "badge-red" : "badge-gray"}`} style={{ fontSize: 11 }}>
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ fontSize: 12.5 }}>{c.createdBy?.name ?? "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-ghost" style={{ fontSize: 11, color: "var(--red)" }}
                          onClick={() => deleteCompetitor(c.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
