"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTopicPage() {
  const router = useRouter();
  const [users,   setUsers]   = useState<any[]>([]);
  const [form,    setForm]    = useState({
    title: "",
    description: "",
    productType: "ANNUAL",
    classFrom: "1",
    classTo: "10",
    assignedToId: "",
    dueDate: "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  useEffect(() => {
    fetch("/api/admin/users", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const all = Array.isArray(data) ? data : (data.users ?? []);
        // Filter to CONTENT_TEAM users
        const ct = all.filter((u: any) =>
          u.roles?.some((r: any) => (r.role?.name ?? r) === "CONTENT_TEAM")
        );
        setUsers(ct.length > 0 ? ct : all);
      });
  }, []);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.assignedToId) {
      setError("Title and assigned user are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/content/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title:       form.title,
          description: form.description || undefined,
          productType: form.productType,
          classFrom:   Number(form.classFrom),
          classTo:     Number(form.classTo),
          assignedToId: form.assignedToId,
          dueDate:     form.dueDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create topic"); return; }
      router.push("/admin/content");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>New Content Topic</h1>
        <p>Create a topic and assign it to a content team member.</p>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <p style={{ color: "var(--red)", fontSize: 14, margin: 0 }}>{error}</p>}

          <div>
            <label className="form-label">Title *</label>
            <input className="input" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Class 5 GK Chapter 3" required />
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea className="input" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Optional description..." style={{ height: 80, resize: "vertical" }} />
          </div>

          <div>
            <label className="form-label">Product Type *</label>
            <select className="input" value={form.productType} onChange={(e) => update("productType", e.target.value)}>
              <option value="ANNUAL">Annual</option>
              <option value="PAPERBACKS_PLAINS">Paperbacks (Plains)</option>
              <option value="PAPERBACKS_HILLS">Paperbacks (Hills)</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="form-label">Class From *</label>
              <input className="input" type="number" min="1" max="12" value={form.classFrom} onChange={(e) => update("classFrom", e.target.value)} />
            </div>
            <div>
              <label className="form-label">Class To *</label>
              <input className="input" type="number" min="1" max="12" value={form.classTo} onChange={(e) => update("classTo", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="form-label">Assign To *</label>
            <select className="input" value={form.assignedToId} onChange={(e) => update("assignedToId", e.target.value)} required>
              <option value="">Select user...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Due Date</label>
            <input className="input" type="date" value={form.dueDate} onChange={(e) => update("dueDate", e.target.value)} />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={() => router.push("/admin/content")}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Creating..." : "Create Topic"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
