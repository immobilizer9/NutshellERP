"use client";

import { useEffect, useRef, useState } from "react";

const ALL_ROLES = ["ADMIN", "BD_HEAD", "SALES", "CONTENT_TEAM", "TRAINER", "DESIGN_TEAM"];

// Modules each role grants (for preview)
const ROLE_MODULES: Record<string, string[]> = {
  ADMIN:        ["USER_MANAGEMENT", "AUDIT_LOG", "EXPORTS", "CONTENT_ASSIGN", "CONTENT_REVIEW",
                 "ANALYTICS", "ORDERS", "PIPELINE", "SCHOOLS", "TARGETS", "TEAM_MANAGEMENT",
                 "QUIZ_SESSIONS", "TRAINING_SESSIONS"],
  BD_HEAD:      ["TEAM_MANAGEMENT", "ORDERS", "PIPELINE", "SCHOOLS", "ANALYTICS",
                 "TASKS", "DAILY_REPORTS", "TARGETS"],
  SALES:        ["ORDERS", "PIPELINE", "ANALYTICS", "TASKS", "DAILY_REPORTS"],
  CONTENT_TEAM: ["CONTENT_CREATE", "CONTENT_ASSIGN", "QUIZ_SESSIONS", "TRAINING_SESSIONS"],
  TRAINER:      ["QUIZ_SESSIONS", "TRAINING_SESSIONS", "CONTENT_CREATE"],
  DESIGN_TEAM:  [],
};

function getEffectiveModules(roles: string[]): string[] {
  const set = new Set<string>();
  for (const r of roles) for (const m of (ROLE_MODULES[r] ?? [])) set.add(m);
  return Array.from(set).sort();
}

const EMPTY_FORM = { name: "", email: "", password: "", roles: [] as string[], managerId: "", phone: "" };

