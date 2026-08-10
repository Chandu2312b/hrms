import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", roles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"] },
  { to: "/leave/apply", label: "Leave", roles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"] },
  { to: "/wfh/apply", label: "WFH", roles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"] },
  { to: "/employees", label: "Directory", roles: ["EMPLOYEE", "MANAGER", "HR", "ADMIN"] },
  { to: "/approvals", label: "Leave Approvals", roles: ["MANAGER", "HR", "ADMIN"] },
  { to: "/wfh/approvals", label: "WFH Approvals", roles: ["MANAGER", "HR", "ADMIN"] },
  { to: "/employees/add", label: "+ Add Employee", roles: ["HR", "ADMIN"] },
];

const ROLE_LABEL = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  HR: "HR",
  ADMIN: "Admin",
};

export default function Layout({ children, title, subtitle }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("hrms_user") || "{}");

  function logout() {
    localStorage.removeItem("hrms_token");
    localStorage.removeItem("hrms_user");
    navigate("/login");
  }

  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.role));

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
            <img src="/assets/logo.jpeg" alt="CraftyTech AI" className="brand-logo" />
            <span className="brand-word">
              craftytech<span className="brand-word-accent">.ai</span>
            </span>
          </Link>

          <button className="nav-toggle" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
            <span /><span /><span />
          </button>

          <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-link ${location.pathname === item.to ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={`nav-user ${menuOpen ? "open" : ""}`}>
            <Link to="/profile" className="user-chip" onClick={() => setMenuOpen(false)}>
              <span className="user-avatar">{(user.fullName || "?").charAt(0)}</span>
              <span>
                <span className="user-name">{user.fullName}</span>
                <span className={`role-badge role-${user.role}`}>{ROLE_LABEL[user.role]}</span>
              </span>
            </Link>
            <button className="btn secondary logout-btn" onClick={logout}>Logout</button>
          </div>
        </div>
      </header>

      <main className="container fade-in">
        {title && (
          <div className="page-heading">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        )}
        {children}
      </main>

      <footer className="app-footer">
        CraftyTech AI Digital Solutions Pvt. Ltd. — Internal HRMS
      </footer>
    </div>
  );
}
