// Seeds the database with default leave types and a starter set of accounts
// so you have working credentials to log in locally right away.
//
// Run with: npx prisma db seed
// (already wired up via the "prisma.seed" entry in package.json)

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding CraftyTech AI HRMS...");

  // 1. Leave types — matches the 18 days/year (Casual+Sick combined) policy
  const casualSick = await prisma.leaveType.upsert({
    where: { name: "Casual/Sick" },
    update: {},
    create: { name: "Casual/Sick", daysPerYear: 18 },
  });
  const earned = await prisma.leaveType.upsert({
    where: { name: "Earned" },
    update: {},
    create: { name: "Earned", daysPerYear: 0 },
  });
  const unpaid = await prisma.leaveType.upsert({
    where: { name: "Unpaid" },
    update: {},
    create: { name: "Unpaid", daysPerYear: 0 },
  });

  const year = new Date().getFullYear();
  const leaveTypes = [casualSick, earned, unpaid];

  async function seedBalances(employeeId) {
    for (const lt of leaveTypes) {
      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId: lt.id, year } },
        update: {},
        create: { employeeId, leaveTypeId: lt.id, year, totalDays: lt.daysPerYear, usedDays: 0 },
      });
    }
  }

  // 2. Admin / Founder account
  const adminPasswordHash = await bcrypt.hash("Admin@123", 10);
  const admin = await prisma.employee.upsert({
    where: { email: "bhargav@craftytechai.in" },
    update: {},
    create: {
      employeeCode: "CTAI-0001",
      fullName: "Bhargav Krishna Pathivada",
      email: "bhargav@craftytechai.in",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      employmentType: "FULL_TIME",
      department: "Founder's Office",
      designation: "Founder & CEO",
      dateOfJoining: new Date("2026-06-25"),
    },
  });
  await seedBalances(admin.id);

  // 3. HR account
  const hrPasswordHash = await bcrypt.hash("Hr@12345", 10);
  const hr = await prisma.employee.upsert({
    where: { email: "hr@craftytechai.in" },
    update: {},
    create: {
      employeeCode: "CTAI-0002",
      fullName: "Kamireddi Sahitya",
      email: "hr@craftytechai.in",
      passwordHash: hrPasswordHash,
      role: "HR",
      employmentType: "FULL_TIME",
      department: "Human Resources",
      designation: "HR Executive",
      dateOfJoining: new Date("2026-07-01"),
      managerId: admin.id,
    },
  });
  await seedBalances(hr.id);

  // 4. Sample Manager account
  const managerPasswordHash = await bcrypt.hash("Manager@123", 10);
  const manager = await prisma.employee.upsert({
    where: { email: "manager@craftytechai.in" },
    update: {},
    create: {
      employeeCode: "CTAI-0003",
      fullName: "Sample Manager",
      email: "manager@craftytechai.in",
      passwordHash: managerPasswordHash,
      role: "MANAGER",
      employmentType: "FULL_TIME",
      department: "Engineering",
      designation: "Engineering Manager",
      dateOfJoining: new Date("2026-07-01"),
      managerId: admin.id,
    },
  });
  await seedBalances(manager.id);

  // 5. Sample Employee account, reporting to the sample manager
  const empPasswordHash = await bcrypt.hash("Employee@123", 10);
  const employee = await prisma.employee.upsert({
    where: { email: "employee@craftytechai.in" },
    update: {},
    create: {
      employeeCode: "CTAI-0004",
      fullName: "Sample Employee",
      email: "employee@craftytechai.in",
      passwordHash: empPasswordHash,
      role: "EMPLOYEE",
      employmentType: "FULL_TIME",
      department: "Engineering",
      designation: "Software Engineer",
      dateOfJoining: new Date("2026-07-15"),
      managerId: manager.id,
    },
  });
  await seedBalances(employee.id);

  console.log("\nSeed complete. Login credentials for local testing:\n");
  console.table([
    { Role: "Admin / Founder", "Email or Employee ID": "bhargav@craftytechai.in / CTAI-0001", Password: "Admin@123" },
    { Role: "HR", "Email or Employee ID": "hr@craftytechai.in / CTAI-0002", Password: "Hr@12345" },
    { Role: "Manager", "Email or Employee ID": "manager@craftytechai.in / CTAI-0003", Password: "Manager@123" },
    { Role: "Employee", "Email or Employee ID": "employee@craftytechai.in / CTAI-0004", Password: "Employee@123" },
  ]);
  console.log("\n⚠️  Change these passwords immediately after first login in any real deployment.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
