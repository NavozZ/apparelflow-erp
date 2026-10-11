# ApparelFlow ERP

**Garment Cutting Verification and Sewing Workflow Management System**

A role-based Enterprise Resource Planning (ERP) prototype designed to manage garment cutting orders, component quantity verification, approval decisions, audit records, and the transfer of approved batches into the sewing production queue.

Developed as a Software Engineering Internship technical assessment.

**Live Application:** https://apparelflow-erp-two.vercel.app

**GitHub Repository:** https://github.com/NavozZ/apparelflow-erp

## 1. Project Overview

ApparelFlow ERP digitizes a garment production workflow in which cutting supervisors create batches, cutting verifiers inspect garment components, and sewing supervisors receive approved batches.

The system provides:

- Role-based authentication and authorization.
- Garment recipe and component management through seeded reference data.
- Cutting order creation with automatic expected component quantity calculations.
- Cutting order submission for verification.
- Component-level quantity recording and GREEN/YELLOW/RED status classification.
- Server-side approval restrictions for shortages and incomplete verification.
- Fabric wastage calculations against recipe-specific limits.
- Approval and rejection decisions with database audit records.
- A sewing queue containing eligible verified batches.
- Controlled transitions into sewing production.

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 App Router, React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js Route Handlers |
| Database | Supabase PostgreSQL |
| ORM | Prisma 7 with PostgreSQL adapter |
| Authentication | Auth.js / NextAuth Credentials |
| Password Security | Argon2id |
| Validation | Zod |
| Automated Testing | Vitest |
| Source Control | Git and GitHub |
| Hosting | Vercel |

## 3. User Roles

### Cutting Supervisor

- Log in to the production dashboard.
- Create cutting orders using garment recipes.
- Enter target garment quantities, fabric roll IDs, and actual fabric usage.
- Submit eligible cutting orders for verification.
- View order statuses and production statistics.

### Cutting Verifier

- View pending cutting orders.
- Inspect expected component quantities.
- Record actual component quantities.
- Review component quantity classifications.
- Approve eligible batches.
- Reject batches with a mandatory explanation.

### Sewing Supervisor

- View verified batches eligible for sewing.
- Review recipe, quantity, and approval information.
- Start sewing for approved batches.
- Cannot start sewing for rejected or unverified batches.

Role permissions are checked on the server. Frontend visibility alone is not relied upon for authorization.

## 4. Production Workflow

1. **CUTTING_IN_PROGRESS:** A cutting supervisor creates a cutting order.
2. **PENDING_VERIFICATION:** The supervisor submits the order for component inspection.
3. **Component Inspection:** A cutting verifier records actual component quantities.
4. **Decision:** The verifier approves an eligible batch or rejects it with a reason.
5. **VERIFIED:** Approved batches become eligible for the sewing queue.
6. **REJECTED:** Rejected batches do not enter the sewing queue.
7. **SEWING_IN_PROGRESS:** A sewing supervisor starts sewing for an approved batch.

### Component Quantity Classification

| Status | Rule | Meaning |
|---|---|---|
| GREEN | Actual = Expected | Required count is satisfied exactly |
| YELLOW | Actual > Expected | Additional pieces recorded |
| RED | Actual < Expected | Component shortage |

Expected component quantities are derived from the garment recipe:

**Expected component quantity = Target garment quantity × Pieces required per garment**

For example, an order for 50 garments requiring two side straps per garment has an expected side strap count of 100.

### Approval Hard Stop

The backend prevents approval when:

- A verification item has no recorded actual quantity.
- Any component has an actual quantity lower than expected.
- No verification items exist.
- Calculated fabric wastage exceeds the recipe's permitted cap.
- The order is not in the required verification stage.
- The caller does not have the Cutting Verifier role.

Approval validation and database state changes run inside a transaction. Component updates and verification decisions coordinate through order-level database locking.

### Fabric Wastage

Standard fabric requirement:

`Standard Fabric = Standard Yards per Garment × Target Quantity`

Wastage percentage:

`Wastage % = ((Actual Fabric − Standard Fabric) / Standard Fabric) × 100`

For example, a Crop Top recipe using 1.10 standard yards per garment for 50 garments has a standard requirement of 55 yards. If 57 yards are used, the calculated wastage is approximately 3.64%.

The approval process compares this calculated percentage against the recipe-specific wastage cap.

## 5. Database Design

The main PostgreSQL tables are:

| Table | Purpose |
|---|---|
| `users` | User accounts, password hashes, and roles |
| `recipes` | Garment recipe specifications |
| `recipe_components` | Required component types and piece quantities |
| `cutting_orders` | Cutting batch details and workflow statuses |
| `verification_items` | Expected and actual component counts |
| `verification_logs` | Approval/rejection decisions and verification snapshots |

Prisma migrations define the relational database structure.

The verification log records the decision, verifier, timestamp, component count variances, and relevant fabric wastage information. Rejection records also include a reason.

## 6. Application Pages

| Route | Purpose |
|---|---|
| `/login` | User authentication |
| `/` | Production dashboard |
| `/cutting-orders/new` | Create cutting orders |
| `/verification` | List pending verification orders |
| `/verification/[id]` | Record component counts and make verification decisions |
| `/sewing` | View and manage verified batches |

