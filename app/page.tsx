"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";

type TransactionType = "Receita" | "Despesa";
type ActiveTab = "overview" | "transactions" | "categories" | "reports" | "goals" | "settings";

type Transaction = {
  id: number;
  description: string;
  category: string;
  type: TransactionType;
  value: number;
  date: string;
};

const categoryOptions = ["Salário", "Moradia", "Serviços", "Lazer", "Mercado", "Transporte"];
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const storageKey = "meudinheiro-transactions";
const budgetKey = "meudinheiro-budget";

const navItems: { label: string; icon: ActiveTab; tab: ActiveTab }[] = [
  { label: "Visão geral", icon: "overview", tab: "overview" },
  { label: "Transações", icon: "transactions", tab: "transactions" },
  { label: "Categorias", icon: "categories", tab: "categories" },
  { label: "Relatórios", icon: "reports", tab: "reports" },
  { label: "Metas", icon: "goals", tab: "goals" },
  { label: "Configurações", icon: "settings", tab: "settings" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function iconFor(category: string) {
  const icons: Record<string, string> = {
    Salário: "R$",
    Salario: "R$",
    Moradia: "H",
    Serviços: "Wi",
    Servicos: "Wi",
    Lazer: "St",
    Mercado: "M",
    Transporte: "T",
  };

  return icons[category] ?? category.slice(0, 2);
}

function colorFor(category: string) {
  const colors: Record<string, string> = {
    Salário: "#59d878",
    Salario: "#59d878",
    Moradia: "#ff514f",
    Serviços: "#8d65e8",
    Servicos: "#8d65e8",
    Lazer: "#4d78ff",
    Mercado: "#43b7ff",
    Transporte: "#f5b84b",
  };

  return colors[category] ?? "#a7b0c2";
}

function slugFor(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeCategory(category: string) {
  const legacyCategories: Record<string, string> = {
    Salario: "Salário",
    Servicos: "Serviços",
  };

  return legacyCategories[category] ?? category;
}

function normalizeTransaction(transaction: Transaction) {
  return {
    ...transaction,
    category: normalizeCategory(transaction.category),
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthLabel() {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [type, setType] = useState<TransactionType>("Despesa");
  const [category, setCategory] = useState("Moradia");
  const [date, setDate] = useState(today);
  const [budgetLimit, setBudgetLimit] = useState(2000);
  const [budgetInput, setBudgetInput] = useState("2000");

  useEffect(() => {
    const savedTransactions = window.localStorage.getItem(storageKey);
    const savedBudget = window.localStorage.getItem(budgetKey);

    if (savedTransactions) {
      try {
        const parsedTransactions = JSON.parse(savedTransactions) as Transaction[];
        if (Array.isArray(parsedTransactions)) {
          setTransactions(parsedTransactions.map(normalizeTransaction));
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    if (savedBudget) {
      const parsedBudget = Number(savedBudget);
      if (Number.isFinite(parsedBudget) && parsedBudget > 0) {
        setBudgetLimit(parsedBudget);
        setBudgetInput(String(parsedBudget));
      }
    }

    setHasLoadedSavedData(true);
  }, []);

  useEffect(() => {
    if (hasLoadedSavedData) {
      window.localStorage.setItem(storageKey, JSON.stringify(transactions));
    }
  }, [hasLoadedSavedData, transactions]);

  useEffect(() => {
    if (hasLoadedSavedData) {
      window.localStorage.setItem(budgetKey, String(budgetLimit));
    }
  }, [budgetLimit, hasLoadedSavedData]);

  const totals = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "Receita")
      .reduce((sum, item) => sum + item.value, 0);
    const expenses = transactions
      .filter((item) => item.type === "Despesa")
      .reduce((sum, item) => sum + item.value, 0);

    return {
      income,
      expenses,
      balance: income - expenses,
      totalMovement: income + expenses,
    };
  }, [transactions]);

  const expensesByCategory = useMemo(() => {
    const grouped = transactions
      .filter((item) => item.type === "Despesa")
      .reduce<Record<string, number>>((acc, item) => {
        acc[item.category] = (acc[item.category] ?? 0) + item.value;
        return acc;
      }, {});

    return Object.entries(grouped)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totals.expenses ? Math.round((amount / totals.expenses) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, totals.expenses]);

  const incomeShare = totals.totalMovement
    ? Math.round((totals.income / totals.totalMovement) * 1000) / 10
    : 0;
  const expenseShare = totals.totalMovement
    ? Math.round((totals.expenses / totals.totalMovement) * 1000) / 10
    : 0;
  const budgetUsed = Math.min((totals.expenses / budgetLimit) * 100, 100);
  const budgetRemaining = Math.max(budgetLimit - totals.expenses, 0);
  const largestExpense = expensesByCategory[0];
  const categoryDonut = expensesByCategory.length
    ? expensesByCategory
        .reduce(
          (parts, item) => {
            const start = parts.total;
            const end = start + item.percentage;

            return {
              total: end,
              segments: [...parts.segments, `${colorFor(item.name)} ${start}% ${end}%`],
            };
          },
          { total: 0, segments: [] as string[] },
        )
        .segments.join(", ")
    : "#263246 0 100%";

  function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedValue = Number(value.replace(",", "."));

    if (!description.trim() || !Number.isFinite(parsedValue) || parsedValue <= 0) {
      return;
    }

    setTransactions((current) => [
      {
        id: Date.now(),
        description: description.trim(),
        category,
        type,
        value: parsedValue,
        date,
      },
      ...current,
    ]);
    setDescription("");
    setValue("");
    setType("Despesa");
    setCategory("Moradia");
    setDate(today());
    setActiveTab("transactions");
  }

  function removeTransaction(id: number) {
    setTransactions((current) => current.filter((item) => item.id !== id));
  }

  function resetTransactions() {
    setTransactions([]);
  }

  function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedBudget = Number(budgetInput.replace(",", "."));

    if (Number.isFinite(parsedBudget) && parsedBudget > 0) {
      setBudgetLimit(parsedBudget);
    }
  }

  const summaryCards = (
    <section className="summary-grid" aria-label="Resumo financeiro">
      <article className="metric-card income">
        <span className="metric-icon">v</span>
        <div>
          <p>Receitas</p>
          <strong>{money.format(totals.income)}</strong>
          <small>com base nos lançamentos</small>
        </div>
      </article>
      <article className="metric-card expense">
        <span className="metric-icon">^</span>
        <div>
          <p>Despesas</p>
          <strong>{money.format(totals.expenses)}</strong>
          <small>com base nos lançamentos</small>
        </div>
      </article>
      <article className="metric-card balance">
        <span className="metric-icon">R$</span>
        <div>
          <p>Saldo</p>
          <strong>{money.format(totals.balance)}</strong>
          <small>receitas menos despesas</small>
        </div>
      </article>
    </section>
  );

  const transactionTable = (
    <div className="transaction-table">
      <div className="table-head">
        <span>Descrição</span>
        <span>Categoria</span>
        <span>Tipo</span>
        <span>Valor</span>
        <span>Data</span>
        <span>Ações</span>
      </div>
      {transactions.length === 0 ? (
        <div className="empty-state">Nenhuma transação cadastrada. Adicione seus lançamentos reais no formulário.</div>
      ) : transactions.map((item) => (
        <div className="table-row" key={item.id}>
          <span className="description-cell">
            <span className={`category-avatar ${slugFor(item.category)}`}>{iconFor(item.category)}</span>
            {item.description}
          </span>
          <span><mark className={`tag ${slugFor(item.category)}`}>{item.category}</mark></span>
          <span><mark className={`tag ${slugFor(item.type)}`}>{item.type}</mark></span>
          <strong className={item.type === "Receita" ? "positive" : "negative"}>
            {item.type === "Receita" ? "" : "-"}{money.format(item.value)}
          </strong>
          <span>{formatDate(item.date)}</span>
          <button
            className="delete-action"
            type="button"
            onClick={() => removeTransaction(item.id)}
            aria-label={`Remover ${item.description}`}
          >
            Remover
          </button>
        </div>
      ))}
    </div>
  );

  const transactionForm = (
    <form className="panel transaction-form" id="nova-transacao" onSubmit={addTransaction}>
      <div className="panel-heading">
        <h2>Nova transação</h2>
      </div>
      <label>
        Descrição
        <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex: Mercado" />
      </label>
      <div className="form-row">
        <label>
          Tipo
          <select value={type} onChange={(event) => {
            const nextType = event.target.value as TransactionType;
            setType(nextType);
            setCategory(nextType === "Receita" ? "Salário" : "Moradia");
          }}>
            <option>Receita</option>
            <option>Despesa</option>
          </select>
        </label>
        <label>
          Valor
          <input inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} placeholder="0,00" />
        </label>
      </div>
      <div className="form-row">
        <label>
          Categoria
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categoryOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          Data
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>
      <button type="submit">Adicionar</button>
    </form>
  );

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
          </div>
          <div>
            <strong>MeuDinheiro</strong>
            <p>Gerencie suas finanças</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navegação principal">
          {navItems.map((item) => (
            <button
              className={activeTab === item.tab ? "active" : ""}
              key={item.label}
              onClick={() => setActiveTab(item.tab)}
              type="button"
            >
              <span className={`nav-icon ${item.icon}`} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="current-balance">
          <span>Saldo atual</span>
          <strong>{money.format(totals.balance)}</strong>
          <small>{currentMonthLabel()}</small>
        </div>
      </aside>

      <section className="content" id="dashboard">
        <header className="topbar">
          <button className="month-select" type="button">{currentMonthLabel()}</button>
          <div className="topbar-actions">
            <button className="moon-button" type="button" aria-label="Modo escuro">C</button>
            <button className="primary-action" onClick={() => setActiveTab("transactions")} type="button">+ Nova transação</button>
          </div>
        </header>

        {activeTab === "overview" && (
          <>
            {summaryCards}
            <section className="dashboard-grid">
              <article className="panel month-summary">
                <div className="panel-heading">
                  <h2>Resumo do mês</h2>
                </div>
                <div className="donut-row">
                  <div
                    className="donut main-donut"
                    style={{ "--income": `${incomeShare}%` } as CSSProperties}
                    aria-label={`Receitas ${incomeShare}% e despesas ${expenseShare}%`}
                  >
                    <span>Total</span>
                    <strong>{money.format(totals.totalMovement)}</strong>
                  </div>
                  <div className="legend">
                    <p><span className="dot green" />Receitas <strong>{incomeShare}%</strong></p>
                    <small>{money.format(totals.income)}</small>
                    <p><span className="dot red" />Despesas <strong>{expenseShare}%</strong></p>
                    <small>{money.format(totals.expenses)}</small>
                  </div>
                </div>
              </article>

              <article className="panel balance-chart">
                <div className="panel-heading">
                  <h2>Evolução do saldo</h2>
                  <button type="button">Este mês</button>
                </div>
                <div className="line-chart" aria-label="Gráfico de evolução do saldo">
                  <span>R$ 2.000</span>
                  <span>R$ 1.000</span>
                  <span>R$ 0</span>
                  <span>-R$ 1.000</span>
                  <svg viewBox="0 0 640 220" role="img" aria-label="Linha de saldo do mês">
                    <defs>
                      <linearGradient id="balanceFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#7A5CFF" stopOpacity=".55" />
                        <stop offset="100%" stopColor="#7A5CFF" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path className="area" d="M20 170 L70 145 L115 102 L160 78 L220 82 L275 74 L330 55 L380 34 L430 48 L485 62 L540 56 L620 48 L620 210 L20 210 Z" />
                    <path className="line" d="M20 170 L70 145 L115 102 L160 78 L220 82 L275 74 L330 55 L380 34 L430 48 L485 62 L540 56 L620 48" />
                    {[20, 70, 115, 160, 220, 275, 330, 380, 430, 485, 540, 620].map((x, index) => {
                      const y = [170, 145, 102, 78, 82, 74, 55, 34, 48, 62, 56, 48][index];
                      return <circle cx={x} cy={y} r="4" key={x} />;
                    })}
                  </svg>
                  <div className="chart-days"><span>1</span><span>8</span><span>15</span><span>22</span><span>29</span></div>
                </div>
              </article>

              <article className="panel transactions-panel">
                <div className="panel-heading">
                  <h2>Transações recentes</h2>
                  <button className="ghost-action" type="button" onClick={() => setActiveTab("transactions")}>
                    Ver todas
                  </button>
                </div>
                <div className="transaction-table compact-table">
                  {transactionTable}
                </div>
              </article>

              <aside className="right-column">
                <article className="panel category-panel">
                  <div className="panel-heading">
                    <h2>Despesas por categoria</h2>
                  </div>
                  <div className="category-content">
                    <div className="donut category-donut" style={{ "--categories": categoryDonut } as CSSProperties} />
                    <div className="category-list">
                      {expensesByCategory.length === 0 ? (
                        <p className="muted-line">Sem despesas cadastradas.</p>
                      ) : expensesByCategory.map((item) => (
                        <p key={item.name}>
                          <span className="dot" style={{ background: colorFor(item.name) }} />
                          <span>{item.name}</span>
                          <strong>{item.percentage.toLocaleString("pt-BR")}%</strong>
                          <small>{money.format(item.amount)}</small>
                        </p>
                      ))}
                    </div>
                  </div>
                </article>

                <article className="panel budget-panel">
                  <div className="panel-heading">
                    <h2>Orçamento mensal</h2>
                    <span>{Math.round(budgetUsed)}%</span>
                  </div>
                  <p>{money.format(totals.expenses)} / {money.format(budgetLimit)}</p>
                  <div className="progress"><span style={{ width: `${budgetUsed}%` }} /></div>
                  <small>Restam {money.format(budgetRemaining)} para o limite</small>
                </article>
              </aside>
            </section>
          </>
        )}

        {activeTab === "transactions" && (
          <section className="tab-stack">
            <div className="tab-title">
              <h1>Transações</h1>
              <p>Cadastre, acompanhe e remova lançamentos reais.</p>
            </div>
            <div className="split-grid">
              <article className="panel wide-panel">
                <div className="panel-heading">
                  <h2>Todos os lançamentos</h2>
                  <button className="ghost-action" type="button" onClick={resetTransactions}>Limpar dados</button>
                </div>
                {transactionTable}
              </article>
              {transactionForm}
            </div>
          </section>
        )}

        {activeTab === "categories" && (
          <section className="tab-stack">
            <div className="tab-title">
              <h1>Categorias</h1>
              <p>Veja onde as despesas estão concentradas.</p>
            </div>
            <div className="category-grid">
              {categoryOptions.map((item) => {
                const total = transactions
                  .filter((transaction) => transaction.category === item)
                  .reduce((sum, transaction) => sum + transaction.value, 0);

                return (
                  <article className="panel category-tile" key={item}>
                    <span className="dot" style={{ background: colorFor(item) }} />
                    <h2>{item}</h2>
                    <strong>{money.format(total)}</strong>
                    <small>{transactions.filter((transaction) => transaction.category === item).length} lançamentos</small>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === "reports" && (
          <section className="tab-stack">
            <div className="tab-title">
              <h1>Relatórios</h1>
              <p>Resumo automático do mês atual.</p>
            </div>
            {summaryCards}
            <div className="insight-grid">
              <article className="panel">
                <h2>Maior gasto</h2>
                <strong>{largestExpense ? largestExpense.name : "Sem despesas"}</strong>
                <p>{largestExpense ? money.format(largestExpense.amount) : "Cadastre despesas para gerar este relatório."}</p>
              </article>
              <article className="panel">
                <h2>Saúde do saldo</h2>
                <strong className={totals.balance >= 0 ? "positive" : "negative"}>
                  {totals.balance >= 0 ? "Positiva" : "Negativa"}
                </strong>
                <p>{totals.balance >= 0 ? "Suas receitas cobrem as despesas registradas." : "As despesas passaram das receitas registradas."}</p>
              </article>
              <article className="panel">
                <h2>Uso do orçamento</h2>
                <strong>{Math.round(budgetUsed)}%</strong>
                <p>{money.format(totals.expenses)} de {money.format(budgetLimit)} usados.</p>
              </article>
            </div>
          </section>
        )}

        {activeTab === "goals" && (
          <section className="tab-stack">
            <div className="tab-title">
              <h1>Metas</h1>
              <p>Acompanhe seu limite mensal de despesas.</p>
            </div>
            <article className="panel goal-panel">
              <div className="panel-heading">
                <h2>Limite mensal</h2>
                <span>{Math.round(budgetUsed)}%</span>
              </div>
              <p>{money.format(totals.expenses)} usados de {money.format(budgetLimit)}</p>
              <div className="progress"><span style={{ width: `${budgetUsed}%` }} /></div>
              <strong>{budgetRemaining > 0 ? `${money.format(budgetRemaining)} restantes` : "Limite atingido"}</strong>
            </article>
          </section>
        )}

        {activeTab === "settings" && (
          <section className="tab-stack">
            <div className="tab-title">
              <h1>Configurações</h1>
              <p>Ajuste o orçamento e gerencie os dados locais.</p>
            </div>
            <div className="split-grid">
              <form className="panel transaction-form" onSubmit={saveBudget}>
                <div className="panel-heading">
                  <h2>Orçamento mensal</h2>
                </div>
                <label>
                  Limite de despesas
                  <input inputMode="decimal" value={budgetInput} onChange={(event) => setBudgetInput(event.target.value)} />
                </label>
                <button type="submit">Salvar orçamento</button>
              </form>
              <article className="panel danger-panel">
                <h2>Dados locais</h2>
                <p>Os lançamentos ficam salvos neste navegador.</p>
                <button className="delete-action" type="button" onClick={resetTransactions}>Limpar todas as transações</button>
              </article>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
