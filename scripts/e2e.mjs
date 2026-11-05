// End-to-end check: node scripts/e2e.mjs  (server must be running; BASE=http://localhost:3000 ADMIN_PASSWORD=...)
// Restart the server before re-running: /api/submit allows 20 requests per 10 minutes per IP, and a
// second run inside that window fails as "rate limited" rather than as a real regression.
const BASE = process.env.BASE || 'http://localhost:3000';
// Sign-in credentials come from the environment (E2E_EMAIL / E2E_PASSWORD, e.g. via .env) — the
// owner password is deliberately not written in this file.
const PASS = process.env.E2E_PASSWORD || '';
const EMAIL = (process.env.E2E_EMAIL || 'ceo@artspacejo.com').trim();
if (!PASS) { console.error('Set E2E_PASSWORD (and optionally E2E_EMAIL) to run the end-to-end checks.'); process.exit(1); }
const creds = (pw) => JSON.stringify({ email: EMAIL, password: pw });
let fail = 0;
const ok = (c, m) => { console.log(`${c ? '  ✔' : '  ✖'} ${m}`); if (!c) fail++; };
const j = async (p, o = {}) => { const r = await fetch(BASE + p, { ...o, headers: { 'content-type': 'application/json', ...(o.headers || {}) } }); let b = null; try { b = await r.json(); } catch {} return { s: r.status, b, h: r.headers }; };
const rows = (b) => (Array.isArray(b) ? b : (Array.isArray(b?.rows) ? b.rows : []));

console.log('Auth');
ok((await j('/api/c/leads')).s === 401, 'collections require login');
ok((await j('/api/login', { method: 'POST', body: creds('wrong') })).s === 401, 'wrong password rejected');
const L = await j('/api/login', { method: 'POST', body: creds(PASS) });
ok(L.s === 200 && L.b.token, 'admin login');
const A = { Authorization: `Bearer ${L.b?.token}` };
ok((await j('/api/c/leads?t=' + L.b.token)).s === 401, 'token in URL is NOT accepted');

console.log('Website forms → leads (categorised)');
const mk = (kind, extra = {}) => j('/api/submit', { method: 'POST', body: JSON.stringify({ kind, name: `E2E ${kind}`, phone: '+962790000000', email: 'e2e@test.jo', ...extra }) });
const item = { label: { en: 'Banner', ar: 'بانر' }, detail: '2 m²', dept: 'signage', price: 12 };
const r1 = await mk('quote', { items: [item, { ...item, dept: 'printing', price: 3 }] });
ok(r1.s === 200 && r1.b.no, `calculator quote → ${r1.b?.no}`);
const r2 = await mk('survey', { survey: { address: 'Abdoun, Amman', city: 'Amman', type: 'signage', preferredDate: '2026-11-01', preferredTime: 'morning', mapUrl: 'https://maps.google.com/x' } });
ok(r2.s === 200 && r2.b.surveyId, 'site survey created');
ok((await mk('visit', { survey: { preferredDate: '2026-12-05', preferredTime: 'noon' } })).s === 200, 'visit request');
ok((await mk('consult', { company: 'Retail' })).s === 200, 'consultation');
ok((await mk('booth')).s === 200, 'booth brief');
ok((await mk('contact')).s === 200, 'contact');
ok((await mk('nope')).s === 400, 'unknown form rejected');
ok((await j('/api/submit', { method: 'POST', body: JSON.stringify({ kind: 'visit', name: 'x' }) })).s === 400, 'missing phone/email rejected');
ok((await mk('quote', { items: [] })).s === 400, 'empty cart rejected');
const bot = await mk('visit', { website: 'http://spam' });
ok(bot.s === 200, 'honeypot answered OK…');

