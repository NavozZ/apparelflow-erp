# ApparelFlow ERP

**Production Batch Verification & Sewing Queue Gate**

A full-stack, role-based garment manufacturing workflow application built for the **Webtezza (Pvt) Ltd — Software Engineering Intern Practical Challenge**.

ApparelFlow ERP manages cutting orders, verifies garment component quantities, enforces server-side production approval rules, records verification decisions, and releases approved batches to the sewing department.

**Live Application:** https://apparelflow-erp-two.vercel.app

**GitHub Repository:** https://github.com/NavozZ/apparelflow-erp

## 1. Project Overview

In garment manufacturing, incomplete or incorrectly counted cutting batches can disrupt sewing operations and cause material wastage.

ApparelFlow ERP implements a controlled workflow to prevent unverified or shortage batches from reaching the sewing department.

The application provides:

- Real authentication with three distinct production roles.

- Server-side Role-Based Access Control (RBAC).

- Predefined garment production recipes.

- Cutting order creation and automatic component quantity calculation.

- Component-by-component cutting verification.

- Real-time GREEN, YELLOW, and RED component classifications.

- Strict server-side approval validation.

- Recipe-based fabric wastage calculations.

- Approval and rejection audit logging.

- Database-level protection against modification of audit logs.

- Verified-only Sewing Queue with component and audit details.

- Persistent PostgreSQL database storage.

- Automated unit and mocked API-handler tests.

- Cloud deployment using Vercel and Supabase.

## 2. Technology Stack

| Layer | Technology |

|---|---|

| Frontend | Next.js 16 App Router, React 19, TypeScript |

| Styling | Tailwind CSS 4 |

| Backend | Next.js API Route Handlers |

| Authentication | Auth.js / NextAuth Credentials |

| Password Hashing | Argon2id |

| Authorization | Server-side RBAC |

| Database | Supabase PostgreSQL |

| ORM | Prisma 7 with PostgreSQL adapter |

| Validation | Zod |

| Automated Testing | Vitest |

| Deployment | Vercel |

| Version Control | Git and GitHub |

## 3. System Architecture

The application uses a full-stack Next.js architecture with persistent relational storage.

```text

                  Web Browser

                       |

                       v

             Next.js 16 Application

                       |

          +------------+------------+

          |                         |

          v                         v

     React UI                 API Route Handlers

          |                         |

          |                         v

          |               Authentication / RBAC

          |                         |

          |                         v

          |                 Business Validation

          |                         |

          |                         v

          |                  Prisma ORM 7

          |                         |

          +-------------------------+

                                    |

                                    v

                           Supabase PostgreSQL

                                    |

                         +----------+----------+

                         |                     |

                         v                     v

                    Production Data       Audit Records

```

### Architectural Principles

**Server-side authorization:** Protected routes verify the authenticated user's role before performing database operations.

**Persistent data:** Cutting orders, component counts, verification statuses, and audit decisions are stored in PostgreSQL.

**Transactional approval:** Approval and audit-log creation occur inside the same database transaction.

**Concurrency coordination:** Order-level PostgreSQL row locking coordinates component updates and verification decisions.

**Database query isolation:** The Sewing Queue filters for approved, verified batches instead of relying on frontend filtering.

## 4. Roles and Permissions

The application implements three manufacturing roles.

| Function | Cutting Supervisor | Cutting Verifier | Sewing Supervisor |

|---|---|---|---|

| Create cutting orders | Yes | No | No |

| Submit cutting batches | Yes | No | No |

| Record component counts | No | Yes | No |

| Approve or reject batches | No | Yes | No |

| Access Sewing Queue | No | No | Yes |

| Start sewing assembly | No | No | Yes |

Authorization is enforced through backend functions rather than only through hidden navigation elements.

### Demo Login Credentials

**Live login:** https://apparelflow-erp-two.vercel.app/login

Use the visible **Demo Role Selection** panel to choose a factory role. Selecting a role fills in its email address; signing in still requires its actual password.

| Role | Demo Email | Password |
|---|---|---|
| Cutting Supervisor | `cutting.supervisor@example.com` | `34d730f301ff11e9d7753946a81a72e0` |
| Cutting Verifier | `cutting.verifier@example.com` | `270acecd8c45302c4d90225987462420` |
| Sewing Supervisor | `sewing.supervisor@example.com` | `b1e3eb4c56a85d5920134421e05e37b6` |

> **Before submitting:** Replace every password placeholder with the corresponding **working, assessment-only demo account password**. The placeholders above are not valid login credentials. Verify that the accounts use those passwords. Never publish a password reused for another service, an administrative account, or a real production user. This is a public GitHub repository, so any password committed here will be publicly visible and remain in Git history. Rotate or disable these demo credentials after evaluation.

