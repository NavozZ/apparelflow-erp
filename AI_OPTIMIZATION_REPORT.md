# AI Optimization Report

**Project:** ApparelFlow ERP — Garment Cutting Verification and Sewing Workflow Management

**Assessment:** Software Engineering Internship Technical Assignment

## 1. Introduction

This report describes how AI-assisted development was used during the design, implementation, testing, and deployment of ApparelFlow ERP.

The goal was to use AI as a development assistant to improve productivity while maintaining responsibility for implementation decisions, source control, validation, and troubleshooting.

AI was used to assist with architecture planning, generating initial implementations, explaining technical concepts, identifying errors, and proposing test scenarios.

The resulting code was reviewed and checked using development tools rather than accepted solely because it was AI-generated.

## 2. Development Approach

The project was divided into smaller, verifiable development stages.

| Stage | AI-Assisted Activities | Validation |
|---|---|---|
| Requirements analysis | Identify user roles, cutting verification workflow, and approval restrictions | Review workflow against assignment requirements |
| Database design | Plan relational schema for recipes, orders, verification items, and audit logs | Prisma migration and database queries |
| Authentication | Assist with Auth.js Credentials, Argon2id, and role checks | Login and authorization tests |
| Cutting order management | Develop cutting order APIs and creation form | API responses and database records |
| Component verification | Implement quantity input, GREEN/YELLOW/RED status, and shortage checks | Manual API tests and SQL inspection |
| Approval and rejection | Design transactional decisions and audit records | Positive and negative workflow tests |
| Sewing operations | Implement verified queue and sewing status transition | Database-backed API testing |
| Automated testing | Generate test cases for verification and wastage rules | Vitest execution |
| Deployment | Guide Vercel and Supabase configuration | Production build and live application checks |

A step-by-step implementation approach helped identify failures close to the changes that introduced them.

## 3. Prompting and Problem-Solving Strategy

AI assistance was generally requested for narrowly scoped tasks rather than asking for an entire ERP system in a single prompt.

The approach included:

- Describing the required feature and relevant user role.
- Providing the existing TypeScript, Next.js, or Prisma code where integration was needed.
- Requesting changes to specific files.
- Executing the recommended implementation locally.
- Returning compiler output, API responses, or screenshots when errors occurred.
- Revising the implementation based on observed results.

### Example: Role-Based Authorization

**Development objective:** Allow only Cutting Supervisors to create and submit cutting orders.

**AI-assisted approach:** Define server-side role validation through shared authorization utilities and use them in protected API endpoints.

**Validation:** Unauthorized and wrong-role requests were checked separately from successful supervisor requests.

**Benefit:** Authorization became reusable across the cutting, verification, and sewing workflows.

### Example: Approval Hard Stop

**Development objective:** Prevent an order from being approved if component quantities are incomplete or insufficient.

**AI-assisted approach:** Implement server-side verification rules and database transaction handling.

**Validation:** Approval was rejected when component counts were missing, then rejected again after all counts were supplied but one component remained below its expected quantity.

**Benefit:** The core business restriction was validated through actual backend responses rather than visual status indicators alone.

## 4. Significant Technical Challenges

### 4.1 Prisma 7 and Supabase Integration

The project uses Prisma 7 with a PostgreSQL adapter and Supabase.

AI assistance was used to guide database connection configuration, Prisma Client generation, schema creation, and migration procedures.

The database was verified by checking seeded recipes, generated verification items, order status changes, and audit records.

### 4.2 Next.js 16 Prerendering

During production compilation, the dynamic verification detail page initially failed because runtime route parameters were accessed during prerendering.

The problem was addressed using the route's runtime rendering configuration.

Further build warnings appeared for authenticated API handlers during prerendering. The affected routes were adjusted to defer request-dependent execution.

**Observed result:** A subsequent Next.js production build compiled, type-checked, and completed page generation without the earlier warnings.

### 4.3 Transaction Consistency

Component quantity updates and approval requests could potentially conflict if executed simultaneously.

Order-level PostgreSQL locking was incorporated into the component update and approval transactions to coordinate access to the same cutting order.

**Limitation:** Although the locking strategy was implemented, a dedicated automated concurrency stress test has not yet been completed.