console.log('Admin sees everything');
const leads = rows((await j('/api/c/leads', { headers: A })).b).map((x) => x.data);
const by = (src) => leads.find((l) => l.source === src && l.name.startsWith('E2E'));
ok(by('Website Calculator')?.category === 'signage', 'calculator lead category = top department (signage)');
ok(by('Site Survey')?.category === 'survey', 'survey lead category = survey');
ok(by('Visit Request')?.category === 'visit', 'visit lead category = visit');
ok(by('Visit Request')?.preferredDate === '2026-12-05' && /Preferred visit: 2026-12-05/.test(by('Visit Request')?.notes || ''), 'visit lead keeps the preferred date/time');
ok(by('Consultation Funnel')?.category === 'marketing', 'consult lead category = marketing');
ok(by('Booth Brief')?.category === 'signage', 'booth lead category = signage');
ok(!leads.some((l) => l.source === 'Visit Request' && l.notes === undefined && false), '…');
ok(leads.filter((l) => l.source === 'Visit Request').length === 1, '…and honeypot submission was NOT stored');
const quotes = rows((await j('/api/c/quotes', { headers: A })).b).map((x) => x.data);
const q = quotes.find((x) => x.no === r1.b.no);
ok(q && q.clientId === by('Website Calculator').id && q.items.length === 2, 'quote linked to lead with items');
const orders = rows((await j('/api/c/orders', { headers: A })).b).map((x) => x.data);
ok(orders.some((o) => o.quoteId === q.id), 'draft order linked to quote');
const svs = rows((await j('/api/c/surveys', { headers: A })).b).map((x) => x.data);
const sv = svs.find((s) => s.id === r2.b.surveyId);
ok(sv && sv.clientId === by('Site Survey').id && sv.address === 'Abdoun, Amman' && sv.status === 'new', 'survey linked to lead');

console.log('Accounting books (purchases + petty cash)');
const pur = { id: 'e2e-pur', no: 'PUR-E2E-001', date: '2026-03-01', due: '2026-03-31', supplier: 'E2E Supplier', supplierId: 'e2e-sup', cat: 'materials', amount: 40, vat: true, vatRate: 16, paid: 0, paidBy: 'partner:malek', method: 'transfer' };
const day = { id: 'e2e-cash', date: '2026-03-01', open: 100, closed: false, expenses: [{ id: 'e2e-e1', label: 'E2E tape', amount: 12.5, cat: 'supplies', paidBy: 'cash' }, { id: 'e2e-e2', label: 'E2E courier', amount: 7, cat: 'transport', paidBy: 'company' }] };
ok((await j('/api/c/purchases', { method: 'PUT', body: JSON.stringify({ rows: [] }) })).s === 401, 'purchases write needs admin');
ok((await j('/api/c/cash', { method: 'PUT', body: JSON.stringify({ rows: [] }) })).s === 401, 'petty cash write needs admin');
const putP = await j('/api/c/purchases', { method: 'PUT', headers: A, body: JSON.stringify({ rows: [{ id: pur.id, data: pur }] }) });
const putC = await j('/api/c/cash', { method: 'PUT', headers: A, body: JSON.stringify({ rows: [{ id: day.id, data: day }] }) });
ok(putP.s === 200 && putC.s === 200, 'supplier bill + cash day saved');
const gotP = rows((await j('/api/c/purchases', { headers: A })).b).map((x) => x.data).find((x) => x.id === pur.id);
const gotC = rows((await j('/api/c/cash', { headers: A })).b).map((x) => x.data).find((x) => x.id === day.id);
ok(gotP?.amount === 40 && gotP?.supplier === 'E2E Supplier' && gotP?.vatRate === 16, 'purchase round-tripped intact');
ok(gotP?.paidBy === 'partner:malek' && gotP?.supplierId === 'e2e-sup', 'supplier bill keeps the payer (partner) and the supplier record');
ok(gotC?.open === 100 && gotC?.expenses?.length === 2 && gotC.expenses[0].amount === 12.5, 'petty cash day round-tripped with its expenses');
ok(gotC?.expenses?.[0]?.paidBy === 'cash' && gotC?.expenses?.[1]?.paidBy === 'company', 'each expense keeps who paid it (box vs company)');
ok((await j('/api/c/nope', { headers: A })).s === 404, 'unknown collection rejected');

