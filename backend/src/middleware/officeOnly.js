// Restricts an endpoint to a whitelisted set of office IP addresses / CIDR ranges.
// Configure via OFFICE_IP_WHITELIST in .env, comma-separated, e.g.:
//   OFFICE_IP_WHITELIST="103.21.45.10,103.21.45.0/28"
//
// IMPORTANT (AWS/ALB deployments): the app must trust the proxy so req.ip reflects
// the real client IP from X-Forwarded-For rather than the load balancer's internal IP.
// This is set in src/index.js via `app.set("trust proxy", true)`.

const ipRangeCheck = require("ip-range-check");

function officeOnly(req, res, next) {
  const whitelist = (process.env.OFFICE_IP_WHITELIST || "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);

  if (whitelist.length === 0) {
    // Fail safe: if nothing is configured, block rather than silently allow from anywhere.
    return res.status(500).json({ error: "Office IP whitelist is not configured. Contact HR/IT." });
  }

  // req.ip may come back as "::ffff:1.2.3.4" (IPv4-mapped IPv6) — normalize it.
  let clientIp = req.ip || req.connection?.remoteAddress || "";
  if (clientIp.startsWith("::ffff:")) clientIp = clientIp.replace("::ffff:", "");

  const allowed = ipRangeCheck(clientIp, whitelist);
  if (!allowed) {
    return res.status(403).json({
      error: "Attendance can only be marked from the office network. Please connect to office Wi-Fi/network and try again.",
    });
  }

  next();
}

module.exports = { officeOnly };
