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
[ ] Conversion tracking
[ ] Forecast engine

---

## PHASE 3 – FIELD INTELLIGENCE
[ ] Visit tracking UI
[ ] Visit analytics
[ ] Location logging system
[ ] Performance heatmap

---

## PHASE 4 – TASK ENGINE 2.0
[x] Task assignment (BD → Sales)
[x] Task completion (Sales)
[ ] Task priority levels
[ ] Task analytics
[ ] Overdue tracking
[ ] Task reporting dashboard

---

## PHASE 5 – ADMIN CONTROL CENTER
[x] User management
[x] Manager assignment
[ ] System metrics
[ ] Organization settings
[ ] Pricing engine control
[ ] Audit log viewer

---

## PHASE 6 – MOBILE READY ARCHITECTURE
[ ] API stabilization
[ ] Response normalization
[ ] Mobile-friendly auth
[ ] Location real-time tracking

---

## PHASE 7 – ENTERPRISE GRADE
[ ] Role permission matrix
[ ] Data export
[ ] Financial reports
[ ] Billing module