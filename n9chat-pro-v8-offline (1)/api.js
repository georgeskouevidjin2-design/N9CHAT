'use strict';
// ═══════════════════════════════════════════════════════════════════
//  N9chat Pro — API Client v1.0
//  Gère toutes les communications avec le backend
//  Fonctionne aussi en mode offline (fallback localStorage)
// ═══════════════════════════════════════════════════════════════════

const N9API = (() => {
  const BASE = window.N9_BACKEND_URL || 'http://localhost:3001/api';

  // ── Token storage ────────────────────────────────────────────────
  function getToken()      { return localStorage.getItem('n9_jwt'); }
  function setToken(t)     { localStorage.setItem('n9_jwt', t); }
  function clearToken()    { localStorage.removeItem('n9_jwt'); }
  function isConnected()   { return !!getToken() && navigator.onLine; }

  // ── Base fetch ───────────────────────────────────────────────────
  async function req(method, path, body, opts = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    try {
      const res = await fetch(BASE + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(opts.timeout || 8000),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        clearToken();
        window.dispatchEvent(new CustomEvent('n9:logout'));
        throw new Error('Session expirée. Reconnectez-vous.');
      }

      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      return data;

    } catch(e) {
      if (e.name === 'TimeoutError' || e.name === 'TypeError') {
        throw new Error('Backend inaccessible — mode hors ligne actif');
      }
      throw e;
    }
  }

  const get    = (path, opts) => req('GET', path, null, opts);
  const post   = (path, body, opts) => req('POST', path, body, opts);
  const put    = (path, body, opts) => req('PUT', path, body, opts);
  const patch  = (path, body, opts) => req('PATCH', path, body, opts);
  const del    = (path, opts) => req('DELETE', path, null, opts);

  // ═══════════════════════════════════════════════════════════════
  //  AUTH
  // ═══════════════════════════════════════════════════════════════
  const auth = {
    async register(username, password, email) {
      const data = await post('/auth/register', { username, password, email });
      if (data.token) setToken(data.token);
      return data;
    },

    async login(username, password) {
      const data = await post('/auth/login', { username, password });
      if (data.token) setToken(data.token);
      return data;
    },

    async me() {
      return get('/auth/me');
    },

    async changePassword(currentPassword, newPassword) {
      return post('/auth/change-password', { currentPassword, newPassword });
    },

    logout() {
      clearToken();
    },

    isLoggedIn() {
      return !!getToken();
    },
  };

  // ═══════════════════════════════════════════════════════════════
  //  PROFILE
  // ═══════════════════════════════════════════════════════════════
  const profile = {
    async get() {
      if (!isConnected()) return null;
      return get('/profile');
    },

    async update(data) {
      if (!isConnected()) { localStorage.setItem('n9_profile', JSON.stringify(data)); return; }
      // Persist locally too (instant UI)
      localStorage.setItem('n9_profile', JSON.stringify(data));
      return put('/profile', data);
    },
  };

  // ═══════════════════════════════════════════════════════════════
  //  THREADS
  // ═══════════════════════════════════════════════════════════════
  const threads = {
    async list() {
      if (!isConnected()) return null;
      return get('/threads');
    },

    async create(title) {
      if (!isConnected()) return { id: Date.now().toString(), title: title||'Nouvelle session' };
      return post('/threads', { title });
    },

    async rename(id, title) {
      if (!isConnected()) return;
      return patch(`/threads/${id}`, { title });
    },

    async setSummary(id, summary) {
      if (!isConnected()) return;
      return patch(`/threads/${id}`, { summary, summarized: true });
    },

    async delete(id) {
      if (!isConnected()) return;
      return del(`/threads/${id}`);
    },
  };

  // ═══════════════════════════════════════════════════════════════
  //  MESSAGES
  // ═══════════════════════════════════════════════════════════════
  const messages = {
    async list(threadId) {
      if (!isConnected()) return null;
      return get(`/threads/${threadId}/messages`);
    },

    async send(threadId, msg) {
      if (!isConnected()) return { id: Date.now().toString() };
      return post(`/threads/${threadId}/messages`, msg);
    },

    async update(msgId, data) {
      if (!isConnected()) return;
      return patch(`/messages/${msgId}`, data);
    },

    async delete(msgId) {
      if (!isConnected()) return;
      return del(`/messages/${msgId}`);
    },
  };

  // ═══════════════════════════════════════════════════════════════
  //  MEMORIES
  // ═══════════════════════════════════════════════════════════════
  const memories = {
    async list() {
      if (!isConnected()) {
        try { return JSON.parse(localStorage.getItem('n9_memory')||'[]'); } catch { return []; }
      }
      return get('/memories');
    },

    async add(text) {
      if (!isConnected()) {
        const mems = JSON.parse(localStorage.getItem('n9_memory')||'[]');
        const entry = { id: Date.now().toString(), text, date: new Date().toLocaleDateString('fr') };
        mems.unshift(entry);
        localStorage.setItem('n9_memory', JSON.stringify(mems));
        return entry;
      }
      return post('/memories', { text });
    },

    async delete(id) {
      if (!isConnected()) {
        const mems = JSON.parse(localStorage.getItem('n9_memory')||'[]').filter(m => m.id !== id);
        localStorage.setItem('n9_memory', JSON.stringify(mems));
        return;
      }
      return del(`/memories/${id}`);
    },
  };

  // ═══════════════════════════════════════════════════════════════
  //  DOCUMENTS
  // ═══════════════════════════════════════════════════════════════
  const documents = {
    async list() {
      if (!isConnected()) {
        try { return JSON.parse(localStorage.getItem('n9_docs')||'[]'); } catch { return []; }
      }
      return get('/documents');
    },

    async add(doc) {
      if (!isConnected()) {
        const docs = JSON.parse(localStorage.getItem('n9_docs')||'[]');
        docs.unshift(doc);
        localStorage.setItem('n9_docs', JSON.stringify(docs));
        return doc;
      }
      return post('/documents', doc);
    },

    async delete(id) {
      if (!isConnected()) {
        const docs = JSON.parse(localStorage.getItem('n9_docs')||'[]').filter(d => d.id !== id);
        localStorage.setItem('n9_docs', JSON.stringify(docs));
        return;
      }
      return del(`/documents/${id}`);
    },
  };

  // ═══════════════════════════════════════════════════════════════
  //  STATS
  // ═══════════════════════════════════════════════════════════════
  const stats = {
    async get() {
      if (!isConnected()) {
        try { return JSON.parse(localStorage.getItem('n9_stats')||'{}'); } catch { return {}; }
      }
      return get('/stats');
    },
  };

  // ═══════════════════════════════════════════════════════════════
  //  SEARCH
  // ═══════════════════════════════════════════════════════════════
  const search = {
    async query(q) {
      if (!isConnected()) return null; // Frontend handles offline search
      return get(`/search?q=${encodeURIComponent(q)}`);
    },
  };

  // ═══════════════════════════════════════════════════════════════
  //  BACKUP
  // ═══════════════════════════════════════════════════════════════
  const backup = {
    async export() {
      if (!isConnected()) return null;
      return get('/backup');
    },
  };

  // ═══════════════════════════════════════════════════════════════
  //  HEALTH
  // ═══════════════════════════════════════════════════════════════
  async function health() {
    try {
      const data = await get('/health', { timeout: 3000 });
      return data.status === 'ok';
    } catch { return false; }
  }

  // Expose
  return { auth, profile, threads, messages, memories, documents, stats, search, backup, health, isConnected, getToken };
})();

// Make globally available
window.N9API = N9API;
