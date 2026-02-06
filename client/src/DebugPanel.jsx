import React from "react";
import { getLastDebug, subscribeDebug } from "./api.js";

export default function DebugPanel() {
  const [open, setOpen] = React.useState(false);
  const [dbg, setDbg] = React.useState(getLastDebug());

  React.useEffect(() => subscribeDebug(setDbg), []);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="space-between">
        <div>
          <strong>Debug</strong>
          <div className="small">Last API request/response (for troubleshooting)</div>
        </div>
        <button onClick={() => setOpen(o => !o)}>{open ? "Hide" : "Show"}</button>
      </div>

      {open && (
        <pre style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
{dbg ? JSON.stringify(dbg, null, 2) : "No requests yet."}
        </pre>
      )}
    </div>
  );
}
