import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import Layout from "../components/Layout";
import { useToast } from "../components/Toast";

export default function AddEmployee() {
  const [managers, setManagers] = useState([]);
  const [form, setForm] = useState({
    employeeCode: "", fullName: "", email: "", password: "",
    role: "EMPLOYEE", employmentType: "FULL_TIME",
    department: "", designation: "", dateOfJoining: "", managerId: "", phone: "",
  });
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    api.get("/employees").then(({ data }) => setManagers(data));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = { ...form, managerId: form.managerId || null };
      const { data } = await api.post("/employees", payload);
      showToast(`${data.fullName} added (${data.employeeCode})`, "success");
      setTimeout(() => navigate(`/employees/${data.id}`), 900);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to create employee", "error");
    }
  }

  return (
    <Layout title="Add New Employee" subtitle="Creates their login and seeds this year's leave balance automatically">
      <div className="card">
        <form onSubmit={handleSubmit}>
          <label>Employee Code</label>
          <input placeholder="CTAI-0043" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} required />
          <label>Full Name</label>
          <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <label>Work Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <label>Temporary Password</label>
          <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <label>Employment Type</label>
          <select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
            <option value="FULL_TIME">Full-Time</option>
            <option value="INTERN">Intern</option>
          </select>
          <label>Role (system access level)</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="EMPLOYEE">Employee</option>
            <option value="MANAGER">Manager</option>
            <option value="HR">HR</option>
            <option value="ADMIN">Admin</option>
          </select>
          <label>Department</label>
          <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <label>Designation</label>
          <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          <label>Date of Joining</label>
          <input type="date" value={form.dateOfJoining} onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })} required />
          <label>Reporting Manager</label>
          <select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
            <option value="">— None —</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.fullName} ({m.employeeCode})</option>)}
          </select>
          <label>Phone</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <button className="btn" type="submit">Create Employee</button>
        </form>
      </div>
    </Layout>
  );
}

