# GlobalBridge Admin System

## Overview

The admin system is a full-featured platform management console accessible at `/admin`. It uses role-based access control with two admin tiers: `super_admin` (unrestricted) and `admin` (broad but cannot modify other admins). The admin layout and pages live in `frontend/src/app/(admin)/` and are proxied through Next.js rewrites to the Express backend at `/api/admin/*`.

## Role Hierarchy

| Role | Permissions |
|------|------------|
| **super_admin** | Bypasses all role checks. Can modify/delete any account including admins. Can change user roles. |
| **admin** | Full access to all management endpoints. Cannot modify/delete `super_admin` accounts. Cannot change user roles. |

Source: `frontend/src/lib/roles.ts`, `backend/src/middleware/auth.ts`

## Auth & Guarding

- **Frontend**: `AdminGuard` component (`frontend/src/components/AdminGuard.tsx`) wraps the admin layout. It checks `getUser()?.role === "admin" || "super_admin"` on mount and on `focus`/`storage` events. Redirects to `/dashboard` if not authorized.
- **Backend**: `requireAdmin()` middleware in `backend/src/middleware/auth.ts` verifies the Firebase JWT, resolves the Postgres user, and checks `role` is `admin` or `super_admin`.
- **`super_admin` bypass**: `requireRole()` passes `super_admin` for any role-gated route.

---

## Backend API Endpoints (`/api/admin/*`)

### System Health
- **`GET /health`** — Live probes for PostgreSQL, Redis, and AI service. Returns `overall`, `services[]` with `status` (up/down/not_configured) and `latencyMs`.
- Source: `backend/src/lib/health.ts` — each probe catches its own failure independently.

### Dashboard Stats
- **`GET /dashboard`** — Single-query aggregation returning: `total_users`, `students`, `mentors`, `employers`, `admins`, `pending_verifications`, `approved_verifications`, `rejected_verifications`, `active_users`, `inactive_users`, `scholarships`, `housing_listings`, `jobs`, `forum_posts`, `messages`, `reports`, `scam_alerts`, `ai_conversations`, `daily_users`, `monthly_users`.

### Signups
- **`GET /signups?days=30`** — Daily signup count series. Uses `buildDailySeries()` for zero-filled daily buckets.

### Countries
- **`GET /countries`** — User counts grouped by `country_of_residence`, top 50.

### Recent Activity
- **`GET /recent-activity`** — Last 10 user signups, last 10 reports, last 10 admin audit errors (parallel queries).

### User Management
- **`GET /users`** — Paginated user list with `?role`, `?status`, `?search`, `?page`, `?limit`. Includes mentor verification flag via LEFT JOIN on `mentor_profiles`.
- **`GET /users/:id`** — Full user detail with mentor/employer profile joins.
- **`PATCH /users/:id`** — Update `full_name`, `email`, `role` (super_admin only), `verification_status`, `country_of_residence`, `country_of_origin`, `bio`, `preferred_language`. Records audit. Blocks modifying super_admin by non-super-admin.
- **`DELETE /users/:id`** — Hard delete. Blocks super_admin deletion.
- **`POST /users/:id/verify`** — Sets `verification_status = 'verified'`.
- **`POST /users/:id/suspend`** — Sets `verification_status = 'rejected'`. Blocks super_admin suspension.
- **`POST /users/:id/activate`** — Sets `verification_status = 'verified'`.
- **`POST /users/bulk-action`** — Accepts `{ ids: UUID[], action: "delete"|"suspend"|"activate"|"verify" }`. Processes each, records single audit entry.

### Mentor Verification
- **`GET /mentor-verifications`** — All mentors with profiles, documents, verification status. Sorted pending-first.
- **`POST /mentor-verifications/:id/approve`** — Verifies user + sets `mentor_profiles.verified_by` and `verified_at`.
- **`POST /mentor-verifications/:id/reject`** — Rejects with optional `reason`.
- **`POST /mentor-verifications/:id/reopen`** — Resets to `pending`.

### Employer Verification
- **`GET /employer-verifications`** — All employers with company profiles, documents, visa sponsorship data. Sorted pending-first.
- **`POST /employer-verifications/:id/approve`** — Verifies employer.
- **`POST /employer-verifications/:id/reject`** — Rejects with optional `reason`.

### Content Moderation
- **`GET /content`** — Union of housing listings, opportunities, jobs, forum posts, and success stories.
- **`POST /content/:type/:id/approve`** — Approves housing (status→active) or opportunity/job (is_verified→TRUE).
- **`POST /content/:type/:id/reject`** — Archives housing or un-verifies opportunity/job.
- **`DELETE /content/:type/:id`** — Hard delete from the relevant table.

