# Pharmacy Khata - Project Plan & Execution Roadmap

## 1. Executive Summary
Pharmacy Khata is a high-reliability, responsive, and secure web application designed to manage daily inter-pharmacy medicine exchanges, lending/borrowing, returns, and accurate financial ledgers. Built with Next.js (App Router), TypeScript, Tailwind CSS, Shadcn UI, and Supabase (PostgreSQL with RLS and Auth), the application provides double-entry accounting integrity, full audit history, and trilingual support (English, Roman Urdu, and Urdu RTL).

---

## 2. Tech Stack & Engineering Standards
- **Framework:** Next.js 15+ (App Router, Server & Client Components)
- **Language:** TypeScript (Strict mode enabled, zero `any` policy)
- **Styling & UI:** Tailwind CSS, Shadcn UI / Radix UI, Lucide Icons
- **Database & Auth:** Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS)
- **Financial Calculations:** Decimal-safe arithmetic (no floating point errors, precision rounded to 2 decimals)
- **Internationalization (i18n):** Context-driven trilingual engine: English (en), Roman Urdu (ur-ro), Urdu (ur) with automatic RTL/LTR direction switching
- **Exporting & Reporting:** Native HTML-to-PDF / print-optimized CSS for daily closings, statements, and receipts
- **Testing:** Vitest / Playwright / Custom automated test runner scripts verifying calculations, database integrity, and UI flows

---

## 3. Core Accounting & Domain Rules

### 3.1 Transaction Types
1. **Medicine Received (Borrowing / Receiving from another pharmacy):**
   - Represents goods received.
   - Financial effect: **Payable** to that pharmacy increases.
2. **Medicine Given (Lending / Supplying to another pharmacy):**
   - Represents goods given out.
   - Financial effect: **Receivable** from that pharmacy increases.

### 3.2 Pricing & Calculation Formulas
- $\text{Discount Amount} = \frac{\text{Retail Price} \times \text{Discount Percentage}}{100}$
- $\text{Discounted Unit Price} = \text{Retail Price} - \text{Discount Amount}$
- $\text{Line Total} = \text{Quantity} \times \text{Discounted Unit Price}$
- $\text{Grand Total} = \sum (\text{Line Totals})$

### 3.3 Return Formulas & Ledger Reversals
- Linked directly to specific `transaction_items` row.
- Total returned quantity cannot exceed `quantity - already_returned_quantity`.
- $\text{Return Amount} = \text{Return Quantity} \times \text{Original Discounted Unit Price}$
- **Return of Received Medicine:** Reduces **Payable**.
- **Return of Given Medicine:** Reduces **Receivable**.

### 3.4 Pharmacy Running Khata
- $\text{Net Balance} = \text{Total Payable} - \text{Total Receivable}$
- If $\text{Net Balance} > 0$: **Net Payable** (You owe the pharmacy).
- If $\text{Net Balance} < 0$: **Net Receivable** (The pharmacy owes you).
- Running balance computed chronologically from opening balance and ledger entries.

---

## 4. Phase-by-Phase Roadmap

| Phase | Milestone | Acceptance Criteria |
|---|---|---|
| **Phase 00** | Project Inspection & Planning | Workspace inspected; Docs created (`PROJECT_PLAN.md`, `DATABASE_SCHEMA.md`, `DEVELOPMENT_PROGRESS.md`, `TESTING_REPORT.md`, `ARCHITECTURE.md`). |
| **Phase 01** | Project Initialization | Next.js + TS + Tailwind + Shadcn UI initialized, dependencies installed, dev/build scripts clean. |
| **Phase 02** | Supabase Database Architecture | SQL migrations defined for all 7 tables, atomic constraints, foreign keys, numeric precision, RLS, audit triggers. |
| **Phase 03** | Auth & Security | Supabase auth integration, session management, middleware route protection, RLS policies tested. |
| **Phase 04** | UI System & Dashboard | Responsive sidebar/topbar layout, metric cards, recent transactions, quick actions, empty/loading states. |
| **Phase 05** | Pharmacy Management | Add, edit, list, search, soft delete, restore, and view profile for pharmacies with validation. |
| **Phase 06** | Medicine Transaction System | Multi-line transaction entry, dynamic calculation, discount validation, atomic database persistence. |
| **Phase 07** | Medicine Return System | Item-linked returns, partial return checks, strict quantity limits, accurate ledger reversal. |
| **Phase 08** | Pharmacy-wise Khata | Chronological statement with running balance, opening balance, debit/credit entries, net status badge. |
| **Phase 09** | Daily Khata & Closing | Date-filtered ledger, aggregate totals (received, given, returns, payable, receivable), daily closing snapshot. |
| **Phase 10** | Complete Activity History | Searchable immutable audit trail tracking record ID, table, action, old/new json data, timestamp. |
| **Phase 11** | Multi-Language System | Trilingual support (English, Roman Urdu, Urdu RTL) with persistent settings and comprehensive dictionaries. |
| **Phase 12** | Reports & Exports | Print-ready PDF statements, daily closing sheets, pharmacy ledgers with crisp layout. |
| **Phase 13** | Integration & E2E Testing | Comprehensive simulation of full business cycle: pharmacies -> transactions -> returns -> ledgers -> audits. |
| **Phase 14** | Security & Performance Audit | Audit of input validation, SQL injection safety, RLS airtightness, bundle optimization, error boundaries. |
| **Phase 15** | Production Readiness & Deployment | Environment variable configurations, Vercel deployment readiness, migration verification. |

---

## 5. Risk Assessment & Mitigations
1. **Floating Point Inaccuracies:**
   - *Mitigation:* Use integer cents or PostgreSQL `numeric(12, 2)` with standard bankers or round-half-up utility functions (`Math.round((val + Number.EPSILON) * 100) / 100`).
2. **Over-returning Items:**
   - *Mitigation:* Database-level check constraints and transaction row locking during return creation.
3. **Audit Trail Tampering:**
   - *Mitigation:* Row Level Security denying UPDATE/DELETE on `activity_logs`.
