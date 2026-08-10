# CraftyTech AI HRMS — v1.2 (MongoDB Atlas + Vercel)

A responsive HRMS web app (works on PC, tablet, and mobile browsers) built with:
- **Backend:** Node.js + Express + Prisma ORM, deployed as a Vercel serverless function
- **Database:** MongoDB Atlas (free M0 tier)
- **Frontend:** React + Vite, branded with your logo, animated/motion UI, fully responsive, deployed on Vercel
- **Auth:** JWT-based login (email or Employee ID)
- **Hosting cost at this scale: $0/month** (Vercel Hobby + Atlas M0 free tiers)

This release bundles four modules that share one Employee table, one login
system, and one deployable app — ready to publish as a single release:

1. **Attendance** — office-network-restricted clock-in/clock-out
2. **Leave Management** — apply, balance tracking, manager/HR approval
3. **Work-From-Home Exceptions** — pre-approved WFH days bypass the office-IP check
4. **Employee Database** — directory, full profiles, HR onboarding/offboarding

Every page shares one branded navigation bar (your logo + gradient theme
derived from it), with **role-based navigation and dashboard widgets** —
Employees, Managers, and HR/Admins each see a different set of features (see
Section 3 below).

Payroll, Recruitment, and Performance modules are still on the roadmap (see
bottom of this file) and can be added later using the same patterns.

**Note on this migration:** the route files (business logic) are unchanged
from the PostgreSQL version — Prisma Client's API is identical across
providers. Only `prisma/schema.prisma`, the Prisma client setup, and the
deployment config changed. See Section 6 for what's different about MongoDB
and why.

---

## 0. Login Credentials (Local/Seeded Data)

Run the seed script (see Local Setup below) to create these starter accounts:

| Role | Email or Employee ID | Password |
|------|----------------------|----------|
| Admin / Founder | `bhargav@craftytechai.in` or `CTAI-0001` | `Admin@123` |
| HR | `hr@craftytechai.in` or `CTAI-0002` | `Hr@12345` |
| Manager (sample) | `manager@craftytechai.in` or `CTAI-0003` | `Manager@123` |
| Employee (sample) | `employee@craftytechai.in` or `CTAI-0004` | `Employee@123` |

**⚠️ These are for local testing only.** Change every password immediately
after first login in any real deployment, and delete/deactivate the sample
Manager and Employee accounts once you've added your real team via the "Add
Employee" screen.

---

## 1. Local Setup

### 1a. Create a free MongoDB Atlas cluster
1. Sign up at https://www.mongodb.com/cloud/atlas and create an **M0 (free)** cluster.
2. Database Access → add a database user (e.g. `hrms_admin`) with a strong password.
3. Network Access → add `0.0.0.0/0` (allow access from anywhere). This is
   required because Vercel serverless functions don't have static IPs —
   Atlas can't be locked to a specific IP range the way RDS could.
