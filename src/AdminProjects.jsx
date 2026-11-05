import React, { useState, useMemo } from 'react';
import {
  Briefcase, FolderKanban, Plus, Search, Filter, Calendar, CheckCircle2,
  AlertTriangle, DollarSign, ArrowUpRight, TrendingUp, Layers, Package,
  Receipt, Wallet, Hammer, ChevronRight, X, Clock, FileText, ExternalLink,
  Percent, ShieldAlert, Check, ShoppingCart, User, MapPin
} from 'lucide-react';
import { useApp, PROJECT_STATUSES } from './store.jsx';
import { Tip } from './ui.jsx';

/**
 * Computes live project financial metrics by aggregating linked invoices,
 * supplier purchases, inventory consumption, and petty cash site expenses.
 */
export function computeProjectFinancials(project, { invoices = [], purchases = [], stock_movements = [], cash = [] }) {
  const pid = project.id;
  const qid = project.quoteId;
  const oid = project.orderId;

  // 1. Linked Sales Invoices (Revenue)
  const linkedInvoices = invoices.filter(
    (inv) => (inv.projectId && inv.projectId === pid) || (oid && inv.orderId === oid) || (qid && inv.quoteId === qid)
  );

  let invoicedNet = 0;
  let collected = 0;
  linkedInvoices.forEach((inv) => {
    const sub = (inv.items || []).reduce((s, i) => s + Number(i.price || 0), 0);
    const disc = Number(inv.discount || 0);
    const net = Math.max(0, sub - disc);
    invoicedNet += net;
    const paid = (inv.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    collected += paid;
  });

  // Fallback to budget revenue if not invoiced yet
  const revenue = invoicedNet > 0 ? invoicedNet : Number(project.budgetRevenue || 0);

  // 2. Direct Purchases (Supplier bills allocated to this project)
  const linkedPurchases = purchases.filter((p) => p.projectId === pid || (oid && p.orderId === oid));
  const purchasesCost = linkedPurchases.reduce((s, p) => {
    const amt = Number(p.amount || 0);
    return s + amt;
  }, 0);

  // 3. Materials Consumed from Inventory
  const linkedMovements = stock_movements.filter((m) => m.projectId === pid && m.type === 'consumption');
  const inventoryCost = linkedMovements.reduce((s, m) => s + Number(m.totalCost || (m.qty * m.unitCost) || 0), 0);

  // 4. Site / Petty Cash Expenses
  let pettyCost = 0;
  const linkedPetty = [];
  (cash || []).forEach((day) => {
    (day.expenses || []).forEach((e) => {
      if (e.projectId === pid) {
        pettyCost += Number(e.amount || 0);
        linkedPetty.push({ ...e, date: day.date });
      }
    });
  });

  // 5. Total Direct Costs
  const totalCost = purchasesCost + inventoryCost + pettyCost;
  const grossProfit = revenue - totalCost;
  const marginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  // Health assessment
  let health = 'good'; // 'good' (>40%), 'warning' (20-40%), 'danger' (<20%), 'negative' (<0%)
  if (grossProfit < 0) health = 'negative';
  else if (marginPct < 20) health = 'danger';
  else if (marginPct < 38) health = 'warning';

  return {
    revenue,
    invoicedNet,
    collected,
    purchasesCost,
    inventoryCost,
    pettyCost,
    totalCost,
    grossProfit,
    marginPct,
    health,
    linkedInvoices,
    linkedPurchases,
    linkedMovements,
    linkedPetty,
  };
}

export default function AdminProjects({ onNav }) {
  const {
    T, lang, money, projects = [], quotes = [], orders = [], invoices = [],
    purchases = [], cash = [], inventory = [], stock_movements = [], leads = [],
    customers = [], addProject, updateProject, deleteProject, recordStockMovement, upd
  } = useApp();

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterHealth, setFilterHealth] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [issueStockModal, setIssueStockModal] = useState(false);

  // Form states for New Project
  const [newTitle, setNewTitle] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newBudgetRev, setNewBudgetRev] = useState('');
  const [newBudgetCost, setNewBudgetCost] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newManager, setNewManager] = useState('Alaa Al-Yaman');
  const [newLocation, setNewLocation] = useState('Amman, Jordan');
  const [newNotes, setNewNotes] = useState('');

  // Stock issue form
  const [selectedItem, setSelectedItem] = useState('');
  const [issueQty, setIssueQty] = useState('1');
  const [issueNote, setIssueNote] = useState('');

  // Client lookup helper
  const clientNameOf = (p) => {
    const cust = customers.find((c) => c.id === p.customerId);
    if (cust) return cust.name?.en || cust.name?.ar || cust.company;
    const lead = leads.find((l) => l.id === p.clientId);
    if (lead) return lead.company || lead.name;
    return T('Direct Client', 'عميل مباشر');
  };

  // Compile full financials for all projects
  const projectsWithFinance = useMemo(() => {
    return (projects || []).map((p) => ({
      ...p,
      clientName: clientNameOf(p),
      fin: computeProjectFinancials(p, { invoices, purchases, stock_movements, cash }),
    }));
  }, [projects, invoices, purchases, stock_movements, cash, leads, customers]);

  // Aggregate KPIs
  const kpis = useMemo(() => {
    let totalRev = 0;
    let totalCost = 0;
    let activeCount = 0;
    let riskCount = 0;

    projectsWithFinance.forEach((p) => {
      totalRev += p.fin.revenue;
      totalCost += p.fin.totalCost;
      if (p.status !== 'completed') activeCount++;
      if (p.fin.grossProfit < 0 || p.fin.marginPct < 20) riskCount++;
    });

    const netProfit = totalRev - totalCost;
    const overallMargin = totalRev > 0 ? (netProfit / totalRev) * 100 : 0;

    return { totalRev, totalCost, netProfit, overallMargin, activeCount, riskCount };
  }, [projectsWithFinance]);

  // Filtered list
  const filtered = useMemo(() => {
    return projectsWithFinance.filter((p) => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterHealth !== 'all') {
        if (filterHealth === 'risk' && p.fin.health !== 'danger' && p.fin.health !== 'negative') return false;
        if (filterHealth === 'profitable' && p.fin.health !== 'good') return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = (p.title || '').toLowerCase().includes(q);
        const matchNo = (p.no || '').toLowerCase().includes(q);
        const matchClient = (p.clientName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchNo && !matchClient) return false;
      }
      return true;
    });
  }, [projectsWithFinance, filterStatus, filterHealth, search]);

  const selectedProject = projectsWithFinance.find((p) => p.id === selectedProjectId);

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created = addProject({
      title: newTitle.trim(),
      clientId: newClient,
      budgetRevenue: Number(newBudgetRev || 0),
      budgetCost: Number(newBudgetCost || 0),
      targetDate: newTargetDate,
      manager: newManager,
      location: newLocation,
      notes: newNotes,
    });
    setNewTitle('');
    setNewBudgetRev('');
    setNewBudgetCost('');
    setNewNotes('');
    setShowCreateModal(false);
    setSelectedProjectId(created.id);
  };

  const handleIssueStock = (e) => {
    e.preventDefault();
    if (!selectedItem || !selectedProject) return;
    const itm = inventory.find((i) => i.id === selectedItem);
    if (!itm) return;
    const qty = Number(issueQty || 1);

    recordStockMovement({
      itemId: itm.id,
      type: 'consumption',
      qty,
      unitCost: itm.unitCost || 0,
      projectId: selectedProject.id,
      note: issueNote.trim() || `Material consumed for ${selectedProject.no}`,
      date: new Date().toISOString().slice(0, 10),
    });

    setSelectedItem('');
    setIssueQty('1');
    setIssueNote('');
    setIssueStockModal(false);
  };

  const toggleMilestone = (mId) => {
    if (!selectedProject) return;
    const updated = (selectedProject.milestones || []).map((m) =>
      m.id === mId ? { ...m, done: !m.done } : m
    );
    updateProject(selectedProject.id, { milestones: updated });
  };

  const handleStatusChange = (newStatus) => {
    if (!selectedProject) return;
    updateProject(selectedProject.id, { status: newStatus });
  };

  const statusObj = (s) => PROJECT_STATUSES.find(([val]) => val === s) || ['unknown', s, s, '#9CA3AF'];

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg flex items-center gap-2.5">
            <FolderKanban className="text-terra" size={26} />
            {T('Projects & Job Costing', 'المشاريع وتكاليف العمل')}
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {T(
              'Track contract revenue, direct material costs, petty cash, and real-time gross profit per project.',
              'متابعة إيرادات العقود، تكاليف المواد المباشرة، فواتير الموردين، ونسب الأرباح الفعلية لكل مشروع.'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="btn btn-gold flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Plus size={16} />
          {T('New Project', 'مشروع جديد')}
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Tip
          icon={Briefcase}
          label={T('Active Projects', 'المشاريع النشطة')}
          value={String(kpis.activeCount)}
          hint={`${projects.length} ${T('total projects', 'مشروع إجمالي')}`}
          tone="gold"
        />
        <Tip
          icon={DollarSign}
          label={T('Projected Revenue', 'إجمالي الإيرادات')}
          value={money(kpis.totalRev)}
          hint={T('From contracts & invoices', 'من العقود والفواتير')}
          tone="emerald"
        />
        <Tip
          icon={ShoppingCart}
          label={T('Direct Realized Costs', 'التكاليف المباشرة')}
          value={money(kpis.totalCost)}
          hint={T('Materials + Bills + Site cash', 'مواد + فواتير + نقد موقع')}
          tone="terra"
        />
        <Tip
          icon={TrendingUp}
          label={T('Realized Gross Profit', 'الربح الإجمالي المحقق')}
          value={money(kpis.netProfit)}
          hint={`${kpis.overallMargin.toFixed(1)}% ${T('average margin', 'متوسط الهامش')}`}
          tone={kpis.netProfit >= 0 ? 'emerald' : 'red'}
        />
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-2xl border border-line/10 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter pills */}
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-line/10 text-fg font-semibold'
                : 'text-muted hover:text-fg'
            }`}
          >
            {T('All Status', 'الكل')} ({projects.length})
          </button>
          {PROJECT_STATUSES.map(([val, en, ar, color]) => {
            const count = projects.filter((p) => p.status === val).length;
            return (
              <button
                key={val}
                type="button"
                onClick={() => setFilterStatus(val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  filterStatus === val
                    ? 'bg-line/10 text-fg font-semibold'
                    : 'text-muted hover:text-fg'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span>{T(en, ar)}</span>
                <span className="text-[10px] text-subtle opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Margin Health Filter */}
          <select
            value={filterHealth}
            onChange={(e) => setFilterHealth(e.target.value)}
            className="input-base text-xs !py-1.5 !px-2.5 w-auto"
          >
            <option value="all">{T('All Margins', 'جميع هوامش الربح')}</option>
            <option value="profitable">{T('High Margin (> 40%)', 'أرباح عالية (> 40%)')}</option>
            <option value="risk">{T('Margin Risk (< 20% or Loss)', 'معرض للمخاطر (< 20%)')}</option>
          </select>

          {/* Search box */}
          <div className="relative flex-1 sm:w-56">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={T('Search project or client...', 'بحث عن مشروع أو عميل...')}
              className="input-base text-xs !ps-8 !py-1.5 w-full"
            />
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-surface rounded-3xl border border-line/10 shadow-soft">
          <FolderKanban size={40} className="mx-auto text-muted/60 mb-3" />
          <p className="text-base font-semibold text-fg">{T('No projects found', 'لم يتم العثور على مشاريع')}</p>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            {T(
              'Projects are automatically created when quotations are approved, or you can create one manually.',
              'يتم إنشاء المشاريع تلقائياً عند اعتماد عروض الأسعار، أو يمكنك إنشاء مشروع جديد يدوياً.'
            )}
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn btn-gold !py-2 !px-4 text-xs mt-4 inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            {T('Create First Project', 'إنشاء أول مشروع')}
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const st = statusObj(p.status);
            const fin = p.fin;
            const completedMilestones = (p.milestones || []).filter((m) => m.done).length;
            const totalMilestones = (p.milestones || []).length;
            const progressPct = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`group bg-surface rounded-3xl border p-5 transition-all duration-300 hover:shadow-lift cursor-pointer flex flex-col justify-between ${
                  selectedProjectId === p.id ? 'border-terra ring-2 ring-terra/20' : 'border-line/10 hover:border-line/25'
                }`}
              >
                <div>
                  {/* Card Header: Code + Status */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="font-mono text-[11px] font-bold text-terra bg-terra/10 px-2 py-0.5 rounded-md">
                      {p.no}
                    </span>
                    <span
                      className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5"
                      style={{ backgroundColor: `${st[3]}18`, color: st[3] }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st[3] }} />
                      {T(st[1], st[2])}
                    </span>
                  </div>

                  {/* Title & Client */}
                  <h3 className="font-bold text-base text-fg line-clamp-1 group-hover:text-terra transition-colors">
                    {p.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted mt-1">
                    <User size={13} className="shrink-0 text-subtle" />
                    <span className="truncate">{p.clientName}</span>
                  </div>

                  {/* Progress Milestone Bar */}
                  {totalMilestones > 0 && (
                    <div className="mt-4 pt-3 border-t border-line/5">
                      <div className="flex justify-between text-[11px] text-subtle mb-1">
                        <span>{T('Milestones', 'المراحل')}</span>
                        <span>
                          {completedMilestones}/{totalMilestones} ({progressPct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-line/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-terra rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Financial Metrics Box */}
                  <div className="mt-4 p-3 rounded-2xl bg-canvas/60 border border-line/5 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-muted">
                      <span>{T('Revenue (Contract)', 'الإيراد التعاقدي')}</span>
                      <span className="font-bold text-fg">{money(fin.revenue)}</span>
                    </div>

                    <div className="flex justify-between items-center text-muted">
                      <span>{T('Direct Costs', 'التكاليف المباشرة')}</span>
                      <span className="font-semibold text-terra">− {money(fin.totalCost)}</span>
                    </div>

                    <div className="h-px bg-line/10 my-1" />

                    <div className="flex justify-between items-center font-bold">
                      <span>{T('Gross Profit', 'الربح الإجمالي')}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={fin.grossProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                          {money(fin.grossProfit)}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            fin.marginPct >= 38
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : fin.marginPct >= 20
                              ? 'bg-gold/15 text-gold'
                              : 'bg-red-500/10 text-red-500'
                          }`}
                        >
                          {fin.marginPct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer link */}
                <div className="mt-4 pt-3 border-t border-line/10 flex items-center justify-between text-[11px] text-muted">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-subtle" />
                    {p.startDate || T('No date', 'بدون تاريخ')}
                  </span>
                  <span className="flex items-center gap-0.5 text-terra font-semibold group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                    {T('Details', 'التفاصيل')}
                    <ChevronRight size={14} className="rtl:rotate-180" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Detail Drawer / Side Sheet */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-fade">
          <div className="w-full max-w-2xl bg-surface h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-s border-line/10">
            {/* Header */}
            <div className="p-5 border-b border-line/10 flex items-start justify-between gap-4 sticky top-0 bg-surface/95 backdrop-blur z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-terra bg-terra/10 px-2 py-0.5 rounded">
                    {selectedProject.no}
                  </span>
                  <select
                    value={selectedProject.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="text-xs font-semibold px-2 py-0.5 rounded-lg border border-line/15 bg-canvas"
                  >
                    {PROJECT_STATUSES.map(([val, en, ar]) => (
                      <option key={val} value={val}>
                        {T(en, ar)}
                      </option>
                    ))}
                  </select>
                </div>
                <h2 className="text-xl font-bold text-fg">{selectedProject.title}</h2>
                <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                  <User size={12} /> {selectedProject.clientName} · <MapPin size={12} /> {selectedProject.location}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProjectId(null)}
                className="p-2 text-muted hover:text-fg hover:bg-line/5 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Financial Dashboard of the Project */}
              <div className="p-4 rounded-3xl bg-canvas border border-line/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-fg flex items-center gap-2">
                    <TrendingUp size={16} className="text-terra" />
                    {T('Project Financial Breakdown', 'البيان المالي للمشروع')}
                  </h3>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      selectedProject.fin.marginPct >= 38
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : selectedProject.fin.marginPct >= 20
                        ? 'bg-gold/15 text-gold'
                        : 'bg-red-500/15 text-red-500'
                    }`}
                  >
                    {selectedProject.fin.marginPct.toFixed(1)}% {T('Margin', 'هامش الربح')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-surface rounded-2xl border border-line/5">
                    <div className="text-[10px] text-muted">{T('Total Revenue', 'إجمالي الإيرادات')}</div>
                    <div className="text-sm font-bold text-fg mt-0.5">{money(selectedProject.fin.revenue)}</div>
                    <div className="text-[9px] text-emerald-500 mt-0.5">
                      {money(selectedProject.fin.collected)} {T('collected', 'محصّل')}
                    </div>
                  </div>

                  <div className="p-3 bg-surface rounded-2xl border border-line/5">
                    <div className="text-[10px] text-muted">{T('Direct Costs', 'إجمالي التكاليف')}</div>
                    <div className="text-sm font-bold text-terra mt-0.5">
                      {money(selectedProject.fin.totalCost)}
                    </div>
                    <div className="text-[9px] text-subtle mt-0.5">{T('Materials + Bills + Cash', 'شامل كل المصاريف')}</div>
                  </div>

                  <div className="p-3 bg-surface rounded-2xl border border-line/5">
                    <div className="text-[10px] text-muted">{T('Gross Profit', 'صافي ربح المشروع')}</div>
                    <div
                      className={`text-sm font-bold mt-0.5 ${
                        selectedProject.fin.grossProfit >= 0 ? 'text-emerald-500' : 'text-red-500'
                      }`}
                    >
                      {money(selectedProject.fin.grossProfit)}
                    </div>
                    <div className="text-[9px] text-subtle mt-0.5">
                      {selectedProject.fin.grossProfit >= 0 ? T('Profitable', 'مشروع رابح') : T('Loss', 'خسارة')}
                    </div>
                  </div>
                </div>

                {/* Direct Costs Detailed Breakdown */}
                <div className="text-xs space-y-1.5 pt-2 border-t border-line/10">
                  <div className="flex justify-between text-muted">
                    <span>
                      0. {T('Sales Invoices (Revenue)', 'فواتير المبيعات (الإيراد)')} ({selectedProject.fin.linkedInvoices.length})
                    </span>
                    <span className="font-semibold text-emerald-500">{money(selectedProject.fin.invoicedNet)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>
                      1. {T('Supplier Bills (Purchases)', 'فواتير الموردين (المشتريات)')} ({selectedProject.fin.linkedPurchases.length})
                    </span>
                    <span className="font-semibold text-fg">{money(selectedProject.fin.purchasesCost)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>
                      2. {T('Inventory Materials Consumed', 'مواد مسحوبة من المستودع')} ({selectedProject.fin.linkedMovements.length})
                    </span>
                    <span className="font-semibold text-fg">{money(selectedProject.fin.inventoryCost)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>
                      3. {T('Site & Petty Cash Expenses', 'مصاريف موقع ونثريات')} ({selectedProject.fin.linkedPetty.length})
                    </span>
                    <span className="font-semibold text-fg">{money(selectedProject.fin.pettyCost)}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Row */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIssueStockModal(true)}
                  className="btn-ghost !py-1.5 !px-3 text-xs flex items-center gap-1.5 border border-line/15 rounded-xl hover:bg-terra/10 hover:text-terra hover:border-terra/30"
                >
                  <Package size={14} className="text-terra" />
                  {T('Issue Material from Stock', 'صرف مواد من المستودع')}
                </button>

                <button
                  type="button"
                  onClick={() => onNav && onNav('accounting')}
                  className="btn-ghost !py-1.5 !px-3 text-xs flex items-center gap-1.5 border border-line/15 rounded-xl hover:bg-gold/10 hover:text-gold hover:border-gold/30"
                >
                  <ShoppingCart size={14} className="text-gold" />
                  {T('Add Supplier Bill', 'إضافة فاتورة مشتريات')}
                </button>

                <button
                  type="button"
                  onClick={() => onNav && onNav('invoices')}
                  className="btn-ghost !py-1.5 !px-3 text-xs flex items-center gap-1.5 border border-line/15 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30"
                >
                  <Receipt size={14} className="text-emerald-500" />
                  {T('View Invoices', 'عرض الفواتير')}
                </button>
              </div>

              {/* Milestones & Tasks Section */}
              <div>
                <h3 className="font-bold text-sm text-fg mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  {T('Milestones & Fabrication Checklist', 'مراحل العمل والتصنيع')}
                </h3>
                <div className="space-y-2">
                  {(selectedProject.milestones || []).map((m) => (
                    <div
                      key={m.id}
                      onClick={() => toggleMilestone(m.id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                        m.done ? 'bg-emerald-500/5 border-emerald-500/20 text-muted' : 'bg-surface border-line/10 text-fg'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                          m.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-line/30'
                        }`}
                      >
                        {m.done && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span className={`text-xs font-medium flex-1 ${m.done ? 'line-through text-subtle' : ''}`}>
                        {m.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Linked Materials Consumed from Inventory */}
              <div>
                <h3 className="font-bold text-sm text-fg mb-3 flex items-center gap-2">
                  <Package size={16} className="text-terra" />
                  {T('Warehouse Materials Consumed', 'المواد المصروفة للمشروع')}
                </h3>
                {selectedProject.fin.linkedMovements.length === 0 ? (
                  <p className="text-xs text-subtle bg-canvas p-3 rounded-xl border border-line/5 text-center">
                    {T('No warehouse stock issued yet.', 'لم يتم صرف مواد من المستودع بعد.')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedProject.fin.linkedMovements.map((mov) => {
                      const itm = inventory.find((i) => i.id === mov.itemId);
                      return (
                        <div key={mov.id} className="p-3 bg-canvas rounded-xl border border-line/10 flex justify-between items-center text-xs">
                          <div>
                            <div className="font-semibold text-fg">
                              {itm ? (lang === 'ar' ? itm.name.ar : itm.name.en) : mov.itemId}
                            </div>
                            <div className="text-[11px] text-muted">
                              {mov.qty} {itm?.unit || 'unit'} × {money(mov.unitCost)} · {mov.date}
                            </div>
                          </div>
                          <div className="font-bold text-terra">
                            {money(mov.totalCost || mov.qty * mov.unitCost)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Linked Supplier Purchases */}
              <div>
                <h3 className="font-bold text-sm text-fg mb-3 flex items-center gap-2">
                  <ShoppingCart size={16} className="text-sky-500" />
                  {T('Linked Supplier Bills', 'فواتير المشتريات المرتبطة')}
                </h3>
                {selectedProject.fin.linkedPurchases.length === 0 ? (
                  <p className="text-xs text-subtle bg-canvas p-3 rounded-xl border border-line/5 text-center">
                    {T('No supplier bills allocated to this project.', 'لا توجد فواتير موردين مخصصة لهذا المشروع.')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedProject.fin.linkedPurchases.map((pur) => (
                      <div key={pur.id} className="p-3 bg-canvas rounded-xl border border-line/10 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-semibold text-fg">{pur.no} · {pur.supplier}</div>
                          <div className="text-[11px] text-muted">{pur.date} · {pur.cat}</div>
                        </div>
                        <div className="font-bold text-terra">{money(pur.amount)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-line/10 bg-canvas flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  if (confirm(T('Are you sure you want to delete this project?', 'هل أنت متأكد من حذف هذا المشروع؟'))) {
                    deleteProject(selectedProject.id);
                    setSelectedProjectId(null);
                  }
                }}
                className="text-xs text-red-500 hover:underline"
              >
                {T('Delete Project', 'حذف المشروع')}
              </button>

              <button
                type="button"
                onClick={() => setSelectedProjectId(null)}
                className="btn btn-ghost text-xs"
              >
                {T('Close', 'إغلاق')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Project */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade">
          <div className="bg-surface w-full max-w-lg rounded-3xl p-6 border border-line/15 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-fg">{T('Create New Project', 'إنشاء مشروع جديد')}</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-muted hover:text-fg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">{T('Project Title', 'عنوان المشروع')} *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Starbucks City Mall Signage Facade"
                  className="input-base text-xs w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">{T('Client / Lead', 'العميل')}</label>
                  <select
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    className="input-base text-xs w-full"
                  >
                    <option value="">{T('Select client...', 'اختر العميل...')}</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.company || l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">{T('Target Completion Date', 'تاريخ التسليم المستهدف')}</label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="input-base text-xs w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">{T('Contract / Budget Revenue', 'قيمة العقد / الإيراد')} (JOD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBudgetRev}
                    onChange={(e) => setNewBudgetRev(e.target.value)}
                    placeholder="e.g. 1500"
                    className="input-base text-xs w-full"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">{T('Estimated Budget Cost', 'التكلفة التقديرية')} (JOD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBudgetCost}
                    onChange={(e) => setNewBudgetCost(e.target.value)}
                    placeholder="e.g. 800"
                    className="input-base text-xs w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">{T('Location', 'الموقع')}</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="input-base text-xs w-full"
                />
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">{T('Notes / Scope of Work', 'ملاحظات ونطاق العمل')}</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder={T('Specifications, dimensions, materials...', 'المواصفات، القياسات، المواد المطلوبة...')}
                  className="input-base text-xs w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-ghost text-xs">
                  {T('Cancel', 'إلغاء')}
                </button>
                <button type="submit" className="btn btn-gold text-xs">
                  {T('Create Project', 'حفظ المشروع')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Issue Material from Inventory to Project */}
      {issueStockModal && selectedProject && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade">
          <div className="bg-surface w-full max-w-md rounded-3xl p-6 border border-line/15 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-fg flex items-center gap-2">
                  <Package size={18} className="text-terra" />
                  {T('Issue Stock to Project', 'صرف مواد من المستودع للمشروع')}
                </h3>
                <p className="text-[11px] text-muted">{selectedProject.no} — {selectedProject.title}</p>
              </div>
              <button type="button" onClick={() => setIssueStockModal(false)} className="text-muted hover:text-fg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleIssueStock} className="space-y-4 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">{T('Select Material / Item', 'المادة المطلوبة')} *</label>
                <select
                  required
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="input-base text-xs w-full"
                >
                  <option value="">{T('Choose from inventory...', 'اختر من المخزون...')}</option>
                  {inventory.map((itm) => (
                    <option key={itm.id} value={itm.id}>
                      {itm.sku} · {lang === 'ar' ? itm.name.ar : itm.name.en} ({T('In stock', 'متوفر')}: {itm.currentQty} {itm.unit}) — {money(itm.unitCost)}/{itm.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">{T('Quantity to Issue', 'الكمية المصروفة')} *</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    value={issueQty}
                    onChange={(e) => setIssueQty(e.target.value)}
                    className="input-base text-xs w-full"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">{T('Total Material Cost', 'التكلفة الإجمالية')}</label>
                  <div className="p-2.5 bg-canvas rounded-xl font-bold text-terra">
                    {(() => {
                      const itm = inventory.find((i) => i.id === selectedItem);
                      const cost = (itm?.unitCost || 0) * Number(issueQty || 0);
                      return money(cost);
                    })()}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">{T('Note / Part of Sign', 'ملاحظة (أي جزء من اللوحة)')}</label>
                <input
                  type="text"
                  value={issueNote}
                  onChange={(e) => setIssueNote(e.target.value)}
                  placeholder={T('e.g. Front face acrylic cutting', 'مثلاً: واجهة الحروف البارزة')}
                  className="input-base text-xs w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIssueStockModal(false)} className="btn btn-ghost text-xs">
                  {T('Cancel', 'إلغاء')}
                </button>
                <button type="submit" className="btn btn-gold text-xs">
                  {T('Confirm & Deduct Stock', 'تأكيد وصرف من المستودع')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