export default function UsersPage() {
  const [users, setUsers]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]               = useState({ text: "", ok: false });
  const [search, setSearch]         = useState("");

  // Edit user state
  const [editUser, setEditUser]             = useState<any>(null);
  const [editForm, setEditForm]             = useState({ name: "", phone: "", roles: [] as string[] });
  const [editMsg, setEditMsg]               = useState({ text: "", ok: false });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Password reset state
  const [resetUser, setResetUser]           = useState<any>(null);
  const [resetPw,   setResetPw]             = useState("");
  const [resetMsg,  setResetMsg]            = useState({ text: "", ok: false });
  const [resetSubmitting, setResetSubmitting] = useState(false);

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
    if (!form.name || !form.email || !form.password || form.roles.length === 0) {
      setMsg({ text: "Name, email, password, and at least one role are required.", ok: false }); return;
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

  const toggleActive = async (user: any) => {
    await fetch("/api/admin/update-user", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId: user.id, isActive: !user.isActive }),
    });
    fetchUsers();
  };

  const openEdit = (user: any) => {
    setEditUser(user);
    setEditForm({
      name:  user.name  ?? "",
      phone: user.phone ?? "",
      roles: user.roles?.map((r: any) => r.role.name) ?? [],
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
        roles:  editForm.roles.length > 0 ? editForm.roles : undefined,
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

  const handleResetPassword = async () => {
    if (!resetPw.trim() || resetPw.length < 6) {
      setResetMsg({ text: "Password must be at least 6 characters.", ok: false }); return;
    }
    setResetSubmitting(true); setResetMsg({ text: "", ok: false });
    const res  = await fetch("/api/admin/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ userId: resetUser.id, newPassword: resetPw }),
    });
    const data = await res.json();
    if (data.success) {
      setResetMsg({ text: "Password reset successfully.", ok: true });
      setTimeout(() => { setResetUser(null); setResetPw(""); setResetMsg({ text: "", ok: false }); }, 1500);
    } else {
      setResetMsg({ text: data.error || "Failed.", ok: false });
    }
    setResetSubmitting(false);
  };

  const handleCSVUpload = async (file: File) => {
    setCsvUploading(true); setCsvResult(null);
    const text = await file.text();
    const res  = await fetch("/api/admin/schools/bulk-upload", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ csv: text }),
    });
    const data = await res.json();
    setCsvResult(data); setCsvUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const toggleRole = (role: string, current: string[], setter: (r: string[]) => void) => {
    setter(current.includes(role) ? current.filter((r) => r !== role) : [...current, role]);
  };

  const bdHeads  = users.filter((u) => u.roles?.some((r: any) => r.role.name === "BD_HEAD"));
  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const roleCounts = ALL_ROLES.map((role) => ({
    role,
    count: users.filter((u) => u.roles?.some((r: any) => r.role.name === role)).length,
  }));

  const createModules = getEffectiveModules(form.roles);
  const editModules   = getEffectiveModules(editForm.roles);

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Users</h1>
          <p>Manage team members and access</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Create User</button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{users.length || "—"}</div>
        </div>
        {roleCounts.slice(0, 3).map(({ role, count }) => (
          <div key={role} className="stat-card">
            <div className="stat-label">{role.replace(/_/g, " ")}</div>
            <div className="stat-value">{count || "—"}</div>
          </div>
        ))}
      </div>

      {/* Bulk School Import */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 6 }}>Bulk Import Schools</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 14px" }}>
          Upload a CSV file to add multiple schools at once.
          Required columns: <code style={{ fontFamily: "monospace" }}>name, address, city, state</code>.
          Optional: <code style={{ fontFamily: "monospace" }}>contactPerson, contactPhone, latitude, longitude, pipelineStage</code>
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.[0]) handleCSVUpload(e.target.files[0]); }} />
          <button className="btn" disabled={csvUploading} onClick={() => fileRef.current?.click()}>
            {csvUploading ? "Uploading…" : "Upload CSV"}
          </button>
          <button className="btn" style={{ fontSize: 12.5 }} onClick={() => {
            const sample = `name,address,city,state,contactPerson,contactPhone,pipelineStage\nSt. Xavier's School,12 Park Street,Kolkata,West Bengal,Mr. Das,9000000001,LEAD`;
            const a = document.createElement("a");
            a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(sample);
            a.download = "sample_schools.csv"; a.click();
          }}>↓ Sample CSV</button>
        </div>
        {csvResult && (
          <div style={{ marginTop: 14 }}>
            <div className="alert alert-success" style={{ marginBottom: csvResult.errors.length > 0 ? 8 : 0 }}>
              {csvResult.created} school{csvResult.created !== 1 ? "s" : ""} imported
              {csvResult.skipped > 0 && ` · ${csvResult.skipped} skipped`}
            </div>
            {csvResult.errors.length > 0 && (
              <div className="alert alert-error">
                {csvResult.errors.slice(0, 5).map((e, i) => <div key={i}>• {e}</div>)}
                {csvResult.errors.length > 5 && <div>…and {csvResult.errors.length - 5} more</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <input className="input" placeholder="Search users…" value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
      </div>

      {/* Users Table */}
      <div className="card">
        <h2 style={{ marginBottom: 14 }}>All Users</h2>
        {loading ? (
          <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>No users found</p>
            <p>Create a user or adjust your search</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 500 }}>{user.name}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{user.email}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{user.phone ?? "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {user.roles?.map((r: any) => (
                          <span key={r.role.name} className="badge badge-indigo" style={{ fontSize: 11 }}>
                            {r.role.name.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${user.isActive ? "badge-green" : "badge-red"}`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => openEdit(user)}>Edit</button>
                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: "4px 10px" }}
                          onClick={() => { setResetUser(user); setResetPw(""); setResetMsg({ text: "", ok: false }); }}>
                          Reset PW
                        </button>
                        <button
                          className={`btn ${user.isActive ? "btn-danger" : "btn-success"}`}
                          style={{ fontSize: 12, padding: "4px 10px" }}
                          onClick={() => toggleActive(user)}>
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

      {/* Create User Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24, overflowY: "auto" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="fade-in" style={{ background: "var(--surface)", borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border)", padding: 28, width: "100%", maxWidth: 480,
            boxShadow: "0 24px 48px rgba(0,0,0,0.18)", margin: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Create User</h2>
              <button className="btn" onClick={() => setShowModal(false)} style={{ fontSize: 18, padding: "2px 8px" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="form-label">Full Name *</label>
                <input className="input" placeholder="e.g. Rahul Sharma" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input className="input" type="email" placeholder="user@nutshell.com" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label className="form-label">Password *</label>
                  <input className="input" type="password" placeholder="Min 6 chars" value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input className="input" placeholder="e.g. 9000000001" value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>

              {/* Multi-role checkboxes */}
              <div>
                <label className="form-label">Roles * (select one or more)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px",
                  border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg)" }}>
                  {ALL_ROLES.map((role) => (
                    <label key={role} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                      <input type="checkbox" checked={form.roles.includes(role)}
                        onChange={() => toggleRole(role, form.roles, (r) => setForm((f) => ({ ...f, roles: r })))} />
                      <span style={{ fontWeight: 500 }}>{role.replace("_", " ")}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Module preview */}
              {form.roles.length > 0 && (
                <div style={{ padding: "10px 12px", background: "rgba(99,102,241,0.06)",
                  border: "1px solid rgba(99,102,241,0.2)", borderRadius: "var(--radius)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 6 }}>
                    Modules granted ({createModules.length}):
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {createModules.map((m) => (
                      <span key={m} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4,
                        background: "rgba(99,102,241,0.12)", color: "var(--accent)", fontWeight: 500 }}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {form.roles.includes("SALES") && (
                <div>
                  <label className="form-label">Assign to BD Head</label>
                  <select className="input" value={form.managerId}
                    onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value }))}>
                    <option value="">No manager</option>
                    {bdHeads.map((bd) => <option key={bd.id} value={bd.id}>{bd.name}</option>)}
                  </select>
                </div>
              )}

              {msg.text && <div className={`alert ${msg.ok ? "alert-success" : "alert-error"}`}>{msg.text}</div>}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" disabled={submitting} onClick={handleCreate}>
                  {submitting ? "Creating…" : "Create User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setResetUser(null); }}>
          <div className="fade-in" style={{ background: "var(--surface)", borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border)", padding: 28, width: "100%", maxWidth: 400,
            boxShadow: "0 24px 48px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: "0 0 2px" }}>Reset Password</h2>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{resetUser.name} · {resetUser.email}</p>
              </div>
              <button className="btn" onClick={() => setResetUser(null)} style={{ fontSize: 18, padding: "2px 8px" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="form-label">New Password *</label>
                <input className="input" type="password" placeholder="Min 6 characters" value={resetPw}
                  onChange={(e) => setResetPw(e.target.value)} />
              </div>
              {resetMsg.text && (
                <div className={`alert ${resetMsg.ok ? "alert-success" : "alert-error"}`}>{resetMsg.text}</div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn" onClick={() => setResetUser(null)}>Cancel</button>
                <button className="btn btn-primary" disabled={resetSubmitting} onClick={handleResetPassword}>
                  {resetSubmitting ? "Resetting…" : "Reset Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24, overflowY: "auto" }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditUser(null); }}>
          <div className="fade-in" style={{ background: "var(--surface)", borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border)", padding: 28, width: "100%", maxWidth: 480,
            boxShadow: "0 24px 48px rgba(0,0,0,0.18)", margin: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 2px" }}>Edit User</h2>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{editUser.email}</p>
              </div>
              <button className="btn" onClick={() => setEditUser(null)} style={{ fontSize: 18, padding: "2px 8px" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="form-label">Full Name</label>
                <input className="input" value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input className="input" placeholder="e.g. 9000000001" value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>

              {/* Multi-role checkboxes */}
              <div>
                <label className="form-label">Roles (select one or more)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px",
                  border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg)" }}>
                  {ALL_ROLES.map((role) => (
                    <label key={role} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                      <input type="checkbox" checked={editForm.roles.includes(role)}
                        onChange={() => toggleRole(role, editForm.roles, (r) => setEditForm((f) => ({ ...f, roles: r })))} />
                      <span style={{ fontWeight: 500 }}>{role.replace("_", " ")}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Module preview */}
              {editForm.roles.length > 0 && (
                <div style={{ padding: "10px 12px", background: "rgba(99,102,241,0.06)",
                  border: "1px solid rgba(99,102,241,0.2)", borderRadius: "var(--radius)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 6 }}>
                    Modules granted ({editModules.length}):
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {editModules.map((m) => (
                      <span key={m} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4,
                        background: "rgba(99,102,241,0.12)", color: "var(--accent)", fontWeight: 500 }}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {editMsg.text && (
                <div className={`alert ${editMsg.ok ? "alert-success" : "alert-error"}`}>{editMsg.text}</div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button className="btn" onClick={() => setEditUser(null)}>Cancel</button>
                <button className="btn btn-primary" disabled={editSubmitting} onClick={saveEdit}>
                  {editSubmitting ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
