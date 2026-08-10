const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");
const { officeOnly } = require("../middleware/officeOnly");

const router = express.Router();

function todayDate() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

// Skips the office-IP check if the employee has an APPROVED WFH request for
// today; otherwise falls through to the normal office-only restriction.
async function officeOrApprovedWFH(req, res, next) {
  try {
    const wfh = await prisma.wFHRequest.findUnique({
      where: { employeeId_date: { employeeId: req.user.id, date: todayDate() } },
    });
    if (wfh?.status === "APPROVED") {
      req.isWFHToday = true;
      return next();
    }
  } catch (err) {
    return next(err);
  }
  return officeOnly(req, res, next);
}

// POST /api/attendance/clock-in
// officeOnly runs AFTER requireAuth so an unauthenticated request gets a 401
// (not a 403 IP error) — clearer error messages for the user.
router.post("/clock-in", requireAuth, officeOrApprovedWFH, async (req, res, next) => {
  try {
    const date = todayDate();
    let existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: req.user.id, date } },
    });
    if (!existing) {
      existing = await prisma.attendance.findFirst({
        where: { employeeId: req.user.id, clockOut: null },
        orderBy: { clockIn: "desc" },
      });
    }
    if (existing?.clockIn) return res.status(400).json({ error: "Already clocked in today" });

    const record = existing
      ? await prisma.attendance.update({
          where: { id: existing.id },
          data: { clockIn: new Date(), status: req.isWFHToday ? "WORK_FROM_HOME" : "PRESENT" },
        })
      : await prisma.attendance.create({
          data: {
            employeeId: req.user.id,
            date,
            clockIn: new Date(),
            status: req.isWFHToday ? "WORK_FROM_HOME" : "PRESENT",
          },
        });

    res.json(record);
  } catch (err) {
    next(err);
  }
});

// POST /api/attendance/clock-out
router.post("/clock-out", requireAuth, officeOrApprovedWFH, async (req, res, next) => {
  try {
    const date = todayDate();
    let existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: req.user.id, date } },
    });
    if (!existing) {
      existing = await prisma.attendance.findFirst({
        where: { employeeId: req.user.id, clockOut: null },
        orderBy: { clockIn: "desc" },
      });
    }
    if (!existing?.clockIn) return res.status(400).json({ error: "You haven't clocked in today" });
    if (existing.clockOut) return res.status(400).json({ error: "Already clocked out today" });

    const clockOut = new Date();
    const workHours = (clockOut - new Date(existing.clockIn)) / (1000 * 60 * 60);

    const record = await prisma.attendance.update({
      where: { id: existing.id },
      data: { clockOut, workHours: Math.round(workHours * 100) / 100 },
    });

    res.json(record);
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance/me?month=2026-08
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { month } = req.query; // "YYYY-MM"
    const where = { employeeId: req.user.id };
    if (month) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      where.date = { gte: start, lt: end };
    }
    const records = await prisma.attendance.findMany({ where, orderBy: { date: "desc" } });
    res.json(records);
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance/team - manager/HR view of direct reports for a given date
router.get("/team", requireAuth, requireRole("MANAGER", "HR", "ADMIN"), async (req, res, next) => {
  try {
    const { date } = req.query; // "YYYY-MM-DD"
    const targetDate = date ? new Date(date) : todayDate();

    const reports = await prisma.employee.findMany({
      where: req.user.role === "MANAGER" ? { managerId: req.user.id } : {},
      select: { id: true, fullName: true, employeeCode: true, department: true },
    });

    const records = await prisma.attendance.findMany({
      where: { employeeId: { in: reports.map((r) => r.id) }, date: targetDate },
    });

    const merged = reports.map((r) => ({
      ...r,
      attendance: records.find((a) => a.employeeId === r.id) || null,
    }));

    res.json(merged);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
