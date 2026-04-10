
# CLAUDE RESUME GUIDE
# Read this file first when starting a new session on this project.

## PROJECT OVERVIEW
Nutshell ERP — school book distribution and content management system.
Built by: Nutshell GK Books, Siliguri, West Bengal.
Stack: Next.js 16 (Turbopack), Prisma ORM, PostgreSQL, JWT auth via httpOnly cookies, custom CSS design system.
No external UI libraries. No webpack plugins.

## FIRST THING TO DO IN EVERY NEW SESSION
Run these commands to understand the current state:

1. Read the schema:
   cat prisma/schema.prisma

2. Check what pages exist:
   find app -name "page.tsx" | sort

3. Check what API routes exist:
   find app/api -name "route.ts" | sort

4. Check recent git changes (if git is initialized):
   git log --oneline -20
   git diff HEAD~1 --name-only

5. Read this file again fully before doing anything:
   cat CLAUDE_RESUME.md

---

## TECH STACK RULES — NEVER BREAK THESE

- Next.js 16 with Turbopack. Never add next-pwa or any webpack plugin.
- next.config.js must only contain: const nextConfig = { turbopack: {} }; module.exports = nextConfig
  NOTE: Security headers can be added as headers() function alongside turbopack config - that is OK.
- Auth: always use getTokenFromRequest(req) + verifyToken(token) from lib/auth.ts
- Database: always use the shared prisma singleton from lib/prisma.ts — never new PrismaClient()
- CSS: use existing classes from app/globals.css — .card .btn .btn-primary .btn-secondary .input .badge .data-table .table-wrap .empty-state .page-header .stat-card .form-label
- No TipTap, Quill, ProseMirror, Slate or any editor library — content editor uses contenteditable + execCommand only
- No external UI component libraries

---

## ROLES AND MODULES

Roles: ADMIN, BD_HEAD, SALES, CONTENT_TEAM, TRAINER, DESIGN_TEAM

Module permissions (stored in RolePermission table as Permission.name values):
ADMIN:        USER_MANAGEMENT, AUDIT_LOG, EXPORTS, CONTENT_ASSIGN, CONTENT_REVIEW, ANALYTICS, ORDERS, PIPELINE, SCHOOLS, TARGETS, TEAM_MANAGEMENT, QUIZ_SESSIONS, TRAINING_SESSIONS
BD_HEAD:      TEAM_MANAGEMENT, ORDERS, PIPELINE, SCHOOLS, ANALYTICS, TASKS, DAILY_REPORTS, TARGETS
SALES:        ORDERS, PIPELINE, ANALYTICS, TASKS, DAILY_REPORTS
CONTENT_TEAM: CONTENT_CREATE, CONTENT_ASSIGN, QUIZ_SESSIONS, TRAINING_SESSIONS
TRAINER:      QUIZ_SESSIONS, TRAINING_SESSIONS, CONTENT_CREATE

Users can have multiple roles. Sidebar shows union of all modules across all roles.

---

## DATABASE

Run after any schema change:
npx prisma db push && npx prisma generate

Seed credentials (run: node prisma/seed.js):
ADMIN        admin@nutshell.com    admin123
BD_HEAD      bd@nutshell.com       bd123456
SALES        sales1@nutshell.com   sales123
SALES        sales2@nutshell.com   sales123
CONTENT_TEAM content@nutshell.com  content123
TRAINER      trainer@nutshell.com  trainer123
DESIGN_TEAM  design@nutshell.com   design123

---

## KEY FILE LOCATIONS

