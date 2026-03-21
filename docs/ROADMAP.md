# ERP SYSTEM DEVELOPMENT ROADMAP

## CORE FOUNDATION (DONE)
[x] Auth system
[x] Role system
[x] Order creation
[x] Order details
[x] Returns system
[x] Net revenue calculation
[x] Prisma relational schema
[x] Production build stable

---

## PHASE 1 – REVENUE ENGINE HARDENING
[x] Role-based order visibility        ← implemented in orders/list API
[x] Order edit lock logic              ← orders are immutable by design (no edit route exists)
[x] Revenue analytics refinement       ← analytics now use status: APPROVED + netAmount
[x] School-level revenue summary       ← pipeline API includes orders with netAmount

---

## PHASE 2 – PIPELINE SYSTEM
[x] Pipeline board UI
[x] Stage update API
[x] Conversion tracking       ← conversionRate in /api/sales/analytics (CLOSED_WON / total closed)
[x] Event scheduling          ← Quiz / Teacher Training / Meeting per school with date; calendar on sales dashboard
[x] Forecast engine           ← stage-weighted revenue forecast in BD analytics + analytics page

---

## PHASE 3 – FIELD INTELLIGENCE
[x] Visit tracking UI          ← LogVisitModal on pipeline page
[x] Visit analytics            ← outcome breakdown on analytics page (BD + Sales)
[ ] Location logging system
[ ] Performance heatmap

---

## PHASE 4 – TASK ENGINE 2.0
[x] Task assignment (BD → Sales)
[x] Task completion (Sales)
[x] Task priority levels       ← HIGH/MEDIUM/LOW field on Task; priority selector + badge in BD tasks UI
[x] Task analytics             ← completion rate, overdue count in analytics + BD tasks stat cards
[x] Overdue tracking           ← overdue badge + filter on BD tasks; overdueTasks in analytics
[ ] Task reporting dashboard

---

## PHASE 5 – ADMIN CONTROL CENTER
[x] User management
[x] Manager assignment
[x] System metrics            ← /admin/metrics page with users, orders, revenue, pipeline, tasks, field activity
[ ] Organization settings
[ ] Pricing engine control
[x] Audit log viewer          ← full page + paginated API at /audit-log with action filtering

---

## PHASE 6 – MOBILE READY ARCHITECTURE
[ ] API stabilization
[ ] Response normalization
[ ] Mobile-friendly auth
[ ] Location real-time tracking

---

## PHASE 7 – ENTERPRISE GRADE
[ ] Role permission matrix
[x] Data export               ← Google Sheets export via /api/admin/export-sheets + ExportSheetsButton
[ ] Financial reports
[ ] Billing module