### 4.4 Automated Testing Dependencies

An initial Vitest installation failed because the installed Node.js type definitions were incompatible with the selected Vitest dependency requirements.

The project was updated to use compatible Node.js type definitions, allowing Vitest to install successfully.

## 5. Testing and Verification

The verification rules unit test suite contains 12 passing tests.

| Test Area | Passing Tests |
|---|---:|
| GREEN/YELLOW/RED quantity classification | 3 |
| Component approval validation | 5 |
| Fabric wastage validation | 4 |
| **Total** | **12** |

Additional backend workflow tests covered:

- Cutting order creation.
- Expected component quantity generation.
- Submission for verification.
- GREEN, YELLOW, and RED quantity recording.
- Approval rejection when quantities were missing.
- Approval rejection when a component shortage remained.
- Successful approval with component variance and wastage audit data.
- Rejection with a mandatory reason.
- Exclusion of rejected batches from the sewing queue.
- Blocking rejected orders from starting sewing.
- Starting sewing for an approved order.

**Testing scope:** Unit tests currently exercise extracted business-rule functions. They do not replace automated API integration tests, browser end-to-end tests, security penetration testing, or concurrent transaction tests.

## 6. AI-Generated Code Review

AI-generated suggestions were checked against the existing project structure before being accepted.

Examples of corrections made during development include:

- Correcting an API route placed in the wrong directory.
- Separating database cutting order IDs from displayed order numbers.
- Adjusting Next.js runtime rendering configuration to resolve production build failures.
- Adding coordinated database locking around component verification and approval.
- Preserving role checks inside backend endpoints instead of relying on hidden UI buttons.

These corrections illustrate that AI-generated implementations require verification and sometimes further refinement.

## 7. Productivity Improvements

AI assistance helped accelerate development by providing:

- Structured milestones for a multi-role ERP workflow.
- Initial TypeScript and React component implementations.
- Prisma query patterns and database schema guidance.
- Targeted explanations of compiler and runtime errors.
- Consistent API response handling patterns.
- Test scenarios based on business rules.
- Deployment setup guidance for Vercel and Supabase.

The largest practical benefit was faster iteration between implementation, error inspection, and correction.

No numerical productivity improvement is claimed because a controlled comparison against a non-AI development process was not performed.

## 8. Security Considerations

Security-related implementation decisions included:

- Server-side role authorization.
- Password hashing using Argon2id.
- Request validation using Zod.
- Controlled workflow status transitions.
- Transactional audit record creation.
- Keeping environment secrets outside Git version control.

A dependency audit identified unresolved high-severity dependency advisories involving packages in the Prisma toolchain.

The recommended forced audit remediation was not applied because it proposed a breaking Prisma version change that could disrupt the project's Prisma 7 configuration.

Further review is needed to assess dependency upgrades, production exposure, database row-level security configuration, audit log immutability, and demo-account access controls.

These findings should be addressed before using the prototype with sensitive production information.

## 9. Limitations and Future Optimization

Recommended future improvements are:

1. Integrate all production approval rules with shared, directly tested business-rule modules.
2. Add automated HTTP integration tests for role restrictions and workflow status transitions.
3. Add end-to-end browser tests for all three user roles.
4. Add concurrency tests for simultaneous verification edits and approval attempts.
5. Strengthen audit log immutability at the database level.
6. Review Supabase exposure and database access controls.
7. Resolve outstanding dependency security advisories.
8. Improve form behavior when unsaved changes are present.
9. Add operational logging, performance monitoring, and automated deployment checks.

## 10. Conclusion

AI assistance was used as a practical software engineering support tool throughout ApparelFlow ERP development.

The project demonstrates the use of AI-generated guidance alongside relational database modelling, full-stack TypeScript implementation, server-side authorization, business-rule enforcement, unit testing, Git-based version control, and cloud deployment.

The work also demonstrates the importance of independently verifying AI recommendations, documenting limitations, and distinguishing successful compilation from complete production validation.

**GitHub Repository:** https://github.com/NavozZ/apparelflow-erp

**Live Application:** https://apparelflow-erp-two.vercel.app