### Suggested Evaluator Walkthrough

1. Sign in as the **Cutting Supervisor**, create a cutting order, and submit it for verification.
2. Sign out and sign in as the **Cutting Verifier**. Record component counts; try a shortage to observe the approval hard stop, then verify an eligible batch.
3. Sign out and sign in as the **Sewing Supervisor**. Review the verifier audit and component counts, then start sewing for an approved batch.

## 5. Manufacturing State Machine

The system uses the following production workflow:

```text

CUTTING_IN_PROGRESS

        |

        | Cutting Supervisor submits batch

        v

PENDING_VERIFICATION

        |

        | Cutting Verifier checks components

        |

        +------ Valid counts and wastage ------+

        |                                      |

        |                                      v

        |                                   VERIFIED

        |                                      |

        |                                      | Sewing Supervisor

        |                                      v

        |                              SEWING_IN_PROGRESS

        |

        +------ Rejected with reason --------> REJECTED

```

A cutting batch cannot enter the Sewing Queue without an authorized verification approval.

### Important State Restrictions

- Only Cutting Supervisors create and submit cutting orders.

- Only Cutting Verifiers record verified component counts and approve/reject orders.

- Approval is allowed only when the order is pending verification and business rules pass.

- Rejected orders cannot be started in sewing.

- Only verified batches with an approval audit record appear on the Sewing Queue page.

- The Sewing Supervisor can start sewing only for an eligible verified order.

Rejected orders are retained for audit purposes. A complete re-cut/resubmission workflow remains a future enhancement.

## 6. Seeded Production Recipes

Two garment recipes are available for evaluation.

### Recipe A — Casual Blouse

| Property | Value |

|---|---|

| Recipe Code | REC-BL01 |

| Standard Fabric | 1.8 yards / garment |

| Maximum Wastage | 5.0% |

| Component | Pieces per Garment |

|---|---:|

| Front Body Panel | 1 |

| Back Body Panel | 1 |

| Sleeves (Left & Right) | 2 |

| Collar & Stand | 1 |

| Sleeve Cuffs | 2 |

### Recipe B — Crop Top

| Property | Value |

|---|---|

| Recipe Code | REC-CT02 |

| Standard Fabric | 1.1 yards / garment |

| Maximum Wastage | 8.0% |

| Component | Pieces per Garment |

|---|---:|

| Front Chest Panel | 1 |

| Back Support Panel | 1 |

| Neck Binding Strip | 1 |

| Hem Elastic Casing | 1 |

| Side Strap Accents | 2 |

### Automatic Component Multiplier

Expected component quantities are calculated from the recipe.

**Expected Quantity = Target Garment Quantity × Pieces per Garment**

Example:

For 50 Casual Blouses:

- Front Body Panels: 50 × 1 = 50

- Back Body Panels: 50 × 1 = 50

- Sleeves: 50 × 2 = 100

- Collars: 50 × 1 = 50

- Sleeve Cuffs: 50 × 2 = 100

Expected quantities are generated automatically when the cutting order is created.

## 7. Cutting Verification and Traffic-Light Engine

The Cutting Verifier records the actual quantity of every garment component.

| Status | Condition | Result |

|---|---|---|

| GREEN | Actual = Expected | Exact match |

| YELLOW | Actual > Expected | Excess recorded; approval allowed |

| RED | Actual < Expected | Shortage; approval blocked |

| Unrecorded | Actual is null | Approval blocked |

### Server-Side Approval Hard Stop

An approval request is rejected when:

- The order has no verification components.

- One or more component quantities have not been recorded.

- Any component has a shortage.

- The calculated fabric wastage exceeds the recipe limit.

- The order is not pending verification.

- The caller does not have the Cutting Verifier role.

Frontend controls are not treated as security boundaries. The API independently checks the persisted database state before approving a batch.

### HTTP Response Contract

| Scenario | Status |

|---|---|

| Approval successful | 200 OK |

| Authentication required | 401 Unauthorized |

| Role not permitted | 403 Forbidden |

| Order not found | 404 Not Found |

| Invalid order state | 409 Conflict |

| Missing count, shortage, or excessive wastage | 422 Unprocessable Entity |

## 8. Fabric Wastage Calculation

The system calculates expected fabric consumption and actual wastage.

**Expected Fabric = Standard Fabric per Garment × Target Quantity**

**Wastage % = ((Actual Fabric Used − Expected Fabric) / Expected Fabric) × 100**

Example:

A production batch contains 50 Crop Tops.

- Standard fabric: 1.1 yards per garment

- Expected fabric: 55 yards

- Actual fabric used: 57 yards

