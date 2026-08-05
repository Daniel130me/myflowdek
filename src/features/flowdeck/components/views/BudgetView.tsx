'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  X,
  Wallet,
  Receipt,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  DollarSign,
  CircleDollarSign,
  FolderOpen,
  CalendarDays,
} from 'lucide-react';
import {
  COLORS,
  FF,
  fmtDate,
  TODAY,
  teamById,
  CURRENT_USER_ID,
  type Budget,
  type Expense,
  type Project,
} from '@/features/flowdeck/model';
import { SectionHeader, Avatar } from '../ui';
import { useViewport } from '../../hooks/useViewport';
import { toast } from 'sonner';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface BudgetViewProps {
  budgets: Budget[];
  expenses: Expense[];
  projects: Record<string, Project>;
  currentProjectId: string | null;
  onAddBudget: (budget: Budget) => void;
  onUpdateBudget: (id: string, patch: Partial<Budget>) => void;
  onDeleteBudget: (id: string) => void;
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'NGN';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  NGN: '₦',
};

const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'NGN'];

const EXPENSE_CATEGORIES = ['Travel', 'Software', 'Hardware', 'Marketing', 'Legal', 'Freelance', 'Other'] as const;

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: `1px solid ${COLORS.line}`,
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  background: COLORS.graySoft,
  fontFamily: FF,
  minHeight: 44,
  boxSizing: 'border-box',
  outline: 'none',
  color: COLORS.ink,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'auto',
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function fmtCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getBarColor(pct: number): string {
  if (pct > 90) return COLORS.red;
  if (pct >= 75) return COLORS.amber;
  return COLORS.green;
}

function getBarBg(pct: number): string {
  if (pct > 90) return COLORS.redSoft;
  if (pct >= 75) return COLORS.amberSoft;
  return COLORS.greenSoft;
}

function categoryBadgeColor(cat: string): { color: string; bg: string } {
  const map: Record<string, { color: string; bg: string }> = {
    Travel: { color: '#0891B2', bg: '#CFFAFE' },
    Software: { color: '#7C3AED', bg: '#EDE9FE' },
    Hardware: { color: '#DC2626', bg: '#FEE2E2' },
    Marketing: { color: '#FE8029', bg: '#FFF4EB' },
    Legal: { color: '#D97706', bg: '#FEF3C7' },
    Freelance: { color: '#DB2777', bg: '#FCE7F3' },
    Other: { color: '#6B7280', bg: '#F3F4F6' },
  };
  return map[cat] || map.Other;
}

/* -------------------------------------------------------------------------- */
/*  Main Component                                                            */
/* -------------------------------------------------------------------------- */

