import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import Layout from "../components/Layout";

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [team, setTeam] = useState(null);
  const [companyStats, setCompanyStats] = useState(null);
  const user = JSON.parse(localStorage.getItem("hrms_user") || "{}");
  const isManager = user.role === "MANAGER";
  const isHRorAdmin = user.role === "HR" || user.role === "ADMIN";

  function isTodayRecord(record) {
    if (!record) return false;
    const todayStr = new Date().toDateString();
    if (record.clockIn && new Date(record.clockIn).toDateString() === todayStr) {
      return true;
    }
    if (record.clockOut && new Date(record.clockOut).toDateString() === todayStr) {
      return true;
    }
    if (record.date) {
      if (new Date(record.date).toDateString() === todayStr) return true;
      const localISO = new Date().toISOString().slice(0, 10);
      const recISO = new Date(record.date).toISOString().slice(0, 10);
      if (recISO === localISO) return true;
    }
    return false;
  }

  async function loadRecords() {
    try {
      const { data } = await api.get("/attendance/me");
      setRecords(data);
      const todayRec = data.find(isTodayRecord) || null;
      setToday(todayRec);
    } catch (err) {
      console.error("Failed to load attendance records:", err);
    }
  }

  async function loadManagerWidget() {
    const { data } = await api.get("/attendance/team");
    const present = data.filter((d) => d.attendance?.clockIn).length;
    const wfh = data.filter((d) => d.attendance?.status === "WORK_FROM_HOME").length;
    setTeam({ total: data.length, present, wfh, absent: data.length - present });
  }

  async function loadCompanyWidget() {
    const [emps, pendingLeave, pendingWfh] = await Promise.all([
      api.get("/employees"),
      api.get("/leave/pending"),
      api.get("/wfh/pending"),
    ]);
    setCompanyStats({
      headcount: emps.data.filter((e) => e.isActive).length,
      pendingLeave: pendingLeave.data.length,
      pendingWfh: pendingWfh.data.length,
    });
  }

  useEffect(() => {
    loadRecords();
    if (isManager) loadManagerWidget();
    if (isHRorAdmin) loadCompanyWidget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function clockIn() {
    setLoading(true);
    setActionError("");
    try {
      const { data } = await api.post("/attendance/clock-in");
      setToday(data);
      await loadRecords();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to clock in");
    } finally {
      setLoading(false);
    }
  }

  async function clockOut() {
    setLoading(true);
    setActionError("");
    try {
      const { data } = await api.post("/attendance/clock-out");
      setToday(data);
      await loadRecords();
    } catch (err) {
      setActionError(err.response?.data?.error || "Failed to clock out");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title={`Welcome back, ${user.fullName?.split(" ")[0] || ""} 👋`} subtitle={new Date().toDateString()}>

      <div className="card">
        <h2>Today's Attendance</h2>
        {actionError && <p style={{ color: "#c0392b", fontSize: 14 }}>⚠️ {actionError}</p>}
        {!today?.clockIn && <button className="btn" disabled={loading} onClick={clockIn}>Clock In</button>}
        {today?.clockIn && !today?.clockOut && (
          <>
            <p>Clocked in at {new Date(today.clockIn).toLocaleTimeString()}</p>
            <button className="btn secondary" disabled={loading} onClick={clockOut}>Clock Out</button>
          </>
        )}
        {today?.clockOut && (
          <p>✅ Done for today — {today.workHours} hrs worked
            ({new Date(today.clockIn).toLocaleTimeString()} – {new Date(today.clockOut).toLocaleTimeString()})</p>
        )}
      </div>

      {/* Manager-only widget */}
      {isManager && team && (
        <div className="card">
          <h3>Team Overview <span className="role-badge role-MANAGER" style={{ marginLeft: 6 }}>Manager</span></h3>
          <div className="stat-grid">
            <div className="stat-tile"><div className="stat-value">{team.total}</div><div className="stat-label">Direct Reports</div></div>
            <div className="stat-tile"><div className="stat-value">{team.present}</div><div className="stat-label">Present Today</div></div>
            <div className="stat-tile"><div className="stat-value">{team.wfh}</div><div className="stat-label">WFH Today</div></div>
            <div className="stat-tile"><div className="stat-value">{team.absent}</div><div className="stat-label">Not Clocked In</div></div>
          </div>
        </div>
      )}

      {/* HR/Admin-only widget */}
      {isHRorAdmin && companyStats && (
        <div className="card">
          <h3>Company Overview <span className="role-badge role-HR" style={{ marginLeft: 6 }}>HR</span></h3>
          <div className="stat-grid">
            <div className="stat-tile"><div className="stat-value">{companyStats.headcount}</div><div className="stat-label">Active Employees</div></div>
            <div className="stat-tile"><div className="stat-value">{companyStats.pendingLeave}</div><div className="stat-label">Pending Leave</div></div>
            <div className="stat-tile"><div className="stat-value">{companyStats.pendingWfh}</div><div className="stat-label">Pending WFH</div></div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <Link to="/employees/add" className="btn secondary" style={{ textDecoration: "none", textAlign: "center" }}>+ Add Employee</Link>
            <Link to="/employees" className="btn secondary" style={{ textDecoration: "none", textAlign: "center" }}>Full Directory</Link>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Quick Actions</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/leave/apply" className="btn" style={{ textDecoration: "none", textAlign: "center" }}>Apply for Leave</Link>
          <Link to="/wfh/apply" className="btn secondary" style={{ textDecoration: "none", textAlign: "center" }}>Request WFH</Link>
          {(isManager || isHRorAdmin) && (
            <>
              <Link to="/approvals" className="btn secondary" style={{ textDecoration: "none", textAlign: "center" }}>Leave Approvals</Link>
              <Link to="/wfh/approvals" className="btn secondary" style={{ textDecoration: "none", textAlign: "center" }}>WFH Approvals</Link>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Recent Attendance</h3>
        <table>
          <thead><tr><th>Date</th><th>In</th><th>Out</th><th>Status</th></tr></thead>
          <tbody>
            {records.slice(0, 10).map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.date).toLocaleDateString()}</td>
                <td>{r.clockIn ? new Date(r.clockIn).toLocaleTimeString() : "—"}</td>
                <td>{r.clockOut ? new Date(r.clockOut).toLocaleTimeString() : "—"}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
