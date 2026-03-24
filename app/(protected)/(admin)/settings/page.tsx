"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AdminSettingsPage() {
  const [me,      setMe]      = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  // editable fields
  const [visitDays,    setVisitDays]    = useState(30);
  const [deliveryDays, setDeliveryDays] = useState(7);
  const [emailApproval,   setEmailApproval]   = useState(true);
  const [emailRejection,  setEmailRejection]  = useState(true);
  const [emailTask,       setEmailTask]       = useState(true);
  const [emailOverdue,    setEmailOverdue]    = useState(false);

  // Drive OAuth + folder picker
  const [driveConnected,  setDriveConnected]  = useState(false);
  const [driveEmail,      setDriveEmail]      = useState<string | null>(null);
  const [driveFolderId,   setDriveFolderId]   = useState("");
  const [driveFolderName, setDriveFolderName] = useState("");
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [driveFolders,    setDriveFolders]    = useState<any[]>([]);
  const [driveLoading,    setDriveLoading]    = useState(false);
  const [driveError,      setDriveError]      = useState("");
  const [driveStatusMsg,  setDriveStatusMsg]  = useState("");
  const [disconnecting,   setDisconnecting]   = useState(false);
  const [breadcrumb,      setBreadcrumb]      = useState<{id: string; name: string}[]>([]);

  const searchParams = useSearchParams();

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me",        { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/settings", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/drive?action=status", { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
    ]).then(([meData, settingsData, driveStatus]) => {
      setMe(meData?.user);
      setOrgName(settingsData?.orgName ?? "");
      const s = settingsData?.settings ?? {};
      setSettings(s);
      setVisitDays(s.visitAlertDays    ?? 30);
      setDeliveryDays(s.deliveryAlertDays ?? 7);
      setEmailApproval(s.emailOnOrderApproval  ?? true);
      setEmailRejection(s.emailOnOrderRejection ?? true);
      setEmailTask(s.emailOnTaskAssignment ?? true);
      setEmailOverdue(s.emailOnOverdueTask ?? false);
      setDriveFolderId(s.driveFolderId ?? "");
      setDriveFolderName(s.driveFolderName ?? "");
      setDriveConnected(driveStatus?.connected ?? false);
      setDriveEmail(driveStatus?.email ?? null);
      setLoading(false);
    });

    // Handle OAuth redirect result
    const driveConnectedParam = searchParams.get("drive_connected");
    const driveErrorParam     = searchParams.get("drive_error");
    if (driveConnectedParam === "1") setDriveStatusMsg("✓ Google Drive connected successfully!");
    if (driveErrorParam)             setDriveStatusMsg(`Drive connection failed: ${driveErrorParam}`);
  }, []);

  const handleSave = async () => {
    setError("");
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method:      "PUT",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitAlertDays:        visitDays,
        deliveryAlertDays:     deliveryDays,
        emailOnOrderApproval:  emailApproval,
        emailOnOrderRejection: emailRejection,
        emailOnTaskAssignment: emailTask,
        emailOnOverdueTask:    emailOverdue,
        driveFolderId,
        driveFolderName,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) {
      setError(data.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  async function disconnectDrive() {
    setDisconnecting(true);
    const res = await fetch("/api/drive/auth", { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setDriveConnected(false);
      setDriveEmail(null);
      setDriveStatusMsg("Google Drive disconnected.");
    }
    setDisconnecting(false);
  }

  async function openDrivePicker() {
    setDrivePickerOpen(true);
    setDriveError("");
    setBreadcrumb([]);
    await loadFolders(null);
  }

  async function loadFolders(parentId: string | null) {
    setDriveLoading(true);
    setDriveError("");
    try {
      const url = parentId
        ? `/api/drive?action=folders&parentId=${parentId}`
        : "/api/drive?action=folders";
      const res  = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) { setDriveError(data.error ?? "Failed to load folders"); return; }
      setDriveFolders(data.folders ?? []);
    } finally {
      setDriveLoading(false);
    }
  }

  async function enterFolder(folder: { id: string; name: string }) {
    setBreadcrumb((prev) => [...prev, folder]);
    await loadFolders(folder.id);
  }

  async function navigateTo(index: number) {
    if (index < 0) {
      setBreadcrumb([]);
      await loadFolders(null);
    } else {
      const crumb = breadcrumb[index];
      setBreadcrumb((prev) => prev.slice(0, index + 1));
      await loadFolders(crumb.id);
    }
  }

  function selectFolder(folder: { id: string; name: string }) {
    const path = [...breadcrumb.map((b) => b.name), folder.name].join(" / ");
    setDriveFolderId(folder.id);
    setDriveFolderName(path);
    setDrivePickerOpen(false);
  }

  if (loading) return <p style={{ color: "var(--text-muted)", padding: "40px 0" }}>Loading…</p>;

  return (
    <>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Organization configuration and system preferences</p>
      </div>

      {/* ── Organization Info (read-only) ── */}
      <div className="card" style={{ maxWidth: 580, marginBottom: 16 }}>
        <h2 style={{ marginBottom: 16 }}>Organization Info</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label className="form-label">Organization Name</label>
            <input className="input" value={orgName} readOnly
              style={{ color: "var(--text-muted)", cursor: "not-allowed" }} />
          </div>
          <div>
            <label className="form-label">Organization ID</label>
            <input className="input" value={me?.organizationId ?? "—"} readOnly
              style={{ color: "var(--text-muted)", cursor: "not-allowed", fontFamily: "monospace", fontSize: 12 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="form-label">Your Role</label>
              <input className="input" value={(me?.roles ?? []).join(", ")} readOnly
                style={{ color: "var(--text-muted)", cursor: "not-allowed" }} />
            </div>
            <div>
              <label className="form-label">Your Email</label>
              <input className="input" value={me?.email ?? "—"} readOnly
                style={{ color: "var(--text-muted)", cursor: "not-allowed" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Alert Thresholds ── */}
      <div className="card" style={{ maxWidth: 580, marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>Alert Thresholds</h2>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 18 }}>
          Configure when schools and orders appear in alert views.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label className="form-label">Visit overdue after (days)</label>
            <input
              className="input"
              type="number"
              min={1} max={365}
              value={visitDays}
              onChange={(e) => setVisitDays(Number(e.target.value))}
            />
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
              Schools not visited in this many days appear in visit alerts.
            </p>
          </div>
          <div>
            <label className="form-label">Delivery alert window (days)</label>
            <input
              className="input"
              type="number"
              min={1} max={90}
              value={deliveryDays}
              onChange={(e) => setDeliveryDays(Number(e.target.value))}
            />
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
              Orders due within this many days appear in delivery alerts.
            </p>
          </div>
        </div>
      </div>

      {/* ── Email Notifications ── */}
      <div className="card" style={{ maxWidth: 580, marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>Email Notifications</h2>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 18 }}>
          Control which events trigger automatic email notifications.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Order approved",   desc: "Email to sales rep when their order is approved", value: emailApproval,   set: setEmailApproval   },
            { label: "Order rejected",   desc: "Email to sales rep when their order is rejected", value: emailRejection,  set: setEmailRejection  },
            { label: "Task assigned",    desc: "Email to sales rep when a task is assigned",       value: emailTask,       set: setEmailTask       },
            { label: "Overdue task",     desc: "Email reminder for tasks past their due date",     value: emailOverdue,    set: setEmailOverdue    },
          ].map(({ label, desc, value, set }) => (
            <label key={label} style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => set(e.target.checked)}
                style={{ marginTop: 3, accentColor: "var(--accent)" }}
              />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text-primary)" }}>{label}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ── Google Drive Integration ── */}
      <div className="card" style={{ maxWidth: 580, marginBottom: 16 }}>
        <h2 style={{ marginBottom: 4 }}>Google Drive Integration</h2>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16 }}>
          Connect your Google account to enable content backups and imports. Requires <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in your environment.
        </p>

        {driveStatusMsg && (
          <div className={`alert ${driveStatusMsg.startsWith("✓") ? "alert-success" : "alert-error"}`}
            style={{ marginBottom: 14 }}>
            {driveStatusMsg}
          </div>
        )}

        {/* Connection status */}
        <div style={{
          padding: "12px 14px", borderRadius: "var(--radius)",
          border: `1px solid ${driveConnected ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
          background: driveConnected ? "rgba(34,197,94,0.05)" : "var(--bg)",
          display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
        }}>
          <span style={{ fontSize: 22 }}>{driveConnected ? "✅" : "⬜"}</span>
          <div style={{ flex: 1 }}>
            {driveConnected ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  Connected as {driveEmail}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Google Drive access is active. You can browse folders and backup content.
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Not connected</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Click Connect to authorise with your Google account.
                </div>
              </>
            )}
          </div>
          {driveConnected ? (
            <button className="btn btn-ghost" style={{ fontSize: 12, color: "var(--red)" }}
              onClick={disconnectDrive} disabled={disconnecting}>
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          ) : (
            <a href="/api/drive/auth" className="btn btn-primary" style={{ fontSize: 13, textDecoration: "none" }}>
              Connect Google Drive
            </a>
          )}
        </div>

        {/* Folder picker — only shown when connected */}
        {driveConnected && (
          <>
            <label className="form-label">Backup Folder</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{
                flex: 1, border: "1px solid var(--border)", borderRadius: "var(--radius)",
                padding: "8px 12px", fontSize: 13,
                background: driveFolderId ? "rgba(99,102,241,0.05)" : "var(--bg)",
                color: driveFolderId ? "var(--text-primary)" : "var(--text-muted)",
                display: "flex", alignItems: "center", gap: 8, minHeight: 38,
              }}>
                {driveFolderId ? (
                  <>
                    <span>📁</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {driveFolderName || driveFolderId}
                    </span>
                    <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: 16, padding: 0 }}
                      onClick={() => { setDriveFolderId(""); setDriveFolderName(""); }}>×</button>
                  </>
                ) : (
                  <span>No folder selected — backups will fail until one is chosen</span>
                )}
              </div>
              <button className="btn btn-secondary" style={{ fontSize: 13, flexShrink: 0 }}
                onClick={openDrivePicker}>
                📂 Browse
              </button>
            </div>
            {driveFolderId && (
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                ID: <code style={{ fontFamily: "monospace" }}>{driveFolderId}</code>
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Drive folder picker modal ── */}
      {drivePickerOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={(e) => { if (e.target === e.currentTarget) setDrivePickerOpen(false); }}>
          <div style={{
            background: "var(--surface)", borderRadius: 10, width: 520, maxWidth: "95vw",
            maxHeight: "80vh", display: "flex", flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          }}>
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>Select Google Drive Folder</h2>
              <button className="btn btn-ghost" style={{ fontSize: 18, padding: "2px 8px" }}
                onClick={() => setDrivePickerOpen(false)}>×</button>
            </div>

            {/* Breadcrumb */}
            <div style={{ padding: "8px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", minHeight: 38 }}>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--accent)", padding: "2px 4px" }}
                onClick={() => navigateTo(-1)}>
                My Drive
              </button>
              {breadcrumb.map((crumb, i) => (
                <span key={crumb.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>/</span>
                  <button
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: i === breadcrumb.length - 1 ? "var(--text-primary)" : "var(--accent)", padding: "2px 4px" }}
                    onClick={() => navigateTo(i)}>
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>

            {/* Folder list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {driveError && (
                <div style={{ padding: "12px 20px", color: "var(--red)", fontSize: 13 }}>{driveError}</div>
              )}
              {driveLoading ? (
                <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  Loading folders…
                </div>
              ) : driveFolders.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  {breadcrumb.length === 0
                    ? "No folders shared with the service account. Share a folder first."
                    : "No subfolders here."}
                </div>
              ) : (
                driveFolders.map((folder: any) => (
                  <div key={folder.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 20px", gap: 12, cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}
                      onClick={() => enterFolder({ id: folder.id, name: folder.name })}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>📁</span>
                      <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {folder.name}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: 11, padding: "3px 8px" }}
                        onClick={() => enterFolder({ id: folder.id, name: folder.name })}
                        title="Open folder">
                        Open ›
                      </button>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: 11, padding: "3px 10px" }}
                        onClick={() => selectFolder({ id: folder.id, name: folder.name })}>
                        Select
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer: select current folder if navigated in */}
            {breadcrumb.length > 0 && (
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Current: {breadcrumb.map((b) => b.name).join(" / ")}
                </span>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: 13 }}
                  onClick={() => selectFolder(breadcrumb[breadcrumb.length - 1])}>
                  Use This Folder
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Save ── */}
      {error && (
        <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12, maxWidth: 580 }}>{error}</p>
      )}
      <div style={{ maxWidth: 580, marginBottom: 24 }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ minWidth: 140 }}
        >
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Settings"}
        </button>
      </div>

      {/* ── Quick Links ── */}
      <div className="card" style={{ maxWidth: 580 }}>
        <h2 style={{ marginBottom: 14 }}>Quick Links</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { href: "/admin/users",       label: "Manage Users",       desc: "Create, edit, deactivate users and assign managers" },
            { href: "/admin/schools",     label: "Manage Schools",     desc: "Edit school details and reassign between reps" },
            { href: "/admin/permissions", label: "Role Permissions",   desc: "Control what each role can access" },
            { href: "/admin/returns",     label: "Returns Management", desc: "View all product returns across orders" },
            { href: "/admin/financial",   label: "Financial Overview", desc: "Payments, deliveries, and outstanding amounts" },
            { href: "/admin/audit-log",   label: "Audit Log",          desc: "Full trail of all actions in the system" },
            { href: "/admin/metrics",     label: "System Metrics",     desc: "API health, database stats, usage metrics" },
          ].map(({ href, label, desc }) => (
            <a key={href} href={href} style={{ display: "block", padding: "12px 14px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", textDecoration: "none", transition: "border-color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
              <p style={{ fontWeight: 600, margin: "0 0 2px", fontSize: 13.5, color: "var(--text-primary)" }}>{label}</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>{desc}</p>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
