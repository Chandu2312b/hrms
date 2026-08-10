const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// POST /api/wfh/apply  { date: "YYYY-MM-DD", reason }
router.post("/apply", requireAuth, async (req, res, next) => {
  try {
    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ error: "date is required" });

    const request = await prisma.wFHRequest.upsert({
      where: { employeeId_date: { employeeId: req.user.id, date: new Date(date) } },
      update: { reason, status: "PENDING", approverId: null, approverNote: null },
      create: { employeeId: req.user.id, date: new Date(date), reason },
    });

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

// GET /api/wfh/me
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const requests = await prisma.wFHRequest.findMany({
      where: { employeeId: req.user.id },
      orderBy: { date: "desc" },
    });
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

// GET /api/wfh/pending - manager/HR review queue
router.get("/pending", requireAuth, requireRole("MANAGER", "HR", "ADMIN"), async (req, res, next) => {
  try {
    const reportIds =
      req.user.role === "MANAGER"
        ? (await prisma.employee.findMany({ where: { managerId: req.user.id }, select: { id: true } })).map((e) => e.id)
        : undefined;

    const requests = await prisma.wFHRequest.findMany({
      where: { status: "PENDING", ...(reportIds ? { employeeId: { in: reportIds } } : {}) },
      include: { employee: { select: { fullName: true, employeeCode: true } } },
      orderBy: { date: "asc" },
    });
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/wfh/:id/decision  { decision: "APPROVED" | "REJECTED", note }
router.patch("/:id/decision", requireAuth, requireRole("MANAGER", "HR", "ADMIN"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, note } = req.body;
    if (!["APPROVED", "REJECTED"].includes(decision)) {
      return res.status(400).json({ error: "decision must be APPROVED or REJECTED" });
    }

    const updated = await prisma.wFHRequest.update({
      where: { id },
      data: { status: decision, approverId: req.user.id, approverNote: note },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