Auth:           lib/auth.ts
Prisma client:  lib/prisma.ts
Audit log:      lib/auditLog.ts
Rate limiter:   lib/rateLimit.ts  (NEW - in-memory sliding window)
Input validator: lib/validate.ts  (NEW - Zod schemas + helper)
Send order email:   lib/sendOrderEmail.ts
Send task email:    lib/sendTaskEmail.ts
Generate PDF:       lib/generateOrderPdf.tsx
Global styles:      app/globals.css
Root layout:        app/layout.tsx
Protected layout:   app/(protected)/layout.tsx (uses dynamic import ssr:false)
Sidebar client:     app/(protected)/LayoutClient.tsx
AI Chatbot:         app/components/AIChatbot.tsx
Activity Calendar:  app/components/ActivityCalendar.tsx

---

## PAGE ROUTES

/                           → login
/dashboard                  → ADMIN dashboard
/bd/dashboard               → BD_HEAD dashboard
/sales                      → SALES dashboard
/analytics                  → analytics (all roles, role-aware content)
/pipeline                   → pipeline (role-scoped)
/orders                     → orders list
/orders/new                 → 3-step order form
/orders/[id]                → order detail with sticky right panel
/bd/schools                 → schools list
/bd/tasks                   → BD task management
/bd/reports                 → daily reports review
/bd/timeline                → team activity timeline
/admin/users                → user management + CSV school upload
/admin/audit-log            → audit log viewer
/admin/content              → admin content management
/content/topics             → content team topic list (click → opens editor)
/content/workspace/[id]     → Google Docs-style editor (full viewport, no sidebar)
/content/question-banks     → question bank manager
/content/quiz               → quiz sessions
/content/training           → training sessions
/content/review             → admin content review
/design                     → design team dashboard
/targets                    → targets page
/reports                    → daily reports (sales)
/tasks                      → tasks (sales)

---

## API ROUTES

/api/auth/me                → returns { user: { userId, name, email, roles[], modules[] } }
/api/health                 → GET health check (NEW)
/api/orders/list            → GET orders (role-scoped)
/api/orders/create          → POST create order (SALES + BD_HEAD)
/api/orders/[id]            → GET single order with items, POCs, returns
/api/pipeline               → GET pipeline (role-scoped, ?salesPersonId= filter)
/api/pipeline/create        → POST create pipeline entry
/api/pipeline/update-stage  → POST update school stage
/api/activities             → GET/POST/PATCH activities (calendar)
/api/bd/analytics           → GET BD analytics
/api/bd/tasks               → GET/POST tasks
/api/bd/team                → GET team members under BD_HEAD
/api/bd/schools             → GET/POST schools
/api/admin/analytics        → GET org analytics
/api/admin/users            → GET all users
/api/admin/create-user      → POST create user (multi-role)
/api/admin/update-user      → POST update user
/api/admin/audit-log        → GET audit log
/api/admin/export-sheets    → POST export to Google Sheets
/api/admin/schools/bulk-upload → POST CSV school import
/api/admin/gdpr/export      → GET GDPR data export for a user (NEW)
/api/admin/gdpr/erase       → POST right-to-erasure / anonymize user (NEW)
/api/sales/analytics        → GET personal analytics
/api/content/topics         → GET/POST/PATCH/DELETE content topics
/api/content/documents      → GET/POST/PATCH/DELETE content documents
/api/content/documents/[id] → GET single document
/api/content/documents/beacon → POST beacon save (no auth)
/api/content/question-banks → GET/POST/PATCH
/api/content/questions      → GET/POST/DELETE
/api/content/materials      → GET/POST
/api/content/quiz-sessions  → GET/POST/PATCH
/api/content/training-sessions → GET/POST/PATCH
/api/ai/chat                → POST Gemini chat

---

## ENV VARIABLES REQUIRED

DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=         (NEW - for refresh tokens)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_SHEETS_ID=
GEMINI_API_KEY=
APP_URL=
SENTRY_DSN=                 (NEW - optional, for error tracking)

---

## CONTENT EDITOR — CRITICAL RULES

The editor at /content/workspace/[id] is a full-viewport Google Docs-style editor.
It does NOT use the regular app layout or sidebar.
AIChatbot is rendered globally by LayoutClient.tsx — do NOT import it again in the workspace page.