console.log('Customers & suppliers directory');
const cus = { id: 'e2e-cus', name: 'E2E Client Co', tax: '12345', address: 'Amman', notes: '', phone: '+962 79 000 0000', email: 'e2e@client.test', contact: { name: 'E2E Contact', role: 'Manager', phone: '0790000000', email: 'e2e@client.test' } };
const sup = { id: 'e2e-sup', name: 'E2E Supply Co', tax: '', address: 'Zarqa', notes: '', phone: '0791111111', email: '', contact: { name: 'E2E Sales', role: '', phone: '', email: 'e2e@supply.test' } };
ok((await j('/api/c/customers', { method: 'PUT', body: JSON.stringify({ rows: [] }) })).s === 401, 'customers write needs admin');
ok((await j('/api/c/suppliers', { method: 'PUT', body: JSON.stringify({ rows: [] }) })).s === 401, 'suppliers write needs admin');
const putCu = await j('/api/c/customers', { method: 'PUT', headers: A, body: JSON.stringify({ rows: [{ id: cus.id, data: cus }] }) });
const putSu = await j('/api/c/suppliers', { method: 'PUT', headers: A, body: JSON.stringify({ rows: [{ id: sup.id, data: sup }] }) });
ok(putCu.s === 200 && putSu.s === 200, 'customer + supplier saved');
const gotCu = rows((await j('/api/c/customers', { headers: A })).b).map((x) => x.data).find((x) => x.id === cus.id);
const gotSu = rows((await j('/api/c/suppliers', { headers: A })).b).map((x) => x.data).find((x) => x.id === sup.id);
ok(gotCu?.name === 'E2E Client Co' && gotCu?.contact?.name === 'E2E Contact' && gotCu?.contact?.role === 'Manager', 'customer round-tripped with its Contact tab');
ok(gotCu?.phone === '+962 79 000 0000' && gotCu?.email === 'e2e@client.test', 'customer phone/e-mail kept verbatim (dedupe normalises at the UI)');
ok(gotSu?.name === 'E2E Supply Co' && gotSu?.contact?.name === 'E2E Sales' && gotSu?.address === 'Zarqa', 'supplier round-tripped with its Contact tab');

console.log('HR & payroll (employee file → daily sheet → advance → monthly run → payslip)');
const emp = {
  id: 'e2e-emp', no: 'EMP-999', name: 'E2E Employee', nameAr: 'موظف تجريبي', title: 'Designer', dept: 'design',
  phone: '0790000001', email: 'e2e@staff.test', nationalId: '', ssNo: 'SS-999', startDate: '2026-01-05', endDate: '',
  active: true, payType: 'monthly', base: 900, allowances: [{ label: 'Transport', amount: 60 }], commissionPct: 2,
  family: false, ssSubject: true, taxSubject: true, bankName: 'Housing Bank', iban: 'JO00', notes: '',
};
// One row of the daily sheet: coming 09:00, leaving 18:00, 60-minute break → 8 regular hours.
const att = { id: 'e2e-emp:2026-10-01', employeeId: emp.id, date: '2026-10-01', in: '09:00', out: '18:00', brk: 60, status: 'work', holiday: false, otAdj: 0, note: '' };
const adv = { id: 'e2e-adv', employeeId: emp.id, date: '2026-10-05', amount: 150, note: 'E2E advance', method: 'cash' };
// A line as `approve()` freezes it: every figure is stored, so the payslip never re-computes.
const stats = { days: 31, worked: 22, leave: 0, sick: 0, unpaid: 0, absent: 1, holidays: 0, regular: 176, ot: 2, holidayHours: 0, hours: 178, missing: 0, unpaidDays: 1 };
const line = {
  employeeId: emp.id, no: emp.no, name: emp.name, nameAr: emp.nameAr, title: emp.title, payType: 'monthly', month: '2026-10',
  stats, rates: { dayRate: 34.62, hourly: 4.33, hoursDivisor: 208 }, allowances: emp.allowances, allowancesTotal: 60,
  base: 900, absence: 34.62, otAmount: 21.65, holidayAmount: 0, commission: 80, commissionPct: 2, bonus: 0,
  otherAdd: 0, otherDed: 0, gross: 1027.03, ssBase: 960, ssEmployee: 72, ssEmployer: 136.8, tax: 0,
  advances: [{ id: adv.id, date: adv.date, amount: 150, remaining: 0 }], advanceTotal: 150, deductions: 222,
  net: 805.03, employerCost: 1163.83, note: '', warn: false, frozen: true, method: 'bank',
  ack: { signed: true, name: 'E2E Employee', at: '2026-10-31' },
};
const run = { id: 'PR-2026-10', no: 'PR-2026-10', month: '2026-10', status: 'approved', createdAt: '2026-10-01', approvedAt: '2026-10-31', lines: [line] };
ok((await j('/api/c/payrolls', { method: 'PUT', body: JSON.stringify({ rows: [] }) })).s === 401, 'payroll run write needs admin');
ok((await j('/api/c/attendance', { method: 'PUT', body: JSON.stringify({ rows: [] }) })).s === 401, 'daily sheet write needs admin');
const putE = await j('/api/c/employees', { method: 'PUT', headers: A, body: JSON.stringify({ rows: [{ id: emp.id, data: emp }] }) });
const putAt = await j('/api/c/attendance', { method: 'PUT', headers: A, body: JSON.stringify({ rows: [{ id: att.id, data: att }] }) });
const putAv = await j('/api/c/advances', { method: 'PUT', headers: A, body: JSON.stringify({ rows: [{ id: adv.id, data: adv }] }) });
const putRn = await j('/api/c/payrolls', { method: 'PUT', headers: A, body: JSON.stringify({ rows: [{ id: run.id, data: run }] }) });
ok([putE, putAt, putAv, putRn].every((r) => r.s === 200), 'employee, attendance row, advance and monthly run saved');
const all = async (t) => rows((await j(`/api/c/${t}`, { headers: A })).b).map((x) => x.data);
const gotE = (await all('employees')).find((x) => x.id === emp.id);
const gotAt = (await all('attendance')).find((x) => x.id === att.id);
const gotRun = (await all('payrolls')).find((x) => x.id === run.id);
const gl = gotRun?.lines?.[0];
ok(gotE?.base === 900 && gotE?.allowances?.[0]?.amount === 60 && gotE?.ssSubject === true, 'employee file keeps salary, allowance and SSC registration');
ok(gotAt?.in === '09:00' && gotAt?.out === '18:00' && gotAt?.brk === 60, 'daily sheet keeps coming/leaving times and the break');
ok(gotRun?.status === 'approved' && gl?.frozen === true, 'run is approved and its line is frozen');
ok(gl?.base === 900 && gl?.absence === 34.62 && gl?.ssEmployee === 72 && gl?.net === 805.03, 'frozen line keeps every money figure (no re-computation drift)');
ok(gl?.advances?.[0]?.amount === 150 && gl?.advanceTotal === 150 && gl?.advances[0].remaining === 0, 'the recovered advance is stored on the line');
ok(gl?.ack?.signed === true && gl?.ack?.name === 'E2E Employee' && gl?.ack?.at === '2026-10-31', 'signature acknowledgement stored with the line');
ok((await j('/api/settings/hr', { method: 'PUT', body: '{"data":{}}' })).s === 401, 'payroll rules write needs admin');
// Non-destructive: read what is there, add a marker, read it back, then restore in Cleanup.
const hr0 = (await j('/api/settings?ids=hr')).b?.[0]?.data || {};
ok((await j('/api/settings/hr', { method: 'PUT', headers: A, body: JSON.stringify({ data: { ...hr0, __e2e: 'ok' } }) })).s === 200, 'Jordanian payroll rules saved');
const hrBack = (await j('/api/settings?ids=hr')).b?.[0]?.data;
ok(hrBack?.__e2e === 'ok' && hrBack?.ssEmployee === hr0.ssEmployee, 'payroll rules round-tripped without touching the SSC / overtime rates');

