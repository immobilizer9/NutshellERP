"use client";

import { useEffect, useState } from "react";

const ROLE_LABELS: Record<string, string> = {
  ADMIN:   "Admin",
  BD_HEAD: "BD Head",
  SALES:   "Sales Rep",
};

export default function PermissionsPage() {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null);
  const [saved,   setSaved]   = useState<string | null>(null);

  // Local edits: { [roleName]: Set<permissionName> }
  const [edits, setEdits] = useState<Record<string, Set<string>>>({});

  const fetchData = async () => {
    setLoading(true);
    const res    = await fetch("/api/admin/permissions", { credentials: "include" });
    const result = await res.json();
    if (!result.error) {
      setData(result);
      // Init edits from current DB state
      const init: Record<string, Set<string>> = {};
      for (const role of result.roles ?? []) {
        init[role.name] = new Set(role.permissions);
      }
      setEdits(init);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const togglePermission = (roleName: string, permName: string) => {
    setEdits((prev) => {
      const set  = new Set(prev[roleName] ?? []);
      set.has(permName) ? set.delete(permName) : set.add(permName);
      return { ...prev, [roleName]: set };
    });
  };

  const saveRole = async (roleName: string) => {
    setSaving(roleName);
    const permissions = Array.from(edits[roleName] ?? []);
    const res = await fetch("/api/admin/permissions", {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ roleName, permissions }),
    });
    setSaving(null);
    if (res.ok) {
      setSaved(roleName);
      setTimeout(() => setSaved(null), 2000);
    }
  };

  if (loading) return <p style={{ color: "var(--text-muted)", padding: "40px 0" }}>Loading...</p>;

  const roles       = data?.roles       ?? [];
  const permissions = data?.permissions ?? [];
  const roleNames   = ["ADMIN", "BD_HEAD", "SALES"];

  return (
    <>
      <div className="page-header">
        <h1>Role Permissions</h1>
        <p>Control what each role can do across the system</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {roleNames.map((roleName) => {
          const current = edits[roleName] ?? new Set();
          const isSaving = saving === roleName;
          const wasSaved = saved === roleName;

          return (
            <div key={roleName} className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{ROLE_LABELS[roleName] ?? roleName}</h2>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{roleName}</span>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => saveRole(roleName)}
                  disabled={isSaving}
                  style={{ minWidth: 100 }}
                >
                  {isSaving ? "Saving…" : wasSaved ? "✓ Saved" : "Save"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                {permissions.map((perm: any) => {
                  const checked = current.has(perm.name);
                  return (
                    <label
                      key={perm.name}
                      style={{
                        display:     "flex",
                        gap:         10,
                        alignItems:  "flex-start",
                        cursor:      "pointer",
                        padding:     "10px 12px",
                        borderRadius: "var(--radius)",
                        border:      `1px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                        background:  checked ? "rgba(99,102,241,0.07)" : "transparent",
                        transition:  "border-color 0.15s, background 0.15s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(roleName, perm.name)}
                        style={{ marginTop: 2, flexShrink: 0, accentColor: "var(--accent)" }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                          {perm.label}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          {perm.description}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 20, padding: "14px 18px" }}>
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text-secondary)" }}>Note:</strong> Permissions define what each role is allowed to do.
          Changes take effect immediately on next login. Route-level enforcement is still governed by server-side role checks.
        </p>
      </div>
    </>
  );
}
