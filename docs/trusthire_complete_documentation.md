# TrustHire (SafHire) Complete Platform Documentation

This document provides an exhaustive technical and functional overview of the TrustHire ecosystem, covering the database design, backend infrastructure, frontend interfaces, and AI-driven automation.

---

## 1. System Overview
TrustHire is a trust-centric recruitment platform designed to connect verified employers with screened students. It features automated scam detection, AI resume parsing, and a hierarchical navigation system for colleges (CDC), companies, and students.

### User Personas & Roles
- **Super Admin**: Platform oversight, college management, and manual verification of employers.
- **CDC Admin**: College-level placement officer. Manages student batches, dynamic groups, and campus job routing.
- **Employer**: Recruiter who posts jobs (Off-Campus or Campus-specific) and manages applications.
- **Student/Alumni**: Job seekers who apply to roles, manage their skills via resume parsing, and engage in job discussions.

---

## 2. Technical Data Model (Database Design)

The system uses a PostgreSQL database (hosted on Supabase) with the following canonical tables:

### 2.1 Core Identity & Access
| Table | Description | Key Fields |
| :--- | :--- | :--- |
| `roles` | Defines the 5 user roles. | `code`, `name` |
| `users` | Primary identity table linked to Auth. | `email`, `full_name`, `role_code`, `is_active` |
| `audit_logs` | Tracks all administrative and critical actions. | `actor_id`, `action`, `entity_type`, `ip_address` |

### 2.2 Institutional Data
| Table | Description | Key Fields |
| :--- | :--- | :--- |
| `colleges` | Educational institutions on the platform. | `name`, `slug`, `domain`, `status` (pending/approved) |
| `cdc_admins` | Links users to specific colleges as admins. | `user_id`, `college_id`, `designation`, `status` |
| `batches` | Yearly student intake groups for a college. | `name`, `graduation_year`, `department` |
| `groups` | Dynamic student segments filtered by criteria. | `name`, `criteria` (JSONB: CGPA, backlogs, etc.) |

### 2.3 Student Profiles & Documents
| Table | Description | Key Fields |
| :--- | :--- | :--- |
| `students` | The primary profile for job seekers. | `cgpa`, `backlogs`, `skills`, `resume_url`, `verification_status` |
| `student_documents` | Verification files (Marksheets, IDs, etc.). | `document_type`, `storage_path`, `verification_status` |
| `group_membership` | Links students to dynamic groups. | `group_id`, `student_id` |

### 2.4 Recruitment & Jobs
| Table | Description | Key Fields |
| :--- | :--- | :--- |
| `employers` | Company profiles and credibility stats. | `company_name`, `company_domain`, `credibility_score` |
| `jobs` | The central job posting table. | `distribution_mode` (off_campus/campus), `status`, `ai_screening_status` |
| `job_ai_reviews` | Stores result of AI fraud/scam analysis. | `scam_score`, `risk_level`, `explanation` |
| `job_assignments` | Routes jobs to specific colleges/batches. | `visibility_status`, `override_reason` |
| `applications` | The link between students and jobs. | `status` (applied/screening/etc.), `ai_match_score` |

### 2.5 Engagement & Support
| Table | Description | Key Fields |
| :--- | :--- | :--- |
| `discussions` | Threaded discussions attached to jobs. | `scope`, `ai_summary` |
| `votes` | Upvotes/Downvotes/Scam reports for jobs. | `vote_type`, `weight` |
| `appeals` | Employer requests for job re-review. | `reason`, `status`, `resolution_notes` |
| `notifications` | System alerts for all user actions. | `user_id`, `type`, `message` |

---

## 3. Backend API Architecture (Endpoints)

The backend is built on Express.js and organized into domain-driven routes.

### 3.1 Authentication & Profile (`/auth`, `/student`, `/employer`)
- `POST /auth/register`: User signup with role-specific payloads.
- `POST /auth/login`: Issue JWT and return user metadata.
- `GET /student/profile`: Retrieve detailed student data.
- `PATCH /student/profile`: Update personal and academic info.
- `POST /student/resume`: Upload PDF and trigger AI skill extraction.
- `GET /employer/profile`: Retrieve company profile.

