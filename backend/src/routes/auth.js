const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

const router = express.Router();

// POST /api/auth/login
// Accepts either "identifier" (email or employee code) — kept "email" too for backward compatibility
router.post("/login", async (req, res, next) => {
  try {
    const identifier = req.body.identifier || req.body.email;
    const { password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: "Email/Employee ID and password required" });
    }

    // Decide whether the identifier looks like an email or an employee code
    const isEmail = identifier.includes("@");
    const employee = await prisma.employee.findUnique({
      where: isEmail ? { email: identifier.toLowerCase().trim() } : { employeeCode: identifier.trim() },
    });
    if (!employee || !employee.isActive) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, employee.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: employee.id, role: employee.role, email: employee.email },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.json({
      token,
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        designation: employee.designation,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
