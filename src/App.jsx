import { useMemo } from "react";
import { useFinanceDashboard } from "./context/useFinanceDashboard.js";
import CountUp from "./components/CountUp.jsx";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

function formatMoney(value) {
  return currency.format(value);
}

function labelMonth(dateString) {
  return monthFormatter.format(new Date(dateString));
}

function getMonthKey(dateString) {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function emptyDraft() {
  return {
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    category: "Food",
    type: "expense",
    note: "",
  };
}

function App() {
  const {
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
  } = useFinanceDashboard();

  const categories = useMemo(() => {
    return [...new Set(transactions.map((t) => t.category))].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [transactions]);

  const totals = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const expense = transactions
      .filter((t) => t.type === "expense")
      .reduce((acc, t) => acc + Number(t.amount), 0);

    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [transactions]);

  const trendData = useMemo(() => {
    const byMonth = new Map();

    for (const t of transactions) {
      const key = getMonthKey(t.date);
      const existing = byMonth.get(key) ?? {
        month: key,
        income: 0,
        expense: 0,
      };
      if (t.type === "income") {
        existing.income += Number(t.amount);
      } else {
        existing.expense += Number(t.amount);
      }
      byMonth.set(key, existing);
    }

    const rows = [...byMonth.values()].sort((a, b) =>
      a.month.localeCompare(b.month),
    );

    return rows.reduce((acc, row) => {
      const previousBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
      const balance = previousBalance + (row.income - row.expense);

      acc.push({
        ...row,
        label: labelMonth(`${row.month}-01`),
        balance,
      });

      return acc;
    }, []);
  }, [transactions]);

  const spendingByCategory = useMemo(() => {
    const byCategory = new Map();

    for (const t of transactions) {
      if (t.type !== "expense") continue;
      byCategory.set(
        t.category,
        (byCategory.get(t.category) ?? 0) + Number(t.amount),
      );
    }

    return [...byCategory.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    let next = transactions.filter((t) => {
      const typeMatch = typeFilter === "all" || t.type === typeFilter;
      const categoryMatch =
        categoryFilter === "all" || t.category === categoryFilter;
      const searchMatch =
        query.length === 0 ||
        t.category.toLowerCase().includes(query) ||
        t.note.toLowerCase().includes(query) ||
        t.date.includes(query);

      return typeMatch && categoryMatch && searchMatch;
    });

    next = next.sort((a, b) => {
      if (sortBy === "date-desc") return new Date(b.date) - new Date(a.date);
      if (sortBy === "date-asc") return new Date(a.date) - new Date(b.date);
      if (sortBy === "amount-desc") return Number(b.amount) - Number(a.amount);
      if (sortBy === "amount-asc") return Number(a.amount) - Number(b.amount);
      return 0;
    });

    return next;
  }, [transactions, search, typeFilter, categoryFilter, sortBy]);

  const insights = useMemo(() => {
    const topCategory = spendingByCategory[0];
    const latestMonth = trendData[trendData.length - 1];
    const previousMonth = trendData[trendData.length - 2];

    let monthlyComparison = "Not enough monthly data for comparison yet.";
    if (latestMonth && previousMonth) {
      const delta = latestMonth.expense - previousMonth.expense;
      const direction = delta >= 0 ? "higher" : "lower";
      monthlyComparison = `${latestMonth.label} expenses are ${formatMoney(Math.abs(delta))} ${direction} than ${previousMonth.label}.`;
    }

    const savingsRate =
      totals.income === 0
        ? 0
        : ((totals.balance / totals.income) * 100).toFixed(1);

    return {
      topCategory: topCategory
        ? `${topCategory.category} (${formatMoney(topCategory.amount)}) is your highest spending category.`
        : "No spending category data yet.",
      monthlyComparison,
      observation: `Current savings rate is ${savingsRate}% based on all tracked transactions.`,
    };
  }, [spendingByCategory, trendData, totals.balance, totals.income]);

  const linePoints = useMemo(() => {
    if (trendData.length === 0) return "";

    const maxBalance = Math.max(...trendData.map((d) => d.balance), 1);
    const minBalance = Math.min(...trendData.map((d) => d.balance), 0);
    const spread = maxBalance - minBalance || 1;

    return trendData
      .map((point, index) => {
        const x =
          trendData.length === 1 ? 50 : (index / (trendData.length - 1)) * 100;
        const y = 100 - ((point.balance - minBalance) / spread) * 100;
        return `${x},${y}`;
      })
      .join(" ");
  }, [trendData]);

  const areaPath = useMemo(() => {
    if (trendData.length === 0) return "";
    return `M 0,100 L ${linePoints} L 100,100 Z`;
  }, [linePoints, trendData.length]);

  const isAdmin = role === "admin";

  function resetDraft() {
    setDraft(emptyDraft());
    setEditingId(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!isAdmin) return;

    const amount = Number(draft.amount);
    if (
      !draft.date ||
      !draft.category ||
      !draft.type ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return;
    }

    if (editingId) {
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? { ...t, ...draft, amount, note: draft.note.trim() || "No note" }
            : t,
        ),
      );
    } else {
      const item = {
        id: crypto.randomUUID(),
        ...draft,
        amount,
        note: draft.note.trim() || "No note",
      };
      setTransactions((prev) => [item, ...prev]);
    }

    resetDraft();
  }

  function startEdit(transaction) {
    if (!isAdmin) return;
    setEditingId(transaction.id);
    setDraft({
      date: transaction.date,
      amount: String(transaction.amount),
      category: transaction.category,
      type: transaction.type,
      note: transaction.note,
    });
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-11xl rounded-3xl p-4 sm:p-6 lg:p-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-white/20 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-slate-300">
              Personal Finance Hub
            </p>
            <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Finance Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
              Track cash flow, inspect transactions, and spot spending trends at
              a glance.
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-lg sm:p-4">
            <label
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-300"
              htmlFor="role"
            >
              Demo Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                resetDraft();
              }}
              className="w-full rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400"
            >
              <option value="viewer">Viewer (read only)</option>
              <option value="admin">Admin (add/edit)</option>
            </select>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            label="Total Balance"
            amount={totals.balance}
            tone="balance"
          />
          <SummaryCard
            label="Total Income"
            amount={totals.income}
            tone="income"
          />
          <SummaryCard
            label="Total Expenses"
            amount={totals.expense}
            tone="expense"
          />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
          <article className="panel-card xl:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-xl text-white">Balance Trend</h2>
              <p className="text-xs uppercase tracking-wider text-slate-300">
                Time based visualization
              </p>
            </div>

            {trendData.length === 0 ? (
              <EmptyState label="No monthly trend available yet." />
            ) : (
              <>
                <svg viewBox="0 0 100 100" className="h-64 w-full">
                  <defs>
                    <linearGradient
                      id="trendGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#trendGradient)" />
                  <polyline
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2.2"
                    points={linePoints}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-300 sm:grid-cols-6">
                  {trendData.map((point) => (
                    <div
                      key={point.month}
                      className="rounded-lg bg-slate-900/50 px-2 py-2 text-center"
                    >
                      <p>{point.label}</p>
                      <p className="mt-1 font-semibold text-white">
                        {formatMoney(point.balance)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </article>

          <article className="panel-card xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-xl text-white">
                Spending Breakdown
              </h2>
              <p className="text-xs uppercase tracking-wider text-slate-300">
                Categorical visualization
              </p>
            </div>

            {spendingByCategory.length === 0 ? (
              <EmptyState label="No expense data to categorize." />
            ) : (
              <div className="space-y-3">
                {spendingByCategory.map((item) => {
                  const max = spendingByCategory[0].amount || 1;
                  const percent = Math.round((item.amount / max) * 100);
                  return (
                    <div key={item.category}>
                      <div className="mb-1 flex items-center justify-between text-sm text-slate-200">
                        <span>{item.category}</span>
                        <span>{formatMoney(item.amount)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-linear-to-r from-cyan-400 to-emerald-400"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <article className="panel-card lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-xl text-white">Transactions</h2>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-slate-200">
                {filteredTransactions.length} shown
              </span>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input
                placeholder="Search note, date, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="filter-input xl:col-span-2"
              />

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="filter-input"
              >
                <option value="all">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="filter-input"
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-input md:col-span-2 xl:col-span-4"
              >
                <option value="date-desc">Sort: Date (newest)</option>
                <option value="date-asc">Sort: Date (oldest)</option>
                <option value="amount-desc">Sort: Amount (high to low)</option>
                <option value="amount-asc">Sort: Amount (low to high)</option>
              </select>
            </div>

            {filteredTransactions.length === 0 ? (
              <EmptyState label="No transactions found for current filters." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-160 text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-300">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Note</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      {isAdmin ? (
                        <th className="px-3 py-2 text-right">Action</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((t) => (
                      <tr
                        key={t.id}
                        className="border-t border-white/10 text-slate-100"
                      >
                        <td className="px-3 py-3">{t.date}</td>
                        <td className="px-3 py-3">{t.category}</td>
                        <td className="px-3 py-3">
                          <span
                            className={
                              t.type === "income"
                                ? "type-pill type-income"
                                : "type-pill type-expense"
                            }
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-300">{t.note}</td>
                        <td className="px-3 py-3 text-right font-semibold">
                          {formatMoney(t.amount)}
                        </td>
                        {isAdmin ? (
                          <td className="px-3 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => startEdit(t)}
                              className="rounded-lg border border-cyan-300/40 px-3 py-1 text-xs text-cyan-200 transition hover:bg-cyan-500/10"
                            >
                              Edit
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="panel-card">
            <h2 className="font-heading text-xl text-white">Insights</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              <InsightRow label="Top Category" text={insights.topCategory} />
              <InsightRow
                label="Monthly Comparison"
                text={insights.monthlyComparison}
              />
              <InsightRow label="Observation" text={insights.observation} />
            </div>

            <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4">
              <h3 className="font-heading text-base text-white">
                Role Behavior
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                {isAdmin
                  ? "Admin mode is enabled. You can add and edit transactions."
                  : "Viewer mode is enabled. Data is visible but mutation actions are locked."}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-3 rounded-2xl border border-white/15 bg-white/5 p-4"
            >
              <h3 className="font-heading text-base text-white">
                {editingId ? "Edit Transaction" : "Add Transaction"}
              </h3>

              <fieldset
                disabled={!isAdmin}
                className="space-y-3 disabled:opacity-55"
              >
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className="filter-input"
                />

                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Amount"
                  value={draft.amount}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  className="filter-input"
                />

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={draft.type}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, type: e.target.value }))
                    }
                    className="filter-input"
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>

                  <input
                    placeholder="Category"
                    value={draft.category}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="filter-input"
                  />
                </div>

                <input
                  placeholder="Note"
                  value={draft.note}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, note: e.target.value }))
                  }
                  className="filter-input"
                />

                <div className="flex gap-2">
                  <button type="submit" className="action-btn action-primary">
                    {editingId ? "Update" : "Add"}
                  </button>
                  <button
                    type="button"
                    onClick={resetDraft}
                    className="action-btn action-muted"
                  >
                    Reset
                  </button>
                </div>
              </fieldset>
            </form>
          </article>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ label, amount, tone }) {
  const toneStyles = {
    balance: "from-cyan-500/25 to-cyan-500/0 border-cyan-300/30",
    income: "from-emerald-500/25 to-emerald-500/0 border-emerald-300/30",
    expense: "from-rose-500/25 to-rose-500/0 border-rose-300/30",
  };

  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const sign = safeAmount < 0 ? "-" : "";

  return (
    <article className={`panel-card bg-linear-to-br ${toneStyles[tone]}`}>
      <p className="text-xs uppercase tracking-widest text-slate-300">
        {label}
      </p>
      <p className="count-up-text mt-3 font-heading text-3xl font-semibold text-white">
        {sign}$
        <CountUp
          key={safeAmount}
          from={0}
          to={Math.abs(safeAmount)}
          separator=","
          direction="up"
          duration={1}
          className="inline"
          startCounting={true}
        />
      </p>
    </article>
  );
}

function InsightRow({ label, text }) {
  return (
    <div className="rounded-xl border border-white/15 bg-slate-950/40 p-3">
      <p className="text-xs uppercase tracking-wider text-cyan-200">{label}</p>
      <p className="mt-1 text-sm text-slate-200">{text}</p>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/25 bg-white/5 p-6 text-center text-sm text-slate-300">
      {label}
    </div>
  );
}

export default App;
