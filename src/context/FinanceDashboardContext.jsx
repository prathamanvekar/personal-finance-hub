import { useEffect, useMemo, useState } from "react";
import { DashboardContext } from "./dashboardContext.js";

const STORAGE_KEY = "finance-dashboard-v1";

const initialTransactions = [
  {
    id: "t1",
    date: "2026-01-04",
    amount: 4300,
    category: "Salary",
    type: "income",
    note: "January salary",
  },
  {
    id: "t2",
    date: "2026-01-08",
    amount: 72,
    category: "Food",
    type: "expense",
    note: "Lunch with team",
  },
  {
    id: "t3",
    date: "2026-01-12",
    amount: 240,
    category: "Transport",
    type: "expense",
    note: "Fuel and toll",
  },
  {
    id: "t4",
    date: "2026-01-20",
    amount: 125,
    category: "Entertainment",
    type: "expense",
    note: "Movie night",
  },
  {
    id: "t5",
    date: "2026-02-03",
    amount: 4400,
    category: "Salary",
    type: "income",
    note: "February salary",
  },
  {
    id: "t6",
    date: "2026-02-06",
    amount: 520,
    category: "Shopping",
    type: "expense",
    note: "Sneakers",
  },
  {
    id: "t7",
    date: "2026-02-14",
    amount: 96,
    category: "Food",
    type: "expense",
    note: "Valentine dinner",
  },
  {
    id: "t8",
    date: "2026-02-17",
    amount: 380,
    category: "Utilities",
    type: "expense",
    note: "Electricity bill",
  },
  {
    id: "t9",
    date: "2026-03-02",
    amount: 4550,
    category: "Salary",
    type: "income",
    note: "March salary",
  },
  {
    id: "t10",
    date: "2026-03-09",
    amount: 250,
    category: "Healthcare",
    type: "expense",
    note: "Routine checkup",
  },
  {
    id: "t11",
    date: "2026-03-16",
    amount: 148,
    category: "Food",
    type: "expense",
    note: "Groceries",
  },
  {
    id: "t12",
    date: "2026-03-21",
    amount: 720,
    category: "Travel",
    type: "expense",
    note: "Weekend trip",
  },
  {
    id: "t13",
    date: "2026-04-02",
    amount: 4700,
    category: "Salary",
    type: "income",
    note: "April salary",
  },
  {
    id: "t14",
    date: "2026-04-06",
    amount: 210,
    category: "Transport",
    type: "expense",
    note: "Metro card recharge",
  },
  {
    id: "t15",
    date: "2026-04-10",
    amount: 430,
    category: "Utilities",
    type: "expense",
    note: "Internet + water",
  },
];

function createEmptyDraft() {
  return {
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    category: "Food",
    type: "expense",
    note: "",
  };
}

function readPersistedDashboardState() {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function FinanceDashboardProvider({ children }) {
  const [role, setRole] = useState(() => {
    const saved = readPersistedDashboardState();
    return saved?.role ?? "viewer";
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = readPersistedDashboardState();
    return Array.isArray(saved?.transactions) && saved.transactions.length > 0
      ? saved.transactions
      : initialTransactions;
  });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(createEmptyDraft);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ role, transactions }));
  }, [role, transactions]);

  const value = useMemo(
    () => ({
      role,
      setRole,
      transactions,
      setTransactions,
      search,
      setSearch,
      typeFilter,
      setTypeFilter,
      categoryFilter,
      setCategoryFilter,
      sortBy,
      setSortBy,
      editingId,
      setEditingId,
      draft,
      setDraft,
    }),
    [
      role,
      transactions,
      search,
      typeFilter,
      categoryFilter,
      sortBy,
      editingId,
      draft,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
