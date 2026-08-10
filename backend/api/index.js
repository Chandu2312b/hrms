// Vercel serverless entry point. Combined with the root vercel.json rewrite
// (which forwards every request path to this function), the Express app in
// src/app.js handles routing exactly as it does locally — no code
// duplication between local dev and production.

module.exports = require("../src/app");