4. Connect → Drivers → copy the connection string, it looks like:
   `mongodb+srv://hrms_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   Add your database name before the `?`, e.g. `.../hrms_db?retryWrites=true...`

### 1b. Backend
```bash
cd backend
cp .env.example .env      # paste your Atlas connection string, JWT secret, office IP
npm install                # also runs "prisma generate" automatically (postinstall hook)
npx prisma db push         # creates collections/indexes from schema.prisma (MongoDB has no migrations)
npx prisma db seed         # creates the login accounts listed in Section 0
npm run dev                 # runs on http://localhost:4000
```

### 1c. Frontend
```bash
cd frontend
npm install
npm run dev                 # runs on http://localhost:5173
```

Create a `.env` in `frontend/` with:
```
VITE_API_URL=http://localhost:4000/api
```

Your logo is already placed at `frontend/public/assets/logo.jpeg` and used
across the login page, navbar, and browser favicon — replace that file
directly if you ever update the logo, no code changes needed.

---

## 2. Login & Office-IP Restrictions

**Login accepts email OR employee code.** The frontend now has a single
"Email or Employee ID" field. The backend (`auth.js`) detects which one was
entered by checking for `@` — no separate toggle needed.

**Clock-in/clock-out is restricted to the office network.** This is enforced
server-side (never trust a client-side check for this) via
`backend/src/middleware/officeOnly.js`:

1. Set `OFFICE_IP_WHITELIST` in `.env` — comma-separated public IPs and/or CIDR
   ranges, e.g. `OFFICE_IP_WHITELIST="103.21.45.10,103.21.45.0/28"`.
2. Find your office's public IP from an office machine at
   https://whatismyipaddress.com — if your ISP gives a static IP, use it
   directly; if it rotates within a small range, whitelist that range.
3. If you deploy behind AWS ALB/CloudFront, `req.ip` will show the load
   balancer's internal address unless you enable `trust proxy` — this is
   already set in `src/index.js`, so `X-Forwarded-For` is read correctly.
4. If someone tries to clock in/out from outside the office network, they'll
   get a clear error: *"Attendance can only be marked from the office
   network."*

**Two things worth deciding as you scale:**
- Office Wi-Fi with a dynamic public IP will occasionally change; budget for
  updating `OFFICE_IP_WHITELIST` when that happens, or ask your ISP for a
  static IP for the office connection.
- WFH days are now handled properly (see below) rather than being a gap in the system.

### Work-From-Home Exceptions

Employees can request a WFH day from the Dashboard → "Request WFH". Once a
manager/HR/admin approves it (Dashboard → "WFH Approvals"), that employee's
clock-in/clock-out for that specific date skips the office-IP check
automatically — no manual override needed. Attendance is recorded with a
`WORK_FROM_HOME` status so it's distinguishable from a normal office day in
reports.

### Employee Database

- **Directory** (`/employees`): searchable list of all employees. HR/Admin see
  everyone; Managers see their direct reports; regular employees see basic
  info for org lookups (name, department, designation — no sensitive fields).
- **Profiles** (`/employees/:id` or `/profile` for yourself): full details
  including emergency contact, PAN, Aadhaar, and bank details. Employees can
  self-edit safe fields (phone, address, emergency contact); PAN/Aadhaar/bank
  details and role/department changes are HR/Admin-only.
- **Add Employee** (`/employees/add`, HR/Admin only): creates the login,
  assigns a role/department/manager, and **automatically seeds that person's
  leave balance for the current year** based on your existing `LeaveType`
  records — no separate manual step needed when onboarding.
- **Deactivate** (`PATCH /api/employees/:id/deactivate`): soft-deletes an
  employee (keeps their attendance/leave history intact for records, but they
  can no longer log in).

**Before going live, seed your `LeaveType` table** (e.g., one row: "Casual/Sick",
`daysPerYear: 18`, matching your policy) via `npx prisma studio` — new
employees' balances are generated from whatever LeaveTypes exist at the time
they're added.

---

## 3. Role-Based Features

Every account has one of four roles, set when the employee is created (or
edited later by HR/Admin). The navbar, dashboard widgets, and available pages
all adapt automatically based on `user.role` — nobody sees a feature they
can't use.

| Feature | Employee | Manager | HR | Admin |
|---|:---:|:---:|:---:|:---:|
| Clock in/out, own attendance history | ✅ | ✅ | ✅ | ✅ |
| Apply for leave / WFH | ✅ | ✅ | ✅ | ✅ |
| View employee directory | ✅ (basic info) | ✅ | ✅ (full) | ✅ (full) |
| **Team Overview widget** (direct reports' attendance today) | — | ✅ | — | — |
| Approve/reject **direct reports'** leave & WFH | — | ✅ | — | — |
| Approve/reject **anyone's** leave & WFH | — | — | ✅ | ✅ |
| **Company Overview widget** (headcount, org-wide pending requests) | — | — | ✅ | ✅ |
| Add new employees (onboarding) | — | — | ✅ | ✅ |
| Edit anyone's profile, role, department, PAN/Aadhaar/bank details | — | — | ✅ | ✅ |
| Deactivate employees (offboarding) | — | — | ✅ | ✅ |

This is enforced in two layers — the frontend hides links/widgets a role
shouldn't see (`Layout.jsx`'s `NAV_ITEMS`, `Dashboard.jsx`'s conditional
widgets), and the **backend independently re-checks every request**
(`requireRole(...)` in the route files) — so it's not just a UI toggle,
someone can't get access by guessing a URL.

---

## 4. Design System

- **Branding:** your logo drives the whole palette — navy (`#0f1f3d` →
  `#1a3466`) and teal (`#16a8b8`) from the circuit/wrench mark, with an amber
  accent (`#e8834e`) pulled from the thread detail, used sparingly for
  highlights.
