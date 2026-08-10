require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const attendanceRoutes = require("./routes/attendance");
const leaveRoutes = require("./routes/leave");
const wfhRoutes = require("./routes/wfh");
const employeeRoutes = require("./routes/employees");

const app = express();

// Required behind any reverse proxy/load balancer (Vercel, AWS ALB, etc.) so
// req.ip reflects the real client IP from X-Forwarded-For instead of the
// proxy's own address. Needed for the office-IP restriction on clock-in/out.
app.set("trust proxy", true);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok", service: "craftytechai-hrms-api" }));

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/wfh", wfhRoutes);
app.use("/api/employees", employeeRoutes);

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

module.exports = app;
