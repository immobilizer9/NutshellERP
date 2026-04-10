"use client";

import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [user, setUser]         = useState<any>(null);
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [profileMsg, setProfileMsg] = useState({ text: "", ok: false });
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg]         = useState({ text: "", ok: false });
  const [savingPw, setSavingPw]   = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          setName(d.user.name ?? "");
          setPhone(d.user.phone ?? "");
        }
      });
  }, []);

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg({ text: "", ok: false });
    const res = await fetch("/api/auth/update-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, phone }),
    });
    const data = await res.json();
    if (res.ok) {
      setProfileMsg({ text: "Profile updated.", ok: true });
      setUser((u: any) => ({ ...u, name: data.name, phone: data.phone }));
    } else {
      setProfileMsg({ text: data.error || "Failed to update.", ok: false });
    }
    setSavingProfile(false);
  };

  const changePassword = async () => {
    setPwMsg({ text: "", ok: false });
    if (newPw !== confirmPw) {
      setPwMsg({ text: "New passwords do not match.", ok: false });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ text: "Password must be at least 8 characters.", ok: false });
      return;
    }
    setSavingPw(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwMsg({ text: "Password changed successfully.", ok: true });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } else {
      setPwMsg({ text: data.error || "Failed to change password.", ok: false });
    }
    setSavingPw(false);
  };

  if (!user) return <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>;

  return (
    <>
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Update your details and change your password</p>
      </div>

      {/* ── Info card ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 16 }}>Account Info</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label className="form-label">Email</label>
            <input className="input" value={user.email} disabled style={{ opacity: 0.6 }} />
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>Email cannot be changed. Contact admin if needed.</p>
          </div>
          <div>
            <label className="form-label">Role</label>
            <input className="input" value={user.roles?.join(", ") ?? "—"} disabled style={{ opacity: 0.6 }} />
          </div>
          <div>
            <label className="form-label">Full Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input className="input" placeholder="10-digit mobile number" value={phone}
              onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        {profileMsg.text && (
          <div className={`alert ${profileMsg.ok ? "alert-success" : "alert-error"}`} style={{ marginTop: 14 }}>
            {profileMsg.text}
          </div>
        )}
        <button
          className="btn btn-primary"
          style={{ marginTop: 16 }}
          onClick={saveProfile}
          disabled={savingProfile}
        >
          {savingProfile ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* ── Change password ── */}
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>Change Password</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
          <div>
            <label className="form-label">Current Password</label>
            <input className="input" type="password" value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" />
          </div>
          <div>
            <label className="form-label">New Password</label>
            <input className="input" type="password" value={newPw}
              onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>Minimum 8 characters.</p>
          </div>
          <div>
            <label className="form-label">Confirm New Password</label>
            <input className="input" type="password" value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" />
          </div>
          {pwMsg.text && (
            <div className={`alert ${pwMsg.ok ? "alert-success" : "alert-error"}`}>
              {pwMsg.text}
            </div>
          )}
          <button
            className="btn btn-primary"
            style={{ alignSelf: "flex-start" }}
            onClick={changePassword}
            disabled={savingPw || !currentPw || !newPw || !confirmPw}
          >
            {savingPw ? "Changing…" : "Change Password"}
          </button>
        </div>
      </div>
    </>
  );
}