- Wastage: approximately 3.64%

- Allowed cap: 8%

The wastage is within the permitted recipe limit.

Calculations in the approval workflow use Prisma Decimal values to reduce floating-point precision issues.

## 9. Relational Database Schema

The database is implemented in Supabase PostgreSQL and managed using Prisma migrations.

| Table | Responsibility |

|---|---|

| `users` | Authentication accounts, password hashes, roles |

| `recipes` | Garment specifications and wastage limits |

| `recipe_components` | Recipe bill-of-materials components |

| `cutting_orders` | Production batches and workflow state |

| `verification_items` | Expected counts, actual counts, traffic-light classifications |

| `verification_logs` | Approval/rejection decisions and verification snapshots |

### Main Relationships

- A user can create multiple cutting orders.

- A user acting as verifier can create multiple verification logs.

- A recipe contains multiple recipe components.

- A recipe can be associated with multiple cutting orders.

- A cutting order contains multiple verification items.

- A cutting order can have verification audit records.

- Verification items reference their original recipe components.

### Audit Records

When a verifier approves a batch, the application records:

- Cutting order ID.

- Verifier user ID.

- Approval decision.

- Verification timestamp.

- Component count variances.

- Fabric wastage percentage.

Rejected decisions additionally record a mandatory rejection reason.

### Audit Immutability

Migration `20261011_immutable_verification_logs` installs a PostgreSQL trigger preventing ordinary UPDATE and DELETE operations on `verification_logs`.

This helps preserve historical verification decisions. The audit data remains readable.

**Limitation:** Database owners and privileged administrators may still be able to modify or disable the trigger. This is not absolute tamper-proof storage.

## 10. Application Pages

| Route | Description |

|---|---|

| `/login` | Authentication and demo role selector |

| `/` | Role-aware production dashboard |

| `/cutting-orders/new` | Create a cutting production batch |

| `/verification` | View batches waiting for verification |

| `/verification/[id]` | Record component counts and approve/reject |

| `/sewing` | View eligible verified batches and start sewing |

### Sewing Queue Details

The Sewing Supervisor can review:

- Batch order number.

- Garment recipe.

- Target garment quantity.

- Fabric roll identification.

- Verifier name.

- Approval timestamp.

- Fabric wastage percentage.

- Expected and actual component quantities.

- Component variances and verification status.

- Start Sewing Assembly action.

The UI restricts the queue to verified orders having an approved verification log.

## 11. Backend API Endpoints

| Method | Endpoint | Function |

|---|---|---|

| POST | `/api/cutting-orders` | Create a cutting order |

| POST | `/api/cutting-orders/[id]/submit` | Submit for verification |

| GET | `/api/cutting-orders/[id]/verification` | Retrieve verification details |

| PATCH | `/api/cutting-orders/[id]/verification` | Save actual component count |

| POST | `/api/cutting-orders/[id]/approve` | Approve a valid batch |

| POST | `/api/cutting-orders/[id]/reject` | Reject with a mandatory reason |

| GET | `/api/verification/pending` | List pending verification batches |

| GET | `/api/sewing/queue` | Retrieve verified cutting batches |

| POST | `/api/sewing/[id]/start` | Start sewing assembly |

| GET | `/api/recipes` | Retrieve available recipes |

Most production workflow endpoints require an authenticated user with the correct role.

## 12. Local Installation

### Requirements

- Node.js 22

- npm

- PostgreSQL database (Supabase supported)

- Git

### Clone the Repository

```bash

git clone https://github.com/NavozZ/apparelflow-erp.git

cd apparelflow-erp

```

### Install Dependencies

```bash

npm install

```

### Configure Environment Variables

Create a `.env` file in the project root.

```dotenv

DATABASE_URL="your-pooled-postgresql-connection"

DIRECT_URL="your-direct-or-session-postgresql-connection"

AUTH_SECRET="your-secure-auth-secret"

DEMO_CUTTING_SUPERVISOR_PASSWORD="your-secure-demo-password"

DEMO_CUTTING_VERIFIER_PASSWORD="your-secure-demo-password"

DEMO_SEWING_SUPERVISOR_PASSWORD="your-secure-demo-password"

```

Each demo password should be at least 12 characters, as required by the seeding script.

Never commit `.env` or real secrets to source control.

### Generate Prisma Client

```bash

npx prisma generate

```

### Apply Database Migrations

```bash

npx prisma migrate deploy

```

This applies the database schema migrations, including the verification-log protection trigger.

### Seed Garment Recipes

```bash

npx tsx prisma/seed.ts

```

### Seed Demo Accounts

```bash

npx tsx scripts/seed-demo-users.ts

```

