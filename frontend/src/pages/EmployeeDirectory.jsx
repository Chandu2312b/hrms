import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import Layout from "../components/Layout";

export default function EmployeeDirectory() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const user = JSON.parse(localStorage.getItem("hrms_user") || "{}");
  const canAdd = user.role === "HR" || user.role === "ADMIN";

  async function load() {
    const { data } = await api.get("/employees");
    setEmployees(data);
  }
  useEffect(() => { load(); }, []);

  const filtered = employees.filter((e) =>
    [e.fullName, e.employeeCode, e.department, e.designation].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout title="Employee Directory" subtitle={`${employees.length} people at CraftyTech AI`}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <input
            type="text"
            placeholder="Search by name, code, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 0, maxWidth: 320 }}
          />
          {canAdd && (
            <Link to="/employees/add" className="btn" style={{ width: "auto", textDecoration: "none" }}>
              + Add Employee
            </Link>
          )}
        </div>
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Name</th><th>Code</th><th>Department</th><th>Designation</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id}>
                <td><Link to={`/employees/${e.id}`}>{e.fullName}</Link></td>
                <td>{e.employeeCode}</td>
                <td>{e.department || "—"}</td>
                <td>{e.designation || "—"}</td>
                <td>{e.isActive ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
