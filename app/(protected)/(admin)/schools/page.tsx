"use client";

import { useEffect, useState } from "react";
import Badge from "@/app/components/Badge";

const PIPELINE_STAGES = [
  "LEAD", "CONTACTED", "VISITED", "PROPOSAL_SENT", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST",
];

const EMPTY_FORM = {
  name: "", city: "", state: "", address: "",
  contactPerson: "", contactPhone: "",
  pipelineStage: "LEAD", assignedToId: "",
};

const PAGE_SIZE = 20;

export default function AdminSchoolsPage() {
  const [schools, setSchools]     = useState<any[]>([]);
  const [users, setUsers]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  const fetchSchools = async () => {
    setLoading(true);
    const res  = await fetch("/api/admin/schools", { credentials: "include" });
    const data = await res.json();
    setSchools(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const res  = await fetch("/api/admin/users", { credentials: "include" });
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchSchools();
    fetchUsers();
  }, []);

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1); }, [search]);

  const filtered = schools.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q) ||
      s.state?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const active   = schools.filter((s) => ["LEAD","CONTACTED","VISITED"].includes(s.pipelineStage)).length;
  const advanced = schools.filter((s) => ["PROPOSAL_SENT","NEGOTIATION"].includes(s.pipelineStage)).length;
  const closed   = schools.filter((s) => ["CLOSED_WON","CLOSED_LOST"].includes(s.pipelineStage)).length;

  const openEdit = (school: any) => {
    setEditTarget(school);
    setForm({
      name:          school.name          ?? "",
      city:          school.city          ?? "",
      state:         school.state         ?? "",
      address:       school.address       ?? "",
      contactPerson: school.contactPerson ?? "",
      contactPhone:  school.contactPhone  ?? "",
      pipelineStage: school.pipelineStage ?? "LEAD",
      assignedToId:  school.assignedTo?.id ?? school.assignedToId ?? "",
    });
    setError("");
    setSuccess("");
  };

  const openCreate = () => {
    setCreateOpen(true);
    setForm({ ...EMPTY_FORM });
    setError("");
    setSuccess("");
  };

  const closeModals = () => {
    setEditTarget(null);
    setCreateOpen(false);
    setError("");
    setSuccess("");
  };

  const handleSave = async () => {
    if (!form.name || !form.city || !form.state) {
      setError("Name, city, and state are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/schools/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSuccess("School updated.");
      closeModals();
      fetchSchools();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.city || !form.state) {
      setError("Name, city, and state are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      closeModals();
      fetchSchools();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReassign = async (schoolId: string, assignedToId: string) => {
    await fetch("/api/admin/schools/reassign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ schoolId, assignedToId }),
    });
    fetchSchools();
  };

  const SchoolForm = () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {[
        { key: "name",          label: "School Name *",  placeholder: "e.g. St. Xavier's School" },
        { key: "city",          label: "City *",         placeholder: "e.g. Siliguri" },
        { key: "state",         label: "State *",        placeholder: "e.g. West Bengal" },
        { key: "address",       label: "Address",        placeholder: "Street address" },
        { key: "contactPerson", label: "Contact Person", placeholder: "e.g. Principal Sharma" },
        { key: "contactPhone",  label: "Contact Phone",  placeholder: "e.g. 9000000001" },
      ].map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="form-label">{label}</label>
          <input
            className="input"
            placeholder={placeholder}
            value={(form as any)[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          />
        </div>
      ))}
      <div>
        <label className="form-label">Pipeline Stage</label>
        <select
          className="input"
          value={form.pipelineStage}
          onChange={(e) => setForm((f) => ({ ...f, pipelineStage: e.target.value }))}
        >
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label">Assigned To</label>
        <select
          className="input"
          value={form.assignedToId}
          onChange={(e) => setForm((f) => ({ ...f, assignedToId: e.target.value }))}
        >
          <option value="">— Unassigned —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Schools</h1>
          <p>Manage school assignments and details</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add School</button>
      </div>

      {/* ── Search ── */}
      <div style={{ marginBottom: 20 }}>
        <input
          className="input"
          placeholder="Search by name, city, or state..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Schools</div>
          <div className="stat-value">{schools.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value" style={{ color: "var(--green)" }}>{active}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Advanced</div>
          <div className="stat-value" style={{ color: "var(--yellow)" }}>{advanced}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Closed</div>
          <div className="stat-value" style={{ color: "var(--text-muted)" }}>{closed}</div>
        </div>
      </div>

      {success && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>
      )}

      {/* ── Schools Table ── */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>
            All Schools
            <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>
              ({filtered.length})
            </span>
          </h2>
        </div>

        {loading ? (
          <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>{search ? "No schools match your search" : "No schools yet"}</p>
            {!search && <p>Add your first school using the button above</p>}
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>City / State</th>
                    <th>Stage</th>
                    <th>Assigned Rep</th>
                    <th>Contact</th>
                    <th>Orders</th>
                    <th>Added</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((school) => (
                    <tr key={school.id}>
                      <td style={{ fontWeight: 500 }}>{school.name}</td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                        {school.city}{school.state ? `, ${school.state}` : ""}
                      </td>
                      <td><Badge status={school.pipelineStage ?? "LEAD"} /></td>
                      <td>
                        <select
                          className="input"
                          style={{ minWidth: 140, fontSize: 12 }}
                          value={school.assignedTo?.id ?? school.assignedToId ?? ""}
                          onChange={(e) => handleReassign(school.id, e.target.value)}
                        >
                          <option value="">— Unassigned —</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {school.contactPerson && (
                          <p style={{ margin: 0, fontSize: 13 }}>{school.contactPerson}</p>
                        )}
                        {school.contactPhone && (
                          <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "1px 0 0" }}>
                            {school.contactPhone}
                          </p>
                        )}
                      </td>
                      <td style={{ color: "var(--text-secondary)", textAlign: "center" }}>
                        {school._count?.orders ?? school.ordersCount ?? 0}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                        {new Date(school.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: 12 }}
                          onClick={() => openEdit(school)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 16 }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 12 }}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 12 }}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {editTarget && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModals(); }}
        >
          <div style={{ background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", padding: 28, width: "100%", maxWidth: 560, boxShadow: "0 24px 48px rgba(0,0,0,0.18)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ marginBottom: 20 }}>Edit School</h2>
            <SchoolForm />
            {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={closeModals}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Modal ── */}
      {createOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModals(); }}
        >
          <div style={{ background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", padding: 28, width: "100%", maxWidth: 560, boxShadow: "0 24px 48px rgba(0,0,0,0.18)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ marginBottom: 20 }}>Add New School</h2>
            <SchoolForm />
            {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={closeModals}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? "Creating..." : "Create School"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