The demo-user seed script creates or updates the three demo user accounts using Argon2id password hashes.

Run seeding only against an intended development or evaluation database. Review the target connection and existing accounts before execution.

### Start the Application

```bash

npm run dev

```

Open http://localhost:3000.

## 13. Automated Testing

The project includes **17 passing automated tests** implemented using Vitest.

### Run Tests

```bash

npm test

```

### Unit Tests — 12

File: `tests/verification-rules.test.ts`

| Area | Test Count |

|---|---:|

| GREEN/YELLOW/RED classification | 3 |

| Component approval validation | 5 |

| Fabric wastage validation | 4 |

| **Total** | **12** |

### Mocked API-Handler Tests — 5

File: `tests/api-workflow.test.ts`

| Scenario | Expected Outcome |

|---|---|

| Authenticated verifier approves GREEN order | HTTP 200, VERIFIED status |

| RED component blocks approval | HTTP 422, no approval audit or status update |

| Rejection without mandatory reason | HTTP 400 |

| Unauthorized role attempts approval | HTTP 403 |

| Sewing Queue retrieval | Query filters for VERIFIED orders |

The API-handler tests invoke actual route-handler functions with mocked authentication and database operations.

They do not modify the live Supabase database.

**Testing limitation:** This suite is not a complete live-database integration, concurrency, penetration, or browser end-to-end test suite.

### Quality Checks

```bash

npx tsc --noEmit

npm run lint

npm test

npm run build

```

Latest local verification results:

- Prisma Client generation: Passed

- TypeScript checking: Passed

- ESLint: Passed

- Vitest: 17/17 passed

- Next.js production build: Passed

- Static page generation: 14/14 completed

## 14. Deployment

The application uses Vercel for hosting and Supabase PostgreSQL for persistent data storage.

**Live URL:** https://apparelflow-erp-two.vercel.app

**Repository:** https://github.com/NavozZ/apparelflow-erp

### Vercel Build Command

```bash

npx prisma generate && npm run build

```

### Required Vercel Environment Variables

- `DATABASE_URL`

- `DIRECT_URL`

- `AUTH_SECRET`

The production database must already have the required Prisma migrations applied.

A successful local build does not by itself confirm that every workflow has been tested in the deployed environment.

## 15. Security and Defensive Architecture

The implementation includes:

- Authenticated user sessions.

- Argon2id password hashing.

- Database-backed role verification.

- Server-side validation for workflow permissions.

- Zod validation of user-submitted API data.

- Strict restrictions on production state transitions.

- Transactional verification approval and audit logging.

- PostgreSQL row locking for coordinated order updates.

- Verified-only Sewing Queue database queries.

- PostgreSQL trigger protection against audit-log modification.

- Environment variable management for credentials and secrets.

### Known Limitations

- Outstanding high-severity dependency audit findings require remediation and assessment of production impact.

- Supabase Row-Level Security and database exposure settings require a separate security review.

- Database administrators with sufficient privileges can modify audit-protection triggers.

- Automated tests do not currently provide complete browser end-to-end, live database integration, or concurrent-load coverage.

- Demo account access is intended for assessment, not sensitive production operations.

- A complete rejected-batch re-cut and resubmission workflow has not been implemented.

- The verification interface could be enhanced with stronger unsaved-changes handling.

This application is an assessment prototype and requires additional security hardening before processing sensitive factory production data.

## 16. AI-Assisted Development

AI assistance was used throughout architecture planning, schema design, full-stack development, troubleshooting, testing, and deployment preparation.

The engineering workflow emphasized reviewing generated code, inspecting terminal output, testing business rules, and correcting AI-generated shortcomings.

Examples of improvements include:

- Correcting API status codes to distinguish validation failures from state conflicts.

- Expanding pure-function tests into mocked API-handler tests.

- Resolving Next.js 16 production prerendering issues.

- Adding transaction and locking safeguards.

- Improving audit-log protection.

- Strengthening role isolation and evaluator usability.

For details, see:

[AI_OPTIMIZATION_REPORT.md](./AI_OPTIMIZATION_REPORT.md)

## 17. Project Status

The core Cutting Operations & Gatekeeper Verification workflow is implemented, with cloud database persistence, role-based user interfaces, server-side approval restrictions, verification audit records, and a Sewing Queue.

The deployed `main` branch includes the assessment improvements, 17 automated tests, and database-level audit-log protection.

Further production hardening and complete end-to-end validation remain future work.

**---**

**Developed for:** Webtezza (Pvt) Ltd — Software Engineering Intern Practical Challenge

**GitHub:** https://github.com/NavozZ/apparelflow-erp

**Live Demo:** https://apparelflow-erp-two.vercel.app
