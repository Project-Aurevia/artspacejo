import React, { useState, useMemo } from 'react';
import {
  Package, Plus, Search, Filter, AlertTriangle, ArrowDownRight, ArrowUpRight,
  TrendingUp, Layers, ShoppingCart, DollarSign, Edit2, Trash2, X, Check,
  Warehouse, History, ShieldAlert, Tag, ExternalLink, CornerDownLeft
} from 'lucide-react';
import { useApp, INVENTORY_CATS } from './store.jsx';
import { Tip } from './ui.jsx';

export default function AdminInventory({ onNav }) {
  const {
    T, lang, money, inventory = [], stock_movements = [], projects = [],
    suppliers = [], addInventoryItem, updateInventoryItem, deleteInventoryItem,
    recordStockMovement
  } = useApp();

  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'ledger'
  const [selectedCat, setSelectedCat] = useState('all');
  const [search, setSearch] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [receiveModalItem, setReceiveModalItem] = useState(null);
  const [issueModalItem, setIssueModalItem] = useState(null);
  const [adjustModalItem, setAdjustModalItem] = useState(null);

  // Form states for Add/Edit
  const [formSku, setFormSku] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formNameAr, setFormNameAr] = useState('');
  const [formCat, setFormCat] = useState('sheets');
  const [formUnit, setFormUnit] = useState('sheet');
  const [formMinStock, setFormMinStock] = useState('5');
  const [formUnitCost, setFormUnitCost] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formQty, setFormQty] = useState('0');
  const [formLocation, setFormLocation] = useState('');
  const [formSupplier, setFormSupplier] = useState('');

  // Transaction modal inputs
  const [txQty, setTxQty] = useState('1');
  const [txCost, setTxCost] = useState('');
  const [txProject, setTxProject] = useState('');
  const [txNote, setTxNote] = useState('');

  // Inventory KPI metrics
  const stats = useMemo(() => {
    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    inventory.forEach((i) => {
      const qty = Number(i.currentQty || 0);
      const cost = Number(i.unitCost || 0);
      totalValuation += qty * cost;
      if (qty <= 0) outOfStockCount++;
      else if (qty <= Number(i.minStock || 0)) lowStockCount++;
    });

    const totalMovements = stock_movements.length;
    return { totalValuation, lowStockCount, outOfStockCount, totalMovements };
  }, [inventory, stock_movements]);

  // Filtered catalog
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      if (selectedCat !== 'all' && item.category !== selectedCat) return false;
      if (showLowStockOnly && item.currentQty > item.minStock) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchSku = (item.sku || '').toLowerCase().includes(q);
        const matchEn = (item.name?.en || '').toLowerCase().includes(q);
        const matchAr = (item.name?.ar || '').toLowerCase().includes(q);
        if (!matchSku && !matchEn && !matchAr) return false;
      }
      return true;
    });
  }, [inventory, selectedCat, showLowStockOnly, search]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormSku(`SKU-${Date.now().toString().slice(-5)}`);
    setFormNameEn('');
    setFormNameAr('');
    setFormCat('sheets');
    setFormUnit('sheet');
    setFormMinStock('5');
    setFormUnitCost('');
    setFormSellingPrice('');
    setFormQty('10');
    setFormLocation('Warehouse A');
    setFormSupplier('');
    setShowAddModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormSku(item.sku || '');
    setFormNameEn(item.name?.en || '');
    setFormNameAr(item.name?.ar || '');
    setFormCat(item.category || 'sheets');
    setFormUnit(item.unit || 'sheet');
    setFormMinStock(String(item.minStock || '0'));
    setFormUnitCost(String(item.unitCost || '0'));
    setFormSellingPrice(String(item.sellingPrice || '0'));
    setFormQty(String(item.currentQty || '0'));
    setFormLocation(item.location || '');
    setFormSupplier(item.supplierId || '');
    setShowAddModal(true);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    const payload = {
      sku: formSku.trim(),
      name: { en: formNameEn.trim(), ar: formNameAr.trim() },
      category: formCat,
      unit: formUnit,
      minStock: Number(formMinStock || 0),
      unitCost: Number(formUnitCost || 0),
      sellingPrice: Number(formSellingPrice || 0),
      currentQty: Number(formQty || 0),
      location: formLocation.trim(),
      supplierId: formSupplier,
    };

    if (editingItem) {
      updateInventoryItem(editingItem.id, payload);
    } else {
      addInventoryItem(payload);
    }
    setShowAddModal(false);
  };

  const handleReceiveStock = (e) => {
    e.preventDefault();
    if (!receiveModalItem) return;
    const qty = Number(txQty || 0);
    const unitCost = Number(txCost || receiveModalItem.unitCost || 0);

    recordStockMovement({
      itemId: receiveModalItem.id,
      type: 'inbound',
      qty,
      unitCost,
      note: txNote || 'Stock receipt from supplier',
    });

    setReceiveModalItem(null);
    setTxQty('1');
    setTxCost('');
    setTxNote('');
  };

  const handleIssueToProject = (e) => {
    e.preventDefault();
    if (!issueModalItem) return;
    const qty = Number(txQty || 0);

    recordStockMovement({
      itemId: issueModalItem.id,
      type: 'consumption',
      qty,
      unitCost: issueModalItem.unitCost || 0,
      projectId: txProject,
      note: txNote || 'Material issued for project',
    });

    setIssueModalItem(null);
    setTxQty('1');
    setTxProject('');
    setTxNote('');
  };

  const handleAdjustCount = (e) => {
    e.preventDefault();
    if (!adjustModalItem) return;
    const newQty = Number(txQty || 0);

    recordStockMovement({
      itemId: adjustModalItem.id,
      type: 'adjustment',
      qty: newQty,
      unitCost: adjustModalItem.unitCost || 0,
      note: txNote || 'Inventory cycle count adjustment',
    });

    setAdjustModalItem(null);
    setTxQty('0');
    setTxNote('');
  };

  const catLabel = (c) => {
    const found = INVENTORY_CATS.find(([val]) => val === c);
    return found ? (lang === 'ar' ? found[2] : found[1]) : c;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg flex items-center gap-2.5">
            <Warehouse className="text-terra" size={26} />
            {T('Inventory & Materials Management', 'إدارة المخزون والمواد')}
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {T(
              'Track raw materials, sheets, LEDs, vinyl rolls, stock valuation, and issue items directly to projects.',
              'متابعة المواد الخام، الألواح، الإنارة، رولات الطباعة، تقييم المخزون، وصرف المواد مباشرة للمشاريع.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="bg-line/5 p-1 rounded-2xl flex items-center border border-line/10">
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'catalog' ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
              }`}
            >
              <Package size={14} />
              {T('Catalog & Stock', 'دليل المواد والمخزون')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'ledger' ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
              }`}
            >
              <History size={14} />
              {T('Stock Movement Ledger', 'سجل الحركات')} ({stock_movements.length})
            </button>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="btn btn-gold flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            {T('Add Material', 'إضافة مادة')}
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Tip
          icon={Package}
          label={T('Unique Materials (SKUs)', 'أصناف المواد')}
          value={String(inventory.length)}
          hint={`${INVENTORY_CATS.length} ${T('material categories', 'تصنيفات رئيسية')}`}
          tone="gold"
        />
        <Tip
          icon={DollarSign}
          label={T('Total Stock Valuation', 'القيمة الإجمالية للمخزون')}
          value={money(stats.totalValuation)}
          hint={T('Asset value on hand', 'قيمة الأصول بالمستودع')}
          tone="emerald"
        />
        <Tip
          icon={AlertTriangle}
          label={T('Low Stock Alerts', 'تنبيهات نقص المخزون')}
          value={String(stats.lowStockCount + stats.outOfStockCount)}
          hint={`${stats.outOfStockCount} ${T('out of stock', 'نافد بالكامل')}`}
          tone={stats.lowStockCount + stats.outOfStockCount > 0 ? 'red' : 'emerald'}
        />
        <Tip
          icon={History}
          label={T('Stock Movements', 'حركات الصرف والتوريد')}
          value={String(stats.totalMovements)}
          hint={T('Inbound receipts & project issues', 'وارد للمستودع ومصروف للمشاريع')}
          tone="sky"
        />
      </div>

      {activeTab === 'catalog' ? (
        <>
          {/* Categories & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-2xl border border-line/10 shadow-soft">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCat('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  selectedCat === 'all'
                    ? 'bg-line/10 text-fg font-semibold'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {T('All Items', 'جميع المواد')} ({inventory.length})
              </button>
              {INVENTORY_CATS.map(([val, en, ar]) => {
                const count = inventory.filter((i) => i.category === val).length;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSelectedCat(val)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      selectedCat === val
                        ? 'bg-line/10 text-fg font-semibold'
                        : 'text-muted hover:text-fg'
                    }`}
                  >
                    <span>{T(en, ar)}</span>
                    <span className="text-[10px] text-subtle opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                  showLowStockOnly
                    ? 'bg-red-500/10 text-red-500 border-red-500/25'
                    : 'bg-surface text-muted border-line/15 hover:text-fg'
                }`}
              >
                <AlertTriangle size={13} />
                {T('Low Stock Only', 'المواد الناقصة فقط')}
              </button>

              <div className="relative flex-1 sm:w-56">
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={T('Search SKU or name...', 'بحث بالرمز أو الاسم...')}
                  className="input-base text-xs !ps-8 !py-1.5 w-full"
                />
              </div>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="overflow-x-auto rounded-3xl border border-line/10 bg-surface shadow-soft">
            <table className="w-full text-start text-xs">
              <thead className="bg-canvas border-b border-line/10 text-muted uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-start">{T('Item / Material', 'المادة / الصنف')}</th>
                  <th className="py-3 px-3 text-start">{T('Category', 'التصنيف')}</th>
                  <th className="py-3 px-3 text-start">{T('Location', 'الموقع')}</th>
                  <th className="py-3 px-3 text-center">{T('Stock on Hand', 'المخزون المتوفر')}</th>
                  <th className="py-3 px-3 text-end">{T('Unit Cost', 'تكلفة الوحدة')}</th>
                  <th className="py-3 px-3 text-end">{T('Stock Valuation', 'قيمة المخزون')}</th>
                  <th className="py-3 px-4 text-end">{T('Actions', 'الإجراءات')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/10">
                {filteredItems.map((item) => {
                  const qty = Number(item.currentQty || 0);
                  const min = Number(item.minStock || 0);
                  const isOutOfStock = qty <= 0;
                  const isLow = qty <= min && !isOutOfStock;
                  const itemValuation = qty * Number(item.unitCost || 0);

                  return (
                    <tr key={item.id} className="hover:bg-line/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-fg text-sm">
                          {lang === 'ar' ? item.name?.ar : item.name?.en}
                        </div>
                        <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-terra font-semibold">{item.sku}</span>
                          <span className="text-subtle">·</span>
                          <span className="text-subtle">
                            {lang === 'ar' ? item.name?.en : item.name?.ar}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-line/5 text-muted text-[11px] font-medium border border-line/10">
                          {catLabel(item.category)}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-muted">
                        {item.location || T('Workshop Shelf', 'رف الورشة')}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold font-mono text-xs">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOutOfStock
                                ? 'bg-red-500 animate-pulse'
                                : isLow
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span
                            className={
                              isOutOfStock
                                ? 'text-red-500 font-extrabold'
                                : isLow
                                ? 'text-amber-500 font-extrabold'
                                : 'text-fg'
                            }
                          >
                            {qty} {item.unit}
                          </span>
                        </div>
                        {isLow && (
                          <div className="text-[10px] text-amber-500 mt-0.5 font-medium">
                            {T('Below min', 'أقل من حد الأمان')} ({min})
                          </div>
                        )}
                        {isOutOfStock && (
                          <div className="text-[10px] text-red-500 mt-0.5 font-bold">
                            {T('Out of Stock', 'نافد بالمستودع!')}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-end font-mono text-fg">
                        {money(item.unitCost)}
                        <span className="text-[10px] text-subtle block">
                          {T('sell', 'بيع')}: {money(item.sellingPrice)}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-end font-mono font-bold text-terra">
                        {money(itemValuation)}
                      </td>

                      <td className="py-3.5 px-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Receive Stock */}
                          <button
                            type="button"
                            title={T('Receive Stock (Inbound)', 'توريد مواد')}
                            onClick={() => {
                              setReceiveModalItem(item);
                              setTxCost(String(item.unitCost || ''));
                            }}
                            className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          >
                            <ArrowDownRight size={15} />
                          </button>

                          {/* Issue to Project */}
                          <button
                            type="button"
                            title={T('Issue to Project (Outbound)', 'صرف لمشروع')}
                            onClick={() => setIssueModalItem(item)}
                            className="p-1.5 text-terra hover:bg-terra/10 rounded-lg transition-colors"
                          >
                            <ArrowUpRight size={15} />
                          </button>

                          {/* Edit Item */}
                          <button
                            type="button"
                            title={T('Edit Item', 'تعديل')}
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-muted hover:text-fg hover:bg-line/5 rounded-lg transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Delete Item */}
                          <button
                            type="button"
                            title={T('Delete Item', 'حذف')}
                            onClick={() => {
                              if (confirm(T('Delete this item from inventory?', 'هل أنت متأكد من حذف هذه المادة؟'))) {
                                deleteInventoryItem(item.id);
                              }
                            }}
                            className="p-1.5 text-subtle hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Stock Movements Audit Ledger */
        <div className="space-y-4">
          <div className="bg-surface p-4 rounded-3xl border border-line/10 shadow-soft">
            <h3 className="font-bold text-sm text-fg mb-3 flex items-center gap-2">
              <History size={16} className="text-terra" />
              {T('Complete Stock Movement Ledger', 'سجل حركات المواد الواردة والمصروفة')}
            </h3>

            {stock_movements.length === 0 ? (
              <p className="text-xs text-subtle py-8 text-center">{T('No stock movements recorded yet.', 'لا توجد حركات مسجلة بعد.')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-canvas border-b border-line/10 text-muted uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 text-start">{T('Date', 'التاريخ')}</th>
                      <th className="py-2.5 px-3 text-start">{T('Type', 'نوع الحركة')}</th>
                      <th className="py-2.5 px-3 text-start">{T('Item', 'المادة')}</th>
                      <th className="py-2.5 px-3 text-center">{T('Quantity', 'الكمية')}</th>
                      <th className="py-2.5 px-3 text-end">{T('Total Value', 'القيمة')}</th>
                      <th className="py-2.5 px-3 text-start">{T('Linked Project', 'المشروع المرتبط')}</th>
                      <th className="py-2.5 px-3 text-start">{T('Notes', 'الملاحظات')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/10">
                    {stock_movements.map((mov) => {
                      const itm = inventory.find((i) => i.id === mov.itemId);
                      const prj = projects.find((p) => p.id === mov.projectId);
                      const isInbound = mov.type === 'inbound';
                      const isConsumption = mov.type === 'consumption';

                      return (
                        <tr key={mov.id} className="hover:bg-line/[0.02]">
                          <td className="py-3 px-3 font-mono text-muted">{mov.date}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isInbound
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : isConsumption
                                  ? 'bg-terra/10 text-terra'
                                  : 'bg-sky-500/10 text-sky-500'
                              }`}
                            >
                              {isInbound
                                ? T('Inbound (Receipt)', 'وارد (توريد)')
                                : isConsumption
                                ? T('Project Issue', 'صرف لمشروع')
                                : T('Adjustment', 'تسوية جردية')}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-fg">
                            {itm ? (lang === 'ar' ? itm.name.ar : itm.name.en) : mov.itemId}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold">
                            {isInbound ? `+${mov.qty}` : isConsumption ? `−${mov.qty}` : mov.qty} {itm?.unit || ''}
                          </td>
                          <td className="py-3 px-3 text-end font-mono font-semibold text-fg">
                            {money(mov.totalCost || mov.qty * mov.unitCost)}
                          </td>
                          <td className="py-3 px-3 text-muted">
                            {prj ? (
                              <span className="font-semibold text-terra">{prj.no} · {prj.title}</span>
                            ) : (
                              <span className="text-subtle">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-subtle max-w-xs truncate">{mov.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Item */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade">
          <div className="bg-surface w-full max-w-xl rounded-3xl p-6 border border-line/15 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-fg">
                {editingItem ? T('Edit Material', 'تعديل بيانات المادة') : T('Add Material to Inventory', 'إضافة مادة للمستودع')}
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-muted hover:text-fg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">{T('SKU / Code', 'رمز الصنف')} *</label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="e.g. ACR-3MM-CLR"
                    className="input-base text-xs w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">{T('Category', 'التصنيف')} *</label>
                  <select
                    value={formCat}
                    onChange={(e) => setFormCat(e.target.value)}
                    className="input-base text-xs w-full"
                  >
                    {INVENTORY_CATS.map(([val, en, ar]) => (
                      <option key={val} value={val}>{T(en, ar)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">{T('Name (English)', 'الاسم بالإنجليزية')} *</label>
                  <input
                    type="text"
                    required
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    placeholder="e.g. Clear Acrylic Sheet 3mm"
                    className="input-base text-xs w-full"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">{T('Name (Arabic)', 'الاسم بالعربية')} *</label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    value={formNameAr}
                    onChange={(e) => setFormNameAr(e.target.value)}
                    placeholder="مثلاً: لوح إكريليك شفاف ٣ ملم"
                    className="input-base text-xs w-full font-ar"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">{T('Unit of Measure', 'وحدة القياس')}</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="input-base text-xs w-full"
                  >
                    <option value="sheet">{T('Sheet (لوح)', 'لوح')}</option>
                    <option value="roll">{T('Roll (رول)', 'رول')}</option>
                    <option value="pcs">{T('Piece / Pcs (قطعة)', 'قطعة')}</option>
                    <option value="meter">{T('Meter (متر طولي)', 'متر طولي')}</option>
                    <option value="m2">{T('Square Meter (م²)', 'متر مربع')}</option>
                    <option value="kg">{T('Kilogram (كغ)', 'كيلوغرام')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">{T('Unit Cost (JOD)', 'سعر التكلفة')}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formUnitCost}
                    onChange={(e) => setFormUnitCost(e.target.value)}
                    placeholder="e.g. 22.00"
                    className="input-base text-xs w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">{T('Selling Price (JOD)', 'سعر البيع')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value)}
                    placeholder="e.g. 38.00"
                    className="input-base text-xs w-full font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">{T('Current Qty in Stock', 'الكمية الحالية')}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                    className="input-base text-xs w-full font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">{T('Low Stock Alert Limit', 'حد الأمان الأدنى')}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    className="input-base text-xs w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">{T('Shelf / Location', 'موقع التخزين')}</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Rack A-1"
                    className="input-base text-xs w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line/10">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-ghost text-xs">
                  {T('Cancel', 'إلغاء')}
                </button>
                <button type="submit" className="btn btn-gold text-xs">
                  {editingItem ? T('Update Material', 'حفظ التعديلات') : T('Add to Inventory', 'إضافة للمستودع')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Receive Stock (Inbound) */}
      {receiveModalItem && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade">
          <div className="bg-surface w-full max-w-md rounded-3xl p-6 border border-line/15 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-fg flex items-center gap-2">
                  <ArrowDownRight size={18} className="text-emerald-500" />
                  {T('Receive Stock (Inbound)', 'توريد مواد للمستودع')}
                </h3>
                <p className="text-[11px] text-muted font-mono">{receiveModalItem.sku} · {lang === 'ar' ? receiveModalItem.name.ar : receiveModalItem.name.en}</p>
              </div>
              <button type="button" onClick={() => setReceiveModalItem(null)} className="text-muted hover:text-fg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReceiveStock} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-medium mb-1">{T('Quantity Received', 'الكمية الموردة')} *</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    value={txQty}
                    onChange={(e) => setTxQty(e.target.value)}
                    className="input-base text-xs w-full font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">{T('Unit Cost (JOD)', 'سعر الوحدة')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={txCost}
                    onChange={(e) => setTxCost(e.target.value)}
                    className="input-base text-xs w-full font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">{T('Supplier / Invoice Reference', 'المورد / رقم الفاتورة')}</label>
                <input
                  type="text"
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  placeholder="e.g. Modern Acrylic Suppliers - Bill #492"
                  className="input-base text-xs w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setReceiveModalItem(null)} className="btn btn-ghost text-xs">
                  {T('Cancel', 'إلغاء')}
                </button>
                <button type="submit" className="btn btn-gold text-xs">
                  {T('Confirm Receipt', 'تأكيد التوريد')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Issue to Project (Outbound) */}
      {issueModalItem && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade">
          <div className="bg-surface w-full max-w-md rounded-3xl p-6 border border-line/15 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-fg flex items-center gap-2">
                  <ArrowUpRight size={18} className="text-terra" />
                  {T('Issue Stock to Project', 'صرف مواد لمشروع')}
                </h3>
                <p className="text-[11px] text-muted font-mono">{issueModalItem.sku} · {lang === 'ar' ? issueModalItem.name.ar : issueModalItem.name.en}</p>
              </div>
              <button type="button" onClick={() => setIssueModalItem(null)} className="text-muted hover:text-fg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleIssueToProject} className="space-y-4 text-xs">
              <div>
                <label className="block text-muted font-medium mb-1">{T('Select Target Project', 'المشروع الهدف')} *</label>
                <select
                  required
                  value={txProject}
                  onChange={(e) => setTxProject(e.target.value)}
                  className="input-base text-xs w-full"
                >
                  <option value="">{T('Select project...', 'اختر المشروع...')}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.no} — {p.title}
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
                    max={issueModalItem.currentQty}
                    step="0.1"
                    required
                    value={txQty}
                    onChange={(e) => setTxQty(e.target.value)}
                    className="input-base text-xs w-full font-mono font-bold"
                  />
                  <span className="text-[10px] text-subtle block mt-0.5">
                    {T('Max in stock', 'المتاح بالمستودع')}: {issueModalItem.currentQty} {issueModalItem.unit}
                  </span>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">{T('Total Material Cost', 'التكلفة الإجمالية')}</label>
                  <div className="p-2.5 bg-canvas rounded-xl font-bold text-terra">
                    {money((issueModalItem.unitCost || 0) * Number(txQty || 0))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">{T('Notes / Purpose', 'الغرض / ملاحظات')}</label>
                <input
                  type="text"
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  placeholder="e.g. Facade box letters fabrication"
                  className="input-base text-xs w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIssueModalItem(null)} className="btn btn-ghost text-xs">
                  {T('Cancel', 'إلغاء')}
                </button>
                <button type="submit" className="btn btn-gold text-xs">
                  {T('Deduct & Debit Project', 'صرف وتحميل على المشروع')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
