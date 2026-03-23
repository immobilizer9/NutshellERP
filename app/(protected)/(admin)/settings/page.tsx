"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me",        { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/settings", { credentials: "include" }).then((r) => r.json()),
    ]).then(([meData, settingsData]) => {
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
      setLoading(false);
    });
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