### 3.2 Job Management (`/jobs`)
- `GET /jobs`: Public off-campus job listing.
- `GET /jobs/:id`: Detailed job view (with applied status check).
- `POST /jobs`: Create a new role (triggers AI scam review).
- `PATCH /jobs/:id/status`: Admin override of job status.
- `POST /jobs/:id/apply`: Submit student application.
- `GET /jobs/:id/applicants`: (Recruiter only) List all candidates.
- `PATCH /jobs/applications/:id/status`: Accept/Reject candidate.

### 3.3 CDC Management (`/cdc`)
- `GET /cdc/batches`: List all batches in the current college.
- `POST /cdc/batches`: Create a new graduation batch.
- `POST /cdc/groups`: Create a dynamic student segment.
- `POST /cdc/groups/:id/refresh-members`: Re-calculate group members.
- `GET /cdc/employer-requests`: Review companies asking for access.
- `PATCH /cdc/employer-requests/:id`: Approve/Reject college access.
- `POST /cdc/jobs/:id/assignments`: Route a job to students.

### 3.4 AI Microservice Proxies (`/ai`)
- `POST /ai/parse-resume`: Internal endpoint for PDF extraction.
- `POST /ai/review-job`: Internal endpoint for fraud scoring.

---

## 4. Frontend Blueprint (Pages & Features)

### 4.1 Global Navigation
- **AppShell**: Responsive sidebar/header with user role switching and notifications.
- **StatusBadge**: Universal component for displaying verification and job states.

### 4.2 Student Workspace
- **Jobs Dashboard**: Personalized feed showing eligible and saved jobs.
- **StudentProfile**:
    - **Button [Upload Resume]**: Triggers parsing and profile update.
    - **Form [Personal Info]**: Editable fields for CGPA, LinkedIn, etc.
- **MyApplications**: Track status (Applied -> Interview -> Offered).
- **JobDetail**: 
    - **Button [Apply Now]**: Becomes "Already Applied" if submitted.
    - **Discussion Tab**: Join "Global" or "College" threads.

### 4.3 Recruiter Workspace
- **PostJob**: Form for title, role, eligibility JSON, and salary.
- **MyJobs**: 
    - **Job Selection List**: Sidebar to pick active roles.
    - **Applicant Panel**: Card-based list of candidates.
    - **Action [Accept]**: Move candidate to `accepted`.
    - **Action [Reject]**: Move candidate to `rejected`.
    - **Link [View Profile]**: Opens candidate's resume/details.
    - **Link [Chat]**: Link to discussion thread.
- **EmployerProfile**: Manage company verification documents.

### 4.4 CDC Workspace
- **PageHeader**: Stats for students, requests, and assignments.
- **Action [Create Batch]**: Define a new academic year.
- **Action [Create Group]**: Set filters (e.g., "MNC Tier 1" -> CGPA > 8.0, No backlogs).
- **Queue [Employer Requests]**: Approve or Block companies from college access.
- **Form [Campus Routing]**: Assign jobs to specific batches or groups.

### 4.5 Admin Panel
- **Validation List**: Manual review for flagged jobs.
- **Appeals Queue**: Handle employer messages requesting re-approval.
- **Action [Approve Job]**: Overrides AI and makes job public.
- **Action [Block User]**: Revokes platform access for bad actors.

---

## 5. AI Service Integration

The platform handles two critical AI workflows via a dedicated microservice:

### 5.1 Resume Intelligence
- **Task**: PDF Text -> Standardized JSON.
- **Fields**: Extracted Skills, LinkedIn URL, Preferred Role, Department.
- **Logic**: If the student's profile is empty, AI results are used to fill in gaps automatically.

### 5.2 Trust & Scam Logic
- **Task**: Job Description/Employer Data -> Scam Probability.
- **Parameters**: 
    - **Scam Score (0-100)**: Based on salary outliers, role ambiguity, and domain trust.
    - **Risk Level**: Low (Auto-Approve), Medium (Review Queue), High (Auto-Block).
    - **Credibility Score**: Incremental score for employers based on successful hires and clean reports.

---

## 6. Security & Audit Trail
- **Row Level Security (RLS)**: Enforced via Supabase to ensure students only see their own data and authorized jobs.
- **Audit Logging**: Every button click that modifies status (Accept applicant, Approve job, Resolve appeal) is logged with Actor ID and IP address.
- **Message Logic**: All rejections (Appeals, Employer requests) now require custom resolution notes entered via a popup prompt.

---
*Documentation Version: 1.0.0 | Generated by SafHire DevOps*
