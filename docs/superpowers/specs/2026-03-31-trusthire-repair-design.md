# TrustHire Repair Design

Date: 2026-03-31
Project: TrustHire (repairing and upgrading the existing `SafHire` codebase)
Status: Approved for implementation

## Objective

Transform the current prototype into a production-style multi-college placement portal with:

- secure role-based access control
- multi-college data isolation
- employer verification
- AI scam detection and job matching
- CDC-controlled campus hiring
- polished, role-aware frontend flows

This is an in-place v2 cleanup. The repo will converge on one canonical architecture instead of carrying both the legacy single-tenant contract and the newer multi-college contract at the same time.

## Scope

The implementation covers these major workstreams:

1. Canonical multi-college schema and RLS
2. Secure backend refactor with layered architecture
3. AI service contract cleanup
4. Role-aware frontend refactor
5. Seed data and README cleanup
6. Removal of obsolete legacy contract usage
7. End-to-end demo readiness

## Current Problems

The existing codebase has a strong foundation but is currently split between two incompatible generations of the product:

- legacy tables such as `student_profiles`, `employer_profiles`, and `job_applications`
- newer tables such as `students`, `employers`, `applications`, and `job_assignments`

This split causes broken contracts, tenant leakage risk, inconsistent role handling, and incomplete module coverage.

## Canonical Product Model

### Roles

- `super_admin`
- `cdc_admin`
- `employer`
- `student`
- `alumni`

Rules:

- public signup is allowed only for `student`, `alumni`, and `employer`
- `super_admin` and `cdc_admin` are provisioned only through protected server-side flows
- `cdc_admin` belongs to exactly one college
- `student` belongs to exactly one college and exactly one batch
- `alumni` uses the student profile model with an alumni status flag
- `employer` is global, but access to individual colleges is managed separately

### Job Distribution Modes

TrustHire supports two hiring patterns.

#### `off_campus_public`

- employer posts a public job to the whole platform
- any eligible student or alumni can view and apply
- the job uses one global discussion thread
- CDC approval is not required

#### `campus_cdc`

- employer targets one or more colleges through CDC
- job visibility is controlled by college assignments
- each college can further restrict visibility to batches or dynamic groups
- only assigned and eligible students can view or apply
- discussion is scoped per college

### Job Visibility Rules

- job existence is global
- job visibility is controlled by distribution mode
- public jobs bypass CDC visibility checks
- campus jobs require assignment-based visibility checks
- batch and group restrictions must be enforced during both feed generation and application

## Canonical Data Model

Identity is managed by `auth.users`. The application uses `public.users` as the canonical profile table.

### Tables

- `roles`
- `users`
- `colleges`
- `cdc_admins`
- `batches`
- `groups`
- `group_membership`
- `students`
- `student_documents`
- `employers`
- `employer_verifications`
- `employer_college_access`
- `jobs`
- `job_ai_reviews`
- `job_assignments`
- `applications`
- `votes`
- `discussions`
- `discussion_replies`
- `notifications`
- `appeals`
- `audit_logs`

### Key Modeling Decisions

- `users.id` references `auth.users.id`
- `users.role_code` references `roles.code`
- `students.user_id` and `employers.user_id` are unique
- `students.batch_id` is required
- `students.college_id` must match the chosen batch's college
- `groups` store CDC-owned filter definitions
- `group_membership` stores the resolved members of those groups
- `jobs` store employer-owned core job data and global workflow status
- `job_assignments` store college-specific routing and restriction details
- `discussions.college_id` is nullable
  - `NULL` means a global discussion for `off_campus_public`
  - a real `college_id` means a campus-specific discussion for `campus_cdc`

## Security Model

### Application Layer

- React communicates with the Node API using secure `httpOnly` cookies
- access and refresh tokens are not stored in `localStorage`
- the backend uses a request-scoped Supabase client for user-context operations
- the service-role client is reserved for controlled system actions only
- every sensitive action is validated at the backend service layer

### Data Layer

All application tables will have RLS enabled.

Core rules:

- users can access their own personal records
- employers can manage only their own employer profile, jobs, and applicants for jobs they own
- CDC admins can read and write only records tied to their college
- students can only see campus jobs assigned to their college and matching their batch or group membership
- public jobs are globally readable by authenticated student and alumni users
- campus discussions are college-scoped
- global discussions are shared across the whole platform

### Auditability

The backend will log at minimum:

- college approval
- CDC admin provisioning
- employer verification and blocking
- job creation
- AI fraud review results
- CDC approval, restriction, rejection, and override actions
- application status changes
- appeals and outcomes
- moderation actions

## Backend Architecture

The Express app will be refactored into a layered structure:

- `routes`
- `controllers`
- `services`
- `middleware`
- `validators`
- `helpers`

### API Modules

- `auth`
- `users`
- `colleges`
- `cdc`
- `employers`
- `jobs`
- `applications`
- `discussions`
- `votes`
- `notifications`
- `appeals`
- `analytics`
- `ai`

### Responsibilities

- routes map HTTP endpoints and attach middleware
- controllers shape request and response payloads
- services implement business and tenancy rules
- validators enforce payload correctness
- helpers provide pagination, auditing, cookie handling, and common utilities

## AI Service Contract

The FastAPI service will expose the canonical endpoints:

- `POST /predict-scam`
- `POST /match-job`
- `POST /summarize-discussion`
- `POST /generate-prep`
- `POST /extract-resume-skills`

### Expected Behavior

#### `POST /predict-scam`

Returns:

- `scam_score`
- `risk_level`
- `explanation`
- `extracted_red_flags`
- role match or role hints where useful

Hybrid logic:

- rule-based detection
- lightweight ML classifier
- explanation layer with a graceful fallback when LLM access is unavailable

#### `POST /match-job`

Returns:

- overall fit score
- matched skills
- missing skills
- explanation

#### `POST /summarize-discussion`

Returns:

- summary
- common questions
- interview difficulty
- preparation topics

#### `POST /generate-prep`

Returns:

- preparation roadmap
- key topics
- likely interview questions
- resume tips
- skill gap analysis

#### `POST /extract-resume-skills`

Returns:

- extracted skills
- inferred fields such as email, phone, department, batch year, and CGPA when detected

The Node backend remains the only caller of the AI service in normal operation.

## Frontend Model

The frontend remains React + Tailwind CSS, but becomes explicitly role-aware.

### Public Screens

- landing page
- login
- signup

### Student and Alumni Screens

- dashboard
- profile
- smart job feed
- saved jobs
- applications
- job detail
- discussion
- notifications
- AI preparation

### Employer Screens

- dashboard
- company profile
- verification flow
- post job
- my jobs
- applicants
- appeals

### CDC Screens

- dashboard
- students
- batches
- groups
- employer access requests
- college job approvals and assignments
- analytics

### Super Admin Screens

- colleges
- CDC provisioning
- employer verification
- flagged jobs
- fraud analytics
- platform analytics

### UX Direction

- professional campus-product feel
- clean hierarchy and explicit trust signals
- responsive layouts
- role-specific navigation
- clear state chips for verification, AI review, assignment, application status, and appeals

## Migration Strategy

The codebase will be corrected in this order:

1. Write the design spec and implementation plan
2. Standardize the schema and seed data on the canonical model
3. Remove legacy contract usage from backend and frontend
4. Refactor backend auth, RBAC, tenancy, and core services
5. Align the AI service with the canonical contract
6. Rebuild frontend routing and key role-based pages around the new API
7. Update README and verify demo readiness

## Out of Scope

The implementation will focus on a demo-ready production-style platform, not a full enterprise release. Items intentionally kept lightweight:

- external enterprise identity providers
- complex workflow orchestration systems
- background job infrastructure beyond simple synchronous or lightweight async behavior
- full automated test coverage across all layers

## Risks and Mitigations

### Risk: Dirty working tree

The repository already contains local edits. Implementation must avoid reverting unrelated user work and should prefer targeted replacement aligned with the canonical model.

### Risk: RLS complexity

RLS alone is not sufficient for all business logic. The backend will remain the primary policy enforcement layer, with RLS used as a strong fallback barrier.

### Risk: Breaking contract changes

The cleanup is intentionally breaking. The frontend, backend, and SQL must be migrated together to avoid another split-contract state.

## Success Criteria

The TrustHire repair is successful when:

- the repo uses one canonical schema and one canonical API contract
- public users cannot self-create privileged accounts
- campus jobs are isolated by college, batch, and group
- off-campus jobs are globally visible and discussed globally
- CDC workflows are college-scoped
- employer verification, AI review, appeals, notifications, and analytics exist in a coherent product flow
- backend boots, frontend builds, AI service boots, and the main demo flows are runnable from the README
