// Local backend client (Express + SQLite in /server). Keeps the small `sb` interface the app
// already uses, but talks to /api on the same origin — no external services.
const TOKEN = 'artspace_token';
const listeners = new Set();
const getToken = () => localStorage.getItem(TOKEN);
const emit = (session) => listeners.forEach((cb) => cb('CHANGE', session));

async function call(path, { method = 'GET', body, raw, headers = {} } = {}) {
  try {
    const h = { ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (getToken()) h.Authorization = `Bearer ${getToken()}`;
    const r = await fetch(`/api${path}`, { method, headers: h, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
    const j = await r.json().catch(() => null);
    if (!r.ok) return { data: null, error: { message: j?.error || r.statusText, status: r.status } };
    return { data: j, error: null };
  } catch (e) {
    return { data: null, error: { message: String(e) } };
  }
}

const SETTINGS = ['rates', 'content', 'company'];
// ids the admin has seen per collection — only these may be deleted by a save,
// so website submissions that arrive meanwhile are never wiped.
const known = {};

const table = (t) => {
  const isSettings = t === 'settings';
  const run = async (ids) => {
    if (isSettings) return call(`/settings?ids=${(ids || SETTINGS).join(',')}`);
    const res = await call(`/c/${t}`);
    if (res.data) known[t] = new Set(res.data.map((r) => r.id));
    return res;
  };
  return {
    select: () => ({
      in: (_col, ids) => run(ids),
      then: (res, rej) => run().then(res, rej),
    }),
    upsert: async (rows) => {
      if (isSettings) return call(`/settings/${rows.id}`, { method: 'PUT', body: { data: rows.data } });
      const keep = new Set(rows.map((r) => r.id));
      const deleted = [...(known[t] || [])].filter((id) => !keep.has(id));
      const res = await call(`/c/${t}`, { method: 'PUT', body: { rows, deleted } });
      if (!res.error) known[t] = keep;
      return res;
    },
    insert: (row) => call(`/c/${t}`, { method: 'POST', body: row }),
  };
};

export const sb = {
  from: table,
  auth: {
    async signInWithPassword({ email, password }) {
      const { data, error } = await call('/login', { method: 'POST', body: { email, password } });
      if (error) return { error };
      localStorage.setItem(TOKEN, data.token);
      emit({ token: data.token });
      return { error: null };
    },
    async getSession() {
      if (!getToken()) return { data: { session: null } };
      const { error } = await call('/session');
      if (error && error.status === 401) { localStorage.removeItem(TOKEN); return { data: { session: null } }; }
      return { data: { session: { token: getToken() } } };
    },
    async signOut() { localStorage.removeItem(TOKEN); emit(null); },
    onAuthStateChange(cb) {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    },
  },
  functions: {
    invoke: (name, { body }) => call(`/fn/${name}`, { method: 'POST', body }),
  },
};

/** Upload a client file (public). Returns the stored file name, or '' on failure. */
export async function uploadFile(file) {
  if (!file) return '';
  const { data, error } = await call('/upload', { method: 'POST', raw: file, headers: { 'x-filename': encodeURIComponent(file.name) } });
  return error ? '' : data.path;
}

/** Admin-only: short-lived signed download link for an uploaded file. */
export async function signedUrl(path) {
  if (!path) return '';
  const { data } = await call(`/files-link/${encodeURIComponent(path)}`);
  return data?.url || '';
}

/** Public website forms → server builds lead (+ quote/order/survey), categorises it and alerts the team. */
export async function submitForm(payload) {
  const { data, error } = await call('/submit', { method: 'POST', body: payload });
  return error ? { error } : { data };
}

const toDataUrl = (file, max = 900) => new Promise((resolve, reject) => {
  const img = new Image();
  const objUrl = URL.createObjectURL(file);
  img.onload = () => {
    const k = Math.min(1, max / Math.max(img.width || max, img.height || max));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round((img.width || max) * k));
    c.height = Math.max(1, Math.round((img.height || max) * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(objUrl);
    resolve(c.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.85));
  };
  img.onerror = reject;
  img.src = objUrl;
});

/** Admin: resize an image and store it on the server. Falls back to a data URL if the server is unreachable. */
export async function uploadMedia(file) {
  const dataUrl = await toDataUrl(file);
  if (!getToken()) return dataUrl;
  const blob = await (await fetch(dataUrl)).blob();
  const { data, error } = await call('/media', { method: 'POST', raw: blob, headers: { 'Content-Type': blob.type } });
  return error ? dataUrl : data.url;
}