Loading content into editor — ONLY this pattern works:
1. Fetch document from /api/content/documents/[id]
2. Set docLoaded = true after fetch
3. In a separate useEffect that depends on [docLoaded, doc]:
   if (!docLoaded || !editorRef.current || !doc) return
   editorRef.current.innerHTML = doc.body || ""
NEVER use dangerouslySetInnerHTML on the contenteditable div.
NEVER set innerHTML in JSX or render.

Auto-save triggers on every "input" event, debounced 1000ms.
Saves to PATCH /api/content/documents with { id, body, title, wordCount, charCount }.
No action field = content save. Action field = status change.
Beacon saves on tab close via navigator.sendBeacon to /api/content/documents/beacon.

Content workflow:
Admin creates topic → document auto-created in same transaction →
Content team opens topic card → navigates to /content/workspace/[doc.id] →
Writes content → submits → Admin reviews → Approves or Rejects with comment →
Approved → Admin sends to design team via email with HTML export →
Published when final

---

## COMMON ERRORS AND FIXES

ERROR: Hydration mismatch on sidebar SVG icons
FIX: app/(protected)/layout.tsx uses dynamic import with ssr:false
     The actual sidebar is in LayoutClient.tsx loaded client-only

ERROR: prisma field does not exist in select
FIX: Run npx prisma generate after any schema change

ERROR: Both middleware.ts and proxy.ts detected
FIX: Remove-Item middleware.ts — keep only proxy.ts

ERROR: Turbopack webpack config error
FIX: Remove next-pwa or any webpack plugin from next.config.js
     next.config.js should only be: const nextConfig = { turbopack: {} }; module.exports = nextConfig

ERROR: Cannot read properties of null (reading innerHTML) in editor
FIX: innerHTML must only be set inside useEffect after docLoaded=true AND editorRef.current is not null

ERROR: Auto-save not working
FIX: Input event listener must be attached in useEffect that depends on [docLoaded]
     Not in the initial mount effect

ERROR: Content shows blank on reopen
FIX: Check GET /api/content/documents/[id] returns the body field
     Check the useEffect dependency array includes [docLoaded, doc]

ERROR: Menu items in editor not working (File/Edit/View etc)
FIX: All execCommand calls must call editorRef.current.focus() first
     All menu item clicks need e.stopPropagation()
     Dropdowns need z-index:200 and parent must not have overflow:hidden

ERROR: AI chatbot not visible in editor
FIX: Import AIChatbot directly in the editor page
     Add <AIChatbot documentContext={...} showContextNote={true} /> at end of JSX

---

## ENTERPRISE HARDENING — IMPLEMENTATION PROGRESS

Started: 2026-03-30. All items below verified: npx tsc --noEmit = 0 errors, npx vitest run = 39/39 pass.

### SECURITY

| # | Feature | Status | File(s) |
|---|---------|--------|---------|
| S1 | Security headers (CSP, HSTS, X-Frame, Permissions-Policy, Referrer) | ✅ DONE | next.config.js |
| S2 | In-memory rate limiting — login (10/15min), create-user (20/hr) | ✅ DONE | lib/rateLimit.ts (pre-existing), api/auth/login, api/admin/create-user |
| S3 | Zod input validation — login, topics POST/PATCH, documents PATCH, create-user | ✅ DONE | lib/validate.ts |
| S4 | sanitize-html on document body save (prevents XSS via rich text) | ✅ DONE | api/content/documents/route.ts PATCH |
| S5 | JWT refresh token flow — 1hr access + 7d refresh, rotation on use, revoke on logout | ✅ DONE | api/auth/login, api/auth/refresh/route.ts, api/auth/logout |
| S6 | Refresh tokens stored as SHA-256 hash in DB (RefreshToken table) | ✅ DONE | prisma/schema.prisma, api/auth/refresh |

### DATA & COMPLIANCE

