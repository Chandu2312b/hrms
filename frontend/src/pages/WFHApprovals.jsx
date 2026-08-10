import React, { useEffect, useState } from "react";
import api from "../api";
import Layout from "../components/Layout";

export default function WFHApprovals() {
  const [pending, setPending] = useState([]);

  async function load() {
    const { data } = await api.get("/wfh/pending");
    setPending(data);
  }
  useEffect(() => { load(); }, []);

  async function decide(id, decision) {
    await api.patch(`/wfh/${id}/decision`, { decision });
    load();
  }

  return (
    <Layout title="WFH Approvals" subtitle="Review and act on pending work-from-home requests">
      <div className="card">
        {pending.length === 0 && <p>No pending requests 🎉</p>}
        {pending.map((r) => (
          <div key={r.id} style={{ borderBottom: "1px solid var(--border)", padding: "14px 0" }}>
            <strong>{r.employee.fullName}</strong> ({r.employee.employeeCode})
            <p style={{ margin: "4px 0", color: "var(--grey)" }}>{new Date(r.date).toLocaleDateString()}</p>
            {r.reason && <p style={{ fontStyle: "italic" }}>"{r.reason}"</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" style={{ width: "auto" }} onClick={() => decide(r.id, "APPROVED")}>Approve</button>
              <button className="btn secondary" style={{ width: "auto" }} onClick={() => decide(r.id, "REJECTED")}>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
