# System Architecture Specification

## 1. System Overview
Pharmacy Khata is structured as a modern, high-performance Next.js application utilizing the App Router architecture, TypeScript for end-to-end type safety, Tailwind CSS for modular styling, and Supabase for authentication, relational storage, and row-level security.

```
+-----------------------------------------------------------------------------------+
|                                 Next.js 15+ App                                   |
|                                                                                   |
|  +-------------------+  +-----------------------+  +---------------------------+  |
|  | Presentation (UI) |  | Client/Server Actions |  | Internationalization (i18n)| |
|  | Shadcn UI / Radix |  | Zod Schema Validation |  | EN / Roman Urdu / Urdu RTL|  |
|  | Tailwind CSS      |  | Decimal Calculators   |  | Lucide Icons              |  |
|  +-------------------+  +-----------------------+  +---------------------------+  |
|                                     |                                             |
|                                     v                                             |
|  +-----------------------------------------------------------------------------+  |
|  |                     Supabase Client & Server Context                        |  |
|  |                SSR Cookie Management (@supabase/ssr)                        |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                             Supabase PostgreSQL                                   |
|                                                                                   |
|  +---------------------+  +----------------------+  +--------------------------+  |
|  |  7 Relational Tables|  | Row Level Security   |  | Immutable Audit Triggers |  |
|  |  NUMERIC(12, 2)     |  | auth.uid() Tenant    |  | activity_logs            |  |
|  +---------------------+  +----------------------+  +--------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Directory Layout
The folder structure organizes client/server boundaries, accounting business logic, and UI components cleanly:

```
d:\Personal Projects\Pharmacy khata\
├── src\
│   ├── app\
│   │   ├── (auth)\
│   │   │   ├── login\
│   │   │   └── register\
│   │   ├── (dashboard)\
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                    # Main Dashboard
│   │   │   ├── transactions\
│   │   │   │   ├── page.tsx                # Transaction listing
│   │   │   │   └── new\page.tsx            # New Transaction Entry
│   │   │   ├── khata\
│   │   │   │   └── page.tsx                # Daily Khata & Daily Closing
│   │   │   ├── pharmacies\
│   │   │   │   ├── page.tsx                # Pharmacy Management
│   │   │   │   └── [id]\page.tsx           # Individual Pharmacy Khata Statement
│   │   │   ├── returns\
│   │   │   │   ├── page.tsx                # Return History
│   │   │   │   └── new\page.tsx            # Process Return
│   │   │   ├── activity\
│   │   │   │   └── page.tsx                # Full Audit Log History
│   │   │   └── settings\
│   │   │       └── page.tsx                # Language & Profile Settings
│   │   ├── api\                            # API route handlers & report generators
│   │   ├── layout.tsx                      # Root HTML with RTL/LTR lang providers
│   │   └── globals.css
│   ├── components\
│   │   ├── ui\                             # Shadcn UI primitives (Button, Dialog, Input, Table, Card...)
│   │   ├── layout\                         # Sidebar, Header, MobileNav, LanguageSwitcher
│   │   ├── transactions\                   # Dynamic line-item tables, discount calculator
│   │   ├── khata\                          # Ledger statements, running balances, closing sheets
│   │   └── common\                         # EmptyState, ErrorBoundary, ConfirmationDialog, StatCard
│   ├── lib\
│   │   ├── supabase\
│   │   │   ├── client.ts                   # Browser Supabase client
│   │   │   ├── server.ts                   # Server-side Supabase client (@supabase/ssr)
│   │   │   └── middleware.ts               # Auth session refresh middleware
│   │   ├── calculations\
│   │   │   ├── financial.ts                # Invariant-checked precision math functions
│   │   │   └── financial.test.ts           # Vitest suite for financial logic
│   │   ├── i18n\
│   │   │   ├── dictionaries.ts             # English, Roman Urdu, Urdu translation dictionaries
│   │   │   └── context.tsx                 # Language Context with RTL toggle
│   │   └── utils.ts                        # Styling & string utilities
│   ├── types\
│   │   ├── database.types.ts               # Supabase generated / typed schemas
│   │   └── khata.types.ts                  # Domain models, view models, and filters
│   └── middleware.ts                       # Next.js route protection middleware
├── supabase\
│   └── migrations\
│       └── 001_initial_schema.sql          # Version-controlled PostgreSQL migration
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## 3. Application Routes

| Path | Purpose |
|---|---|
| `/login` | Authentication (Sign In & Sign Up) |
| `/` | Dashboard (Daily stats, quick actions, recent activity) |
| `/transactions` | List all medicine exchange transactions |
| `/transactions/new` | Multi-item medicine exchange form (Received / Given) |
| `/transactions/[id]` | Invoice and transaction details view |
| `/pharmacies` | Pharmacy directory, balances, search, add/edit modal |
| `/pharmacies/[id]` | Comprehensive Pharmacy ledger statement with running balance |
| `/returns` | List of all returns with link to original items |
| `/returns/new` | Item-level return processing dialog/page |
| `/khata` | Daily Khata ledger & Daily Closing calculations |
| `/activity` | Immutable audit trail & change history |
| `/settings` | Language selector (EN, Roman Urdu, Urdu RTL) & store profile |

---

## 4. Acceptance Criteria for Phase 00 Verification
- [x] Complete project plan documented in `PROJECT_PLAN.md`.
- [x] Complete database schema with types, foreign keys, and indexes documented in `DATABASE_SCHEMA.md`.
- [x] Development progress matrix and verification log initiated in `DEVELOPMENT_PROGRESS.md`.
- [x] Quality assurance and testing protocol established in `TESTING_REPORT.md`.
- [x] System architecture, route hierarchy, and directory structure defined in `ARCHITECTURE.md`.

Phase 00 is complete and verified. Progression to Phase 01 is approved.