- **Typography:** Inter (Google Fonts), the same family most modern SaaS
  products use for a clean, professional feel.
- **Motion:** cards fade/slide in on load with a slight stagger, buttons lift
  on hover, the navbar logo tilts on hover, status badges and role chips use
  color coding throughout. All motion is CSS-only (no extra JS libraries),
  so it stays fast.
- **Responsiveness:** the navbar collapses into a hamburger menu under 860px;
  everything else uses fluid grids and flex-wrap so it works from a 360px
  phone up to a widescreen monitor without separate mobile/desktop code paths.
- All of this lives in `frontend/src/styles.css` and
  `frontend/src/components/Layout.jsx` — one shared layout wraps every
  authenticated page, so any future page automatically gets the same
  navbar, spacing, and motion for free.

---

## 5. Deployment — Vercel + MongoDB Atlas

```
                    Vercel (Frontend Project)
                    React build, served as static
                    files from Vercel's CDN
                              │
                    calls VITE_API_URL
                              │
                              ▼
                    Vercel (Backend Project)
                    Express app running as a single
                    serverless function (api/index.js)
                              │
                              ▼
                    MongoDB Atlas (M0 free cluster)
```

We deploy the frontend and backend as **two separate Vercel projects** from
the same repo (set each project's "Root Directory" to `frontend` or `backend`
respectively) — this keeps them independently deployable and avoids
monorepo build complexity.

### Step-by-step

**A. Database — MongoDB Atlas** (see Section 1a above for full steps)
Create the free M0 cluster, add a DB user, whitelist `0.0.0.0/0`, and grab the
connection string.

**B. Backend — Vercel serverless**
1. Push this repo to GitHub (or GitLab/Bitbucket).
2. In Vercel, "Add New Project" → import the repo → set **Root Directory** to `backend`.
3. Framework preset: "Other". Vercel will detect `api/index.js` automatically
   via the `vercel.json` rewrite rule already included in `backend/`.
4. Add environment variables in the Vercel project settings:
   - `DATABASE_URL` — your Atlas connection string
   - `JWT_SECRET` — a long random string
   - `FRONTEND_ORIGIN` — your frontend's Vercel URL (set this after step C)
   - `OFFICE_IP_WHITELIST` — your office's public IP/range
   - `NODE_ENV` — `production`
5. Deploy. Vercel runs `npm install` (which triggers `prisma generate` via
   the `postinstall` hook) automatically — no separate build step needed for
   a plain Node API.
6. **Before first use**, run `npx prisma db push` and `npx prisma db seed`
   from your local machine with `DATABASE_URL` pointed at the same Atlas
   cluster, to create collections/indexes and the starter accounts.

**C. Frontend — Vercel static**
1. "Add New Project" again → same repo → set **Root Directory** to `frontend`.
2. Framework preset: Vercel auto-detects Vite.
3. Add environment variable: `VITE_API_URL` = `https://your-backend-project.vercel.app/api`
4. Deploy. The included `frontend/vercel.json` handles the SPA fallback
   routing so React Router's client-side routes (like `/employees/:id`) work
   on direct page loads and refreshes.
5. Go back to the backend project's env vars and set `FRONTEND_ORIGIN` to
   this frontend URL, then redeploy the backend so CORS allows it.

