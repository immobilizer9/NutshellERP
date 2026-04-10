"use client";

import { useEffect, useState } from "react";

const EMPTY_FORM = {
  name: "", address: "", city: "", state: "",
  latitude: "", longitude: "", contactPerson: "", contactPhone: "",
};

export default function BDSchoolsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");

  const fetchSchools = async () => {
    setLoading(true);
    const res = await fetch("/api/bd/schools", { credentials: "include" });
    const data = await res.json();
    setSchools(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchSchools(); }, []);

  const handleAdd = async () => {
    if (!form.name || !form.address || !form.city || !form.state) {
      setError("Name, address, city, and state are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/bd/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...form,
        latitude:  form.latitude  ? parseFloat(form.latitude)  : 0,
        longitude: form.longitude ? parseFloat(form.longitude) : 0,
      }),
    });
    const data = await res.json();
    if (data.id) {
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchSchools();
    } else {
      setError(data.error || "Failed to add school.");
    }
    setSubmitting(false);
  };

  const stages = Array.from(new Set(schools.map((s) => s.pipelineStage).filter(Boolean)));

  const filtered = schools.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "ALL" || s.pipelineStage === stageFilter;
    return matchSearch && matchStage;
  });

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Schools</h1>
          <p>Manage school accounts</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/admin/schools/bulk-upload" className="btn btn-secondary" style={{ textDecoration: "none", fontSize: 13 }}>
            Bulk Upload
          </a>
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ Add School"}
          </button>
        </div>
      </div>

      {/* ── Add School Form ── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ marginBottom: 16 }}>Add New School</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { key: "name",          label: "School Name *",    placeholder: "e.g. St. Xavier's School" },
              { key: "address",       label: "Address *",        placeholder: "Street address" },
              { key: "city",          label: "City *",           placeholder: "e.g. Siliguri" },
              { key: "state",         label: "State *",          placeholder: "e.g. West Bengal" },
              { key: "contactPerson", label: "Contact Person",   placeholder: "e.g. Principal Sharma" },
              { key: "contactPhone",  label: "Contact Phone",    placeholder: "e.g. 9000000001" },
              { key: "latitude",      label: "Latitude",         placeholder: "e.g. 26.7271" },
              { key: "longitude",     label: "Longitude",        placeholder: "e.g. 88.3953" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="form-label">{label}</label>
                <input
                  className="input"
                  placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={handleAdd} disabled={submitting}>
              {submitting ? "Adding..." : "Add School"}
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowForm(false); setError(""); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Search & Filter ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="Search by name or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <select
          className="input"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          style={{ maxWidth: 200 }}
        >
          <option value="ALL">All Stages</option>
          {stages.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* ── Schools Table ── */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>All Schools</h2>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {filtered.length} school{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div style={{ color: "var(--text-muted)", padding: "40px 0", textAlign: "center" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>{search || stageFilter !== "ALL" ? "No schools match your filters" : "No schools yet"}</p>
            <p>{!search && stageFilter === "ALL" ? "Add your first school using the button above" : "Try adjusting your search or filter"}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>Pipeline Stage</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((school) => (
                  <tr key={school.id}>
                    <td style={{ fontWeight: 500 }}>{school.name}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{school.city}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{school.state}</td>
                    <td style={{ fontSize: 13 }}>{school.contactPerson ?? "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{school.contactPhone ?? "—"}</td>
                    <td>
                      {school.pipelineStage
                        ? <span className="badge badge-indigo">{school.pipelineStage}</span>
                        : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      {school.assignedTo?.name ?? "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <a
                          href={`/bd/schools/${school.id}`}
                          className="btn btn-secondary"
                          style={{ fontSize: 12, padding: "4px 10px", textDecoration: "none" }}
                        >
                          View
                        </a>
                        <a
                          href={`/bd/schools/${school.id}/edit`}
                          className="btn btn-secondary"
                          style={{ fontSize: 12, padding: "4px 10px", textDecoration: "none" }}
                        >
                          Edit
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
