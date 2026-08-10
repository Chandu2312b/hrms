const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const PUBLIC_FIELDS = {
  id: true, employeeCode: true, fullName: true, email: true, role: true,
  employmentType: true, department: true, designation: true, dateOfJoining: true,
  managerId: true, isActive: true, phone: true,
};

const FULL_PROFILE_FIELDS = {
  ...PUBLIC_FIELDS,
  personalEmail: true, address: true, dateOfBirth: true, bloodGroup: true,
  emergencyContactName: true, emergencyContactPhone: true,
  panNumber: true, aadhaarNumber: true, bankAccountNumber: true, bankIfsc: true,
  manager: { select: { id: true, fullName: true, employeeCode: true } },
};

// GET /api/employees - directory (HR/Admin: everyone, Manager: direct reports, Employee: colleagues' basic info)
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const where =
      req.user.role === "HR" || req.user.role === "ADMIN"
        ? {}
        : req.user.role === "MANAGER"
        ? { OR: [{ managerId: req.user.id }, { id: req.user.id }] }
        : {}; // regular employees can see the directory (basic fields only) for org lookups

    const employees = await prisma.employee.findMany({
      where,
      select: PUBLIC_FIELDS,
      orderBy: { fullName: "asc" },
    });
    res.json(employees);
  } catch (err) {
    next(err);
  }
});

// GET /api/employees/me - my own full profile
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.user.id },
      select: FULL_PROFILE_FIELDS,
    });
    res.json(employee);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/employees/me - self-service edit (limited, safe fields only)
router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const allowed = ["phone", "personalEmail", "address", "bloodGroup", "emergencyContactName", "emergencyContactPhone"];
    const data = {};
    for (const key of allowed) if (key in req.body) data[key] = req.body[key];

    const updated = await prisma.employee.update({
      where: { id: req.user.id },
      data,
      select: FULL_PROFILE_FIELDS,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/employees/:id - full profile (HR/Admin, or own manager, or self)
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const isSelf = id === req.user.id;
    const isPrivileged = ["HR", "ADMIN"].includes(req.user.role);

    if (!isSelf && !isPrivileged) {
      const target = await prisma.employee.findUnique({ where: { id }, select: { managerId: true } });
      if (target?.managerId !== req.user.id) {
        return res.status(403).json({ error: "Not authorized to view this profile" });
      }
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: FULL_PROFILE_FIELDS,
    });
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    res.json(employee);
  } catch (err) {
    next(err);
  }
});

// POST /api/employees - create a new employee (HR/Admin only) - onboarding
router.post("/", requireAuth, requireRole("HR", "ADMIN"), async (req, res, next) => {
  try {
    const {
      employeeCode, fullName, email, password, role, employmentType,
      department, designation, dateOfJoining, managerId, phone,
    } = req.body;

    if (!employeeCode || !fullName || !email || !password || !dateOfJoining) {
      return res.status(400).json({
        error: "employeeCode, fullName, email, password, dateOfJoining are required",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const employee = await prisma.employee.create({
      data: {
        employeeCode, fullName, email: email.toLowerCase().trim(), passwordHash,
        role: role || "EMPLOYEE",
        employmentType: employmentType || "FULL_TIME",
        department, designation,
        dateOfJoining: new Date(dateOfJoining),
        managerId: managerId || null,
        phone,
      },
      select: PUBLIC_FIELDS,
    });

    // Seed default leave balances for the current year (18 days/year, per company policy)
    const leaveTypes = await prisma.leaveType.findMany();
    const year = new Date().getFullYear();
    for (const lt of leaveTypes) {
      await prisma.leaveBalance.create({
        data: { employeeId: employee.id, leaveTypeId: lt.id, year, totalDays: lt.daysPerYear, usedDays: 0 },
      });
    }

    res.status(201).json(employee);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "An employee with that code or email already exists" });
    }
    next(err);
  }
});

// PATCH /api/employees/:id - HR/Admin edit any field (role, department, manager, active status, etc.)
router.patch("/:id", requireAuth, requireRole("HR", "ADMIN"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const allowed = [
      "fullName", "role", "employmentType", "department", "designation", "managerId",
      "isActive", "phone", "personalEmail", "address", "bloodGroup",
      "emergencyContactName", "emergencyContactPhone", "panNumber", "aadhaarNumber",
      "bankAccountNumber", "bankIfsc",
    ];
    const data = {};
    for (const key of allowed) if (key in req.body) data[key] = req.body[key];

    const updated = await prisma.employee.update({ where: { id }, data, select: FULL_PROFILE_FIELDS });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/employees/:id/deactivate - offboarding (HR/Admin only), keeps history intact
router.patch("/:id/deactivate", requireAuth, requireRole("HR", "ADMIN"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await prisma.employee.update({
      where: { id },
      data: { isActive: false },
      select: PUBLIC_FIELDS,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
