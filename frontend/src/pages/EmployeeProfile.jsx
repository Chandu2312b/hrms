import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import Layout from "../components/Layout";

const SELF_SERVICE_FIELDS = ["phone", "personalEmail", "address", "bloodGroup", "emergencyContactName", "emergencyContactPhone"];
const HR_ONLY_FIELDS = ["fullName", "role", "employmentType", "department", "designation", "isActive", "panNumber", "aadhaarNumber", "bankAccountNumber", "bankIfsc"];

export default function EmployeeProfile() {
  const { id } = useParams();
  const currentUser = JSON.parse(localStorage.getItem("hrms_user") || "{}");
  const isMe = !id || id === currentUser.id;
  const isHR = currentUser.role === "HR" || currentUser.role === "ADMIN";

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [message, setMessage] = useState("");

  async function load() {
    const { data } = await api.get(isMe ? "/employees/me" : `/employees/${id}`);
    setProfile(data);
    setForm(data);
  }
  useEffect(() => { load(); }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setMessage("");
    try {
      const endpoint = isMe ? "/employees/me" : `/employees/${id}`;
      const fields = isMe ? SELF_SERVICE_FIELDS : [...SELF_SERVICE_FIELDS, ...HR_ONLY_FIELDS];
      const payload = {};
      fields.forEach((f) => { if (form[f] !== undefined) payload[f] = form[f]; });

      const { data } = await api.patch(endpoint, payload);
      setProfile(data);
      setMessage("✅ Profile updated");
    } catch (err) {
      setMessage("❌ " + (err.response?.data?.error || "Failed to update"));
    }
  }

  if (!profile) return <Layout><p>Loading...</p></Layout>;

  return (
    <Layout title={profile.fullName} subtitle={`${profile.employeeCode} · ${profile.designation || "—"}`}>
      <div className="card">
        <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div className="stat-tile"><div className="stat-value" style={{ fontSize: 15 }}>{profile.department || "—"}</div><div className="stat-label">Department</div></div>
          <div className="stat-tile"><div className="stat-value" style={{ fontSize: 15 }}>{profile.email}</div><div className="stat-label">Work Email</div></div>
          <div className="stat-tile"><div className="stat-value" style={{ fontSize: 15 }}>{profile.dateOfJoining ? new Date(profile.dateOfJoining).toLocaleDateString() : "—"}</div><div className="stat-label">Joined</div></div>
          {profile.manager && <div className="stat-tile"><div className="stat-value" style={{ fontSize: 15 }}>{profile.manager.fullName}</div><div className="stat-label">Reports To</div></div>}
        </div>
      </div>

      <div className="card">
        <h3>{isMe ? "Edit My Details" : "Edit Details (HR)"}</h3>
        <form onSubmit={handleSave}>
          {isHR && !isMe && (
            <>
              <label>Full Name</label>
              <input value={form.fullName || ""} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              <label>Department</label>
              <input value={form.department || ""} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              <label>Designation</label>
              <input value={form.designation || ""} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
              <label>Role</label>
              <select value={form.role || "EMPLOYEE"} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="HR">HR</option>
                <option value="ADMIN">Admin</option>
              </select>
            </>
          )}

          <label>Phone</label>
          <input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <label>Personal Email</label>
          <input value={form.personalEmail || ""} onChange={(e) => setForm({ ...form, personalEmail: e.target.value })} />
          <label>Address</label>
          <textarea rows={2} value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <label>Blood Group</label>
          <input value={form.bloodGroup || ""} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} />
          <label>Emergency Contact Name</label>
          <input value={form.emergencyContactName || ""} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} />
          <label>Emergency Contact Phone</label>
          <input value={form.emergencyContactPhone || ""} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} />

          {isHR && (
            <>
              <label>PAN Number</label>
              <input value={form.panNumber || ""} onChange={(e) => setForm({ ...form, panNumber: e.target.value })} />
              <label>Aadhaar Number</label>
              <input value={form.aadhaarNumber || ""} onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })} />
              <label>Bank Account Number</label>
              <input value={form.bankAccountNumber || ""} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })} />
              <label>Bank IFSC</label>
              <input value={form.bankIfsc || ""} onChange={(e) => setForm({ ...form, bankIfsc: e.target.value })} />
            </>
          )}

          {message && <p>{message}</p>}
          <button className="btn" type="submit">Save Changes</button>
        </form>
      </div>
    </Layout>
  );
}
