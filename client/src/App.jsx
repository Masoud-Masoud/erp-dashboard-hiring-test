import React from "react";
import { api, setToken, clearToken } from "./api.js";
import DebugPanel from "./DebugPanel.jsx";

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function App() {
  const [token, setTokenState] = React.useState(null);

  const [banner, setBanner] = React.useState(null); // { type: 'ok'|'err', text }
  const [loading, setLoading] = React.useState(false);

  // Auth
  async function handleLogin(username, password) {
    setBanner(null);
    setLoading(true);
    try {
      const r = await api.login(username, password);
      setToken(r.token);
      setTokenState(r.token);
    } catch (e) {
      setBanner({ type: "err", text: e.message || "Login failed" });
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearToken();
    setTokenState(null);
  }

  return (
    <div className="container">
      <div className="space-between" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>ERP Dashboard Hiring Test (Phase 1)</h2>
        {token && <button onClick={handleLogout}>Logout</button>}
      </div>

      {banner && <div className={`banner ${banner.type}`}>{banner.text}</div>}

      {!token ? (
        <LoginCard onLogin={handleLogin} loading={loading} />
      ) : (
        <Dashboard setBanner={setBanner} />
      )}

      <DebugPanel />
    </div>
  );
}

function LoginCard({ onLogin, loading }) {
  const [username, setUsername] = React.useState("candidate");
  const [password, setPassword] = React.useState("test123");

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Login</h3>
      <div className="row">
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="password" type="password" />
        <button className="primary" onClick={() => onLogin(username, password)} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </div>
      <div className="small" style={{ marginTop: 8 }}>
        Use the provided credentials in README.
      </div>
    </div>
  );
}

function Dashboard({ setBanner }) {
  const [search, setSearch] = React.useState("");
  const [jobs, setJobs] = React.useState([]);
  const [selectedJobId, setSelectedJobId] = React.useState(null);
  const [loadingJobs, setLoadingJobs] = React.useState(false);

  // Debounced jobs search
  React.useEffect(() => {
    const t = setTimeout(async () => {
      setLoadingJobs(true);
      try {
        const r = await api.getJobs(search);
        setJobs(r.items || []);
      } catch (e) {
        if (e.status === 401) {
          setBanner({ type: "err", text: "Session expired. Please login again." });
        } else {
          setBanner({ type: "err", text: e.message });
        }
      } finally {
        setLoadingJobs(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [search, setBanner]);

  return (
    <div className="row" style={{ alignItems: "stretch" }}>
      <div className="card" style={{ flex: 1, minWidth: 320 }}>
        <div className="space-between">
          <h3 style={{ marginTop: 0 }}>Jobs</h3>
          <span className="small">{loadingJobs ? "Loading..." : `${jobs.length} result(s)`}</span>
        </div>
        <input
          style={{ width: "100%" }}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by jobId, customer, description..."
        />
        <div style={{ marginTop: 12 }}>
          {jobs.map(j => (
            <div
              key={j.jobId}
              className="card"
              style={{
                marginBottom: 10,
                cursor: "pointer",
                borderColor: j.jobId === selectedJobId ? "#2f6fed" : "#e7e8ee"
              }}
              onClick={() => setSelectedJobId(j.jobId)}
            >
              <div><strong>{j.jobId}</strong> — {j.customer}</div>
              <div className="small">{j.description}</div>
            </div>
          ))}
          {jobs.length === 0 && <div className="small muted">No jobs found.</div>}
        </div>
      </div>

      <div style={{ flex: 2, minWidth: 520 }}>
        {selectedJobId ? (
          <Milestones jobId={selectedJobId} setBanner={setBanner} />
        ) : (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Milestones</h3>
            <div className="small muted">Select a job to view milestones.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Milestones({ jobId, setBanner }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // Track per-row edit state (drafts)
  const [editingId, setEditingId] = React.useState(null);
  const [draft, setDraft] = React.useState(null);

  async function load() {
    setLoading(true);
    setBanner(null);
    try {
      const r = await api.getMilestones(jobId);
      setItems(r.items || []);
    } catch (e) {
      setBanner({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    setEditingId(null);
    setDraft(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  function startEdit(m) {
    setEditingId(m.id);
    setDraft({ ...m }); // local copy
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function updateDraft(patch) {
    setDraft(d => ({ ...d, ...patch }));
  }

  async function saveEdit() {
    if (!draft) return;
    setBanner(null);

    // Enforce UI rules (candidate will refine)
    // If isComplete true and completionDate empty -> today
    if (draft.isComplete && !draft.completionDate) {
      draft.completionDate = todayISO();
    }
    // If isComplete false -> completionDate null
    if (!draft.isComplete) {
      draft.completionDate = null;
    }

    try {
      // TODO (candidate): ideally send only changed fields, not full object
      await api.updateMilestone(draft.id, {
        responsibleCode: draft.responsibleCode,
        isComplete: draft.isComplete,
        completionDate: draft.completionDate,
        note: draft.note
      });

      setBanner({ type: "ok", text: "Updated successfully." });
      cancelEdit();
      await load();
    } catch (e) {
      if (e.status === 401) {
        setBanner({ type: "err", text: "Session expired. Please login again." });
      } else {
        setBanner({ type: "err", text: e.message });
      }
    }
  }

  return (
    <div className="card">
      <div className="space-between">
        <h3 style={{ marginTop: 0 }}>Milestones — {jobId}</h3>
        <button onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
      </div>

      {loading ? (
        <div className="small muted">Loading milestones...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th style={{ width: 220 }}>Name</th>
              <th style={{ width: 140 }}>Responsible</th>
              <th style={{ width: 110 }}>Complete</th>
              <th style={{ width: 170 }}>Completion Date</th>
              <th>Note</th>
              <th style={{ width: 210 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(m => {
              const isEditing = editingId === m.id;
              const row = isEditing ? draft : m;

              return (
                <tr key={m.id}>
                  <td>
                    <div><strong>{m.name}</strong></div>
                    <div className="small">ID: {m.id}</div>
                  </td>

                  <td>
                    <input
                      value={row?.responsibleCode || ""}
                      disabled={!isEditing}
                      onChange={e => updateDraft({ responsibleCode: e.target.value })}
                    />
                  </td>

                  <td>
                    <input
                      type="checkbox"
                      checked={!!row?.isComplete}
                      disabled={!isEditing}
                      onChange={e => {
                        const checked = e.target.checked;
                        // Candidate should ensure these rules are applied correctly
                        updateDraft({
                          isComplete: checked,
                          completionDate: checked ? (row.completionDate || todayISO()) : null
                        });
                      }}
                    />
                  </td>

                  <td>
                    <input
                      type="date"
                      value={row?.completionDate || ""}
                      disabled={!isEditing || !row?.isComplete}
                      className={!row?.isComplete ? "muted" : ""}
                      onChange={e => updateDraft({ completionDate: e.target.value || null })}
                    />
                  </td>

                  <td>
                    <textarea
                      value={row?.note || ""}
                      disabled={!isEditing}
                      onChange={e => updateDraft({ note: e.target.value })}
                    />
                  </td>

                  <td>
                    {!isEditing ? (
                      <button onClick={() => startEdit(m)}>Edit</button>
                    ) : (
                      <div className="row">
                        <button className="primary" onClick={saveEdit}>Save</button>
                        <button onClick={cancelEdit}>Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan="6" className="small muted">No milestones for this job.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <div className="small" style={{ marginTop: 10 }}>
        Candidate tasks: improve UX, ensure rules, show errors/success clearly, and keep UI responsive.
      </div>
    </div>
  );
}
