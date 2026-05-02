'use strict';

// ═══════════════════════════════════════════════════════════════════
//  N9chat Pro — Backend Server v1.0
//  Stack : Express + SQLite (sql.js) + JWT + bcryptjs
//  Port  : 3001
// ═══════════════════════════════════════════════════════════════════

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression= require('compression');
const rateLimit  = require('express-rate-limit');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs         = require('fs');
const path       = require('path');
const initSqlJs  = require('sql.js');

// ── CONFIG ──────────────────────────────────────────────────────────
const PORT        = process.env.PORT || 3001;
const JWT_SECRET  = process.env.JWT_SECRET || 'n9chat_pro_secret_key_change_in_production_2025';
const JWT_EXPIRES = '7d';
const DB_FILE     = path.join(__dirname, 'data', 'n9chat.db');
const SALT_ROUNDS = 10;

// ── INIT DB DIR ─────────────────────────────────────────────────────
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// ── DATABASE ────────────────────────────────────────────────────────
let db;

function persistDB() {
  try {
    const data = db.export();
    fs.writeFileSync(DB_FILE, Buffer.from(data));
  } catch(e) { console.error('[DB] Persist error:', e.message); }
}

function initDB(SQL) {
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
    console.log('[DB] Loaded from disk:', DB_FILE);
  } else {
    db = new SQL.Database();
    console.log('[DB] Created new database');
  }

  // ── SCHEMA ────────────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      username    TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      email       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      last_login  TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      pseudo      TEXT,
      name        TEXT,
      bio         TEXT,
      avatar      TEXT,
      language    TEXT NOT NULL DEFAULT 'fr',
      theme       TEXT NOT NULL DEFAULT 'blue',
      persona     TEXT NOT NULL DEFAULT 'expert',
      dark_mode   INTEGER NOT NULL DEFAULT 0,
      sound_on    INTEGER NOT NULL DEFAULT 1,
      vibrate_on  INTEGER NOT NULL DEFAULT 1,
      font_size   INTEGER NOT NULL DEFAULT 14,
      selected_model TEXT NOT NULL DEFAULT 'llama-3.3-70b-versatile',
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS threads (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT NOT NULL DEFAULT 'Nouvelle session',
      summary     TEXT,
      summarized  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id          TEXT PRIMARY KEY,
      thread_id   TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender      TEXT NOT NULL,
      type        TEXT NOT NULL CHECK(type IN ('sent','received')),
      text        TEXT,
      attachments TEXT DEFAULT '[]',
      reactions   TEXT DEFAULT '{}',
      pinned      INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS memories (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      size        INTEGER,
      content     TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stats (
      user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      msgs_sent   INTEGER NOT NULL DEFAULT 0,
      chars_gen   INTEGER NOT NULL DEFAULT 0,
      sessions    INTEGER NOT NULL DEFAULT 0,
      start_date  TEXT NOT NULL DEFAULT (date('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      token       TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
    CREATE INDEX IF NOT EXISTS idx_threads_user    ON threads(user_id);
    CREATE INDEX IF NOT EXISTS idx_memories_user   ON memories(user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_user  ON documents(user_id);
  `);

  persistDB();
  console.log('[DB] Schema ready');
}

// ── SQL HELPERS ─────────────────────────────────────────────────────
function run(sql, params = []) {
  db.run(sql, params);
  persistDB();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  const row  = stmt.getAsObject(params);
  stmt.free();
  return Object.keys(row).length ? row : null;
}

function all(sql, params = []) {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

// ── JWT HELPERS ─────────────────────────────────────────────────────
function signToken(userId) {
  return jwt.sign({ sub: userId, iat: Math.floor(Date.now()/1000) }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ── AUTH MIDDLEWARE ──────────────────────────────────────────────────
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  try {
    const payload = verifyToken(header.slice(7));
    const user = get('SELECT id, username, is_active FROM users WHERE id = ?', [payload.sub]);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Compte inactif ou introuvable' });
    req.user = user;
    next();
  } catch(e) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

// ── EXPRESS APP ──────────────────────────────────────────────────────
const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));
app.use(express.json({ limit: '10mb' }));

// CORS — autorise le frontend local + hébergé
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8080',
    'http://localhost:3000',
    /\.netlify\.app$/,
    /\.vercel\.app$/,
    /\.github\.io$/,
  ],
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// Rate limiting
const limiter      = rateLimit({ windowMs: 15*60*1000, max: 200, message: { error: 'Trop de requêtes. Réessayez.' } });
const authLimiter  = rateLimit({ windowMs: 15*60*1000, max: 20,  message: { error: 'Trop de tentatives de connexion.' } });
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// ═══════════════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════════════

// ── Health check ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ── AUTH — Register ─────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password) return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
  if (username.length < 2 || username.length > 30) return res.status(400).json({ error: 'Identifiant : 2-30 caractères' });
  if (password.length < 6) return res.status(400).json({ error: 'Mot de passe : 6 caractères minimum' });

  const existing = get('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) return res.status(409).json({ error: 'Cet identifiant est déjà utilisé' });

  const id   = uuidv4();
  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  run('INSERT INTO users (id, username, password, email) VALUES (?, ?, ?, ?)', [id, username, hash, email||null]);
  run('INSERT INTO profiles (user_id) VALUES (?)', [id]);
  run('INSERT INTO stats (user_id) VALUES (?)', [id]);

  // Thread de bienvenue
  const threadId = uuidv4();
  const msgId    = uuidv4();
  run('INSERT INTO threads (id, user_id, title) VALUES (?, ?, ?)', [threadId, id, 'Bienvenue']);
  run('INSERT INTO messages (id, thread_id, user_id, sender, type, text) VALUES (?, ?, ?, ?, ?, ?)',
    [msgId, threadId, id, 'N9chat', 'received',
     `Bienvenue ${username} ! 👋\n\nTon compte N9chat Pro est prêt.\n\n📎 **Fichiers** · 🎙️ **Vocal** · 🎵 **Whisper** · 🌙 **Thème** · 👤 **Profil**`]);

  const token = signToken(id);
  res.status(201).json({ token, user: { id, username } });
});

// ── AUTH — Login ────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Identifiant et mot de passe requis' });

  const user = get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
  if (!user) return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });

  run('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?', [user.id]);

  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, username: user.username } });
});

// ── AUTH — Me ────────────────────────────────────────────────────────
app.get('/api/auth/me', auth, (req, res) => {
  const profile = get('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
  const stats   = get('SELECT * FROM stats WHERE user_id = ?',    [req.user.id]);
  res.json({ user: req.user, profile, stats });
});

// ── AUTH — Change password ───────────────────────────────────────────
app.post('/api/auth/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Champs requis' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Nouveau mot de passe trop court' });

  const user  = get('SELECT password FROM users WHERE id = ?', [req.user.id]);
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  run('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);
  res.json({ success: true });
});

// ── PROFILE ──────────────────────────────────────────────────────────
app.get('/api/profile', auth, (req, res) => {
  const profile = get('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
  res.json(profile || {});
});

app.put('/api/profile', auth, (req, res) => {
  const { pseudo, name, bio, avatar, language, theme, persona,
          dark_mode, sound_on, vibrate_on, font_size, selected_model } = req.body;

  run(`UPDATE profiles SET
    pseudo = ?, name = ?, bio = ?, avatar = ?,
    language = ?, theme = ?, persona = ?,
    dark_mode = ?, sound_on = ?, vibrate_on = ?,
    font_size = ?, selected_model = ?,
    updated_at = datetime('now')
    WHERE user_id = ?`,
    [pseudo||null, name||null, bio||null, avatar||null,
     language||'fr', theme||'blue', persona||'expert',
     dark_mode?1:0, sound_on?1:0, vibrate_on?1:0,
     font_size||14, selected_model||'llama-3.3-70b-versatile',
     req.user.id]);

  res.json({ success: true });
});

// ── THREADS ──────────────────────────────────────────────────────────
app.get('/api/threads', auth, (req, res) => {
  const threads = all('SELECT * FROM threads WHERE user_id = ? ORDER BY updated_at DESC', [req.user.id]);
  res.json(threads);
});

app.post('/api/threads', auth, (req, res) => {
  const { title } = req.body;
  const id = uuidv4();
  run('INSERT INTO threads (id, user_id, title) VALUES (?, ?, ?)', [id, req.user.id, title||'Nouvelle session']);

  // Bump stats
  run('UPDATE stats SET sessions = sessions + 1 WHERE user_id = ?', [req.user.id]);

  res.status(201).json({ id, title: title||'Nouvelle session' });
});

app.patch('/api/threads/:id', auth, (req, res) => {
  const { title, summary, summarized } = req.body;
  const thread = get('SELECT id FROM threads WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!thread) return res.status(404).json({ error: 'Session introuvable' });

  if (title !== undefined)      run('UPDATE threads SET title = ?, updated_at = datetime(\'now\') WHERE id = ?', [title, req.params.id]);
  if (summary !== undefined)    run('UPDATE threads SET summary = ? WHERE id = ?', [summary, req.params.id]);
  if (summarized !== undefined) run('UPDATE threads SET summarized = ? WHERE id = ?', [summarized?1:0, req.params.id]);

  res.json({ success: true });
});

app.delete('/api/threads/:id', auth, (req, res) => {
  const thread = get('SELECT id FROM threads WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!thread) return res.status(404).json({ error: 'Session introuvable' });
  run('DELETE FROM threads WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ── MESSAGES ─────────────────────────────────────────────────────────
app.get('/api/threads/:threadId/messages', auth, (req, res) => {
  const thread = get('SELECT id FROM threads WHERE id = ? AND user_id = ?', [req.params.threadId, req.user.id]);
  if (!thread) return res.status(404).json({ error: 'Session introuvable' });

  const messages = all('SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC', [req.params.threadId]);
  const parsed = messages.map(m => ({
    ...m,
    attachments: tryParse(m.attachments, []),
    reactions:   tryParse(m.reactions, {}),
    pinned:      !!m.pinned,
  }));
  res.json(parsed);
});

app.post('/api/threads/:threadId/messages', auth, (req, res) => {
  const { sender, type, text, attachments } = req.body;
  if (!sender || !type) return res.status(400).json({ error: 'sender et type requis' });

  const thread = get('SELECT id FROM threads WHERE id = ? AND user_id = ?', [req.params.threadId, req.user.id]);
  if (!thread) return res.status(404).json({ error: 'Session introuvable' });

  const id = uuidv4();
  // Strip large base64 from attachments before persisting
  const cleanAtts = (attachments||[]).map(a => ({ ...a, dataUrl: a.type==='image' ? a.dataUrl : null }));
  run('INSERT INTO messages (id, thread_id, user_id, sender, type, text, attachments) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, req.params.threadId, req.user.id, sender, type, text||null, JSON.stringify(cleanAtts)]);

  // Update thread timestamp + stats
  run('UPDATE threads SET updated_at = datetime(\'now\') WHERE id = ?', [req.params.threadId]);
  if (type === 'sent') {
    run('UPDATE stats SET msgs_sent = msgs_sent + 1, chars_gen = chars_gen + ? WHERE user_id = ?', [text?.length||0, req.user.id]);
  }

  res.status(201).json({ id });
});

app.patch('/api/messages/:id', auth, (req, res) => {
  const { reactions, pinned, text } = req.body;
  const msg = get('SELECT id FROM messages WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!msg) return res.status(404).json({ error: 'Message introuvable' });

  if (reactions !== undefined) run('UPDATE messages SET reactions = ? WHERE id = ?', [JSON.stringify(reactions), req.params.id]);
  if (pinned    !== undefined) run('UPDATE messages SET pinned = ? WHERE id = ?', [pinned?1:0, req.params.id]);
  if (text      !== undefined) run('UPDATE messages SET text = ? WHERE id = ?', [text, req.params.id]);

  res.json({ success: true });
});

app.delete('/api/messages/:id', auth, (req, res) => {
  const msg = get('SELECT id FROM messages WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!msg) return res.status(404).json({ error: 'Message introuvable' });
  run('DELETE FROM messages WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ── MEMORIES ─────────────────────────────────────────────────────────
app.get('/api/memories', auth, (req, res) => {
  res.json(all('SELECT * FROM memories WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]));
});

app.post('/api/memories', auth, (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Texte requis' });
  const id = uuidv4();
  run('INSERT INTO memories (id, user_id, text) VALUES (?, ?, ?)', [id, req.user.id, text.trim()]);
  res.status(201).json({ id, text: text.trim() });
});

app.delete('/api/memories/:id', auth, (req, res) => {
  const mem = get('SELECT id FROM memories WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!mem) return res.status(404).json({ error: 'Mémoire introuvable' });
  run('DELETE FROM memories WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ── DOCUMENTS ─────────────────────────────────────────────────────────
app.get('/api/documents', auth, (req, res) => {
  const docs = all('SELECT id, user_id, name, size, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json(docs);
});

app.post('/api/documents', auth, (req, res) => {
  const { name, size, content } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'Nom et contenu requis' });

  const count = get('SELECT COUNT(*) as c FROM documents WHERE user_id = ?', [req.user.id]);
  if (count.c >= 20) return res.status(400).json({ error: 'Maximum 20 documents atteint' });

  const id = uuidv4();
  run('INSERT INTO documents (id, user_id, name, size, content) VALUES (?, ?, ?, ?, ?)',
    [id, req.user.id, name, size||0, content.slice(0, 15000)]);
  res.status(201).json({ id, name });
});

app.delete('/api/documents/:id', auth, (req, res) => {
  const doc = get('SELECT id FROM documents WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });
  run('DELETE FROM documents WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ── STATS ─────────────────────────────────────────────────────────────
app.get('/api/stats', auth, (req, res) => {
  const stats   = get('SELECT * FROM stats WHERE user_id = ?', [req.user.id]);
  const threads = get('SELECT COUNT(*) as count FROM threads WHERE user_id = ?', [req.user.id]);
  const msgs    = get('SELECT COUNT(*) as count FROM messages WHERE user_id = ?', [req.user.id]);
  res.json({ ...stats, total_threads: threads.count, total_messages: msgs.count });
});

// ── BACKUP — full export ──────────────────────────────────────────────
app.get('/api/backup', auth, (req, res) => {
  const profile   = get('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
  const threads   = all('SELECT * FROM threads WHERE user_id = ?', [req.user.id]);
  const messages  = all('SELECT * FROM messages WHERE user_id = ?', [req.user.id]);
  const memories  = all('SELECT * FROM memories WHERE user_id = ?', [req.user.id]);
  const documents = all('SELECT * FROM documents WHERE user_id = ?', [req.user.id]);
  const stats     = get('SELECT * FROM stats WHERE user_id = ?', [req.user.id]);

  res.json({
    version: 'n9-backend-v1',
    exported_at: new Date().toISOString(),
    profile,
    threads,
    messages: messages.map(m => ({ ...m, attachments: tryParse(m.attachments, []), reactions: tryParse(m.reactions, {}) })),
    memories,
    documents,
    stats,
  });
});

// ── SEARCH ───────────────────────────────────────────────────────────
app.get('/api/search', auth, (req, res) => {
  const q = req.query.q;
  if (!q || q.length < 2) return res.status(400).json({ error: 'Requête trop courte' });

  const results = all(`
    SELECT m.id, m.text, m.sender, m.type, m.created_at, t.id as thread_id, t.title as thread_title
    FROM messages m
    JOIN threads t ON t.id = m.thread_id
    WHERE m.user_id = ? AND m.text LIKE ?
    ORDER BY m.created_at DESC
    LIMIT 30
  `, [req.user.id, `%${q}%`]);

  res.json(results);
});

// ── ADMIN — DB info (dev only) ────────────────────────────────────────
app.get('/api/admin/info', auth, (req, res) => {
  const userCount = get('SELECT COUNT(*) as c FROM users');
  const msgCount  = get('SELECT COUNT(*) as c FROM messages');
  const threadCt  = get('SELECT COUNT(*) as c FROM threads');
  res.json({
    users: userCount.c,
    messages: msgCount.c,
    threads: threadCt.c,
    db_file: DB_FILE,
    node_version: process.version,
  });
});

// ── 404 ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route introuvable : ${req.method} ${req.path}` });
});

// ── ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Erreur serveur interne' });
});

// ── HELPERS ───────────────────────────────────────────────────────────
function tryParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

// ── START ─────────────────────────────────────────────────────────────
initSqlJs().then(SQL => {
  initDB(SQL);

  // Auto-persist toutes les 30s (sécurité supplémentaire)
  setInterval(persistDB, 30_000);

  app.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║   N9chat Pro Backend v1.0  — PORT ${PORT}   ║`);
    console.log(`╚══════════════════════════════════════════╝`);
    console.log(`  → http://localhost:${PORT}/api/health\n`);
  });
}).catch(err => {
  console.error('Fatal: could not init SQLite', err);
  process.exit(1);
});