export function BudgetView({
  budgets,
  expenses,
  projects,
  currentProjectId,
  onAddBudget,
  onUpdateBudget,
  onDeleteBudget,
  onAddExpense,
  onDeleteExpense,
}: BudgetViewProps) {
  const { isMobile } = useViewport();

  /* ---- State ---- */
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formProjectId, setFormProjectId] = useState(currentProjectId || '');
  const [formTotal, setFormTotal] = useState('');
  const [formCurrency, setFormCurrency] = useState<CurrencyCode>('USD');
  const [formStart, setFormStart] = useState(TODAY.toISOString().slice(0, 10));
  const [formEnd, setFormEnd] = useState('');
  const [addingExpenseFor, setAddingExpenseFor] = useState<string | null>(null);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState<string>('Other');
  const [expDate, setExpDate] = useState(TODAY.toISOString().slice(0, 10));
  const [expandedBudgets, setExpandedBudgets] = useState<Set<string>>(new Set());

  /* ---- Computed ---- */
  const filteredBudgets = useMemo(() => {
    if (currentProjectId) return budgets.filter(b => b.projectId === currentProjectId);
    return budgets;
  }, [budgets, currentProjectId]);

  // Total budget and spent across all (filtered) budgets
  const totalBudget = useMemo(() => filteredBudgets.reduce((s, b) => s + b.totalBudget, 0), [filteredBudgets]);
  const totalSpent = useMemo(
    () => filteredBudgets.reduce((s, b) => {
      const bExpenses = expenses.filter(e => e.budgetId === b.id);
      return s + bExpenses.reduce((es, e) => es + e.amount, 0);
    }, 0),
    [filteredBudgets, expenses]
  );
  const remaining = totalBudget - totalSpent;

  // Project options for form
  const projectOptions = useMemo(() => Object.values(projects), [projects]);

  /* ---- Handlers ---- */
  const handleAddBudget = useCallback(() => {
    if (!formName.trim()) { toast.error('Budget name is required'); return; }
    if (!formProjectId) { toast.error('Please select a project'); return; }
    if (!formTotal || Number(formTotal) <= 0) { toast.error('Enter a valid budget amount'); return; }
    if (!formEnd) { toast.error('End date is required'); return; }

    const newBudget: Budget = {
      id: `bgt-${Date.now()}`,
      projectId: formProjectId,
      name: formName.trim(),
      totalBudget: Number(formTotal),
      spent: 0,
      currency: formCurrency,
      startDate: formStart,
      endDate: formEnd,
      createdAt: TODAY.toISOString(),
    };
    onAddBudget(newBudget);
    setFormName('');
    setFormProjectId(currentProjectId || '');
    setFormTotal('');
    setFormCurrency('USD');
    setFormStart(TODAY.toISOString().slice(0, 10));
    setFormEnd('');
    setShowBudgetForm(false);
    toast.success('Budget created');
  }, [formName, formProjectId, formTotal, formCurrency, formStart, formEnd, currentProjectId, onAddBudget]);

  const handleDeleteBudget = useCallback((id: string) => {
    onDeleteBudget(id);
    toast.success('Budget deleted');
  }, [onDeleteBudget]);

  const handleAddExpense = useCallback((budgetId: string) => {
    const budget = budgets.find(b => b.id === budgetId);
    if (!budget) return;
    if (!expDesc.trim()) { toast.error('Expense description is required'); return; }
    if (!expAmount || Number(expAmount) <= 0) { toast.error('Enter a valid amount'); return; }

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      budgetId,
      projectId: budget.projectId,
      description: expDesc.trim(),
      amount: Number(expAmount),
      category: expCategory,
      date: expDate,
      createdBy: CURRENT_USER_ID,
      createdAt: TODAY.toISOString(),
    };
    onAddExpense(newExpense);

    // Update budget spent
    const bExpenses = expenses.filter(e => e.budgetId === budgetId);
    const newSpent = bExpenses.reduce((s, e) => s + e.amount, 0) + Number(expAmount);
    onUpdateBudget(budgetId, { spent: newSpent });

    setExpDesc('');
    setExpAmount('');
    setExpCategory('Other');
    setExpDate(TODAY.toISOString().slice(0, 10));
    setAddingExpenseFor(null);
    toast.success('Expense added');
  }, [expDesc, expAmount, expCategory, expDate, budgets, expenses, onAddExpense, onUpdateBudget]);

  const handleDeleteExpense = useCallback((expenseId: string, budgetId: string) => {
    const expense = expenses.find(e => e.id === expenseId);
    onDeleteExpense(expenseId);

    // Recalculate budget spent
    const bExpenses = expenses.filter(e => e.budgetId === budgetId && e.id !== expenseId);
    const newSpent = bExpenses.reduce((s, e) => s + e.amount, 0);
    onUpdateBudget(budgetId, { spent: newSpent });
    toast.success('Expense deleted');
  }, [expenses, onDeleteExpense, onUpdateBudget]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedBudgets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  /* ---- Render ---- */
  return (
    <div style={{ padding: isMobile ? 16 : 24, maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <SectionHeader
        title="Budget & Expenses"
        subtitle="Track project budgets and expenses"
        right={
          <button
            onClick={() => setShowBudgetForm(f => !f)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: showBudgetForm ? COLORS.navy : COLORS.accent,
              color: '#FFFFFF', border: 'none', borderRadius: 10,
              padding: isMobile ? '8px 14px' : '10px 16px',
              fontSize: isMobile ? 12.5 : 13, fontWeight: 600,
              fontFamily: FF, cursor: 'pointer', whiteSpace: 'nowrap',
              minHeight: 40,
            }}
          >
            {showBudgetForm ? <X size={15} /> : <Plus size={15} />}
            {showBudgetForm ? 'Cancel' : 'Add Budget'}
          </button>
        }
      />

      {/* Summary cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: isMobile ? 8 : 12,
        marginBottom: 20,
      }}>
        <div style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 14,
          padding: isMobile ? '12px 14px' : '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: isMobile ? 10.5 : 12.5, color: COLORS.gray, fontWeight: 600, fontFamily: FF }}>Total Budget</span>
            <Wallet size={isMobile ? 14 : 16} color={COLORS.accent} />
          </div>
          <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, marginTop: 4, fontFamily: FF, color: COLORS.ink }}>
            {fmtCurrency(totalBudget, 'USD')}
          </div>
        </div>

        <div style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 14,
          padding: isMobile ? '12px 14px' : '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: isMobile ? 10.5 : 12.5, color: COLORS.gray, fontWeight: 600, fontFamily: FF }}>Total Spent</span>
            <Receipt size={isMobile ? 14 : 16} color={COLORS.amber} />
          </div>
          <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, marginTop: 4, fontFamily: FF, color: COLORS.ink }}>
            {fmtCurrency(totalSpent, 'USD')}
          </div>
        </div>

        <div style={{
          background: remaining >= 0 ? COLORS.greenSoft : COLORS.redSoft,
          border: `1px solid ${remaining >= 0 ? COLORS.green : COLORS.red}22`,
          borderRadius: 14,
          padding: isMobile ? '12px 14px' : '16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: isMobile ? 10.5 : 12.5, color: COLORS.gray, fontWeight: 600, fontFamily: FF }}>Remaining</span>
            <TrendingUp size={isMobile ? 14 : 16} color={remaining >= 0 ? COLORS.green : COLORS.red} />
          </div>
          <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, marginTop: 4, fontFamily: FF, color: remaining >= 0 ? COLORS.green : COLORS.red }}>
            {remaining < 0 ? '-' : ''}{fmtCurrency(Math.abs(remaining), 'USD')}
          </div>
        </div>

        <div style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.line}`,
          borderRadius: 14,
          padding: isMobile ? '12px 14px' : '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: isMobile ? 10.5 : 12.5, color: COLORS.gray, fontWeight: 600, fontFamily: FF }}>Active Budgets</span>
            <CircleDollarSign size={isMobile ? 14 : 16} color={COLORS.teal} />
          </div>
          <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, marginTop: 4, fontFamily: FF, color: COLORS.ink }}>
            {filteredBudgets.length}
          </div>
        </div>
      </div>

      {/* Add Budget Form */}
      {showBudgetForm && (
        <div style={{
          background: COLORS.card,
          border: `2px solid ${COLORS.accent}`,
          borderRadius: 14,
          padding: isMobile ? 14 : 20,
          marginBottom: 20,
          boxShadow: '0 2px 8px rgba(254,128,41,0.08)',
        }}>
          <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, fontFamily: FF, marginBottom: 14, color: COLORS.ink }}>
            New Budget
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.gray, fontFamily: FF, marginBottom: 4, display: 'block' }}>Budget Name</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Q4 Marketing Budget" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.gray, fontFamily: FF, marginBottom: 4, display: 'block' }}>Project</label>
                <select value={formProjectId} onChange={e => setFormProjectId(e.target.value)} style={selectStyle}>
                  <option value="">Select project...</option>
                  {projectOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.gray, fontFamily: FF, marginBottom: 4, display: 'block' }}>Currency</label>
                <select value={formCurrency} onChange={e => setFormCurrency(e.target.value as CurrencyCode)} style={selectStyle}>
                  {CURRENCIES.map(c => (
                    <option key={c} value={c}>{c} ({CURRENCY_SYMBOLS[c]})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.gray, fontFamily: FF, marginBottom: 4, display: 'block' }}>Total Budget</label>
              <input type="number" value={formTotal} onChange={e => setFormTotal(e.target.value)} placeholder="10000" min="0" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.gray, fontFamily: FF, marginBottom: 4, display: 'block' }}>Start Date</label>
                <input type="date" value={formStart} onChange={e => setFormStart(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.gray, fontFamily: FF, marginBottom: 4, display: 'block' }}>End Date</label>
                <input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                onClick={() => {
                  setShowBudgetForm(false);
                  setFormName(''); setFormProjectId(currentProjectId || '');
                  setFormTotal(''); setFormCurrency('USD');
                  setFormStart(TODAY.toISOString().slice(0, 10)); setFormEnd('');
                }}
                style={{
                  border: `1px solid ${COLORS.line}`, background: '#FFFFFF', borderRadius: 10,
                  padding: '10px 18px', fontSize: 13, fontWeight: 600, fontFamily: FF,
                  cursor: 'pointer', color: COLORS.gray, minHeight: 40,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddBudget}
                style={{
                  background: COLORS.accent, color: '#FFFFFF', border: 'none', borderRadius: 10,
                  padding: '10px 18px', fontSize: 13, fontWeight: 600, fontFamily: FF,
                  cursor: 'pointer', minHeight: 40,
                }}
              >
                Create Budget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget List */}
      {filteredBudgets.length === 0 && !showBudgetForm ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: isMobile ? 40 : 60, textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: COLORS.graySoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Wallet size={26} color={COLORS.grayLight} />
          </div>
          <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 700, fontFamily: FF, color: COLORS.ink, marginBottom: 6 }}>
            No budgets yet
          </div>
          <div style={{ fontSize: 13, color: COLORS.gray, fontFamily: FF, lineHeight: 1.5, maxWidth: 360 }}>
            Create your first budget to start tracking project expenses.
          </div>
          <button
            onClick={() => setShowBudgetForm(true)}
            style={{
              marginTop: 16, display: 'flex', alignItems: 'center', gap: 6,
              background: COLORS.accent, color: '#FFFFFF', border: 'none', borderRadius: 10,
              padding: '10px 18px', fontSize: 13, fontWeight: 600, fontFamily: FF, cursor: 'pointer',
            }}
          >
            <Plus size={15} /> Create Budget
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredBudgets.map(budget => {
            const project = projects[budget.projectId];
            const budgetExpenses = expenses.filter(e => e.budgetId === budget.id);
            const spent = budgetExpenses.reduce((s, e) => s + e.amount, 0);
            const pct = budget.totalBudget > 0 ? Math.min((spent / budget.totalBudget) * 100, 100) : 0;
            const barColor = getBarColor(pct);
            const isExpanded = expandedBudgets.has(budget.id);
            const isAddingExpense = addingExpenseFor === budget.id;

            return (
              <div key={budget.id} style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.line}`,
                borderRadius: 14,
                padding: isMobile ? 14 : 18,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
              }}>
                {/* Top: project + name + delete */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: isMobile ? 14 : 15.5, fontWeight: 700, fontFamily: FF, color: COLORS.ink, marginBottom: 4, lineHeight: 1.3 }}>
                      {budget.name}
                    </div>
                    {project && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: project.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF, fontWeight: 500 }}>{project.name}</span>
                        <span style={{ fontSize: 12, color: COLORS.grayLight, fontFamily: FF }}>·</span>
                        <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CalendarDays size={11} />
                          {fmtDate(budget.startDate)} – {fmtDate(budget.endDate)}
                        </span>
                        <span style={{ fontSize: 12, color: COLORS.grayLight, fontFamily: FF }}>·</span>
                        <span style={{ fontSize: 12, color: COLORS.gray, fontFamily: FF, fontWeight: 600 }}>{budget.currency}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteBudget(budget.id)}
                    title="Delete budget"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: COLORS.redSoft, color: COLORS.red, border: 'none',
                      borderRadius: 10, padding: '8px 10px', cursor: 'pointer', flexShrink: 0,
                      minHeight: 36,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Progress bar + amounts */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: isMobile ? 13 : 14.5, fontWeight: 700, fontFamily: FF, color: barColor }}>
                      {fmtCurrency(spent, budget.currency)}
                    </span>
                    <span style={{ fontSize: isMobile ? 12 : 13, color: COLORS.gray, fontFamily: FF }}>
                      of {fmtCurrency(budget.totalBudget, budget.currency)}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 10, borderRadius: 5, background: COLORS.lineLight, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 5, background: barColor, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: COLORS.gray, fontFamily: FF }}>
                      {Math.round(pct)}% used
                    </span>
                    <span style={{ fontSize: 11, color: barColor, fontWeight: 600, fontFamily: FF }}>
                      {fmtCurrency(Math.max(budget.totalBudget - spent, 0), budget.currency)} remaining
                    </span>
                  </div>
                </div>

                {/* Action row: Add Expense + Expand */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => setAddingExpenseFor(isAddingExpense ? null : budget.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: isAddingExpense ? COLORS.teal : COLORS.tealSoft,
                      color: isAddingExpense ? '#FFFFFF' : COLORS.teal,
                      border: 'none', borderRadius: 10,
                      padding: '7px 14px', cursor: 'pointer',
                      fontSize: 12.5, fontWeight: 600, fontFamily: FF,
                      minHeight: 36,
                    }}
                  >
                    <Receipt size={14} />
                    {isAddingExpense ? 'Cancel' : 'Add Expense'}
                  </button>

                  {budgetExpenses.length > 0 && (
                    <button
                      onClick={() => toggleExpand(budget.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'none', border: `1px solid ${COLORS.line}`,
                        borderRadius: 10, padding: '7px 14px', cursor: 'pointer',
                        fontSize: 12.5, fontWeight: 500, fontFamily: FF,
                        color: COLORS.gray, minHeight: 36,
                      }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {budgetExpenses.length} expense{budgetExpenses.length !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>

                {/* Add Expense Form */}
                {isAddingExpense && (
                  <div style={{
                    marginTop: 14, background: COLORS.tealSoft,
                    border: `1px solid ${COLORS.teal}33`,
                    borderRadius: 12, padding: isMobile ? 12 : 16,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: FF, color: COLORS.ink, marginBottom: 10 }}>
                      New Expense
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <input
                        value={expDesc}
                        onChange={e => setExpDesc(e.target.value)}
                        placeholder="Description"
                        style={inputStyle}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 1fr 1fr', gap: 10 }}>
                        <input
                          type="number"
                          value={expAmount}
                          onChange={e => setExpAmount(e.target.value)}
                          placeholder="Amount"
                          min="0"
                          style={inputStyle}
                        />
                        <select value={expCategory} onChange={e => setExpCategory(e.target.value)} style={selectStyle}>
                          {EXPENSE_CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={expDate}
                          onChange={e => setExpDate(e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          onClick={() => { setAddingExpenseFor(null); setExpDesc(''); setExpAmount(''); setExpCategory('Other'); }}
                          style={{
                            border: `1px solid ${COLORS.line}`, background: '#FFFFFF', borderRadius: 10,
                            padding: '8px 16px', fontSize: 12.5, fontWeight: 600, fontFamily: FF,
                            cursor: 'pointer', color: COLORS.gray, minHeight: 38,
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAddExpense(budget.id)}
                          disabled={!expDesc.trim() || !expAmount || Number(expAmount) <= 0}
                          style={{
                            background: COLORS.teal, color: '#FFFFFF', border: 'none', borderRadius: 10,
                            padding: '8px 16px', fontSize: 12.5, fontWeight: 600, fontFamily: FF,
                            cursor: expDesc.trim() && expAmount && Number(expAmount) > 0 ? 'pointer' : 'not-allowed',
                            opacity: expDesc.trim() && expAmount && Number(expAmount) > 0 ? 1 : 0.5,
                            minHeight: 38,
                          }}
                        >
                          Add Expense
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expense list (collapsible) */}
                {isExpanded && budgetExpenses.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    {budgetExpenses.length === 0 ? (
                      <div style={{
                        textAlign: 'center', padding: '20px 0',
                        fontSize: 13, color: COLORS.gray, fontFamily: FF,
                      }}>
                        No expenses recorded yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[...budgetExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(expense => {
                          const creator = teamById[expense.createdBy];
                          const catStyle = categoryBadgeColor(expense.category);
                          return (
                            <div key={expense.id} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '10px 12px', background: COLORS.graySoft,
                              borderRadius: 10, flexWrap: 'wrap',
                            }}>
                              <div style={{ flex: 1, minWidth: isMobile ? 120 : 200 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, fontFamily: FF, color: COLORS.ink, marginBottom: 3 }}>
                                  {expense.description}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <span style={{
                                    fontSize: 10.5, fontWeight: 700, fontFamily: FF,
                                    color: catStyle.color, background: catStyle.bg,
                                    borderRadius: 6, padding: '2px 8px',
                                  }}>
                                    {expense.category}
                                  </span>
                                  <span style={{ fontSize: 11, color: COLORS.gray, fontFamily: FF }}>
                                    {fmtDate(expense.date)}
                                  </span>
                                  {creator && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <Avatar id={creator.id} size={16} />
                                      <span style={{ fontSize: 11, color: COLORS.gray, fontFamily: FF }}>{creator.name}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: FF, color: COLORS.ink }}>
                                  {fmtCurrency(expense.amount, budget.currency)}
                                </span>
                                <button
                                  onClick={() => handleDeleteExpense(expense.id, budget.id)}
                                  title="Delete expense"
                                  style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: COLORS.redSoft, color: COLORS.red, border: 'none',
                                    borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
                                    minHeight: 32,
                                  }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
