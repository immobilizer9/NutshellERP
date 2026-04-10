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
  INTERESTED:      "Interested",
  FOLLOW_UP:       "Follow Up",
  NOT_INTERESTED:  "Not Interested",
  ORDER_PLACED:    "Order Placed",
};

const EVENT_LABELS: Record<string, string> = {
  QUIZ:             "Quiz",
  TEACHER_TRAINING: "Teacher Training",
  MEETING:          "Meeting",
};

export default function SchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"orders" | "visits" | "events" | "competitors">("orders");
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [compForm, setCompForm] = useState({ competitor: "", notes: "", isActive: true });
  const [compSaving, setCompSaving] = useState(false);

  const fetchCompetitors = () =>
    fetch(`/api/competitors?schoolId=${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setCompetitors(d); });

  const saveCompetitor = async () => {
    if (!compForm.competitor.trim()) return;
    setCompSaving(true);
    await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ schoolId: id, ...compForm }),
    });
    setCompForm({ competitor: "", notes: "", isActive: true });
    await fetchCompetitors();
    setCompSaving(false);
  };

  const deleteCompetitor = async (noteId: string) => {
    if (!confirm("Delete this competitor note?")) return;
    await fetch(`/api/competitors?id=${noteId}`, { method: "DELETE", credentials: "include" });
    await fetchCompetitors();
  };

  useEffect(() => {
    if (!id) return;
    fetch(`/api/schools/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setSchool(d.error ? null : d);
        setLoading(false);
      });
    fetchCompetitors();
  }, [id]);

  if (loading) return <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>;
  if (!school)  return <div className="alert alert-error">School not found.</div>;

  const approvedOrders = school.orders.filter((o: any) => o.status === "APPROVED");
  const totalRevenue   = approvedOrders.reduce((s: number, o: any) => s + o.netAmount, 0);

  const TabButton = ({ tab: t, label }: { tab: typeof tab; label: string }) => (
    <button
      className={`btn ${tab === t ? "btn-primary" : "btn-ghost"}`}
      style={{ fontSize: 13 }}
      onClick={() => setTab(t)}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>{school.name}</h1>
          <p>{school.address}, {school.city}, {school.state}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="badge badge-blue" style={{ fontSize: 13 }}>{STAGE_LABELS[school.pipelineStage] ?? school.pipelineStage}</span>
          <a href="/bd/schools" className="btn btn-ghost" style={{ fontSize: 13, textDecoration: "none" }}>← Back</a>
        </div>
      </div>

      {/* ── Info Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Assigned To",    value: school.assignedTo?.name ?? "Unassigned" },
          { label: "Contact Person", value: school.contactPerson ?? "—" },
          { label: "Contact Phone",  value: school.contactPhone  ?? "—" },
          { label: "Total Orders",   value: school.orders.length  },
          { label: "Approved Revenue", value: `₹${totalRevenue.toLocaleString()}` },
          { label: "Total Visits",   value: school.visits.length  },
        ].map((row) => (
          <div key={row.label} className="stat-card">
            <div className="stat-label">{row.label}</div>
            <div className="stat-value" style={{ fontSize: "1.2rem" }}>{row.value}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <TabButton tab="orders"      label={`Orders (${school.orders.length})`} />
        <TabButton tab="visits"      label={`Visits (${school.visits.length})`} />
        <TabButton tab="events"      label={`Events (${school.events.length})`} />
        <TabButton tab="competitors" label={`Competitors (${competitors.length})`} />
      </div>

      {/* ── Orders Tab ── */}
      {tab === "orders" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {school.orders.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}><p>No orders for this school yet</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sales Rep</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Net Amount</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Delivery</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {school.orders.map((order: any) => (
                  <tr key={order.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td>{order.createdBy?.name ?? "—"}</td>
                    <td style={{ fontSize: 12 }}>{PRODUCT_LABELS[order.productType] ?? order.productType}</td>
                    <td style={{ fontSize: 12 }}>{order.type}</td>
                    <td style={{ fontWeight: 600, fontFamily: "monospace" }}>₹{order.netAmount.toLocaleString()}</td>
                    <td><Badge status={order.status} /></td>
                    <td><Badge status={order.paymentStatus ?? "UNPAID"} /></td>
                    <td><Badge status={order.deliveryStatus ?? "PENDING"} /></td>
                    <td>
                      {order.pdfUrl ? (
                        <a href={order.pdfUrl} target="_blank" rel="noopener noreferrer"
                          className="btn btn-ghost" style={{ fontSize: 11, padding: "2px 8px" }}>
                          PDF ↗
                        </a>
                      ) : (
                        <a href={`/orders/${order.id}`}
                          className="btn btn-ghost" style={{ fontSize: 11, padding: "2px 8px", textDecoration: "none" }}>
                          View →
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Visits Tab ── */}
      {tab === "visits" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {school.visits.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}><p>No visits recorded yet</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sales Rep</th>
                  <th>Outcome</th>
                  <th>Next Visit</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {school.visits.map((visit: any) => (
                  <tr key={visit.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                      {new Date(visit.createdAt).toLocaleDateString()}
                    </td>
                    <td>{visit.salesUser?.name ?? "—"}</td>
                    <td>
                      {visit.outcome ? (
                        <span className={`badge ${
                          visit.outcome === "INTERESTED"     ? "badge-green"  :
                          visit.outcome === "ORDER_PLACED"   ? "badge-blue"   :
                          visit.outcome === "FOLLOW_UP"      ? "badge-yellow" : "badge-red"
                        }`} style={{ fontSize: 11 }}>
                          {OUTCOME_LABELS[visit.outcome] ?? visit.outcome}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {visit.nextVisitDate ? new Date(visit.nextVisitDate).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {visit.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Events Tab ── */}
      {tab === "events" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {school.events.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}><p>No events scheduled</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Created By</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {school.events.map((event: any) => (
                  <tr key={event.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                      {new Date(event.date).toLocaleDateString()}
                    </td>
                    <td>
                      <span className="badge badge-blue" style={{ fontSize: 11 }}>
                        {EVENT_LABELS[event.type] ?? event.type}
                      </span>
                    </td>
                    <td>{event.createdBy?.name ?? "—"}</td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{event.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {/* ── Competitors Tab ── */}
      {tab === "competitors" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <h2 style={{ marginBottom: 14 }}>Log Competitor</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 10, alignItems: "end" }}>
              <div>
                <label className="form-label">Competitor Name *</label>
                <input className="input" placeholder="e.g. Oxford, S.Chand" value={compForm.competitor}
                  onChange={(e) => setCompForm({ ...compForm, competitor: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Notes</label>
                <input className="input" placeholder="What products? Price point? Any intel?" value={compForm.notes}
                  onChange={(e) => setCompForm({ ...compForm, notes: e.target.value })} />
              </div>
              <button className="btn btn-primary" onClick={saveCompetitor} disabled={compSaving || !compForm.competitor.trim()}>
                {compSaving ? "Saving…" : "Add"}
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {competitors.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}><p>No competitor notes yet</p></div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Competitor</th>
                    <th>Notes</th>
                    <th>Active?</th>
                    <th>Logged By</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((c: any) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.competitor}</td>
                      <td style={{ fontSize: 12.5, color: "var(--text-secondary)", maxWidth: 260 }}>{c.notes ?? "—"}</td>
                      <td>
                        <span className={`badge ${c.isActive ? "badge-green" : "badge-gray"}`} style={{ fontSize: 11 }}>
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.createdBy?.name ?? "—"}</td>
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
            )}
          </div>
        </div>
      )}
    </>
  );
}