console.log('Security');
const h = (await fetch(BASE + '/')).headers;
ok(h.get('x-content-type-options') === 'nosniff', 'nosniff header');
ok(!h.get('x-powered-by'), 'x-powered-by hidden');
ok((await j('/api/files/x?e=1&s=bad')).s === 403, 'file download needs signed link');
ok((await j('/api/files-link/x')).s === 401, 'file link needs admin');
ok((await j('/api/media', { method: 'POST', body: '{}' })).s === 401, 'media upload needs admin');
const up = await fetch(BASE + '/api/upload', { method: 'POST', headers: { 'x-filename': 'evil.html' }, body: 'x' });
ok(up.status === 400, 'upload of .html refused');
ok((await j('/api/fn/send-quote', { method: 'POST', body: '{}' })).s === 401, 'send-quote needs admin');
ok((await j('/api/settings/rates', { method: 'PUT', body: '{"data":{}}' })).s === 401, 'settings write needs admin');
const rb = await fetch(BASE + '/robots.txt').then((r) => r.text());
ok(rb.includes('Disallow: /admin') && rb.includes('Sitemap:'), 'robots.txt + sitemap reference');
ok(rb.includes('OAI-SearchBot') && rb.includes('PerplexityBot'), 'robots.txt allows AI retrieval bots');
const sm = await fetch(BASE + '/sitemap.xml').then((r) => r.text());
ok((sm.match(/<loc>/g) || []).length === 13, 'sitemap.xml lists 13 URLs (home + 6 services x 2 languages)');
ok(await fetch(BASE + '/llms.txt').then((r) => r.text()).then((t) => t.startsWith('# ')), 'llms.txt served');
const lp = await fetch(BASE + '/en/signage-amman');
const lpHtml = await lp.text();
ok(lp.status === 200 && (lpHtml.match(/<h1/g) || []).length === 1, 'landing page renders one H1 without JS');
ok(lpHtml.includes('rel="canonical"') && (lpHtml.match(/rel="alternate" hreflang=/g) || []).length === 3, 'landing page canonical + 3 hreflang');
ok(lpHtml.includes('"FAQPage"') && lpHtml.includes('"AggregateOffer"'), 'landing page JSON-LD FAQ + price range');
ok(!lpHtml.includes('<script src='), 'landing page ships no JS bundle');
ok((await fetch(BASE + '/en/no-such-service')).status === 404, 'unknown landing slug is a real 404');
const adminH = (await fetch(BASE + '/admin')).headers;
ok((await fetch(BASE + '/admin')).status === 200, '/admin route served (login screen inside)');
ok((adminH.get('x-robots-tag') || '').includes('noindex'), '/admin sends noindex header');

