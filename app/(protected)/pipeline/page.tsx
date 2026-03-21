"use client";

import { useEffect, useMemo, useState } from "react";

const EVENT_LABELS: Record<string, string> = {
  QUIZ:             "Quiz",
  TEACHER_TRAINING: "Teacher Training",
  MEETING:          "Meeting",
};

const OUTCOME_LABELS: Record<string, string> = {
  INTERESTED:      "Interested",
  FOLLOW_UP:       "Follow Up",
  NOT_INTERESTED:  "Not Interested",
  ORDER_PLACED:    "Order Placed",
};

// ── Log Visit Modal ─────────────────────────────────────────────────
function LogVisitModal({
  school,
  onClose,
  onSuccess,
}: {
  school: { id: string; name: string };
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const [outcome, setOutcome]           = useState("FOLLOW_UP");
  const [notes, setNotes]               = useState("");
  const [nextVisitDate, setNextVisitDate] = useState("");
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");

  const handleSave = async () => {
    setSaving(true); setError("");
    const res  = await fetch("/api/visits", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ schoolId: school.id, outcome, notes: notes || undefined, nextVisitDate: nextVisitDate || undefined }),
    });
    const data = await res.json();
    if (data.id) { onSuccess(); onClose(); }
    else { setError(data.error || "Failed to log visit."); setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fade-in" style={{ background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 24px 48px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: "0 0 2px" }}>Log Visit</h2>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{school.name}</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: 18, padding: "2px 8px" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label className="form-label">Outcome</label>
            <select className="input" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              {Object.entries(OUTCOME_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="What was discussed?" style={{ resize: "vertical" }} />
          </div>
          <div>
            <label className="form-label">Next Visit Date</label>
            <input className="input" type="date" value={nextVisitDate} onChange={(e) => setNextVisitDate(e.target.value)} />
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Log Visit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Schedule Event Modal ────────────────────────────────────────────
function ScheduleEventModal({
  school,
  onClose,
  onSuccess,
}: {
  school: { id: string; name: string };
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const [type, setType]   = useState("QUIZ");
  const [date, setDate]   = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const handleSave = async () => {
    if (!date) { setError("Date is required."); return; }
    setSaving(true); setError("");
    const res  = await fetch("/api/events", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ schoolId: school.id, type, date, notes: notes || undefined }),
    });
    const data = await res.json();
    if (data.id) { onSuccess(); onClose(); }
    else { setError(data.error || "Failed to schedule event."); setSaving(false); }
  };

  return (
    <div
      style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:60,padding:24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="fade-in" style={{ background:"var(--surface)",borderRadius:"var(--radius-xl)",border:"1px solid var(--border)",padding:28,width:"100%",maxWidth:420,boxShadow:"0 24px 48px rgba(0,0,0,0.18)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <div>
            <h2 style={{ margin:"0 0 2px" }}>Schedule Event</h2>
            <p style={{ margin:0,fontSize:13,color:"var(--text-muted)" }}>{school.name}</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize:18,padding:"2px 8px",lineHeight:1 }}>×</button>
        </div>

        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div>
            <label className="form-label">Event Type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="QUIZ">Quiz</option>
              <option value="TEACHER_TRAINING">Teacher Training</option>
              <option value="MEETING">Meeting</option>
            </select>
          </div>
          <div>
            <label className="form-label">Date *</label>
            <input className="input" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional details..." style={{ resize:"vertical" }} />
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginTop:12 }}>{error}</div>}

        <div style={{ display:"flex",gap:8,justifyContent:"flex-end",marginTop:18 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

const ITEMS_PER_PAGE = 10;

const STAGES = [
  "LEAD","CONTACTED","VISITED",
  "PROPOSAL_SENT","NEGOTIATION",
  "CLOSED_WON","CLOSED_LOST",
];

type School = {
  id: string; name: string; city: string; state: string; pipelineStage: string;
  assignedTo?: { id: string; name: string } | null;
  visits?: { createdAt: string }[];
  orders?: { netAmount: number; status: string }[];
};

// ── New Pipeline Modal ─────────────────────────────────────────────
function NewPipelineModal({
  onClose,
  onSuccess,
  currentUserId,
  userRole,
  salesTeam,
}: {
  onClose:       () => void;
  onSuccess:     () => void;
  currentUserId: string;
  userRole:      string;
  salesTeam:     { id: string; name: string }[];
}) {
  const [mode, setMode]           = useState<"existing"|"new">("existing");
  const [allSchools, setAllSchools] = useState<any[]>([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");

  // New school fields
  const [name, setName]                 = useState("");
  const [address, setAddress]           = useState("");
  const [city, setCity]                 = useState("");
  const [state, setState]               = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Pipeline config
  const [stage, setStage]               = useState("LEAD");
  const [assignedToId, setAssignedToId] = useState(currentUserId);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    fetch("/api/bd/schools", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAllSchools(Array.isArray(d) ? d : []));
  }, []);

  const filteredSchools = allSchools.filter((s) =>
    s.name.toLowerCase().includes(schoolSearch.toLowerCase()) ||
    s.city.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    setError("");

    if (mode === "existing" && !selectedSchoolId) {
      setError("Please select a school."); return;
    }
    if (mode === "new" && (!name || !city || !state)) {
      setError("School name, city, and state are required."); return;
    }

    setSubmitting(true);

    const payload =
      mode === "existing"
        ? { schoolId: selectedSchoolId, pipelineStage: stage, assignedToId }
        : { name, address, city, state, contactPerson, contactPhone, pipelineStage: stage, assignedToId };

    const res  = await fetch("/api/pipeline/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.id) { onSuccess(); onClose(); }
    else setError(data.error || "Failed to create pipeline.");
    setSubmitting(false);
  };

  const canAssign = userRole === "BD_HEAD" || userRole === "ADMIN";

  return (
    <div
      style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="fade-in"
        style={{ background:"var(--surface)",borderRadius:"var(--radius-xl)",border:"1px solid var(--border)",padding:28,width:"100%",maxWidth:520,boxShadow:"0 24px 48px rgba(0,0,0,0.18)",maxHeight:"90vh",overflowY:"auto" }}
      >
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <h2 style={{ margin:0 }}>Add to Pipeline</h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize:18,padding:"2px 8px",lineHeight:1 }}>×</button>
        </div>

        {/* Mode toggle */}
        <div style={{ display:"flex",gap:6,marginBottom:20,background:"var(--bg)",borderRadius:"var(--radius)",padding:4 }}>
          {[
            { key:"existing", label:"Select Existing School" },
            { key:"new",      label:"Create New School" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMode(key as any)}
              style={{
                flex:1,padding:"7px 0",border:"none",borderRadius:"var(--radius-sm)",cursor:"pointer",
                fontFamily:"inherit",fontSize:13,fontWeight:500,transition:"all 0.15s",
                background:mode===key?"var(--surface)":"transparent",
                color:mode===key?"var(--text-primary)":"var(--text-muted)",
                boxShadow:mode===key?"var(--shadow-sm)":"none",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Existing school picker */}
        {mode === "existing" && (
          <div style={{ marginBottom:16 }}>
            <label className="form-label">Search School</label>
            <input
              className="input" placeholder="Type to search..."
              value={schoolSearch} onChange={(e) => setSchoolSearch(e.target.value)}
              style={{ marginBottom:8 }}
            />
            <div style={{ maxHeight:200,overflowY:"auto",border:"1px solid var(--border)",borderRadius:"var(--radius)",background:"var(--bg)" }}>
              {filteredSchools.length === 0 ? (
                <p style={{ padding:"12px 14px",color:"var(--text-muted)",fontSize:13,margin:0 }}>
                  No schools found. Try creating a new one.
                </p>
              ) : (
                filteredSchools.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSchoolId(s.id)}
                    style={{
                      padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid var(--border-soft)",
                      background:selectedSchoolId===s.id?"var(--accent-soft)":"transparent",
                      display:"flex",justifyContent:"space-between",alignItems:"center",
                      transition:"background 0.1s",
                    }}
                  >
                    <div>
                      <p style={{ fontWeight:500,margin:0,fontSize:13.5,color:selectedSchoolId===s.id?"var(--accent)":"var(--text-primary)" }}>{s.name}</p>
                      <p style={{ color:"var(--text-muted)",fontSize:12,margin:"1px 0 0" }}>
                        {s.city}, {s.state}
                        {s.assignedTo && ` · Currently: ${s.assignedTo.name}`}
                      </p>
                    </div>
                    {selectedSchoolId===s.id && (
                      <svg viewBox="0 0 20 20" fill="var(--accent)" width={16} height={16}>
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* New school form */}
        {mode === "new" && (
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16 }}>
            <div style={{ gridColumn:"1 / -1" }}>
              <label className="form-label">School Name *</label>
              <input className="input" placeholder="e.g. St. Xavier's School" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div style={{ gridColumn:"1 / -1" }}>
              <label className="form-label">Address</label>
              <input className="input" placeholder="Street address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <label className="form-label">City *</label>
              <input className="input" placeholder="e.g. Siliguri" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label className="form-label">State *</label>
              <input className="input" placeholder="e.g. West Bengal" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Contact Person</label>
              <input className="input" placeholder="Principal name" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Contact Phone</label>
              <input className="input" placeholder="e.g. 9000000001" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
          </div>
        )}

        <hr className="divider" style={{ marginBottom:16 }} />

        {/* Pipeline config */}
        <div style={{ display:"grid",gridTemplateColumns:canAssign?"1fr 1fr":"1fr",gap:12,marginBottom:16 }}>
          <div>
            <label className="form-label">Pipeline Stage</label>
            <select className="input" value={stage} onChange={(e) => setStage(e.target.value)}>
              {STAGES.map((s) => <option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}
            </select>
          </div>

          {/* BD/Admin can assign to a team member */}
          {canAssign && (
            <div>
              <label className="form-label">Assign To</label>
              <select className="input" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
                <option value={currentUserId}>Myself</option>
                {salesTeam.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom:14 }}>{error}</div>}

        <div style={{ display:"flex",gap:8,justifyContent:"flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Adding..." : "Add to Pipeline"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Pipeline Page ─────────────────────────────────────────────
export default function PipelinePage() {
  const [schools, setSchools]   = useState<School[]>([]);
  const [loading, setLoading]   = useState(true);
  const [me, setMe]             = useState<{ userId:string; roles:string[] } | null>(null);
  const [salesTeam, setSalesTeam] = useState<{ id:string; name:string }[]>([]);
  const [allSalesUsers, setAllSalesUsers] = useState<{ id:string; name:string }[]>([]);

  const [search, setSearch]           = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [sortField, setSortField]     = useState("name");
  const [salesFilter, setSalesFilter] = useState(""); // BD/Admin filter
  const [selected, setSelected]       = useState<string[]>([]);
  const [page, setPage]               = useState(1);
  const [showModal, setShowModal]     = useState(false);
  const [eventSchool, setEventSchool] = useState<{ id: string; name: string } | null>(null);
  const [visitSchool, setVisitSchool] = useState<{ id: string; name: string } | null>(null);

  const isBDorAdmin = me?.roles.includes("BD_HEAD") || me?.roles.includes("ADMIN");

  // Load current user
  useEffect(() => {
    fetch("/api/auth/me", { credentials:"include" })
      .then((r) => r.json())
      .then((d) => { if (d?.user) setMe(d.user); });
  }, []);

  // Load sales team for BD/Admin filter
  useEffect(() => {
    if (!me) return;
    if (me.roles.includes("BD_HEAD")) {
      fetch("/api/bd/team", { credentials:"include" })
        .then((r) => r.json())
        .then((d) => setSalesTeam(Array.isArray(d) ? d : []));
    } else if (me.roles.includes("ADMIN")) {
      fetch("/api/admin/users", { credentials:"include" })
        .then((r) => r.json())
        .then((d) => {
          const sales = Array.isArray(d)
            ? d.filter((u:any) => u.roles?.some((r:any) => r.role.name === "SALES"))
            : [];
          setAllSalesUsers(sales);
        });
    }
  }, [me]);

  const fetchData = async (spId = salesFilter) => {
    setLoading(true);
    const params = spId ? `?salesPersonId=${spId}` : "";
    const res  = await fetch(`/api/pipeline${params}`, { credentials:"include" });
    const data = await res.json();
    setSchools(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { if (me) fetchData(); }, [me]);
  useEffect(() => { setPage(1); }, [search, stageFilter, sortField, salesFilter]);

  const handleSalesFilter = (val: string) => {
    setSalesFilter(val);
    fetchData(val);
  };

  const updateStage = async (schoolId: string, stage: string) => {
    await fetch("/api/pipeline/update-stage", {
      method:"POST", headers:{"Content-Type":"application/json"},
      credentials:"include", body:JSON.stringify({ schoolId, stage }),
    });
    fetchData();
  };

  const bulkUpdateStage = async (stage: string) => {
    if (!stage) return;
    await Promise.all(selected.map((id) => updateStage(id, stage)));
    setSelected([]);
  };

  const totalRevenue  = (s: School) => s.orders?.reduce((sum, o) => sum + o.netAmount, 0) ?? 0;
  const lastVisitDate = (s: School) => s.visits?.length ? new Date(s.visits[0].createdAt).toLocaleDateString() : "—";

  const exportCSV = () => {
    const rows = [
      ["School","City","Stage","Assigned To","Last Visit","Revenue"],
      ...filtered.map((s) => [`"${s.name}"`,`"${s.city}"`,s.pipelineStage,s.assignedTo?.name??"-",lastVisitDate(s),totalRevenue(s).toString()]),
    ];
    const csv = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = encodeURI(csv); a.download = "pipeline.csv"; a.click();
  };

  const filtered = useMemo(() => {
    let r = [...schools];
    if (search)              r = r.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.city.toLowerCase().includes(search.toLowerCase()));
    if (stageFilter!=="ALL") r = r.filter((s) => s.pipelineStage === stageFilter);
    r.sort((a, b) => {
      if (sortField==="city")    return a.city.localeCompare(b.city);
      if (sortField==="stage")   return a.pipelineStage.localeCompare(b.pipelineStage);
      if (sortField==="revenue") return totalRevenue(b) - totalRevenue(a);
      return a.name.localeCompare(b.name);
    });
    return r;
  }, [schools, search, stageFilter, sortField]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((page-1)*ITEMS_PER_PAGE, page*ITEMS_PER_PAGE);

  const toggleSelect    = (id:string, checked:boolean) => setSelected((p) => checked ? [...p,id] : p.filter((x) => x!==id));
  const toggleSelectAll = (checked:boolean) => setSelected(checked ? paginated.map((s) => s.id) : []);

  // The team list for the modal assign dropdown
  const teamForModal: { id:string; name:string }[] =
    me?.roles.includes("ADMIN") ? allSalesUsers : salesTeam;

  return (
    <>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24 }}>
        <div className="page-header" style={{ marginBottom:0 }}>
          <h1>Sales Pipeline</h1>
          <p>
            {me?.roles.includes("SALES")
              ? "Your assigned schools and pipeline stages"
              : "Team pipeline — filter by sales rep to drill down"}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}
          style={{ display:"flex",alignItems:"center",gap:7,flexShrink:0 }}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} style={{ width:14,height:14 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          New Pipeline
        </button>
      </div>

      {/* Controls row */}
      <div style={{ display:"grid",gridTemplateColumns:isBDorAdmin?"1fr 1fr 1fr 1fr auto":"1fr 1fr 1fr auto",gap:10,marginBottom:14 }}>
        <input className="input" placeholder="Search schools..." value={search} onChange={(e) => setSearch(e.target.value)} />

        <select className="input" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="ALL">All Stages</option>
          {STAGES.map((s) => <option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}
        </select>

        <select className="input" value={sortField} onChange={(e) => setSortField(e.target.value)}>
          <option value="name">Sort: Name</option>
          <option value="city">Sort: City</option>
          <option value="stage">Sort: Stage</option>
          <option value="revenue">Sort: Revenue ↓</option>
        </select>

        {/* ✅ Sales person filter — BD/Admin only */}
        {isBDorAdmin && (
          <select className="input" value={salesFilter} onChange={(e) => handleSalesFilter(e.target.value)}>
            <option value="">All Sales Reps</option>
            {(me?.roles.includes("ADMIN") ? allSalesUsers : salesTeam).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}

        <button className="btn btn-secondary" onClick={exportCSV}>Export CSV</button>
      </div>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div style={{ background:"var(--accent-soft)",border:"1px solid var(--accent-border)",borderRadius:"var(--radius-lg)",padding:"10px 16px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ fontSize:13,color:"var(--accent)",fontWeight:500 }}>{selected.length} selected</span>
          <select defaultValue="" onChange={(e) => bulkUpdateStage(e.target.value)} className="input" style={{ maxWidth:200 }}>
            <option value="">Move to stage...</option>
            {STAGES.map((s) => <option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}
          </select>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
          <span style={{ fontSize:13,color:"var(--text-muted)" }}>
            {filtered.length} school{filtered.length!==1?"s":""}
            {filtered.length>ITEMS_PER_PAGE&&` · page ${page} of ${totalPages}`}
          </span>
          {salesFilter && (
            <div style={{ fontSize:13,color:"var(--accent)",display:"flex",alignItems:"center",gap:6 }}>
              Showing: {(me?.roles.includes("ADMIN")?allSalesUsers:salesTeam).find(u=>u.id===salesFilter)?.name}
              <button onClick={() => handleSalesFilter("")} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:16,lineHeight:1,padding:"0 2px" }}>×</button>
            </div>
          )}
        </div>

        {loading ? (
          <p style={{ color:"var(--text-muted)",fontSize:13 }}>Loading...</p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width:40 }}>
                      <input type="checkbox"
                        checked={selected.length===paginated.length&&paginated.length>0}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        style={{ accentColor:"var(--accent)" }}
                      />
                    </th>
                    <th>School</th>
                    <th>City</th>
                    <th>Assigned To</th>
                    <th>Last Visit</th>
                    <th>Revenue</th>
                    <th>Stage</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((school) => (
                    <tr key={school.id}>
                      <td>
                        <input type="checkbox" checked={selected.includes(school.id)}
                          onChange={(e) => toggleSelect(school.id, e.target.checked)}
                          style={{ accentColor:"var(--accent)" }}
                        />
                      </td>
                      <td style={{ fontWeight:500 }}>{school.name}</td>
                      <td style={{ color:"var(--text-secondary)" }}>{school.city}</td>
                      <td style={{ color:"var(--text-secondary)" }}>{school.assignedTo?.name ?? "—"}</td>
                      <td style={{ color:"var(--text-secondary)" }}>{lastVisitDate(school)}</td>
                      <td style={{ fontWeight:600,fontFamily:"monospace" }}>
                        {totalRevenue(school)>0?`₹${totalRevenue(school).toLocaleString()}`:"—"}
                      </td>
                      <td>
                        <select
                          value={school.pipelineStage}
                          onChange={(e) => updateStage(school.id, e.target.value)}
                          className={`badge ${
                            school.pipelineStage==="CLOSED_WON" ?"badge-green":
                            school.pipelineStage==="CLOSED_LOST"?"badge-red":
                            school.pipelineStage==="NEGOTIATION"||school.pipelineStage==="PROPOSAL_SENT"?"badge-yellow":
                            school.pipelineStage==="VISITED"    ?"badge-indigo":
                            school.pipelineStage==="CONTACTED"  ?"badge-blue":"badge-gray"
                          }`}
                          style={{ border:"none",cursor:"pointer",fontFamily:"inherit",background:"transparent" }}
                        >
                          {STAGES.map((s) => <option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}
                        </select>
                      </td>
                      <td>
                        <div style={{ display:"flex",gap:4 }}>
                          <button className="btn btn-secondary" style={{ fontSize:11,padding:"4px 8px",whiteSpace:"nowrap" }}
                            onClick={() => setVisitSchool({ id: school.id, name: school.name })}>
                            Visit
                          </button>
                          <button className="btn btn-secondary" style={{ fontSize:11,padding:"4px 8px",whiteSpace:"nowrap" }}
                            onClick={() => setEventSchool({ id: school.id, name: school.name })}>
                            Event
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginated.length===0&&(
                    <tr><td colSpan={8} style={{ textAlign:"center",padding:"40px 0",color:"var(--text-muted)" }}>
                      {me?.roles.includes("SALES")
                        ? "No schools assigned to you yet. Click \"New Pipeline\" to add one."
                        : "No schools match your filters."}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages>1&&(
              <div style={{ display:"flex",justifyContent:"center",alignItems:"center",gap:6,marginTop:16 }}>
                <button className="btn btn-secondary" disabled={page===1} onClick={() => setPage(1)} style={{ fontSize:12 }}>«</button>
                <button className="btn btn-secondary" disabled={page===1} onClick={() => setPage(page-1)} style={{ fontSize:12 }}>‹ Prev</button>
                {Array.from({length:totalPages},(_,i)=>i+1)
                  .filter((p)=>p===1||p===totalPages||Math.abs(p-page)<=1)
                  .reduce((acc:(number|string)[],p,i,arr)=>{
                    if(i>0&&(p as number)-(arr[i-1] as number)>1)acc.push("...");
                    acc.push(p);return acc;
                  },[])
                  .map((p,i)=>p==="..."?(
                    <span key={`e${i}`} style={{ padding:"0 4px",color:"var(--text-muted)" }}>…</span>
                  ):(
                    <button key={p} onClick={() => setPage(p as number)}
                      style={{ padding:"5px 11px",borderRadius:"var(--radius)",fontSize:13,fontWeight:500,border:"1px solid var(--border)",cursor:"pointer",fontFamily:"inherit",background:page===p?"var(--accent)":"var(--surface)",color:page===p?"#fff":"var(--text-secondary)" }}>
                      {p}
                    </button>
                  ))}
                <button className="btn btn-secondary" disabled={page===totalPages} onClick={() => setPage(page+1)} style={{ fontSize:12 }}>Next ›</button>
                <button className="btn btn-secondary" disabled={page===totalPages} onClick={() => setPage(totalPages)} style={{ fontSize:12 }}>»</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Log Visit Modal */}
      {visitSchool && (
        <LogVisitModal
          school={visitSchool}
          onClose={() => setVisitSchool(null)}
          onSuccess={() => fetchData()}
        />
      )}

      {/* Schedule Event Modal */}
      {eventSchool && (
        <ScheduleEventModal
          school={eventSchool}
          onClose={() => setEventSchool(null)}
          onSuccess={() => {}}
        />
      )}

      {/* New Pipeline Modal */}
      {showModal && me && (
        <NewPipelineModal
          onClose={() => setShowModal(false)}
          onSuccess={() => fetchData()}
          currentUserId={me.userId}
          userRole={me.roles.includes("ADMIN") ? "ADMIN" : me.roles.includes("BD_HEAD") ? "BD_HEAD" : "SALES"}
          salesTeam={teamForModal}
        />
      )}
    </>
  );
}
