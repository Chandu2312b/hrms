const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

function daysBetweenInclusive(start, end) {
  const ms = new Date(end) - new Date(start);
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

// GET /api/leave/balance
router.get("/balance", requireAuth, async (req, res, next) => {
  try {
    const year = new Date().getFullYear();
    const balances = await prisma.leaveBalance.findMany({
      where: { employeeId: req.user.id, year },
      include: { leaveType: true },
    });
    res.json(balances);
  } catch (err) {
    next(err);
  }
});

// POST /api/leave/apply
router.post("/apply", requireAuth, async (req, res, next) => {
  try {
    const { leaveTypeId, startDate, endDate, reason } = req.body;
    if (!leaveTypeId || !startDate || !endDate) {
      return res.status(400).json({ error: "leaveTypeId, startDate, endDate are required" });
    }

    const numDays = daysBetweenInclusive(startDate, endDate);
    const year = new Date(startDate).getFullYear();

    const balance = await prisma.leaveBalance.findUnique({
      where: { employeeId_leaveTypeId_year: { employeeId: req.user.id, leaveTypeId, year } },
    });
    if (balance && balance.usedDays + numDays > balance.totalDays) {
      return res.status(400).json({ error: "Insufficient leave balance" });
    }

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId: req.user.id,
        leaveTypeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        numDays,
        reason,
      },
    });

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

// GET /api/leave/me
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const requests = await prisma.leaveRequest.findMany({
      where: { employeeId: req.user.id },
      include: { leaveType: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

// GET /api/leave/pending - for managers/HR to review
router.get("/pending", requireAuth, requireRole("MANAGER", "HR", "ADMIN"), async (req, res, next) => {
  try {
    const reportIds =
      req.user.role === "MANAGER"
        ? (await prisma.employee.findMany({ where: { managerId: req.user.id }, select: { id: true } })).map((e) => e.id)
        : undefined; // HR/Admin see all pending

    const requests = await prisma.leaveRequest.findMany({
      where: {
        status: "PENDING",
        ...(reportIds ? { employeeId: { in: reportIds } } : {}),
      },
      include: { leaveType: true, employee: { select: { fullName: true, employeeCode: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/leave/:id/decision  { decision: "APPROVED" | "REJECTED", note }
router.patch("/:id/decision", requireAuth, requireRole("MANAGER", "HR", "ADMIN"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, note } = req.body;
    if (!["APPROVED", "REJECTED"].includes(decision)) {
      return res.status(400).json({ error: "decision must be APPROVED or REJECTED" });
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leaveRequest) return res.status(404).json({ error: "Leave request not found" });

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: decision, approverId: req.user.id, approverNote: note },
    });

    if (decision === "APPROVED") {
      const year = new Date(leaveRequest.startDate).getFullYear();
      await prisma.leaveBalance.updateMany({
        where: { employeeId: leaveRequest.employeeId, leaveTypeId: leaveRequest.leaveTypeId, year },
        data: { usedDays: { increment: leaveRequest.numDays } },
      });
      // Mark attendance days as ON_LEAVE
      const { startDate, endDate, employeeId } = leaveRequest;
      const dayMs = 24 * 60 * 60 * 1000;
      for (let t = new Date(startDate).getTime(); t <= new Date(endDate).getTime(); t += dayMs) {
        const d = new Date(t);
        await prisma.attendance.upsert({
          where: { employeeId_date: { employeeId, date: d } },
          update: { status: "ON_LEAVE" },
          create: { employeeId, date: d, status: "ON_LEAVE" },
        });
      }
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