| # | Feature | Status | File(s) |
|---|---------|--------|---------|
| D1 | Soft delete — Order (deletedAt field, filtered from all list queries) | ✅ DONE | prisma/schema.prisma, api/orders/list/route.ts |
| D2 | Soft delete — School (deletedAt field added to schema) | ✅ DONE | prisma/schema.prisma (field added, route filtering TODO) |
| D3 | Soft delete — ContentTopic + ContentDocument (cascade on topic delete) | ✅ DONE | api/content/topics DELETE + api/content/documents DELETE |
| D4 | Document versioning — ContentDocumentVersion table (snapshot on demand) | ✅ DONE | prisma/schema.prisma, api/content/documents/versions/route.ts |
| D5 | GDPR export — bundles all PII + activity for a user as JSON download | ✅ DONE | api/admin/gdpr/export/route.ts |
| D6 | GDPR right-to-erasure — anonymizes name/email/phone, revokes tokens, soft-deletes docs | ✅ DONE | api/admin/gdpr/erase/route.ts |

### OBSERVABILITY

| # | Feature | Status | File(s) |
|---|---------|--------|---------|
| O1 | Health endpoint GET /api/health — DB ping, 503 on failure | ✅ DONE | api/health/route.ts |
| O2 | Audit log — USER_LOGIN on every successful login | ✅ DONE | api/auth/login/route.ts |
| O3 | Audit log — USER_CREATED on admin user creation | ✅ DONE | api/admin/create-user/route.ts |
| O4 | Audit log — TOPIC_DELETE, DOCUMENT_DELETE | ✅ DONE | api/content/topics, api/content/documents DELETE handlers |
| O5 | Audit log — DOCUMENT_SUBMIT/APPROVE/REJECT/SEND_TO_DESIGN/PUBLISH/RESUBMIT | ✅ DONE | api/content/documents/route.ts PATCH |
| O6 | Audit log — GDPR_EXPORT, GDPR_ERASE | ✅ DONE | api/admin/gdpr/* |
| O8 | Audit log — ORDER_APPROVED, ORDER_REJECTED | ✅ DONE | api/bd/approve-order, api/bd/reject-order |
| O9 | Audit log — ORDER_RETURN_FILED, ORDER_STATUS_UPDATED | ✅ DONE | api/orders/return, api/orders/update-status |
| O7 | Pino structured logger (replaces console.log in new code) | ✅ DONE | lib/logger.ts — import and use in new routes |

### RELIABILITY

| # | Feature | Status | File(s) |
|---|---------|--------|---------|
| R1 | Pagination — GET /api/content/topics ?page&limit, returns {topics,total,page,limit,pages} | ✅ DONE | api/content/topics/route.ts |
| R2 | Pagination — GET /api/content/documents ?page&limit, returns {docs,total,...} | ✅ DONE | api/content/documents/route.ts |
| R3 | Pagination — GET /api/orders/list ?page&limit&status, returns {orders,total,...} | ✅ DONE | api/orders/list/route.ts |
| R4 | All 15 consumer pages updated to handle paginated response format | ✅ DONE | orders/*, sales/*, bd/*, content/*, design/* pages |

### TESTING

| # | Feature | Status | File(s) |
|---|---------|--------|---------|
| T1 | Auth unit tests (verifyToken, hasModule, getTokenFromRequest) | ✅ DONE | lib/__tests__/auth.test.ts |
| T2 | Rate limiter unit tests (allow, block, reset, isolation, remaining) | ✅ DONE | lib/__tests__/rateLimit.test.ts |
| T3 | Zod schema unit tests (login, topic, doc, patch schemas — 15 cases) | ✅ DONE | lib/__tests__/validate.test.ts |
| T4 | CSV parse unit tests | ✅ DONE | lib/__tests__/csvParse.test.ts |

### STILL PENDING (enterprise)

| # | Feature | Notes |
|---|---------|-------|
| P1 | 2FA/MFA (TOTP) | otplib + QR code UI — complex, needs modal in login flow |
| P2 | Field-level encryption on User.phone/email | @prisma-field-encryption — needs key management |
| P3 | Background job queue | pg-boss or BullMQ — for emails, Drive backup, bulk import |
| P4 | Playwright E2E tests | Login → create topic → submit → approve flow |
| P5 | School soft-delete filtering | ✅ DONE — api/admin/schools, api/bd/schools, api/search now filter deletedAt:null |
| P6 | Document versioning auto-snapshot on submit/approve | ✅ DONE — PATCH action handler creates ContentDocumentVersion on submit+approve |
| P7 | Admin UI for GDPR export/erase | /admin/users page — add "Export Data" and "Erase User" buttons per user row |
| P8 | Rate limiting on bulk endpoints | /api/admin/schools/bulk-upload, /api/admin/import |
| P9 | Sentry integration | npm install @sentry/nextjs, configure DSN in .env, wrap API handlers |

---

## WHAT IS STILL PENDING (as of last session)

COMPLETED FEATURES (as of 2026-04-10):
1.  ✅ Returns UI — form on order detail page + audit log in api/orders/return
2.  ✅ Order approval queue — bd/approvals page
3.  ✅ Rejection reason visible to sales rep on their order detail page
4.  ✅ School profile page — /schools/[id] universal (sales, BD, admin)
5.  ✅ Payment status on orders — UNPAID/PARTIAL/PAID + amount fields
6.  ✅ Delivery confirmation — DISPATCHED/DELIVERED status in update-status
7.  ✅ Target setting — /targets page, admin sets per-rep targets
8.  ✅ Incentive calculator — sales/incentives + bd/incentives pages
9.  ✅ School dormant alerts — /sales/visit-alerts, 30+ day flag on school profile
10. ✅ Global search — /api/search, school+order+rep
11. ✅ In-app notifications — bell icon, polling, ORDER_APPROVED/REJECTED types
12. ✅ Engagement → Conversion analytics — /api/analytics/engagement-conversion
13. ✅ Competitor intelligence analytics — /api/analytics/competitors
14. ✅ Pipeline stage auto-advance LEAD/CONTACTED → PROPOSAL_SENT on order approval
15. ✅ Audit logs on approve-order and reject-order routes

MISSING FEATURES (still pending):
1.  Bulk order import — historical data migration via CSV
2.  Admin can edit/deactivate existing users (currently only create)
3.  Admin can reassign schools between reps from UI
4.  Edit school details after creation

CONTENT TEAM PENDING:
17. Design team upload flow — design team uploads final file, admin marks published
18. Training material file upload (currently only URL links)

ENTERPRISE PENDING (from current session):
19. 2FA/MFA (TOTP) — otplib — NOT YET STARTED (complex, needs UI)
20. Field-level encryption on User.phone, User.email — NOT YET STARTED
21. Background job queue (pg-boss / BullMQ) for emails + Drive backups — NOT YET STARTED
22. Playwright E2E tests — NOT YET STARTED

---

## BUSINESS CONTEXT

Nutshell GK Books:
- Publisher AND distributor of GK books for schools
- Products: Annual books (Class 1-8, ₹360-₹470 MRP) and Paperbacks (Plains ₹600-₹660, Hills ₹600 fixed — Hills pricing is legacy, cannot increase)
- Returns are common — track carefully
- Sales reps are salaried + incentive — do not show leaderboards
- Hills vs Plains is geographic — Siliguri is the base
- Vendor = delivery/fulfilment partner who gets order confirmation email
- Quiz and teacher training = free engagement activities to build school relationships
- Content team creates GK book content — quiz questions, chapter material, answer keys
- Trainers go to schools and conduct quizzes + teacher training sessions
- All school data has competitor info (currentGKMaterial, currentMaterialPrice) for sales intelligence
