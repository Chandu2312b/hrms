import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { identifier, password });
      localStorage.setItem("hrms_token", data.token);
      localStorage.setItem("hrms_user", JSON.stringify(data.employee));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <img src="/assets/logo.jpeg" alt="CraftyTech AI" className="login-logo" />
        <h1>CraftyTech AI HRMS</h1>
        <p className="login-sub">Sign in to your workspace</p>
        <form onSubmit={handleSubmit}>
          <label>Email or Employee ID</label>
          <input
            type="text"
            placeholder="you@craftytechai.in or CTAI-0042"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p style={{ color: "#c0392b", fontSize: 13 }}>{error}</p>}
          <button className="btn" type="submit" disabled={loading} style={{ marginTop: 6 }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