console.log('Portfolio galleries');
// Shape checks only — the owner edits this content freely, so never assert on a project name.
const content = (await j('/api/settings?ids=content')).b?.[0]?.data;
const prj = content?.projects || [];
if (prj.length === 0) {
  console.log('  ⚠ no portfolio projects found in settings (clean/unseeded DB)');
} else {
  ok(prj.length > 0, `public settings expose ${prj.length} project(s)`);
  ok(prj.every((p) => p.images === undefined || Array.isArray(p.images)), 'every project has an images array (or none)');
  const shown = prj.filter((p) => p.image);
  ok(shown.length > 0, `${shown.length} project(s) have a cover photo`);
  ok(prj.every((p) => { const a = [p.image, ...(p.images || [])].filter(Boolean); return new Set(a).size === a.length; }), 'no photo repeated inside one project');
  const oneCover = shown[0]?.image;
  ok(oneCover?.startsWith('/media/') && (await fetch(BASE + oneCover, { method: 'HEAD' })).status === 200, `cover photo is served (${oneCover})`);
  const oneInner = prj.find((p) => (p.images || []).length)?.images[0];
  ok(!oneInner || (await fetch(BASE + oneInner, { method: 'HEAD' })).status === 200, `inner photo is served (${oneInner || 'n/a'})`);
}

console.log('Projects ↔ sales invoice ↔ supplier bill ↔ petty-cash expense');
const prjRec = { id: 'e2e-prj', no: 'PRJ-E2E-001', title: 'E2E Project', customerId: cus.id, status: 'planning', budgetRevenue: 100, budgetCost: 40, milestones: [] };
const invRec = { id: 'e2e-inv', no: 'INV-E2E-001', customerId: cus.id, projectId: prjRec.id, date: '2026-03-02', due: '2026-04-01', vat: true, vatRate: 16, discount: 0, items: [{ id: 'i1', label: { en: 'E2E', ar: 'E2E' }, dept: 'signage', qty: 1, unit: 100, price: 100 }], payments: [] };
const purRec = { ...pur, id: 'e2e-pur2', no: 'PUR-E2E-002', projectId: prjRec.id };
const dayRec = { ...day, id: 'e2e-cash2', date: '2026-03-02', expenses: [{ id: 'e2e-e3', label: 'E2E site', amount: 5, cat: 'other', paidBy: 'cash', projectId: prjRec.id }] };
const put = (t, r) => j(`/api/c/${t}`, { method: 'PUT', headers: A, body: JSON.stringify({ rows: [{ id: r.id, data: r }] }) });
const putAll = await Promise.all([put('projects', prjRec), put('invoices', invRec), put('purchases', purRec), put('cash', dayRec)]);
ok(putAll.every((r) => r.s === 200), 'project, invoice, supplier bill and expense saved');
const gInv = (await all('invoices')).find((x) => x.id === invRec.id);
const gPur = (await all('purchases')).find((x) => x.id === purRec.id);
const gCash = (await all('cash')).find((x) => x.id === dayRec.id);
const gPrj = (await all('projects')).find((x) => x.id === prjRec.id);
ok(gPrj && gInv?.projectId === gPrj.id, 'sales invoice keeps its project link');
ok(gPur?.projectId === gPrj.id, 'supplier bill keeps its project link');
ok(gCash?.expenses?.[0]?.projectId === gPrj.id, 'petty-cash expense keeps its project link');

