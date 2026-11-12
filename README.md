# Pharmacy Khata (فارمیسی کھاتہ)

An autonomous, test-driven, production-ready web application designed for pharmacies to manage inter-pharmacy medicine borrowings, lendings, itemized returns, and double-entry financial ledgers.

---

## 🌟 Key Features

1. **Precision Financial Ledger:**
   - **Medicine Received** $\to$ Payable liability to that pharmacy.
   - **Medicine Given** $\to$ Receivable asset from that pharmacy.
   - **Returns** $\to$ Atomically deducted from the respective liability/asset.
   - Chronological running balances computed directly from ledger transactions with zero floating-point drift.

2. **Core Accounting Formulas:**
   - $\text{Discount Amount} = \text{Retail Price} \times \frac{\text{Discount \%}}{100}$
   - $\text{Discounted Price} = \text{Retail Price} - \text{Discount Amount}$
   - $\text{Line Total} = \text{Quantity} \times \text{Discounted Price}$
   - $\text{Grand Total} = \sum (\text{Line Totals})$
   - $\text{Return Amount} = \text{Return Quantity} \times \text{Original Discounted Unit Price}$

3. **Item-Linked Medicine Returns:**
   - Every return links directly to an original transaction item.
   - Strict boundary validation prevents returning more than the remaining quantity.
   - Supports multiple partial returns.

4. **Multi-Language Support (3 Languages):**
   - **English** (LTR)
   - **Roman Urdu** (LTR)
   - **Simple Urdu** (RTL with Noto Nastaliq font)
   - Switchable at runtime and persisted in user settings.

5. **Daily Khata & Daily Closing:**
   - Date-wise transaction ledger and pharmacy-wise summary breakdown.
   - Computes daily received, given, returns, payable, receivable, and net positions.

6. **Immutable Audit History:**
   - Append-only activity logs tracking user ID, action, table, record ID, and JSON diffs of changes.

7. **Print & PDF Statements:**
   - Instant print-ready formatting for customer statements, invoices, and closing sheets.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router, React 19)
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS, Lucide React
- **Database & Auth:** Supabase PostgreSQL with Row Level Security (RLS)
- **Testing:** Vitest (20 automated tests passing)

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Environment Setup
Copy the example environment configuration:
```bash
cp .env.example .env.local
```
Add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
*(Note: Pharmacy Khata includes an integrated offline-first repository with memory storage fallback, allowing the entire app to run immediately in demo mode even without active Supabase credentials.)*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Automated Test Suite
```bash
npm test
```

### 5. Production Build
```bash
npm run build
npm start
```

---

## 📂 Supabase Database Migration
To apply the PostgreSQL schema, indexes, RLS policies, and atomic RPC functions to your Supabase project, execute the migration located at:
`supabase/migrations/001_initial_schema.sql`
