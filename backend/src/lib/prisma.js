// Serverless functions can be invoked many times concurrently, each
// potentially creating a fresh `PrismaClient` (and a fresh MongoDB
// connection) if we're not careful. This caches one instance per warm
// execution context (and across hot-reloads in local dev) instead of
// creating a new one per request.

const { PrismaClient } = require("@prisma/client");

const globalForPrisma = globalThis;

const prisma = globalForPrisma.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}

module.exports = prisma;
