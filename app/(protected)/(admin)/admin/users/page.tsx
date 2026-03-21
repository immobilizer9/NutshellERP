"use client";

import { useEffect, useState } from "react";
import Badge from "@/app/components/Badge";

const ROLES = ["ADMIN", "BD_HEAD", "SALES"];

const EMPTY_FORM = { name: "", email: "", password: "", role: "", managerId: "" };

export default function UsersPage() {
  const [users, setUsers]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]           = useState({ text: "", ok: false });
  const [search, setSearch]     = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users", { credentials: "include" });
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password || !form.role) {
      setMsg({ text: "All fields are required.", ok: false });
      return;
    }
    setSubmitting(true);
    setMsg({ text: "", ok: false });
    const res = await fetch("/api/admin/create-user", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.userId) {
      setMsg({ text: "User created successfully.", ok: true });
      setForm(EMPTY_FORM);
      fetchUsers();
      setTimeout(() => { setShowModal(false); setMsg({ text: "", ok: false }); }, 1200);
    } else {
      setMsg({ text: data.error || "Failed to create user.", ok: false });
    }
    setSubmitting(false);
  };

  const bdHeads = users.filter((u) =>
    u.roles?.some((r: any) => r.role.name === "BD_HEAD")
  );

  const filtered = users.filter(
    (u) =>
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
          <p>Manage all users in your organisation</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Create User</button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{users.length}</div>
        </div>
        {roleCounts.map(({ role, count }) => (
          <div key={role} className="stat-card">
            <div className="stat-label">{role.replace("_", " ")}</div>
            <div className="stat-value">{count}</div>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div style={{ marginBottom: 16 }}>
        <input
          className="input"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      {/* ── Table ── */}
      <div className="card">
        <h2 style={{ marginBottom: 14 }}>All Users</h2>
        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>{search ? "No users match your search" : "No users yet"}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 500 }}>{user.name}</td>
                    <td style={{ color: "var(--text-secondary)", fontFamily: "monospace", fontSize: 13 }}>
                      {user.email}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {user.roles?.map((r: any) => (
                          <Badge key={r.role.name} status={r.role.name} />
                        ))}
                      </div>
                    </td>
                    <td>
                      <Badge status={user.isActive ? "ACTIVE" : "INACTIVE"} />
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                      {new Date(user.createdAt).toLocaleDateString()}
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
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 50, padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="fade-in"
            style={{
              background: "var(--surface)", borderRadius: "var(--radius-xl)",
              border: "1px solid var(--border)", padding: 28, width: "100%",
              maxWidth: 420, boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Create User</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}
                style={{ padding: "4px 8px", fontSize: 18, lineHeight: 1 }}>×</button>
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
              <div>
                <label className="form-label">Password *</label>
                <input className="input" type="password" placeholder="Minimum 6 characters" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Role *</label>
                <select className="input" value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="">Select a role...</option>
                  {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                </select>
              </div>
              {form.role === "SALES" && (
                <div>
                  <label className="form-label">Assign to BD Head</label>
                  <select className="input" value={form.managerId}
                    onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
                    <option value="">No manager</option>
                    {bdHeads.map((bd) => <option key={bd.id} value={bd.id}>{bd.name}</option>)}
                  </select>
                </div>
              )}

              {msg.text && (
                <div className={`alert ${msg.ok ? "alert-success" : "alert-error"}`}>{msg.text}</div>
              )}

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
    </>
  );
}
