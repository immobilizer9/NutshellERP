"use client";

import { useEffect, useRef, useState } from "react";
import Badge from "@/app/components/Badge";

const ROLES = ["ADMIN", "BD_HEAD", "SALES"];
const EMPTY_FORM = { name: "", email: "", password: "", role: "", managerId: "", phone: "" };

export default function UsersPage() {
  const [users, setUsers]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]               = useState({ text: "", ok: false });
  const [search, setSearch]         = useState("");

  // Edit user state
  const [editUser, setEditUser]           = useState<any>(null);
  const [editForm, setEditForm]           = useState({ name: "", phone: "", role: "" });
  const [editMsg, setEditMsg]             = useState({ text: "", ok: false });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // CSV upload state
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult]       = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users", { credentials: "include" });
    const d   = await res.json();
    setUsers(Array.isArray(d) ? d : []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password || !form.role) {
      setMsg({ text: "All fields are required.", ok: false }); return;
    }
    setSubmitting(true); setMsg({ text: "", ok: false });
    const res  = await fetch("/api/admin/create-user", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.userId) {
      setMsg({ text: "User created.", ok: true });
      setForm(EMPTY_FORM);
      fetchUsers();
      setTimeout(() => { setShowModal(false); setMsg({ text: "", ok: false }); }, 1200);
    } else {
      setMsg({ text: data.error || "Failed.", ok: false });
    }
    setSubmitting(false);
  };

  // ── Deactivate / Activate ────────────────────────────────────────
  const toggleActive = async (user: any) => {
    await fetch("/api/admin/update-user", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId: user.id, isActive: !user.isActive }),
    });
    fetchUsers();
  };

  // ── Edit user ────────────────────────────────────────────────────
  const openEdit = (user: any) => {
    setEditUser(user);
    setEditForm({
      name:  user.name  ?? "",
      phone: user.phone ?? "",
      role:  user.roles?.[0]?.role?.name ?? "",
    });
    setEditMsg({ text: "", ok: false });
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) {
      setEditMsg({ text: "Name is required.", ok: false }); return;
    }
    setEditSubmitting(true); setEditMsg({ text: "", ok: false });
    const res  = await fetch("/api/admin/update-user", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        userId: editUser.id,
        name:   editForm.name,
        phone:  editForm.phone,
        role:   editForm.role || undefined,
      }),
    });
    const data = await res.json();
    if (data.error) {
      setEditMsg({ text: data.error, ok: false });
    } else {
      setEditMsg({ text: "Saved.", ok: true });
      fetchUsers();
      setTimeout(() => { setEditUser(null); setEditMsg({ text: "", ok: false }); }, 900);
    }
    setEditSubmitting(false);
  };

  // ── CSV Upload ──────────────────────────────────────────────────
  const handleCSVUpload = async (file: File) => {
    setCsvUploading(true);
    setCsvResult(null);
    const text = await file.text();
    const res  = await fetch("/api/admin/schools/bulk-upload", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ csv: text }),
    });
    const data = await res.json();
    setCsvResult(data);
    setCsvUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const bdHeads  = users.filter((u) => u.roles?.some((r: any) => r.role.name === "BD_HEAD"));
  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const roleCounts = ROLES.map((role) => ({
    role,
    count: users.filter((u) => u.roles?.some((r: any) => r.role.name === role)).length,
  }));

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>User Management</h1>
          <p>Manage users and bulk-import schools</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Create User</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">Total Users</div><div className="stat-value">{users.length}</div></div>
        {roleCounts.map(({ role, count }) => (
          <div key={role} className="stat-card">
            <div className="stat-label">{role.replace("_"," ")}</div>
            <div className="stat-value">{count}</div>
          </div>
        ))}
      </div>

      {/* ── CSV Bulk School Upload ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 6 }}>Bulk Import Schools</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 14px" }}>
          Upload a CSV file to add multiple schools at once.
          Required columns: <code style={{ fontFamily: "monospace", background: "var(--bg-subtle)", padding: "1px 5px", borderRadius: 3 }}>name, address, city, state</code>.
          Optional: <code style={{ fontFamily: "monospace", background: "var(--bg-subtle)", padding: "1px 5px", borderRadius: 3 }}>contactPerson, contactPhone, latitude, longitude, pipelineStage</code>
        </p>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.[0]) handleCSVUpload(e.target.files[0]); }}
          />
          <button
            className="btn btn-secondary"
            disabled={csvUploading}
            onClick={() => fileRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: 7 }}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 15, height: 15 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a1 1 0 001 1h10a1 1 0 001-1v-1M9 12V4m0 0l-3 3m3-3l3 3" />
            </svg>
            {csvUploading ? "Uploading..." : "Upload CSV"}
          </button>

          <button
            className="btn btn-ghost"
            style={{ fontSize: 12.5 }}
            onClick={() => {
              const sample = `name,address,city,state,contactPerson,contactPhone,pipelineStage
St. Xavier's School,12 Park Street,Kolkata,West Bengal,Mr. Das,9000000001,LEAD
Sunrise Public School,45 NH34,Siliguri,West Bengal,Mrs. Sharma,9000000002,CONTACTED`;
              const a = document.createElement("a");
              a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(sample);
              a.download = "sample_schools.csv";
              a.click();
            }}
          >
            ↓ Download Sample CSV
          </button>
        </div>

        {csvResult && (
          <div style={{ marginTop: 14 }}>
            <div className={`alert ${csvResult.created > 0 ? "alert-success" : "alert-info"}`} style={{ marginBottom: csvResult.errors.length > 0 ? 8 : 0 }}>
              ✅ {csvResult.created} school{csvResult.created !== 1 ? "s" : ""} imported
              {csvResult.skipped > 0 && ` · ${csvResult.skipped} skipped`}
            </div>
            {csvResult.errors.length > 0 && (
              <div style={{ background: "var(--red-bg)", border: "1px solid var(--red-border)", borderRadius: "var(--radius)", padding: "10px 14px" }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--red)", margin: "0 0 6px" }}>Errors:</p>
                {csvResult.errors.slice(0, 10).map((e, i) => (
                  <p key={i} style={{ fontSize: 12, color: "var(--red)", margin: "0 0 2px" }}>• {e}</p>
                ))}
                {csvResult.errors.length > 10 && (
                  <p style={{ fontSize: 12, color: "var(--red)", margin: "4px 0 0", fontStyle: "italic" }}>
                    ...and {csvResult.errors.length - 10} more
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <input className="input" placeholder="Search users..." value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
      </div>

      {/* Users Table */}
      <div className="card">
        <h2 style={{ marginBottom: 14 }}>All Users</h2>
        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 500 }}>{user.name}</td>
                    <td style={{ color: "var(--text-secondary)", fontFamily: "monospace", fontSize: 13 }}>{user.email}</td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>{user.phone ?? "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        {user.roles?.map((r: any) => <Badge key={r.role.name} status={r.role.name} />)}
                      </div>
                    </td>
                    <td><Badge status={user.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: 12, padding: "3px 10px" }}
                          onClick={() => openEdit(user)}
                        >
                          Edit
                        </button>
                        <button
                          className={`btn ${user.isActive ? "btn-danger" : "btn-success"}`}
                          style={{ fontSize: 12, padding: "3px 10px" }}
                          onClick={() => toggleActive(user)}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create User Modal ── */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="fade-in" style={{ background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 24px 48px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Create User</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ fontSize: 18, padding: "2px 8px", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="form-label">Full Name *</label>
                <input className="input" placeholder="e.g. Rahul Sharma" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input className="input" type="email" placeholder="user@nutshell.com" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label className="form-label">Password *</label>
                  <input className="input" type="password" placeholder="Min 6 chars" value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input className="input" placeholder="e.g. 9000000001" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="form-label">Role *</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="">Select a role...</option>
                  {ROLES.map((r) => <option key={r} value={r}>{r.replace("_"," ")}</option>)}
                </select>
              </div>
              {form.role === "SALES" && (
                <div>
                  <label className="form-label">Assign to BD Head</label>
                  <select className="input" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
                    <option value="">No manager</option>
                    {bdHeads.map((bd) => <option key={bd.id} value={bd.id}>{bd.name}</option>)}
                  </select>
                </div>
              )}

              {msg.text && <div className={`alert ${msg.ok ? "alert-success" : "alert-error"}`}>{msg.text}</div>}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" disabled={submitting} onClick={handleCreate}>
                  {submitting ? "Creating..." : "Create User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editUser && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditUser(null); }}
        >
          <div className="fade-in" style={{ background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 24px 48px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 2px" }}>Edit User</h2>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{editUser.email}</p>
              </div>
              <button className="btn btn-ghost" onClick={() => setEditUser(null)} style={{ fontSize: 18, padding: "2px 8px", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="form-label">Full Name</label>
                <input className="input" value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input className="input" placeholder="e.g. 9000000001" value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select className="input" value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                  <option value="">Keep current</option>
                  {ROLES.map((r) => <option key={r} value={r}>{r.replace("_"," ")}</option>)}
                </select>
              </div>

              {editMsg.text && (
                <div className={`alert ${editMsg.ok ? "alert-success" : "alert-error"}`}>{editMsg.text}</div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button className="btn btn-secondary" onClick={() => setEditUser(null)}>Cancel</button>
                <button className="btn btn-primary" disabled={editSubmitting} onClick={saveEdit}>
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
