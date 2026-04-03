# Finance Dashboard UI

A clean and interactive frontend-only finance dashboard built with React + Vite + Tailwind CSS v4.

This project is designed for evaluation of frontend thinking: component design, data flow, state handling, usability, and polish.

## Setup

1. Install dependencies

```bash
npm install
```

2. Start dev server

```bash
npm run dev
```

3. Build for production

```bash
npm run build
```

4. Lint

```bash
npm run lint
```

## What Is Implemented

### 1) Dashboard Overview

- Summary cards for:
  - Total Balance
  - Total Income
  - Total Expenses
- Time based visualization:
  - Balance trend line chart (monthly running balance)
- Categorical visualization:
  - Spending breakdown by category (bars)

### 2) Transactions Section

- Transaction table includes:
  - Date
  - Amount
  - Category
  - Type (income/expense)
  - Note
- Features:
  - Search (date/category/note)
  - Filter by type
  - Filter by category
  - Sort by date or amount
- Empty state when no transactions match filters

### 3) Basic Role Based UI (Frontend Simulation)

- Role switcher:
  - Viewer: read-only
  - Admin: can add/edit transactions
- UI behavior changes by selected role

### 4) Insights Section

- Highest spending category
- Monthly expense comparison
- Savings-rate observation

### 5) State Management

Managed with React hooks (`useState`, `useMemo`, `useEffect`) for:

- Transactions data
- Filters and sorting
- Selected role
- Admin form state

Computed data is memoized for clarity and efficiency.

### 6) UI / UX Expectations

- Clean and readable dashboard layout
- Responsive across mobile/tablet/desktop
- Graceful empty states
- Subtle motion and gradients for modern polish

## Optional Enhancements Included

- Local storage persistence for:
  - role
  - transactions

## Assumptions

- Static mock data is used (no backend dependency).
- Currency is displayed in USD for demonstration.
- Admin actions are intentionally frontend-only simulation.

## Project Notes

- Main implementation lives in `src/App.jsx`.
- Dashboard visual theme and reusable utility classes are in `src/index.css`.
