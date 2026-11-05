// Role / permission model shared by the server (enforcement) and the admin UI (menus + guards).
// Pure data + helpers — no Node or browser APIs, so both sides can import it.

/** Admin modules that can be granted per user: [id, English, Arabic]. `dash` is always visible. */
export const MODULES = [
  ['crm', 'CRM & Clients', 'العملاء وCRM'],
  ['quotes', 'Quotations', 'عروض الأسعار'],
  ['invoices', 'Invoices', 'الفواتير'],
  ['projects', 'Projects & Costing', 'المشاريع وتكاليف العمل'],
  ['inventory', 'Inventory & Materials', 'المستودع والمواد'],
  ['surveys', 'Site Surveys', 'معاينات المواقع'],
  ['orders', 'Workshop Production', 'الورشة والتنفيذ'],
  ['accounting', 'Accounting & Expenses', 'المحاسبة والمصاريف'],
  ['hr', 'Employees & Attendance', 'الموظفون والدوام'],
  ['payroll', 'Payroll Runs', 'الرواتب والقسائم'],
  ['pricing', 'Calculator, Products & Services', 'الحاسبة والمنتجات والخدمات'],
  ['content', 'Website Content', 'محتوى الموقع'],
  ['company', 'Company Profile', 'بيانات الشركة'],
];
export const MODULE_IDS = MODULES.map(([id]) => id);
export const ACTIONS = ['view', 'add', 'edit', 'delete'];

/**
 * Which modules may touch a data collection. A screen often writes to several collections
 * (e.g. converting a quote creates an order and a client), so a collection is writable when the
 * user holds the action in ANY of the listed modules.
 */
export const COL_MODULES = {
  leads: ['crm', 'quotes', 'surveys', 'orders', 'invoices'],
  customers: ['crm', 'quotes', 'invoices', 'orders', 'projects', 'accounting'],
  quotes: ['quotes', 'crm', 'orders', 'invoices'],
  orders: ['orders', 'quotes', 'projects', 'crm'],
  invoices: ['invoices', 'quotes', 'orders', 'projects', 'accounting'],
  surveys: ['surveys', 'crm'],
  purchases: ['accounting', 'inventory', 'projects'],
  cash: ['accounting', 'projects', 'payroll'],
  suppliers: ['accounting', 'inventory'],
  employees: ['hr', 'payroll'],
  attendance: ['hr', 'payroll'],
  advances: ['hr', 'payroll'],
  payrolls: ['payroll', 'hr'],
  projects: ['projects', 'orders'],
  inventory: ['inventory', 'projects'],
  stock_movements: ['inventory', 'projects'],
};
export const SETTING_MODULES = { rates: ['pricing'], content: ['content'], company: ['company'], hr: ['hr', 'payroll'] };

/** Deleting from these needs sign-off from a full-access admin (the delete becomes a request). */
export const FINANCIAL = new Set(['invoices', 'purchases', 'cash', 'payrolls']);

export const can = (user, mod, act) => !!user && (user.full === true || !!(user.perms && user.perms[mod] && user.perms[mod][act]));
export const canAny = (user, mods, act) => mods.some((m) => can(user, m, act));

const grant = (ids, acts) => Object.fromEntries(ids.map((id) => [id, Object.fromEntries(acts.map((a) => [a, true]))]));
/** One-click starting points in the Users screen. */
export const PRESETS = [
  ['readonly', 'Read only', 'قراءة فقط', () => grant(MODULE_IDS, ['view'])],
  ['catalog', 'Products & services editor', 'محرر المنتجات والخدمات', () => grant(['pricing', 'content'], ['view', 'add', 'edit'])],
  ['sales', 'Sales (CRM, quotes)', 'مبيعات (العملاء وعروض الأسعار)', () => grant(['crm', 'quotes', 'surveys'], ['view', 'add', 'edit'])],
  ['accountant', 'Accountant (no deletes)', 'محاسب (بدون حذف)', () => grant(['invoices', 'accounting', 'payroll', 'hr'], ['view', 'add', 'edit'])],
];
