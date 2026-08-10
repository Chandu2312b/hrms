import React, { useEffect, useState } from "react";
import api from "../api";
import Layout from "../components/Layout";
import { useToast } from "../components/Toast";

export default function ApplyLeave() {
  const [balances, setBalances] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [form, setForm] = useState({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
  const { showToast } = useToast();

  async function load() {
    const [b, r] = await Promise.all([api.get("/leave/balance"), api.get("/leave/me")]);
    setBalances(b.data);
    setMyRequests(r.data);
    if (b.data[0]) setForm((f) => ({ ...f, leaveTypeId: b.data[0].leaveTypeId }));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      await api.post("/leave/apply", form);
      showToast("Leave request submitted successfully!", "success");
      setForm({ leaveTypeId: balances[0]?.leaveTypeId || "", startDate: "", endDate: "", reason: "" });
      load();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to submit leave request", "error");
    }
  }

  return (
    <Layout title="Leave Management" subtitle="Apply for leave and track your balance">
      <div className="card">
        <h2>Leave Balance</h2>
        <table>
          <thead><tr><th>Type</th><th>Total</th><th>Used</th><th>Remaining</th></tr></thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.id}>
                <td>{b.leaveType.name}</td>
                <td>{b.totalDays}</td>
                <td>{b.usedDays}</td>
                <td>{b.totalDays - b.usedDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Apply for Leave</h2>
        <form onSubmit={handleSubmit}>
          <label>Leave Type</label>
          <select value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}>
            {balances.map((b) => <option key={b.leaveTypeId} value={b.leaveTypeId}>{b.leaveType.name}</option>)}
          </select>
          <label>Start Date</label>
          <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
          <label>End Date</label>
          <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
          <label>Reason</label>
          <textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <button className="btn" type="submit">Submit Request</button>
        </form>
      </div>

      <div className="card">
        <h3>My Requests</h3>
        <table>
          <thead><tr><th>Type</th><th>From</th><th>To</th><th>Status</th></tr></thead>
          <tbody>
            {myRequests.map((r) => (
              <tr key={r.id}>
                <td>{r.leaveType.name}</td>
                <td>{new Date(r.startDate).toLocaleDateString()}</td>
                <td>{new Date(r.endDate).toLocaleDateString()}</td>
                <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