**D. Custom domain (optional)**
Both projects can have a custom domain attached in Vercel's dashboard (e.g.
`hrms.craftytechai.in` for frontend, `api.craftytechai.in` for backend) —
no separate DNS/CDN setup needed, Vercel handles SSL automatically.

**E. CI/CD**
This is automatic — Vercel redeploys both projects on every push to your
main branch by default. No extra GitHub Actions setup required.

**F. Cost at this scale**
- Vercel Hobby plan: free (fine for internal tools; upgrade to Pro if you
  need team collaboration features or hit function execution limits).
- MongoDB Atlas M0: free, 512MB storage — plenty for a company of this size
  for a long while.
- **Total: $0/month** until you outgrow the free tiers.

---

## 6. Why MongoDB Here Is a Trade-off (Not Just an Upgrade)

You get free hosting, but it's worth knowing what changed under the hood:

- **Transactions still work** — MongoDB Atlas clusters (including the free
  M0 tier) run as replica sets, which support multi-document transactions.
  The leave-approval flow (updating a leave balance *and* several attendance
  records together) still happens atomically the way it did on Postgres.
- **No enforced foreign keys** — Postgres would reject an `Attendance` row
  pointing at a deleted `Employee`. MongoDB won't stop you; Prisma emulates
  relational integrity at the application layer (`relationMode = "prisma"`,
  the default for this connector) instead of the database enforcing it.
  Day-to-day this is invisible since all writes go through Prisma anyway,
  but it's worth knowing if anyone ever writes to the database directly.
- **Reporting gets more manual over time** — right now our queries are
  simple lookups and Prisma handles them identically on both providers. But
  once you want cross-collection reports (e.g. "attendance % by department
  last quarter"), Postgres would do that in one SQL join; MongoDB needs an
  aggregation pipeline, which is more code to write and maintain.
- **No static IP for the database connection** — Atlas has to allow
  `0.0.0.0/0` because Vercel's serverless functions don't have a fixed
  outbound IP (unlike a persistent EC2/ECS instance). Restrict access at the
  database-user/password level instead, and use a strong `JWT_SECRET`.

None of this blocks anything we've built — it's just worth revisiting if the
company grows enough that complex cross-team reporting becomes a regular
need. At that point, moving the database back to Postgres (RDS or Vercel's
own Postgres integration) while keeping the Vercel-hosted frontend/backend is
a much smaller change than this migration was, since none of the route logic
would need to change again.

---

## 7. Why We Originally Considered PostgreSQL over DynamoDB

(Kept for reference, from when we chose the initial architecture — the
reasoning about relational vs. document-at-massive-scale still applies;
MongoDB in Section 6 is a different trade-off than DynamoDB was.)

- HR data is relational (employees ↔ managers ↔ attendance ↔ leave ↔ payroll) — a relational or document database with strong query support handles joins and ad-hoc reporting far better than a key-value store like DynamoDB.
- Leave balance deductions need transactional consistency — both Postgres and MongoDB Atlas handle this cleanly with ACID transactions (see `leave.js` — approving a request updates the balance and attendance atomically in one request).
- You'll want flexible reporting for compliance/audits — awkward in DynamoDB regardless of whether the primary store ends up being SQL or MongoDB.
- DynamoDB is best for very high-scale, simple-access-pattern workloads — not the profile of an internal company HRMS.

---

## 8. Suggested Roadmap for Remaining Modules

1. ✅ Attendance (office-IP restricted) & Leave Management
2. ✅ Work-From-Home Exceptions
3. ✅ Employee Database & Profiles (org chart, onboarding, self-service edits)
4. Payroll & CTC processing (monthly payslip generation, integrates with the offer letter CTC structure)
5. Recruitment/Onboarding pipeline (candidate tracking, auto-generates offer letters using the templates already built)
6. Performance/Appraisal tracking

Each new module can reuse the same Employee table and auth system — just add
new Prisma models and route files, following the pattern used in
`attendance.js`, `leave.js`, `wfh.js`, and `employees.js`.