console.log('Users, roles & approvals');
const staffMail = `e2e.staff.${Date.now()}@test.jo`;
const mkUser = await j('/api/users', { method: 'POST', headers: A, body: JSON.stringify({ name: 'E2E Staff', email: staffMail, password: 'staff-pass-123', perms: { invoices: { view: true, add: true, delete: true }, pricing: { view: true } } }) });
ok(mkUser.s === 200 && mkUser.b.id, 'full admin creates a staff user');
const SL = await j('/api/login', { method: 'POST', body: JSON.stringify({ email: staffMail, password: 'staff-pass-123' }) });
ok(SL.s === 200 && SL.b.token && !SL.b.user.full, 'staff user can sign in');
const SA = { Authorization: `Bearer ${SL.b?.token}` };
ok((await j('/api/users', { headers: SA })).s === 403, 'staff cannot open the user list');
ok((await j('/api/c/purchases', { headers: SA })).s === 403, 'staff blocked from a section they cannot view');
ok((await j('/api/settings/rates', { method: 'PUT', headers: SA, body: JSON.stringify({ data: {} }) })).s === 403, 'view-only staff cannot change pricing');
const invId = `e2e_inv_${Date.now()}`;
ok((await j('/api/c/invoices', { method: 'PUT', headers: SA, body: JSON.stringify({ rows: [{ id: invId, data: { id: invId, no: 'E2E-INV', total: 10 } }], deleted: [] }) })).s === 200, 'staff with Add can create an invoice');
ok((await j('/api/c/invoices', { method: 'PUT', headers: SA, body: JSON.stringify({ rows: [{ id: invId, data: { id: invId, no: 'E2E-INV', total: 99 } }], deleted: [] }) })).s === 403, 'staff without Edit cannot change it');
const reqDel = await j('/api/c/invoices', { method: 'PUT', headers: SA, body: JSON.stringify({ rows: [], deleted: [invId] }) });
ok(reqDel.s === 200 && reqDel.b.pending === 1, 'staff delete of an invoice becomes an approval request');
ok(rows((await j('/api/c/invoices', { headers: A })).b).some((r) => r.id === invId), 'invoice still exists while pending');
const pend = (await j('/api/approvals', { headers: A })).b.find((a) => a.rowId === invId && a.status === 'pending');
ok(!!pend, 'full admin sees the pending request');
ok((await j(`/api/approvals/${pend?.id}/approve`, { method: 'POST', headers: SA, body: '{}' })).s === 403, 'staff cannot approve');
ok((await j(`/api/approvals/${pend?.id}/approve`, { method: 'POST', headers: A, body: '{}' })).s === 200, 'full admin approves');
ok(!rows((await j('/api/c/invoices', { headers: A })).b).some((r) => r.id === invId), 'approved invoice is deleted');
await j(`/api/users/${mkUser.b.id}`, { method: 'DELETE', headers: A });
ok((await j('/api/c/invoices', { headers: SA })).s === 401, 'deleted user is signed out immediately');

console.log('Cleanup');
await j('/api/c/invoices', { method: 'PUT', headers: A, body: JSON.stringify({ rows: [], deleted: [invRec.id] }) });
await j('/api/c/projects', { method: 'PUT', headers: A, body: JSON.stringify({ rows: [], deleted: [prjRec.id] }) });
await j('/api/c/purchases', { method: 'PUT', headers: A, body: JSON.stringify({ rows: [], deleted: [purRec.id] }) });
await j('/api/c/cash', { method: 'PUT', headers: A, body: JSON.stringify({ rows: [], deleted: [dayRec.id] }) });
const del = async (t, rows) => j(`/api/c/${t}`, { method: 'PUT', headers: A, body: JSON.stringify({ rows: [], deleted: rows.map((r) => r.id) }) });
await del('leads', leads.filter((l) => l.name.startsWith('E2E')));
await del('quotes', quotes.filter((x) => leads.find((l) => l.id === x.clientId)?.name.startsWith('E2E')));
await del('orders', orders.filter((o) => leads.find((l) => l.id === o.clientId)?.name.startsWith('E2E')));
await del('surveys', svs.filter((s) => leads.find((l) => l.id === s.clientId)?.name.startsWith('E2E')));
await del('purchases', [pur]);
await del('cash', [day]);
await del('customers', [cus]);
await del('suppliers', [sup]);
await del('payrolls', [run]);
await del('advances', [adv]);
await del('attendance', [att]);
await del('employees', [emp]);
// Put the payroll rules back exactly as they were before this run.
await j('/api/settings/hr', { method: 'PUT', headers: A, body: JSON.stringify({ data: hr0 }) });
console.log(fail ? `\n${fail} check(s) FAILED` : '\nAll checks passed');
process.exit(fail ? 1 : 0);
