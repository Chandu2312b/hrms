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

const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(",").map((o) => o.trim().replace(/\/+$/, ""))
  : ["*"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.trim().replace(/\/+$/, "");
      if (
        allowedOrigins.includes("*") ||
        allowedOrigins.some((allowed) => allowed.includes(normalizedOrigin) || normalizedOrigin.includes(allowed))
      ) {
        return callback(null, true);
      }
      // Fallback allow for Vercel app domains
      if (normalizedOrigin.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
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