## 7. Main API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/cutting-orders` | Create a cutting order |
| POST | `/api/cutting-orders/[id]/submit` | Submit an order for verification |
| GET | `/api/cutting-orders/[id]/verification` | Read verification details |
| PATCH | `/api/cutting-orders/[id]/verification` | Record a component count |
| POST | `/api/cutting-orders/[id]/approve` | Approve an eligible order |
| POST | `/api/cutting-orders/[id]/reject` | Reject an order with a reason |
| GET | `/api/verification/pending` | List pending orders |
| GET | `/api/sewing/queue` | List verified orders |
| POST | `/api/sewing/[id]/start` | Start sewing |
| GET | `/api/recipes` | Read available garment recipes |

Protected endpoints enforce authentication and appropriate user roles.

## 8. Local Development Setup

### Prerequisites

- Node.js 22
- npm
- PostgreSQL database, such as Supabase
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/NavozZ/apparelflow-erp.git
cd apparelflow-erp
npm install
```

### Environment Variables

Create a local `.env` file with the following configuration keys:

```dotenv
DATABASE_URL="your-postgresql-pooled-connection"
DIRECT_URL="your-postgresql-direct-or-session-connection"
AUTH_SECRET="your-secure-random-auth-secret"
```

Do not commit real environment secrets or passwords to GitHub.

Additional demo-user password environment variables may be needed when running the demo-user seed script. Consult `scripts/seed-demo-users.ts` for the exact variable names and requirements.

### Database Migration and Prisma Client

```bash
npx prisma generate
npx prisma migrate deploy
```

The database must be accessible and configured before running migrations.

To populate the sample garment recipes:

```bash
npx tsx prisma/seed.ts
```

To create demonstration users, configure the seed script's required environment variables and run:

```bash
npx tsx scripts/seed-demo-users.ts
```

Do not run demo-user seeding against a production environment without reviewing the generated credentials and access requirements.

### Start Development Server

```bash
npm run dev
```

Open http://localhost:3000.

### Production Build

```bash
npx prisma generate
npm run build
```

## 9. Automated Testing

Vitest is used for unit testing verification business rules.

Run the test suite:

```bash
npx vitest run
```

The verification rules test suite contains **12 passing tests** covering:

- GREEN/YELLOW/RED classifications.
- Missing component counts.
- Component shortages.
- Empty verification item collections.
- Valid component counts.
- Invalid negative quantities.
- Fabric wastage calculations.
- Wastage cap acceptance and rejection.
- Invalid fabric input handling.

Additional manual backend validation was performed against the connected PostgreSQL database, including approval rejection for incomplete and insufficient component counts, successful approval with audit logging, order rejection with an audit record, and sewing queue status restrictions.

**Testing limitation:** The unit tests currently cover extracted business-rule functions. They do not constitute complete automated integration, authorization, concurrency, or end-to-end browser testing of all application routes.

## 10. Deployment

The application is deployed using Vercel and an existing Supabase PostgreSQL database.

**Production URL:** https://apparelflow-erp-two.vercel.app

The deployment uses the GitHub `main` branch.

### Vercel Configuration

Framework preset: `Next.js`

Build command:

```bash
npx prisma generate && npm run build
```

Required production environment variables include:

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`

Secrets must be configured in the Vercel project environment settings rather than stored in source control.

Database migrations must be applied separately as part of the database setup or release process.

## 11. Security and Implementation Considerations

Implemented safeguards include:

- Server-side role-based authorization.
- Argon2id password hashing.
- Validation of API request payloads.
- Conditional database status transitions.
- Transactional approval and rejection decisions.
- Database row locking for component updates and verification decisions.
- Authentication secrets stored outside version control.

### Known Limitations and Future Improvements

- Dependency audit findings remain unresolved and require review and remediation. A recent audit reported high-severity findings in dependencies related to the Prisma CLI toolchain.
- Production database exposure and row-level security configuration have not been independently verified as part of the completed testing evidence.
- Audit logs are recorded in the database, but database-enforced immutability has not yet been implemented or verified.
- Automated API integration and concurrency testing should be expanded.
- Verification input editing could benefit from an explicit unsaved-changes warning before approval.
- Demo account access should be restricted or disabled before use with sensitive production information.
- Additional production observability and operational monitoring would improve reliability.

The application is an assessment prototype and should undergo further security review before handling real factory production data.

## 12. AI-Assisted Development

AI assistance was used during development for planning, implementation guidance, TypeScript and Next.js troubleshooting, Prisma integration support, validation logic review, and test-case generation.

Generated recommendations were checked through TypeScript, ESLint, production compilation, unit tests, and selected database-backed workflow tests.

AI-assisted outputs were not treated as a substitute for testing. Remaining security findings and test coverage gaps are documented explicitly.

## 13. Project Status

The prototype includes the main cutting-to-sewing workflow, with a live Vercel deployment, database integration, role-based interfaces, and verified backend approval restrictions.

The project demonstrates full-stack TypeScript development, relational data modelling, API design, authentication, business-rule enforcement, and deployment practices.

---

**Repository:** https://github.com/NavozZ/apparelflow-erp

**Live Demo:** https://apparelflow-erp-two.vercel.app