### Reports Management
- **`GET /reports`** — Paginated reports with `?status` filter. Includes reporter and resolver names via JOINs.
- **`PATCH /reports/:id`** — Update status (`resolved`, `dismissed`, `reviewing`) and optional notes. Records audit.

### Platform Settings
- **`GET /settings`** — All key-value pairs from `platform_settings` table.
- **`PUT /settings`** — Upserts multiple settings. Records audit with changed keys.

### Notifications
- **`POST /notifications/send`** — Send to single user by UUID.
- **`POST /notifications/broadcast`** — Send to all users or filter by role (`student`, `mentor`, `employer`, `all`).
- **`GET /notifications`** — Last 100 notifications with user names.

### AI Management
- **`GET /ai/stats`** — Aggregate AI metrics: total requests, avg tokens, avg response time, error rate, avg feedback rating, conversation count, feature breakdown.
- **`GET /ai/conversations`** — Paginated list of all AI conversations with user info.
- **`GET /ai/conversations/:id`** — Full conversation with message history.

### Knowledge Base
- **`GET /knowledge`** — List knowledge base entries with `?search` and `?category` filtering.

### Analytics
- **`GET /analytics/user-growth?days=30`** — Daily signups broken down by role (student/mentor/employer).
- **`GET /analytics/opportunities?days=30`** — Daily opportunity postings by type.
- **`GET /analytics/forums?days=30`** — Daily forum posts and replies.
- **`GET /analytics/ai-usage?days=30`** — Daily AI usage with avg tokens and response time.
- **`GET /analytics/languages`** — Preferred language distribution.

### Activity Log
- **`GET /activity-log`** — Paginated general activity log (not admin-specific).

### Admin Audit Log
- **`GET /audit`** — Cursor-paginated admin action log. Returns `entries[]` and `nextCursor`. Each entry includes `admin_name`, `admin_email`, `action`, `target_type`, `target_id`, `metadata`, `created_at`.

---

## Frontend Pages & Routes

All admin pages live under `frontend/src/app/(admin)/admin/`. The shared layout is `frontend/src/app/(admin)/layout.tsx`.

### Layout Features
- Sidebar navigation with route-active highlighting
- Mobile sidebar (`MobileSidebar preset="admin"`) with admin-specific nav items
- Admin badge, language switcher, command palette trigger, theme toggle, and user menu in header
- Wrapped entirely in `<AdminGuard>` — non-admins are redirected to `/dashboard`

### Pages

| Route | Page | Description |
|-------|------|-------------|
| `/admin` | `page.tsx` | Dashboard overview — stat cards for users/verifications/content, system health probes, quick actions, community breakdown |
| `/admin/users` | `users/page.tsx` | Full user table with search, role/status filters, pagination, bulk actions (verify/suspend/delete), inline edit modal |
| `/admin/mentor-verifications` | `mentor-verifications/page.tsx` | Side-by-side mentor review queue with profile detail, document viewer, approve/reject/reopen actions |
| `/admin/employer-verifications` | `employer-verifications/page.tsx` | Employer verification queue with company profile, document viewer, approve/reject |
| `/admin/content` | `content/page.tsx` | Content moderation grid with type/status filters, approve/reject/delete actions |
| `/admin/reports` | `reports/page.tsx` | Report queue with severity indicators, detail panel, status transitions |
| `/admin/analytics` | `analytics/page.tsx` | SVG bar charts for user growth, opportunities, forum activity, AI usage; language & country distribution bars |
| `/admin/ai` | `ai/page.tsx` | AI control center with usage metrics, feature breakdown, conversation browser, feedback summary |
| `/admin/notifications` | `notifications/page.tsx` | Send targeted or broadcast notifications, view notification history |
| `/admin/settings` | `settings/page.tsx` | Platform settings editor: general (name, contact, maintenance, registrations), AI config (model, temperature, feature toggles), security (login attempts, session timeout) |
| `/admin/audit` | `audit/page.tsx` | Cursor-paginated admin audit trail with action icons and metadata |

---

## Database Tables

Key tables used by the admin system:

| Table | Purpose |
|-------|---------|
| `users` | Core user data with `role` (enum: super_admin/admin/student/mentor/employer), `verification_status` |
| `mentor_profiles` | Mentor-specific data: expertise, languages, universities, verification metadata |
| `employer_profiles` | Employer company info, visa sponsorship details |
| `user_documents` | Uploaded identity/credential documents linked to verification |
| `admin_audit_log` | Immutable record of privileged admin actions with `admin_id`, `action`, `target_type`, `target_id`, `metadata` |
| `platform_settings` | Key-value store for all configurable platform settings |
| `reports` | Community-flagged content reports with status tracking |
| `notifications` | Per-user and broadcast notifications |
| `ai_conversations` / `ai_messages` | AI chat history |
| `ai_usage_log` / `ai_feedback` | AI performance metrics |
| `activity_log` | General platform activity |

---

## Seed & Setup

Run `npm run seed:admin` in `/backend` to create or promote the initial super admin:

- **Email**: `admin@gmail.com`
- **Password**: `Admin@12345`
- Creates Firebase user + Postgres user with `super_admin` role, or promotes existing user to `super_admin`.

Source: `backend/src/seed-admin.ts`

---

## Promotion Prompt for Admin Page & Dashboard

Copy the prompt below and share it with your AI assistant to improve the admin experience:

```
You are tasked with improving the GlobalBridge admin dashboard and admin pages. The admin system is built with Next.js 15 App Router, TypeScript, and Tailwind CSS. All admin pages are under `frontend/src/app/(admin)/admin/` with a shared layout at `frontend/src/app/(admin)/layout.tsx`. Backend endpoints are Express routes in `backend/src/routes/admin.ts`.

## Current Admin Features

### Dashboard (`/admin`)
- Stat cards: Total Users, Students, Mentors, Employers, Pending Verifications, Open Reports, Scholarships, Housing Listings, Forum Posts, AI Conversations
- System health probe panel (Postgres/Redis/AI with live latency)
- Quick actions menu (Manage Users, Review Verifications, Review Reports, Send Notification, Platform Settings)
- Community breakdown (Students/Mentors/Employers/Admins)
- Growth stats (Daily/Monthly Active Users, Approved/Rejected Verifications)

### Admin Pages
1. **Users** — Table with search, role/status filtering, pagination, bulk actions (verify/suspend/delete), inline edit modal
2. **Mentor Verifications** — Side-by-side review queue with profile details, documents, approve/reject/reopen
3. **Employer Verifications** — Similar to mentor but for employers with company profiles
4. **Content Moderation** — Grid of housing/opportunities/jobs/forums/stories with approve/reject/delete
5. **Reports** — Queue with severity detection (high/med/low by keyword), detail panel, status transitions
6. **Analytics** — SVG bar charts for user growth (stacked by role), opportunities, forum activity, AI usage; language & country distribution bars
7. **AI Control Center** — Usage metrics, feature breakdown, conversation browser, feedback summary
8. **Notifications** — Send targeted or broadcast notifications by role
9. **Settings** — General, AI config (model/temperature/feature toggles), Security settings
10. **Audit Log** — Cursor-paginated admin action trail with icons and metadata

## Improvement Goals

Please analyze the codebase and suggest improvements for:

1. **Dashboard enhancements**: What additional KPIs, charts, or widgets would add value? Consider adding trend indicators (arrows showing increase/decrease vs prior period), real-time user online count, recent error alerts, verification queue urgency indicators, or a platform-wide search bar.

2. **UX improvements**: What interactions feel clunky? Consider bulk select improvements, keyboard shortcuts, batch operations with undo, inline editing improvements, drag-and-drop for content moderation queue, or better mobile responsiveness.

3. **Missing admin features**: What should an admin be able to do that isn't available? Consider:
   - Email templates and bulk email sending
   - Export data (CSV/PDF) for users, reports, analytics
   - Scheduled maintenance mode with countdown
   - Admin activity calendar/heatmap
   - Two-factor authentication management for users
   - Automated moderation rules / keyword filtering
   - Webhook management for integrations
   - API key management for third-party access
   - Backup/restore controls
   - Custom role/permission builder (beyond hardcoded super_admin/admin)

4. **Performance optimizations**: The dashboard currently makes individual queries for every stat — could consolidate into fewer queries? Consider data caching strategies, WebSocket for real-time updates, virtual scrolling for large user tables.

5. **Mobile experience**: The admin layout has basic mobile support but many pages have hidden columns and small touch targets. Evaluate full mobile responsiveness.

6. **Security hardening**: Review for: IDOR vulnerabilities in user management endpoints, rate limiting on admin routes, session management for admin accounts, audit log completeness.

7. **Visual design**: Evaluate the card-based layout, color scheme (cream/clay tones), SVG chart readability, skeleton loading states, empty states, and error boundaries.

Provide specific implementation plans with file paths, component names, and code samples for each improvement.
```