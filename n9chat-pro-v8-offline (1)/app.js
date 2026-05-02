'use strict';

// ═══════════════════════════════════════════════════════════════
// 🔒 ANTI-CLONE & DOMAIN LOCK — N9chat Pro Security Layer v1
// ═══════════════════════════════════════════════════════════════

(function() {
  // ── 1. DOMAINES AUTORISÉS ──────────────────────────────────────
  // ✏️  Ajoute ici TON domaine de déploiement réel (ex: 'n9chat.com')
  // 'localhost' et '127.0.0.1' sont pour le développement local
  const ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '',          // file:// (ouverture directe depuis le disque)
    // 'n9chat.com',
    // 'app.n9chat.com',
    // 'mon-domaine.netlify.app',
  ];

  const host = window.location.hostname.toLowerCase();
  const isAllowed = ALLOWED_HOSTS.some(h => host === h || (h && host.endsWith('.' + h)));

  // ── 2. DÉTECTION IFRAME / EMBEDDING ───────────────────────────
  const isFramed = (() => {
    try { return window.self !== window.top; }
    catch(e) { return true; } // cross-origin frame = bloqué
  })();

  // ── 3. BLOCAGE IMMÉDIAT si domaine non autorisé ou iframe ──────
  if (!isAllowed || isFramed) {
    const reason = isFramed ? 'ERR_FRAME_BLOCKED' : 'ERR_DOMAIN_BLOCKED';
    document.documentElement.innerHTML = '';
    document.body.innerHTML = `
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{min-height:100vh;display:flex;align-items:center;justify-content:center;
             background:#060d1f;font-family:system-ui,sans-serif;}
        .sh{text-align:center;color:#fff;padding:2rem;max-width:420px;}
        .sh-icon{font-size:4rem;display:block;margin-bottom:1.5rem;}
        .sh h1{font-size:1.4rem;font-weight:800;margin-bottom:.75rem;color:#ef4444;}
        .sh p{font-size:.85rem;color:rgba(255,255,255,.4);line-height:1.7;margin-bottom:1rem;}
        .sh code{display:inline-block;padding:.3rem .75rem;background:rgba(255,255,255,.06);
                 border-radius:6px;font-size:.68rem;color:rgba(255,255,255,.25);}
      </style>
      <div class="sh">
        <span class="sh-icon">🛡️</span>
        <h1>Accès non autorisé</h1>
        <p>Cette application est protégée contre la copie et le clonage.<br>
           Accédez-y uniquement depuis le site officiel.</p>
        <code>${reason} · ${host || 'file://'}</code>
      </div>`;
    throw new Error('[N9 Security] Unauthorized origin — execution halted.');
  }

  // ── 4. DÉTECTION DEVTOOLS (dissuasion passive) ─────────────────
  let devOpen = false;
  const checkDev = () => {
    const threshold = 160;
    const open = (window.outerWidth - window.innerWidth) > threshold ||
                 (window.outerHeight - window.innerHeight) > threshold;
    if (open && !devOpen) {
      devOpen = true;
      console.clear();
      console.log('%c🛡 N9chat Pro', 'color:#ef4444;font-size:1.8rem;font-weight:900');
      console.log('%cApplication protégée — extraction interdite.', 'color:#fbbf24;font-size:.8rem');
    } else if (!open) { devOpen = false; }
  };
  // Intervalle espacé pour ne pas consommer CPU
  setInterval(checkDev, 3000);

  // ── 5. BLOCAGE RACCOURCIS ───────────────────────────────────────
  document.addEventListener('keydown', e => {
    const ctrl = e.ctrlKey || e.metaKey;
    const blocked =
      e.key === 'F12' ||
      (ctrl && !e.shiftKey && (e.key === 'u' || e.key === 'U')) ||
      (ctrl && e.shiftKey  && 'ijcIJC'.includes(e.key));
    if (blocked) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // ── 6. CLIC DROIT + DRAG ────────────────────────────────────────
  document.addEventListener('contextmenu', e => e.preventDefault(), true);
  document.addEventListener('dragstart', e => e.preventDefault(), true);

  // ── 7. SESSION FINGERPRINT ──────────────────────────────────────
  try {
    window.__N9_SID__ = btoa(
      JSON.stringify({ h: host, t: Date.now(), v: 'n9-v5' })
    );
  } catch(e) {}

})();

// ── Service Worker ──────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  // Enregistrer après que la page est interactive (pas pendant le chargement)
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(reg => {
        // Vérifier les mises à jour toutes les 60 min
        setInterval(() => reg.update(), 60 * 60 * 1000);
      })
      .catch(e => console.warn('[SW]', e));

  });
}

const { useState, useEffect, useRef, useCallback, createElement: h } = React;

// ── Clé API — segments encodés en Base64 pour ne pas apparaître en clair ──
const _s = ['Z3NrX3RBMlQ3dGNFanhFZGI4NzhS','WHJjV0dkeWIzRllTU242UW9vNkZi','SmNlaGdRZlQxTzdNakc='];
const GROQ_API_KEY = atob(_s.join(''));
const VISION_MODEL  = "meta-llama/llama-4-scout-17b-16e-instruct";
const TEXT_MODEL    = "llama-3.3-70b-versatile";
const WHISPER_MODEL = "whisper-large-v3";

const LANGUAGES = [
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'ar', label: '🇸🇦 العربية' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'pt', label: '🇧🇷 Português' },
];

const THEMES = [
  { id: 'blue',    label: 'Saphir',   accent: '#2563eb', bg: '#f0f4ff', bgDark: '#0d1b3e' },
  { id: 'violet',  label: 'Violet',   accent: '#7c3aed', bg: '#f5f3ff', bgDark: '#1a0e3a' },
  { id: 'emerald', label: 'Émeraude', accent: '#059669', bg: '#f0fdf4', bgDark: '#082316' },
  { id: 'rose',    label: 'Rose',     accent: '#e11d48', bg: '#fff1f2', bgDark: '#2a0812' },
  { id: 'amber',   label: 'Ambre',    accent: '#d97706', bg: '#fffbeb', bgDark: '#221700' },
  { id: 'slate',   label: 'Ardoise',  accent: '#475569', bg: '#f8fafc', bgDark: '#0f172a' },
];

const AI_PERSONAS = [
  { id: 'expert',   label: '🔬 Expert',     desc: 'Analytique, précis, structuré' },
  { id: 'coach',    label: '💪 Coach',       desc: 'Motivant, bienveillant, proactif' },
  { id: 'creative', label: '🎨 Créatif',     desc: 'Imaginatif, original, inspirant' },
  { id: 'concise',  label: '⚡ Concis',      desc: 'Réponses courtes et directes' },
  { id: 'socratic', label: '🧠 Socratique',  desc: 'Guide par des questions ciblées' },
];

const QUICK_SUGGESTIONS = [
  "Résume notre conversation",
  "Explique différemment",
  "Donne des exemples concrets",
  "Quels sont les points clés ?",
  "Approfondis ce sujet",
  "Quelles sont les alternatives ?",
];

// ── Sounds ──────────────────────────────────────────────────────
let _ctx = null;
function getAudioCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!_ctx && AC) { try { _ctx = new AC(); } catch(e){} }
  return _ctx;
}
function playTone(freq, dur, type, vol) {
  const ctx = getAudioCtx(); if (!ctx) return;
  try {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = type||'sine'; o.frequency.value = freq||880;
    g.gain.setValueAtTime(vol||0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (dur||0.08));
    o.start(); o.stop(ctx.currentTime + (dur||0.08));
  } catch(e) {}
}
function playReceiveSound() { playTone(660,0.06,'sine',0.1); setTimeout(()=>playTone(880,0.08,'sine',0.08),70); }
function playSendSound()    { playTone(440,0.05,'sine',0.07); }
function vibrateDevice(p)   { try { if (navigator.vibrate) navigator.vibrate(p||[30]); } catch(e) {} }

// ── Storage helpers ──────────────────────────────────────────────
const DEFAULT_PROFILE = {
  name:'', pseudo:'', bio:'', language:'fr', theme:'blue', avatar:null,
  persona:'expert', darkMode:false, soundEnabled:true, vibrateEnabled:true,
  fontSize:14, selectedModel:'llama-3.3-70b-versatile',
};
function loadProfile()  { try { const r=localStorage.getItem('n9_profile'); return r?{...DEFAULT_PROFILE,...JSON.parse(r)}:null; } catch{return null;} }
function saveProfile(p) { localStorage.setItem('n9_profile', JSON.stringify(p)); }
function loadThreads()  { try { const r=localStorage.getItem('n9_threads'); return r?JSON.parse(r):null; } catch{return null;} }
function saveThreads(threads) {
  const clean = threads.map(t=>({...t, messages:t.messages.map(m=>({...m, attachments:m.attachments?m.attachments.map(a=>({...a,file:undefined})):undefined}))}));
  try { localStorage.setItem('n9_threads', JSON.stringify(clean)); } catch(e) {}
}

function applyTheme(themeId, dark) {
  const t = THEMES.find(x=>x.id===themeId)||THEMES[0];
  const r = document.documentElement;
  r.style.setProperty('--accent', t.accent);
  r.style.setProperty('--accent-hover', t.accent+'cc');
  r.style.setProperty('--accent-light', t.accent+(dark?'28':'18'));
  r.style.setProperty('--accent-glow', t.accent+'28');
  r.style.setProperty('--msg-user-bg', t.accent);
  r.style.setProperty('--thread-active-txt', t.accent);
  r.style.setProperty('--thread-active-border', t.accent+'60');
  r.style.setProperty('--thread-active-bg', t.accent+'18');
  r.style.setProperty('--border-focus', t.accent+'90');
  if (dark) {
    r.style.setProperty('--bg', t.bgDark);
    r.style.setProperty('--surface', '#1a2035');
    r.style.setProperty('--surface-2', '#131929');
    r.style.setProperty('--border', '#2a3555');
    r.style.setProperty('--text-primary', '#e8edf8');
    r.style.setProperty('--text-secondary', '#8fa3c8');
    r.style.setProperty('--text-muted', '#4a5f8a');
    r.style.setProperty('--input-bg', '#1a2035');
    r.style.setProperty('--input-border', '#2a3555');
    r.style.setProperty('--msg-ai-bg', '#1e2a45');
    r.style.setProperty('--msg-ai-txt', '#e8edf8');
    r.style.setProperty('--msg-ai-border', '#2a3555');
    document.body.classList.add('dark');
  } else {
    r.style.setProperty('--bg', t.bg);
    r.style.setProperty('--surface', '#ffffff');
    r.style.setProperty('--surface-2', '#f7f9fe');
    r.style.setProperty('--border', '#dde5f5');
    r.style.setProperty('--text-primary', '#0f1c3f');
    r.style.setProperty('--text-secondary', '#4a5f8a');
    r.style.setProperty('--text-muted', '#8fa3c8');
    r.style.setProperty('--input-bg', '#ffffff');
    r.style.setProperty('--input-border', '#dde5f5');
    r.style.setProperty('--msg-ai-bg', '#ffffff');
    r.style.setProperty('--msg-ai-txt', '#0f1c3f');
    r.style.setProperty('--msg-ai-border', '#dde5f5');
    document.body.classList.remove('dark');
  }
}

async function requestPushPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}
function sendPushNotification(title, body) {
  if (Notification.permission==='granted' && document.hidden) new Notification(title, { body });
}
function exportTxt(thread) {
  const blob = new Blob([thread.messages.map(m=>`[${m.sender}]\n${m.text||''}\n`).join('\n')], {type:'text/plain'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${thread.title}.txt`; a.click(); URL.revokeObjectURL(a.href);
}
function exportPdf(thread) {
  const win = window.open('','_blank'); if (!win) return;
  const rows = thread.messages.map(m=>`<div style="margin-bottom:16px"><strong style="color:#2563eb;font-size:.75rem;text-transform:uppercase">${m.sender}</strong><p style="margin:4px 0;white-space:pre-wrap;color:#1a1a2e">${(m.text||'').replace(/</g,'&lt;')}</p></div>`).join('');
  win.document.write(`<!DOCTYPE html><html><head><title>${thread.title}</title><style>body{font-family:sans-serif;max-width:700px;margin:40px auto;padding:0 20px}h1{font-size:1.2rem;border-bottom:2px solid #2563eb;padding-bottom:8px;color:#0f1c3f}</style></head><body><h1>${thread.title}</h1>${rows}</body></html>`);
  win.document.close(); win.print();
}

// ── ICONS ────────────────────────────────────────────────────────
const N9Logo = ({size=40}) => h("svg",{width:size,height:size,viewBox:"0 0 100 100",style:{flexShrink:0,borderRadius:'22%'}},
  h("defs",null,h("linearGradient",{id:"n9g",x1:"0%",y1:"0%",x2:"100%",y2:"100%"},h("stop",{offset:"0%",stopColor:"var(--accent)"}),h("stop",{offset:"100%",stopColor:"#6d28d9"}))),
  h("rect",{width:100,height:100,rx:26,fill:"url(#n9g)"}),
  h("path",{d:"M32 68V32L50 50L68 32V68",stroke:"white",strokeWidth:9,strokeLinecap:"round",strokeLinejoin:"round",fill:"none"}));
const Ico = (d,extra={}) => h("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",...extra},
  Array.isArray(d)?d.map((p,i)=>h(p[0],{key:i,...p[1]})):h(d[0],d[1]));
const SendIcon    = ()=>h("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"white",strokeWidth:2.5,strokeLinecap:"round",strokeLinejoin:"round"},h("line",{x1:"22",y1:"2",x2:"11",y2:"13"}),h("polygon",{points:"22 2 15 22 11 13 2 9 22 2",fill:"white",stroke:"none"}));
const UploadIcon  = ()=>h("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),h("polyline",{points:"17 8 12 3 7 8"}),h("line",{x1:"12",y1:"3",x2:"12",y2:"15"}));
const AudioIcon   = ()=>h("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("path",{d:"M9 18V5l12-2v13"}),h("circle",{cx:"6",cy:"18",r:"3"}),h("circle",{cx:"18",cy:"16",r:"3"}));
const MicIcon     = ({active})=>h("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:active?"#ef4444":"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("rect",{x:"9",y:"2",width:"6",height:"11",rx:"3"}),h("path",{d:"M19 10v2a7 7 0 0 1-14 0v-2"}),h("line",{x1:"12",y1:"19",x2:"12",y2:"22"}),h("line",{x1:"8",y1:"22",x2:"16",y2:"22"}));
const CloseIcon   = ()=>h("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2.5,strokeLinecap:"round"},h("line",{x1:"18",y1:"6",x2:"6",y2:"18"}),h("line",{x1:"6",y1:"6",x2:"18",y2:"18"}));
const LogOutIcon  = ()=>h("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"}),h("polyline",{points:"16 17 21 12 16 7"}),h("line",{x1:"21",y1:"12",x2:"9",y2:"12"}));
const FileDocIcon = ()=>h("svg",{width:22,height:22,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round"},h("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),h("polyline",{points:"14 2 14 8 20 8"}));
const UserIcon    = ()=>h("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("path",{d:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"}),h("circle",{cx:"12",cy:"7",r:"4"}));
const CameraIcon  = ()=>h("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("path",{d:"M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"}),h("circle",{cx:"12",cy:"13",r:"4"}));
const TrashIcon   = ()=>h("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("polyline",{points:"3 6 5 6 21 6"}),h("path",{d:"M19 6l-1 14H6L5 6"}),h("path",{d:"M10 11v6"}),h("path",{d:"M14 11v6"}),h("path",{d:"M9 6V4h6v2"}));
const CheckIcon   = ()=>h("svg",{width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2.5,strokeLinecap:"round",strokeLinejoin:"round"},h("polyline",{points:"20 6 9 17 4 12"}));
const ArrowLeft   = ()=>h("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("line",{x1:"19",y1:"12",x2:"5",y2:"12"}),h("polyline",{points:"12 19 5 12 12 5"}));
const MoonIcon    = ()=>h("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("path",{d:"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"}));
const SunIcon     = ()=>h("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("circle",{cx:"12",cy:"12",r:"5"}),h("line",{x1:"12",y1:"1",x2:"12",y2:"3"}),h("line",{x1:"12",y1:"21",x2:"12",y2:"23"}),h("line",{x1:"4.22",y1:"4.22",x2:"5.64",y2:"5.64"}),h("line",{x1:"18.36",y1:"18.36",x2:"19.78",y2:"19.78"}),h("line",{x1:"1",y1:"12",x2:"3",y2:"12"}),h("line",{x1:"21",y1:"12",x2:"23",y2:"12"}),h("line",{x1:"4.22",y1:"19.78",x2:"5.64",y2:"18.36"}),h("line",{x1:"18.36",y1:"5.64",x2:"19.78",y2:"4.22"}));
const BellIcon    = ()=>h("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("path",{d:"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"}),h("path",{d:"M13.73 21a2 2 0 0 1-3.46 0"}));
const DownloadIcon= ()=>h("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"}),h("polyline",{points:"7 10 12 15 17 10"}),h("line",{x1:"12",y1:"15",x2:"12",y2:"3"}));
const EditIcon    = ()=>h("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("path",{d:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}),h("path",{d:"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"}));
const ChatIcon    = ()=>h("svg",{width:20,height:20,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"}));
const SparkIcon   = ()=>h("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("polygon",{points:"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"}));
const MoreIcon    = ()=>h("svg",{width:14,height:14,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("circle",{cx:"12",cy:"5",r:"1"}),h("circle",{cx:"12",cy:"12",r:"1"}),h("circle",{cx:"12",cy:"19",r:"1"}));
const ListIcon    = ()=>h("svg",{width:20,height:20,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("line",{x1:"8",y1:"6",x2:"21",y2:"6"}),h("line",{x1:"8",y1:"12",x2:"21",y2:"12"}),h("line",{x1:"8",y1:"18",x2:"21",y2:"18"}),h("line",{x1:"3",y1:"6",x2:"3.01",y2:"6"}),h("line",{x1:"3",y1:"12",x2:"3.01",y2:"12"}),h("line",{x1:"3",y1:"18",x2:"3.01",y2:"18"}));

// ─────────────────────────────────────────────────────────────────
// NEW FEATURE CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────────

// Groq models available for selection
const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile',              label: '🧠 LLaMA 3.3 70B',   desc: 'Précision maximale, raisonnement avancé' },
  { id: 'llama-3.1-8b-instant',                 label: '⚡ LLaMA 3.1 8B',    desc: 'Ultra-rapide, idéal pour l\'instant' },
  { id: 'gemma2-9b-it',                         label: '💎 Gemma 2 9B',      desc: 'Google DeepMind, multilingue' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: '🔭 LLaMA 4 Scout', desc: 'Vision + texte, multimodal' },
  { id: 'mixtral-8x7b-32768',                   label: '🌀 Mixtral 8x7B',   desc: 'Grande fenêtre de contexte 32k' },
];

const PROMPT_TEMPLATES = [
  { id: 't1', icon: '✍️', title: 'Rédaction pro',     prompt: 'Rédige un texte professionnel et structuré sur : ' },
  { id: 't2', icon: '🔬', title: 'Analyse critique',  prompt: 'Analyse de manière critique et détaillée : ' },
  { id: 't3', icon: '💡', title: 'Brainstorming',     prompt: 'Génère 10 idées créatives et originales pour : ' },
  { id: 't4', icon: '🐛', title: 'Debug code',        prompt: 'Analyse ce code, trouve les bugs et propose des corrections :\n\n```\n\n```' },
  { id: 't5', icon: '📧', title: 'Email pro',         prompt: 'Rédige un email professionnel pour : ' },
  { id: 't6', icon: '📊', title: 'Résumé',            prompt: 'Résume ce contenu en points clés structurés : ' },
  { id: 't7', icon: '🌐', title: 'Traduction FR→EN',  prompt: 'Traduis ce texte en anglais de façon naturelle : ' },
  { id: 't8', icon: '🎯', title: 'Plan d\'action',    prompt: 'Crée un plan d\'action détaillé étape par étape pour : ' },
];

const REACTIONS = ['👍','❤️','💡','⭐','🔖','😂'];

// Extra storage keys
function loadMemory()    { try { return JSON.parse(localStorage.getItem('n9_memory')||'[]'); } catch { return []; } }
function saveMemory(m)   { localStorage.setItem('n9_memory', JSON.stringify(m)); }
function loadDocs()      { try { return JSON.parse(localStorage.getItem('n9_docs')||'[]'); } catch { return []; } }
function saveDocs(d)     { localStorage.setItem('n9_docs', JSON.stringify(d)); }
function loadPinLock()   { try { return JSON.parse(localStorage.getItem('n9_pinlock')||'null'); } catch { return null; } }
function savePinLock(p)  { localStorage.setItem('n9_pinlock', JSON.stringify(p)); }
function loadStats()     { try { return JSON.parse(localStorage.getItem('n9_stats')||'{"msgs":0,"sessions":0,"chars":0,"startDate":""}'); } catch { return {msgs:0,sessions:0,chars:0,startDate:''}; } }
function saveStats(s)    { localStorage.setItem('n9_stats', JSON.stringify(s)); }
function bumpStats(chars){ const s=loadStats(); s.msgs++; s.chars+=chars; if(!s.startDate)s.startDate=new Date().toLocaleDateString('fr'); saveStats(s); }

// New icons
const SearchIcon  = ()=>h("svg",{width:16,height:16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("circle",{cx:"11",cy:"11",r:"8"}),h("line",{x1:"21",y1:"21",x2:"16.65",y2:"16.65"}));
const CopyIcon    = ()=>h("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("rect",{x:"9",y:"9",width:"13",height:"13",rx:"2",ry:"2"}),h("path",{d:"M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"}));
const PinIcon     = ()=>h("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("path",{d:"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"}),h("circle",{cx:"12",cy:"10",r:"3"}));
const ShareIcon   = ()=>h("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("circle",{cx:"18",cy:"5",r:"3"}),h("circle",{cx:"6",cy:"12",r:"3"}),h("circle",{cx:"18",cy:"19",r:"3"}),h("line",{x1:"8.59",y1:"13.51",x2:"15.42",y2:"17.49"}),h("line",{x1:"15.41",y1:"6.51",x2:"8.59",y2:"10.49"}));
const VolumeIcon  = ()=>h("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("polygon",{points:"11 5 6 9 2 9 2 15 6 15 11 19 11 5"}),h("path",{d:"M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"}));
const LockIcon    = ()=>h("svg",{width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("rect",{x:"3",y:"11",width:"18",height:"11",rx:"2",ry:"2"}),h("path",{d:"M7 11V7a5 5 0 0 1 10 0v4"}));
const ChartIcon   = ()=>h("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("line",{x1:"18",y1:"20",x2:"18",y2:"10"}),h("line",{x1:"12",y1:"20",x2:"12",y2:"4"}),h("line",{x1:"6",y1:"20",x2:"6",y2:"14"}),h("line",{x1:"2",y1:"20",x2:"22",y2:"20"}));
const BookIcon    = ()=>h("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("path",{d:"M4 19.5A2.5 2.5 0 0 1 6.5 17H20"}),h("path",{d:"M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"}));
const TemplIcon   = ()=>h("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}),h("polyline",{points:"14 2 14 8 20 8"}),h("line",{x1:"16",y1:"13",x2:"8",y2:"13"}),h("line",{x1:"16",y1:"17",x2:"8",y2:"17"}),h("polyline",{points:"10 9 9 9 8 9"}));
const ModelIcon   = ()=>h("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("circle",{cx:"12",cy:"12",r:"3"}),h("path",{d:"M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07M4.93 4.93a10 10 0 0 0 0 14.14M8.46 8.46a5 5 0 0 0 0 7.07"}));
const SaveIcon    = ()=>h("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("path",{d:"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"}),h("polyline",{points:"17 21 17 13 7 13 7 21"}),h("polyline",{points:"7 3 7 8 15 8"}));
const GlobeIcon   = ()=>h("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("circle",{cx:"12",cy:"12",r:"10"}),h("line",{x1:"2",y1:"12",x2:"22",y2:"12"}),h("path",{d:"M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"}));
const RegenIcon   = ()=>h("svg",{width:13,height:13,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("polyline",{points:"1 4 1 10 7 10"}),h("path",{d:"M3.51 15a9 9 0 1 0 .49-3.51"}));
const MemIcon     = ()=>h("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},h("path",{d:"M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12c0-2.76 1.12-5.26 2.93-7.07"}),h("path",{d:"M12 6v6l4 2"}));

// ─────────────────────────────────────────────────────────────────
// PIN LOCK SCREEN
// ─────────────────────────────────────────────────────────────────
const PinLockScreen = ({ onUnlock }) => {
  const [pin, setPin]     = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const stored = loadPinLock();

  const press = val => {
    if (pin.length >= 6) return;
    const next = pin + val;
    setPin(next);
    setError(false);
    if (next.length === (stored?.pin?.length || 4)) {
      if (next === stored?.pin) {
        setTimeout(() => onUnlock(), 150);
      } else {
        setShake(true);
        setError(true);
        setTimeout(() => { setPin(''); setShake(false); }, 700);
      }
    }
  };

  const dots = Array.from({ length: stored?.pin?.length || 4 }, (_, i) =>
    h("div", { key: i, className: `pin-dot${pin.length > i ? ' filled' : ''}${error ? ' error' : ''}` })
  );

  return h("div", { className: "pin-screen" },
    h("div", { className: "pin-logo-wrap" }, h(N9Logo, { size: 56 })),
    h("h2", { className: "pin-title" }, "N9chat Pro"),
    h("p", { className: "pin-sub" }, "Entrez votre code PIN"),
    h("div", { className: `pin-dots${shake ? ' shake' : ''}` }, ...dots),
    error && h("p", { className: "pin-error" }, "Code incorrect"),
    h("div", { className: "pin-grid" },
      [1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((k, i) =>
        h("button", {
          key: i,
          className: `pin-key${k === '' ? ' pin-key-empty' : ''}`,
          onClick: () => {
            if (k === '⌫') setPin(p => p.slice(0,-1));
            else if (k !== '') press(String(k));
          },
          disabled: k === ''
        }, k)
      )
    )
  );
};

// ─────────────────────────────────────────────────────────────────
// STATS SCREEN
// ─────────────────────────────────────────────────────────────────
const StatsScreen = ({ threads, onBack }) => {
  const stats = loadStats();
  const totalMsgs  = threads.reduce((a, t) => a + t.messages.length, 0);
  const totalChars = threads.reduce((a, t) => a + t.messages.reduce((b, m) => b + (m.text?.length||0), 0), 0);
  const langs      = { fr:'Français', en:'English', ar:'العربية', es:'Español', de:'Deutsch', pt:'Português' };
  const cards = [
    { label: 'Messages échangés', value: totalMsgs,              icon: '💬' },
    { label: 'Sessions créées',   value: threads.length,         icon: '📁' },
    { label: 'Caractères générés',value: totalChars.toLocaleString(), icon: '✍️' },
    { label: 'Depuis le',         value: stats.startDate || 'Aujourd\'hui', icon: '📅' },
  ];
  return h("div", { className: "profile-screen" },
    h("div", { className: "profile-header" },
      h("button", { className: "profile-back-btn", onClick: onBack }, h(ArrowLeft), h("span", null, "Retour")),
      h("h2", { className: "profile-title" }, "Statistiques"),
    ),
    h("div", { className: "profile-body custom-scrollbar" },
      h("div", { className: "stats-grid" },
        cards.map((c, i) =>
          h("div", { key: i, className: "stats-card" },
            h("span", { className: "stats-icon" }, c.icon),
            h("div", { className: "stats-value" }, c.value),
            h("div", { className: "stats-label" }, c.label)
          )
        )
      ),
      h("section", { className: "profile-section", style: { marginTop: '1.25rem' } },
        h("h3", { className: "profile-section-title" }, "Sessions"),
        threads.map(t => h("div", { key: t.id, className: "stats-thread-row" },
          h("span", { className: "stats-thread-name" }, t.title),
          h("span", { className: "stats-thread-count" }, t.messages.length + " msgs")
        ))
      )
    )
  );
};

// ─────────────────────────────────────────────────────────────────
// TEMPLATES SCREEN
// ─────────────────────────────────────────────────────────────────
const TemplatesScreen = ({ onSelect, onBack }) =>
  h("div", { className: "profile-screen" },
    h("div", { className: "profile-header" },
      h("button", { className: "profile-back-btn", onClick: onBack }, h(ArrowLeft), h("span", null, "Retour")),
      h("h2", { className: "profile-title" }, "Templates"),
    ),
    h("div", { className: "profile-body custom-scrollbar" },
      h("p", { style: { fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '1rem' } },
        "Appuyez sur un template pour l'insérer dans la zone de saisie."
      ),
      h("div", { className: "templates-grid" },
        PROMPT_TEMPLATES.map(t =>
          h("button", { key: t.id, className: "template-card", onClick: () => onSelect(t.prompt) },
            h("span", { className: "template-icon" }, t.icon),
            h("strong", { className: "template-title" }, t.title),
            h("span", { className: "template-preview" }, t.prompt.slice(0, 60) + '…')
          )
        )
      )
    )
  );

// ─────────────────────────────────────────────────────────────────
// DOCS SCREEN (Base documentaire)
// ─────────────────────────────────────────────────────────────────
const DocsScreen = ({ onBack }) => {
  const [docs, setDocs]   = useState(loadDocs());
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const addDoc = async e => {
    const file = e.target.files[0]; if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const newDoc = { id: Date.now().toString(), name: file.name, size: file.size, content: text.slice(0, 12000), date: new Date().toLocaleDateString('fr') };
      const next = [...docs, newDoc];
      setDocs(next); saveDocs(next);
    } catch(err) { alert('Fichier illisible'); }
    setLoading(false); e.target.value = '';
  };

  const removeDoc = id => { const next = docs.filter(d => d.id !== id); setDocs(next); saveDocs(next); };

  return h("div", { className: "profile-screen" },
    h("div", { className: "profile-header" },
      h("button", { className: "profile-back-btn", onClick: onBack }, h(ArrowLeft), h("span", null, "Retour")),
      h("h2", { className: "profile-title" }, "Base documentaire"),
    ),
    h("div", { className: "profile-body custom-scrollbar" },
      h("p", { style: { fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '1rem' } },
        "Ces documents sont injectés dans chaque conversation. L'IA les consulte pour ses réponses."
      ),
      h("button", { className: "profile-save-btn", style: { width: '100%', justifyContent: 'center', marginBottom: '1rem' }, onClick: () => fileRef.current?.click() },
        loading ? "Chargement…" : (h("span", null, "+ Ajouter un document"))
      ),
      h("input", { ref: fileRef, type: "file", style: { display: 'none' }, accept: ".txt,.md,.csv,.json,.py,.js,.html,.css,.xml", onChange: addDoc }),
      docs.length === 0
        ? h("div", { className: "docs-empty" }, h(BookIcon), h("p", null, "Aucun document. Ajoutez des fichiers .txt, .md, .json…"))
        : docs.map(d =>
            h("div", { key: d.id, className: "docs-item" },
              h(FileDocIcon),
              h("div", { className: "docs-meta" },
                h("span", { className: "docs-name" }, d.name),
                h("span", { className: "docs-info" }, fmtSize(d.size) + ' · ' + d.date)
              ),
              h("button", { className: "docs-remove", onClick: () => removeDoc(d.id) }, h(TrashIcon))
            )
          )
    )
  );
};

// ─────────────────────────────────────────────────────────────────
// MEMORY SCREEN
// ─────────────────────────────────────────────────────────────────
const MemoryScreen = ({ onBack }) => {
  const [mems, setMems] = useState(loadMemory());
  const [input, setInput] = useState('');

  const add = () => {
    if (!input.trim()) return;
    const next = [...mems, { id: Date.now().toString(), text: input.trim(), date: new Date().toLocaleDateString('fr') }];
    setMems(next); saveMemory(next); setInput('');
  };
  const remove = id => { const next = mems.filter(m => m.id !== id); setMems(next); saveMemory(next); };

  return h("div", { className: "profile-screen" },
    h("div", { className: "profile-header" },
      h("button", { className: "profile-back-btn", onClick: onBack }, h(ArrowLeft), h("span", null, "Retour")),
      h("h2", { className: "profile-title" }, "Mémoire IA"),
    ),
    h("div", { className: "profile-body custom-scrollbar" },
      h("p", { style: { fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '1rem' } },
        "Ces informations sont rappelées à l'IA dans chaque conversation."
      ),
      h("div", { className: "memory-input-row" },
        h("input", { className: "profile-input", style: { flex: 1 }, placeholder: "Ex: J'aime les réponses courtes", value: input, onChange: e => setInput(e.target.value), onKeyDown: e => e.key === 'Enter' && add() }),
        h("button", { className: "profile-save-btn", style: { marginLeft: '0.5rem' }, onClick: add }, "+ Ajouter")
      ),
      mems.length === 0
        ? h("div", { className: "docs-empty", style: { marginTop: '1rem' } }, h(MemIcon), h("p", null, "Aucune mémoire enregistrée."))
        : h("div", { style: { marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' } },
            mems.map(m =>
              h("div", { key: m.id, className: "docs-item" },
                h("div", { className: "docs-meta" },
                  h("span", { className: "docs-name" }, m.text),
                  h("span", { className: "docs-info" }, m.date)
                ),
                h("button", { className: "docs-remove", onClick: () => remove(m.id) }, h(TrashIcon))
              )
            )
          )
    )
  );
};

// ─────────────────────────────────────────────────────────────────
// SEARCH OVERLAY
// ─────────────────────────────────────────────────────────────────
const SearchOverlay = ({ threads, onClose, onJump }) => {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = q.trim().length < 2 ? [] : threads.flatMap(t =>
    t.messages
      .filter(m => m.text && m.text.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 3)
      .map(m => ({ tid: t.id, tTitle: t.title, msg: m }))
  ).slice(0, 20);

  return h("div", { className: "search-overlay", onClick: e => { if (e.target.className === 'search-overlay') onClose(); } },
    h("div", { className: "search-panel" },
      h("div", { className: "search-bar-row" },
        h(SearchIcon),
        h("input", { ref: inputRef, className: "search-input", placeholder: "Rechercher dans toutes les conversations…", value: q, onChange: e => setQ(e.target.value) }),
        h("button", { className: "search-close", onClick: onClose }, h(CloseIcon))
      ),
      h("div", { className: "search-results custom-scrollbar" },
        q.trim().length < 2
          ? h("p", { className: "search-hint" }, "Tapez au moins 2 caractères…")
          : results.length === 0
            ? h("p", { className: "search-hint" }, "Aucun résultat pour « " + q + " »")
            : results.map((r, i) =>
                h("div", { key: i, className: "search-result", onClick: () => { onJump(r.tid); onClose(); } },
                  h("span", { className: "search-result-session" }, r.tTitle),
                  h("p", { className: "search-result-text" },
                    r.msg.text.toLowerCase().indexOf(q.toLowerCase()) > 30
                      ? '…' + r.msg.text.slice(Math.max(0, r.msg.text.toLowerCase().indexOf(q.toLowerCase())-20), r.msg.text.toLowerCase().indexOf(q.toLowerCase())+80) + '…'
                      : r.msg.text.slice(0, 120) + (r.msg.text.length > 120 ? '…' : '')
                  )
                )
              )
      )
    )
  );
};

// ─────────────────────────────────────────────────────────────────
// SPLASH SCREEN
// ─────────────────────────────────────────────────────────────────
const SplashScreen = ({ onDone }) => {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1=setTimeout(()=>setPhase(1),200);
    const t2=setTimeout(()=>setPhase(2),900);
    const t3=setTimeout(()=>{setPhase(3);setTimeout(onDone,400);},1800);
    return ()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);};
  }, []);
  return h("div",{className:`splash${phase>=3?' splash-out':''}`},
    h("div",{className:`splash-logo${phase>=1?' visible':''}`},
      h(N9Logo,{size:80}),
      h("div",{className:`splash-text${phase>=2?' visible':''}`},
        h("h1",null,"N9chat Pro"),
        h("p",null,"Intelligence Analytique")
      )
    ),
    h("div",{className:`splash-dots${phase>=2?' visible':''}`},
      h("div",{className:"splash-dot"}),h("div",{className:"splash-dot"}),h("div",{className:"splash-dot"})
    )
  );
};

// ─────────────────────────────────────────────────────────────────
// INSTALL BANNER — Première visite, design premium
// ─────────────────────────────────────────────────────────────────
const InstallBanner = ({ onContinue, deferredPrompt }) => {
  const [phase, setPhase]       = useState(0);
  const [step, setStep]         = useState('main'); // 'main' | 'manual'
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled]   = useState(false);

  const isIOS     = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  const isMobile  = isIOS || isAndroid;

  useEffect(() => {
    const t = setTimeout(() => setPhase(1), 60);
    return () => clearTimeout(t);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setInstalled(true);
          setTimeout(onContinue, 1800);
          return;
        }
      } catch(e) {}
      setInstalling(false);
    }
    setStep('manual');
  };

  const features = [
    { icon: '⚡', title: 'Instantané', desc: 'Démarre en moins d\'une seconde, même hors ligne' },
    { icon: '📵', title: 'Hors ligne', desc: 'Accédez à vos conversations sans réseau' },
    { icon: '🔒', title: 'Privé', desc: 'Données 100% stockées sur votre appareil' },
    { icon: '📱', title: 'Natif', desc: 'Expérience identique à une vraie application' },
  ];

  // ── Écran après installation réussie ──
  if (installed) {
    return h("div", { className: "ib-screen visible" },
      h("div", { className: "ib-bg" },
        h("div", { className: "ib-orb ib-orb-1" }),
        h("div", { className: "ib-orb ib-orb-2" })
      ),
      h("div", { className: "ib-success" },
        h("div", { className: "ib-success-ring" }, "✓"),
        h("h2", { className: "ib-success-title" }, "Installation réussie !"),
        h("p",  { className: "ib-success-sub" }, "N9chat Pro est maintenant sur votre écran d'accueil.")
      )
    );
  }

  // ── Écran instructions manuelles ──
  if (step === 'manual') {
    return h("div", { className: `ib-screen${phase>=1?' visible':''}` },
      h("div", { className: "ib-bg" },
        h("div", { className: "ib-orb ib-orb-1" }),
        h("div", { className: "ib-orb ib-orb-2" })
      ),
      h("div", { className: "ib-manual" },
        h("div", { className: "ib-manual-icon" }, isIOS ? '🍎' : isAndroid ? '🤖' : '🖥️'),
        h("h2", { className: "ib-manual-title" }, "Installation manuelle"),
        h("p",  { className: "ib-manual-sub" },
          isIOS     ? "Safari requis pour l'installation sur iPhone / iPad" :
          isAndroid ? "Ouvrez Chrome ou Edge pour installer" :
          "Utilisez Chrome, Edge ou Brave sur ordinateur"
        ),
        h("ol", { className: "ib-steps" },
          ...(isIOS ? [
            h("li", { className: "ib-step" }, h("span", { className: "ib-step-num" }, "1"), h("span", null, "Appuyez sur ", h("strong", null, "Partager"), " ⬆️ en bas de Safari")),
            h("li", { className: "ib-step" }, h("span", { className: "ib-step-num" }, "2"), h("span", null, "Sélectionnez ", h("strong", null, "Sur l'écran d'accueil"))),
            h("li", { className: "ib-step" }, h("span", { className: "ib-step-num" }, "3"), h("span", null, "Appuyez sur ", h("strong", null, "Ajouter")))
          ] : isAndroid ? [
            h("li", { className: "ib-step" }, h("span", { className: "ib-step-num" }, "1"), h("span", null, "Ouvrez le menu ", h("strong", null, "⋮"), " du navigateur")),
            h("li", { className: "ib-step" }, h("span", { className: "ib-step-num" }, "2"), h("span", null, "Sélectionnez ", h("strong", null, "Ajouter à l'écran d'accueil"))),
            h("li", { className: "ib-step" }, h("span", { className: "ib-step-num" }, "3"), h("span", null, "Confirmez avec ", h("strong", null, "Ajouter")))
          ] : [
            h("li", { className: "ib-step" }, h("span", { className: "ib-step-num" }, "1"), h("span", null, "Cliquez sur l'icône ", h("strong", null, "⊕"), " dans la barre d'adresse")),
            h("li", { className: "ib-step" }, h("span", { className: "ib-step-num" }, "2"), h("span", null, "Cliquez sur ", h("strong", null, "Installer l'application")))
          ])
        ),
        h("div", { className: "ib-manual-actions" },
          h("button", { className: "ib-cta", onClick: onContinue }, "Accéder quand même →"),
          h("button", { className: "ib-back", onClick: () => setStep('main') }, "← Retour")
        )
      )
    );
  }

  // ── Écran principal ──
  return h("div", { className: `ib-screen${phase>=1?' visible':''}` },

    // Arrière-plan animé
    h("div", { className: "ib-bg" },
      h("div", { className: "ib-orb ib-orb-1" }),
      h("div", { className: "ib-orb ib-orb-2" }),
      h("div", { className: "ib-orb ib-orb-3" }),
      h("div", { className: "ib-grid" })
    ),

    h("div", { className: "ib-wrap" },

      // ── En-tête
      h("header", { className: "ib-header" },
        h("div", { className: "ib-header-logo" },
          h(N9Logo, { size: 28 }),
          h("span", null, "N9chat Pro")
        ),
        h("button", { className: "ib-header-skip", onClick: onContinue }, "Passer →")
      ),

      // ── Contenu central
      h("main", { className: "ib-main" },

        h("div", { className: "ib-logo-wrap" },
          h("div", { className: "ib-logo-glow" }),
          h(N9Logo, { size: 88 })
        ),

        h("div", { className: "ib-eyebrow" },
          h("span", { className: "ib-dot-green" }),
          "Application PWA — Sans store requis"
        ),

        h("h1", { className: "ib-title" },
          h("span", { className: "ib-title-main" }, "N9chat"),
          h("span", { className: "ib-title-accent" }, " Pro")
        ),

        h("p", { className: "ib-subtitle" },
          "Installez l'application directement sur votre écran d'accueil",
          isMobile && " pour une expérience native optimale."
        ),

        // Features grid
        h("div", { className: "ib-features" },
          features.map((f, i) =>
            h("div", { key: i, className: "ib-feature", style: { animationDelay: `${0.1 + i*0.06}s` } },
              h("span", { className: "ib-feature-icon" }, f.icon),
              h("div", { className: "ib-feature-text" },
                h("strong", null, f.title),
                h("span", null, f.desc)
              )
            )
          )
        ),

        // CTA
        h("div", { className: "ib-actions" },
          h("button", {
            className: `ib-cta${installing ? ' loading' : ''}`,
            onClick: handleInstall,
            disabled: installing
          },
            installing
              ? h("span", { className: "ib-spinner" })
              : h("span", { className: "ib-cta-icon" }, "⬇"),
            installing ? "Installation en cours…" : (
              isMobile ? "Ajouter à l'écran d'accueil" : "Installer l'application"
            )
          ),
          h("button", { className: "ib-skip", onClick: onContinue },
            "Continuer dans le navigateur"
          )
        )
      ),

      // ── Pied
      h("footer", { className: "ib-footer" },
        h("span", null, "Aucune donnée collectée"),
        h("span", { className: "ib-footer-sep" }, "·"),
        h("span", null, "100% local"),
        h("span", { className: "ib-footer-sep" }, "·"),
        h("span", null, "Standard Web ouvert")
      )
    )
  );
};

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
const fileToBase64 = f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f);});
const fmtSize = b=>b<1024?b+' o':b<1048576?(b/1024).toFixed(1)+' Ko':(b/1048576).toFixed(1)+' Mo';
const ACCEPT_IMAGES="image/jpeg,image/png,image/gif,image/webp,image/svg+xml";
const ACCEPT_AUDIO ="audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg,audio/flac,audio/x-m4a,audio/*";
const ACCEPT_DOCS  =".pdf,.txt,.md,.csv,.json,.py,.js,.ts,.html,.css,.xml";

// ─────────────────────────────────────────────────────────────────
// ATTACHMENT BAR
// ─────────────────────────────────────────────────────────────────
const AttachmentBar = ({attachments,onRemove})=>{
  if(!attachments.length)return null;
  return h("div",{className:"attachment-bar"},
    attachments.map((att,i)=>h("div",{key:i,className:"att-chip"},
      att.type==='image'?h("img",{src:att.dataUrl,className:"att-thumb",alt:att.name}):h("div",{className:`att-icon-box ${att.type}`},att.type==='audio'?h(AudioIcon):h(FileDocIcon)),
      h("div",{className:"att-meta"},h("span",{className:"att-name"},att.name),h("span",{className:"att-size"},fmtSize(att.size))),
      h("button",{className:"att-remove",onClick:()=>onRemove(i)},h(CloseIcon))
    ))
  );
};

// ─────────────────────────────────────────────────────────────────
// MSG ATTACHMENTS
// ─────────────────────────────────────────────────────────────────
const MsgAttachments = ({atts})=>{
  if(!atts||!atts.length)return null;
  return h("div",{className:"msg-atts"},
    atts.map((a,i)=>a.type==='image'&&a.dataUrl
      ?h("img",{key:i,src:a.dataUrl,className:"msg-img",alt:a.name})
      :h("div",{key:i,className:`msg-file-chip ${a.type}`},a.type==='audio'?h(AudioIcon):h(FileDocIcon),h("span",null,a.name))
    )
  );
};

// ─────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE — with copy, reactions, pin, TTS, translate, share
// ─────────────────────────────────────────────────────────────────
const MessageBubble = ({msg, onReact, onPin, onRegen, onTranslate, fontSize})=>{
  const isSent=msg.type==="sent";
  const ref=useRef(null);
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied]           = useState(false);
  const [speaking, setSpeaking]       = useState(false);

  useEffect(()=>{
    if(!isSent&&ref.current&&window.renderMathInElement)
      renderMathInElement(ref.current,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});
  },[msg.text]);

  const copyMsg = () => {
    navigator.clipboard?.writeText(msg.text||'').then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1500);});
  };

  const speakMsg = () => {
    if (!window.speechSynthesis) return;
    if (speaking) { speechSynthesis.cancel(); setSpeaking(false); return; }
    const utt = new SpeechSynthesisUtterance(msg.text||'');
    utt.lang = 'fr-FR';
    utt.onend = () => setSpeaking(false);
    setSpeaking(true);
    speechSynthesis.speak(utt);
  };

  const shareMsg = () => {
    const text = `[${msg.sender}]\n${msg.text||''}`;
    if (navigator.share) { navigator.share({ title: 'N9chat Pro', text }); }
    else { navigator.clipboard?.writeText(text); alert('Message copié dans le presse-papier'); }
  };

  return h("div", {
    className: `message-row ${isSent?'sent':'received'}`,
    onMouseEnter: ()=>setShowActions(true),
    onMouseLeave: ()=>setShowActions(false)
  },
    h("div",{className:"message-inner"},
      h("div",{className:`msg-avatar ${isSent?'user':'ai'}`},msg.sender[0].toUpperCase()),
      h("div",{className:"message-content-wrap"},
        h("span",{className:"msg-sender"},
          msg.sender,
          msg.pinned && h("span",{className:"pin-badge"},"📌")
        ),
        h("div",{className:`msg-bubble ${isSent?'sent':'received'}`,style:{fontSize:(fontSize||14)+'px'}},
          h(MsgAttachments,{atts:msg.attachments}),
          msg.text&&(isSent?h("span",null,msg.text):h("div",{ref,className:"prose-content",dangerouslySetInnerHTML:{__html:marked.parse(msg.text)}}))
        ),

        // Reactions display
        msg.reactions&&Object.keys(msg.reactions).length>0&&h("div",{className:"msg-reactions"},
          Object.entries(msg.reactions).map(([emoji,count])=>
            h("span",{key:emoji,className:"reaction-badge",onClick:()=>onReact(msg.id,emoji)},emoji,' ',count)
          )
        ),

        // Action toolbar (hover)
        showActions && h("div",{className:`msg-actions ${isSent?'sent':'received'}`},
          h("button",{className:"msg-action-btn",title:"Copier",onClick:copyMsg},copied?h(CheckIcon):h(CopyIcon)),
          !isSent&&h("button",{className:"msg-action-btn",title:"Lire à voix haute",onClick:speakMsg},h(VolumeIcon)),
          !isSent&&h("button",{className:"msg-action-btn",title:"Traduire",onClick:()=>onTranslate(msg)},h(GlobeIcon)),
          !isSent&&h("button",{className:"msg-action-btn",title:"Regénérer",onClick:()=>onRegen(msg)},h(RegenIcon)),
          h("button",{className:"msg-action-btn",title:"Partager",onClick:shareMsg},h(ShareIcon)),
          h("button",{className:"msg-action-btn",title:"Épingler",onClick:()=>onPin(msg.id)},h(PinIcon)),
          h("div",{className:"msg-reaction-picker"},
            REACTIONS.map(e=>h("button",{key:e,className:"reaction-pick",onClick:()=>onReact(msg.id,e)},e))
          )
        )
      )
    )
  );
};

// ─────────────────────────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────────────────────────
const TypingIndicator = ({label})=>h("div",{className:"typing-row"},
  h("div",{className:"typing-dots"},h("div",{className:"typing-dot"}),h("div",{className:"typing-dot"}),h("div",{className:"typing-dot"})),
  label&&h("span",{className:"typing-label"},label)
);

// ─────────────────────────────────────────────────────────────────
// SUGGESTIONS BAR
// ─────────────────────────────────────────────────────────────────
const SuggestionsBar = ({onSelect,hasMessages})=>{
  if(!hasMessages)return null;
  return h("div",{className:"suggestions-bar"},
    QUICK_SUGGESTIONS.map((s,i)=>h("button",{key:i,className:"suggestion-chip",onClick:()=>onSelect(s)},s))
  );
};

// ─────────────────────────────────────────────────────────────────
// THREAD CONTEXT MENU
// ─────────────────────────────────────────────────────────────────
const ThreadMenu = ({onRename,onDelete,onExportTxt,onExportPdf,onClose})=>{
  const ref=useRef(null);
  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))onClose();};
    setTimeout(()=>document.addEventListener('click',h),0);
    return ()=>document.removeEventListener('click',h);
  },[]);
  return h("div",{ref,className:"thread-menu"},
    h("button",{className:"tmenu-item",onClick:onRename},h(EditIcon),"Renommer"),
    h("button",{className:"tmenu-item",onClick:onExportTxt},h(DownloadIcon),"Exporter TXT"),
    h("button",{className:"tmenu-item",onClick:onExportPdf},h(DownloadIcon),"Exporter PDF"),
    h("div",{className:"tmenu-sep"}),
    h("button",{className:"tmenu-item danger",onClick:onDelete},h(TrashIcon),"Supprimer")
  );
};

// ─────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────
const LoginScreen = ({onLogin})=>{
  const [name,setName]=useState("");
  const [phase,setPhase]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setPhase(1),60);return()=>clearTimeout(t);},[]);
  const submit=e=>{e.preventDefault();if(name.trim())onLogin(name.trim());};
  return h("div",{className:"login-screen"},
    h("div",{className:"login-bg"},
      h("div",{className:"login-orb login-orb-1"}),
      h("div",{className:"login-orb login-orb-2"})
    ),
    h("div",{className:`login-panel${phase>=1?' visible':''}`},
      h("div",{className:"login-left"},
        h("div",{className:"login-brand"},
          h(N9Logo,{size:48}),
          h("div",null,
            h("h2",{className:"login-brand-name"},"N9chat Pro"),
            h("p",{className:"login-brand-sub"},"Intelligence Analytique")
          )
        ),
        h("div",{className:"login-left-body"},
          h("h1",{className:"login-headline"},"Bienvenue sur votre assistant IA"),
          h("p",{className:"login-desc"},"Analysez, discutez, créez. Une intelligence artificielle avancée accessible depuis n'importe quel appareil."),
          h("div",{className:"login-pills"},
            h("span",{className:"login-pill"},"🔬 Analyse IA"),
            h("span",{className:"login-pill"},"📎 Vision"),
            h("span",{className:"login-pill"},"🎙️ Vocal"),
            h("span",{className:"login-pill"},"📵 Hors ligne")
          )
        ),
        h("p",{className:"login-left-footer"},"© 2025 N9chat Pro · Propulsé par Groq")
      ),
      h("div",{className:"login-right"},
        h("div",{className:"login-form-wrap"},
          h("p",{className:"login-form-eyebrow"},"Accès sécurisé"),
          h("h3",{className:"login-form-title"},"Ouvrir une session"),
          h("p",{className:"login-form-sub"},"Entrez votre identifiant pour commencer"),
          h("form",{onSubmit:submit,className:"login-form"},
            h("div",{className:"login-field"},
              h("label",{className:"login-label"},"Identifiant opérateur"),
              h("input",{
                className:"login-input",
                type:"text",
                placeholder:"Ex: Jean_Dupont",
                value:name,
                onChange:e=>setName(e.target.value),
                required:true,
                autoFocus:true
              })
            ),
            h("button",{type:"submit",className:"login-btn",disabled:!name.trim()},
              h("span",null,"Ouvrir la session"),
              h("span",{className:"login-btn-arrow"},"→")
            )
          ),
          h("p",{className:"login-form-note"},"Aucun mot de passe requis · Données locales uniquement")
        )
      )
    )
  );
};

// ─────────────────────────────────────────────────────────────────
// PROFILE SCREEN — enriched with all new settings
// ─────────────────────────────────────────────────────────────────
const ProfileScreen = ({profile,onSave,onBack,onGoStats,onGoDocs,onGoMemory,onExport,onImport})=>{
  const [form,setForm]=useState({...profile});
  const [saved,setSaved]=useState(false);
  const [pinMode,setPinMode]=useState(false);
  const [newPin,setNewPin]=useState('');
  const avatarRef=useRef(null);
  const importRef=useRef(null);
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const pickAvatar=async e=>{const f=e.target.files[0];if(!f)return;set('avatar',await fileToBase64(f));e.target.value='';};
  const handleSave=()=>{onSave(form);setSaved(true);setTimeout(()=>setSaved(false),2000);};
  const deleteWhisper=()=>{const ks=Object.keys(localStorage).filter(k=>k.startsWith('n9_whisper_'));ks.forEach(k=>localStorage.removeItem(k));alert(`${ks.length} transcription(s) Whisper supprimée(s).`);};
  const requestNotif=async()=>{const ok=await requestPushPermission();alert(ok?'✅ Notifications activées !':'❌ Permission refusée.');};
  const initials=(form.pseudo||form.name||'?')[0].toUpperCase();

  const savePin=()=>{
    if(newPin.length<4){alert('PIN minimum 4 chiffres');return;}
    savePinLock({pin:newPin});setNewPin('');setPinMode(false);alert('✅ Code PIN activé !');
  };
  const removePin=()=>{savePinLock(null);alert('PIN supprimé.');};

  return h("div",{className:"profile-screen"},
    h("div",{className:"profile-header"},
      h("button",{className:"profile-back-btn",onClick:onBack},h(ArrowLeft),h("span",null,"Retour")),
      h("h2",{className:"profile-title"},"Mon Profil"),
      h("button",{className:`profile-save-btn ${saved?'saved':''}`,onClick:handleSave},saved?h(CheckIcon):null,saved?"Enregistré":"Sauvegarder")
    ),
    h("div",{className:"profile-body custom-scrollbar"},

      // Avatar
      h("section",{className:"profile-section"},
        h("div",{className:"profile-avatar-wrapper"},
          h("div",{className:"profile-avatar-ring"},
            form.avatar?h("img",{src:form.avatar,className:"profile-avatar-img",alt:"avatar"}):h("div",{className:"profile-avatar-placeholder"},initials)
          ),
          h("div",{className:"profile-avatar-actions"},
            h("button",{className:"profile-avatar-btn",onClick:()=>avatarRef.current?.click()},h(CameraIcon),"Photo"),
            form.avatar&&h("button",{className:"profile-avatar-btn danger",onClick:()=>set('avatar',null)},h(TrashIcon),"Suppr.")
          ),
          h("input",{ref:avatarRef,type:"file",accept:"image/*",style:{display:'none'},onChange:pickAvatar})
        )
      ),

      // Identity
      h("section",{className:"profile-section"},
        h("h3",{className:"profile-section-title"},"Identité"),
        h("div",{className:"profile-field"},h("label",{className:"profile-label"},"Nom complet"),h("input",{className:"profile-input",type:"text",placeholder:"Ex: Jean Dupont",value:form.name,onChange:e=>set('name',e.target.value),maxLength:60})),
        h("div",{className:"profile-field"},h("label",{className:"profile-label"},"Pseudo / Alias"),h("input",{className:"profile-input",type:"text",placeholder:"Ex: JD_Pro",value:form.pseudo,onChange:e=>set('pseudo',e.target.value),maxLength:30}),h("span",{className:"profile-hint"},"Affiché dans les messages")),
        h("div",{className:"profile-field"},h("label",{className:"profile-label"},"Bio / Description"),h("textarea",{className:"profile-textarea",placeholder:"Quelques mots sur vous…",value:form.bio,onChange:e=>set('bio',e.target.value),rows:3,maxLength:200}),h("span",{className:"profile-hint"},`${form.bio.length}/200`))
      ),

      // Quick nav cards
      h("section",{className:"profile-section"},
        h("h3",{className:"profile-section-title"},"Outils"),
        h("div",{className:"profile-nav-grid"},
          h("button",{className:"profile-nav-card",onClick:onGoMemory},h(MemIcon),h("span",null,"Mémoire IA")),
          h("button",{className:"profile-nav-card",onClick:onGoDocs},h(BookIcon),h("span",null,"Documents")),
          h("button",{className:"profile-nav-card",onClick:onGoStats},h(ChartIcon),h("span",null,"Statistiques")),
        )
      ),

      // AI Persona
      h("section",{className:"profile-section"},
        h("h3",{className:"profile-section-title"},"Mode assistant IA"),
        h("div",{className:"persona-grid"},
          AI_PERSONAS.map(p=>h("button",{key:p.id,className:`persona-btn ${form.persona===p.id?'active':''}`,onClick:()=>set('persona',p.id)},
            h("span",{className:"persona-label"},p.label),h("span",{className:"persona-desc"},p.desc)
          ))
        )
      ),

      // Model selector
      h("section",{className:"profile-section"},
        h("h3",{className:"profile-section-title"},"Modèle IA par défaut"),
        h("div",{className:"profile-field"},
          h("select",{className:"profile-input",value:form.selectedModel||'llama-3.3-70b-versatile',onChange:e=>set('selectedModel',e.target.value)},
            GROQ_MODELS.map(m=>h("option",{key:m.id,value:m.id},m.label+' — '+m.desc))
          )
        )
      ),

      // Language
      h("section",{className:"profile-section"},
        h("h3",{className:"profile-section-title"},"Langue préférée"),
        h("div",{className:"profile-lang-grid"},
          LANGUAGES.map(lang=>h("button",{key:lang.code,className:`profile-lang-btn ${form.language===lang.code?'active':''}`,onClick:()=>set('language',lang.code)},lang.label))
        )
      ),

      // Appearance + font size
      h("section",{className:"profile-section"},
        h("h3",{className:"profile-section-title"},"Apparence"),
        h("div",{className:"profile-field toggle-field"},
          h("div",null,h("label",{className:"profile-label"},"Mode sombre"),h("span",{className:"profile-hint"},"Thème nuit")),
          h("button",{className:`toggle-btn ${form.darkMode?'on':''}`,onClick:()=>set('darkMode',!form.darkMode)},h("span",{className:"toggle-knob"},form.darkMode?h(MoonIcon):h(SunIcon)))
        ),
        h("div",{className:"profile-field"},
          h("label",{className:"profile-label"},"Taille du texte — ",form.fontSize||14,"px"),
          h("input",{type:"range",min:11,max:20,step:1,value:form.fontSize||14,className:"profile-range",onChange:e=>set('fontSize',parseInt(e.target.value))})
        ),
        h("div",{className:"profile-theme-grid",style:{marginTop:'1rem'}},
          THEMES.map(t=>h("button",{key:t.id,className:`profile-theme-swatch ${form.theme===t.id?'active':''}`,onClick:()=>set('theme',t.id),style:{'--swatch-color':t.accent},title:t.label},h("div",{className:"profile-swatch-dot"}),h("span",null,t.label)))
        )
      ),

      // Sounds & Notifs
      h("section",{className:"profile-section"},
        h("h3",{className:"profile-section-title"},"Sons & Notifications"),
        h("div",{className:"profile-field toggle-field"},
          h("div",null,h("label",{className:"profile-label"},"Sons sur réponse"),h("span",{className:"profile-hint"},"Bip doux quand l'IA répond")),
          h("button",{className:`toggle-btn ${form.soundEnabled?'on':''}`,onClick:()=>set('soundEnabled',!form.soundEnabled)},h("span",{className:"toggle-knob"}))
        ),
        h("div",{className:"profile-field toggle-field"},
          h("div",null,h("label",{className:"profile-label"},"Vibration"),h("span",{className:"profile-hint"},"Retour haptique sur mobile")),
          h("button",{className:`toggle-btn ${form.vibrateEnabled?'on':''}`,onClick:()=>set('vibrateEnabled',!form.vibrateEnabled)},h("span",{className:"toggle-knob"}))
        ),
        h("button",{className:"profile-notif-btn",onClick:requestNotif},h(BellIcon),"Activer les notifications push")
      ),

      // PIN Lock
      h("section",{className:"profile-section"},
        h("h3",{className:"profile-section-title"},"Sécurité — Code PIN"),
        loadPinLock()
          ? h("div",null,
              h("p",{style:{fontSize:'0.72rem',color:'var(--text-secondary)',marginBottom:'0.75rem'}},"✅ Code PIN actif. L'app se verrouille au prochain démarrage."),
              h("button",{className:"profile-danger-btn",onClick:removePin},h(TrashIcon),"Supprimer le PIN")
            )
          : pinMode
            ? h("div",{className:"pin-setup"},
                h("p",{style:{fontSize:'0.72rem',color:'var(--text-secondary)',marginBottom:'0.5rem'}},"Choisissez un code PIN (4-6 chiffres)"),
                h("input",{className:"profile-input",type:"password",inputMode:"numeric",pattern:"[0-9]*",maxLength:6,placeholder:"Ex: 1234",value:newPin,onChange:e=>setNewPin(e.target.value.replace(/\D/g,''))}),
                h("div",{style:{display:'flex',gap:'0.5rem',marginTop:'0.5rem'}},
                  h("button",{className:"profile-save-btn",onClick:savePin},h(CheckIcon),"Activer"),
                  h("button",{className:"profile-back-btn",onClick:()=>{setPinMode(false);setNewPin('');}},h(CloseIcon),"Annuler")
                )
              )
            : h("button",{className:"profile-notif-btn",onClick:()=>setPinMode(true)},h(LockIcon),"Configurer un code PIN")
      ),

      // Backup
      h("section",{className:"profile-section"},
        h("h3",{className:"profile-section-title"},"Sauvegarde & Restauration"),
        h("div",{style:{display:'flex',gap:'0.5rem',flexWrap:'wrap'}},
          h("button",{className:"profile-save-btn",onClick:onExport},h(SaveIcon),"Exporter"),
          h("button",{className:"profile-back-btn",onClick:()=>importRef.current?.click()},h(DownloadIcon),"Importer"),
          h("input",{ref:importRef,type:"file",accept:".json",style:{display:'none'},onChange:onImport})
        ),
        h("p",{className:"profile-hint",style:{marginTop:'0.5rem'}},"Export complet : conversations, profil, mémoire, documents")
      ),

      // Danger
      h("section",{className:"profile-section danger-zone"},
        h("h3",{className:"profile-section-title danger"},"Zone de gestion"),
        h("div",{className:"profile-danger-card"},
          h("div",{className:"profile-danger-info"},h("p",{className:"profile-danger-title"},"Transcriptions Whisper"),h("p",{className:"profile-danger-desc"},"Supprime les transcriptions audio mémorisées localement")),
          h("button",{className:"profile-danger-btn",onClick:deleteWhisper},h(TrashIcon),"Supprimer")
        )
      )
    )
  );
};
// ─────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────
const DEFAULT_THREAD = {
  id:'1', title:'Analyse Principale',
  messages:[{id:0,sender:"N9chat",type:"received",text:
    "Système **N9-PRO Intelligence** opérationnel.\n\n"+
    "📎 **Image / Fichier** → analyse visuelle et documentaire\n"+
    "🎙️ **Micro live** → dictée en temps réel\n"+
    "🎵 **Audio Whisper** → transcription automatique\n"+
    "⚡ **Suggestions** → tap ⭐ pour des questions rapides\n"+
    "🌙 **Mode sombre** → toggle haut à droite\n"+
    "👤 **Profil** → personnalise ton assistant IA, thème et sons"
  }]
};

const App = () => {
  const [showSplash,setShowSplash]     = useState(true);
  const [showInstall,setShowInstall]   = useState(false);
  const [isLoggedIn,setIsLoggedIn]     = useState(false);
  const [pinLocked,setPinLocked]       = useState(()=>!!loadPinLock());
  const [username,setUsername]         = useState("");
  const [profile,setProfile]           = useState(DEFAULT_PROFILE);
  const [view,setView]                 = useState('chat'); // chat|profile|stats|templates|docs|memory
  const [inputValue,setInputValue]     = useState("");
  const [isTyping,setIsTyping]         = useState(false);
  const [typingLabel,setTypingLabel]   = useState("");
  const [attachments,setAttachments]   = useState([]);
  const [isRecording,setIsRecording]   = useState(false);
  const [micOk,setMicOk]               = useState(false);
  const [showSuggestions,setShowSuggestions] = useState(false);
  const [showSearch,setShowSearch]     = useState(false);
  const [showTemplates,setShowTemplates] = useState(false);
  const [menuThreadId,setMenuThreadId] = useState(null);
  const [renamingId,setRenamingId]     = useState(null);
  const [renameVal,setRenameVal]       = useState("");
  const [isMobile,setIsMobile]         = useState(window.innerWidth<768);
  const [mobileTab,setMobileTab]       = useState('chat');
  const [threads,setThreads]           = useState([DEFAULT_THREAD]);
  const [currentThreadId,setCurrentThreadId] = useState('1');
  const [isOnline,setIsOnline]         = useState(navigator.onLine);
  const [showScrollBtn,setShowScrollBtn] = useState(false);
  const deferredPromptRef              = useRef(null);

  const scrollRef=useRef(null), textareaRef=useRef(null), fileInputRef=useRef(null);
  const audioInputRef=useRef(null), recognRef=useRef(null), renameRef=useRef(null);

  const currentThread = threads.find(t=>t.id===currentThreadId)||threads[0];

  // ── Init ──
  useEffect(()=>{
    const savedUser=localStorage.getItem('n9_pro_user');
    const savedProfile=loadProfile();
    const savedThreads=loadThreads();
    if(savedUser){setUsername(savedUser);setIsLoggedIn(true);}
    if(savedProfile){setProfile(savedProfile);applyTheme(savedProfile.theme,savedProfile.darkMode);}
    if(savedThreads&&savedThreads.length){setThreads(savedThreads);setCurrentThreadId(savedThreads[savedThreads.length-1].id);}
    setMicOk(!!(window.SpeechRecognition||window.webkitSpeechRecognition));
    const onResize=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener('resize',onResize);
    const goOnline=()=>setIsOnline(true);
    const goOffline=()=>setIsOnline(false);
    window.addEventListener('online',goOnline);
    window.addEventListener('offline',goOffline);
    // Capture PWA install prompt
    const onBeforeInstall = e => { e.preventDefault(); deferredPromptRef.current = e; };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return ()=>{
      window.removeEventListener('resize',onResize);
      window.removeEventListener('online',goOnline);
      window.removeEventListener('offline',goOffline);
      window.removeEventListener('beforeinstallprompt',onBeforeInstall);
    };
  },[]);

  useEffect(()=>{saveThreads(threads);},[threads]);
  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTo({top:scrollRef.current.scrollHeight,behavior:'smooth'});},[currentThread.messages,isTyping]);
  useEffect(()=>{if(renamingId&&renameRef.current)renameRef.current.focus();},[renamingId]);

  // ── Scroll-to-bottom button visibility ──
  useEffect(()=>{
    const el=scrollRef.current;
    if(!el)return;
    const onScroll=()=>{
      const distFromBottom=el.scrollHeight-el.scrollTop-el.clientHeight;
      setShowScrollBtn(distFromBottom>120);
    };
    el.addEventListener('scroll',onScroll,{passive:true});
    return()=>el.removeEventListener('scroll',onScroll);
  },[currentThreadId]);

  const scrollToBottom=()=>{
    if(scrollRef.current)scrollRef.current.scrollTo({top:scrollRef.current.scrollHeight,behavior:'smooth'});
  };

  const addMsg=useCallback((tid,msg)=>{
    setThreads(prev=>prev.map(t=>t.id===tid?{...t,messages:[...t.messages,msg]}:t));
  },[]);

  // Limite le texte à 8000 caractères — protection contre les inputs excessifs
  const MAX_INPUT = 8000;
  const handleInputChange=e=>{
    const val = e.target.value.slice(0, MAX_INPUT);
    setInputValue(val);
    const el=e.target;el.style.height='auto';el.style.height=Math.min(el.scrollHeight,140)+'px';
  };
  const resetInput=()=>{setInputValue("");if(textareaRef.current)textareaRef.current.style.height='auto';};

  // Limite la taille des fichiers à 25 Mo
  const MAX_FILE_SIZE = 25 * 1024 * 1024;
  const processFiles=async(files,forceType=null)=>{
    const validFiles = Array.from(files).filter(f => {
      if (f.size > MAX_FILE_SIZE) {
        alert(`Fichier trop volumineux (max 25 Mo) : ${f.name}`);
        return false;
      }
      return true;
    });
    if (!validFiles.length) return;
    const items=await Promise.all(validFiles.map(async file=>{
      const dataUrl=await fileToBase64(file);
      const type=forceType||(file.type.startsWith('image/')?'image':file.type.startsWith('audio/')?'audio':'doc');
      return{name:file.name,size:file.size,type,mimeType:file.type,dataUrl,file};
    }));
    setAttachments(prev=>[...prev,...items]);
  };
  const onFileChange =async e=>{await processFiles(e.target.files);e.target.value='';};
  const onAudioChange=async e=>{await processFiles(e.target.files,'audio');e.target.value='';};
  const removeAtt=i=>setAttachments(prev=>prev.filter((_,idx)=>idx!==i));

  const toggleMic=()=>{
    if(isRecording){recognRef.current?.stop();setIsRecording(false);return;}
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR)return alert("Microphone non supporté sur ce navigateur.");
    const rec=new SR();rec.lang=profile.language||'fr-FR';rec.continuous=true;rec.interimResults=true;
    let final=inputValue;
    rec.onresult=e=>{
      let interim='';
      for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)final+=t+' ';else interim=t;}
      setInputValue(final+interim);
      if(textareaRef.current){textareaRef.current.style.height='auto';textareaRef.current.style.height=Math.min(textareaRef.current.scrollHeight,140)+'px';}
    };
    rec.onerror=()=>setIsRecording(false);rec.onend=()=>setIsRecording(false);
    recognRef.current=rec;rec.start();setIsRecording(true);
  };

  const transcribeAudio=async att=>{
    const fd=new FormData();
    fd.append('file',att.file,att.name);fd.append('model',WHISPER_MODEL);fd.append('response_format','text');fd.append('language',profile.language||'fr');
    const res=await fetch("https://api.groq.com/openai/v1/audio/transcriptions",{method:"POST",headers:{"Authorization":`Bearer ${GROQ_API_KEY}`},body:fd});
    return(await res.text()).trim();
  };

  const buildSysPrompt=name=>{
    const pmap={expert:"Analytique, précis, structuré. Utilise titres, listes et tableaux.",coach:"Motivant et bienveillant. Propose des étapes concrètes.",creative:"Imaginatif et original. Métaphores et exemples vivants.",concise:"Ultra-concis. Maximum 3 phrases. Va à l'essentiel.",socratic:"Guide par des questions ciblées."};
    const persona=AI_PERSONAS.find(p=>p.id===profile.persona)||AI_PERSONAS[0];
    const base=profile.bio?`Tu es N9chat Pro (${persona.label}). Utilisateur: ${name}. Bio: ${profile.bio}. Langue: ${profile.language}.`:`Tu es N9chat Pro (${persona.label}). Utilisateur: ${name}. Langue: ${profile.language}.`;
    const memories = loadMemory();
    const memStr = memories.length > 0 ? `\nMémoire utilisateur: ${memories.map(m=>m.text).join('; ')}.` : '';
    const docs = loadDocs();
    const docStr = docs.length > 0 ? `\nDocuments de référence:\n${docs.map(d=>`[${d.name}]: ${d.content.slice(0,2000)}`).join('\n---\n')}` : '';
    return`${base} ${pmap[profile.persona]||''} Utilise Markdown et LaTeX ($...$).${memStr}${docStr}`;
  };

  const autoSummarize=async(tid,msgs)=>{
    const thread=threads.find(t=>t.id===tid);
    if(!thread||thread.summarized||msgs.length<8)return;
    try{
      const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Authorization":`Bearer ${GROQ_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:TEXT_MODEL,messages:[{role:"system",content:"Génère un résumé court (2-3 phrases max) de cette conversation."},{role:"user",content:msgs.map(m=>`${m.sender}: ${m.text||''}`).join('\n')}],max_tokens:150})});
      const data=await res.json();
      const summary=data.choices?.[0]?.message?.content;
      if(summary)setThreads(prev=>prev.map(t=>t.id===tid?{...t,summarized:true,summary}:t));
    }catch(e){}
  };

  // ── Reaction ──────────────────────────────────────────────────
  const handleReact = (msgId, emoji) => {
    setThreads(prev => prev.map(t => t.id === currentThreadId ? {
      ...t, messages: t.messages.map(m => {
        if (m.id !== msgId) return m;
        const reactions = { ...(m.reactions||{}) };
        reactions[emoji] = (reactions[emoji]||0) + 1;
        return { ...m, reactions };
      })
    } : t));
  };

  // ── Pin ───────────────────────────────────────────────────────
  const handlePin = (msgId) => {
    setThreads(prev => prev.map(t => t.id === currentThreadId ? {
      ...t, messages: t.messages.map(m => m.id === msgId ? { ...m, pinned: !m.pinned } : m)
    } : t));
  };

  // ── Translate ─────────────────────────────────────────────────
  const handleTranslate = async (msg) => {
    if (!navigator.onLine) return;
    setIsTyping(true); setTypingLabel("Traduction en cours…");
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method:"POST", headers:{"Authorization":`Bearer ${GROQ_API_KEY}`,"Content-Type":"application/json"},
        body: JSON.stringify({ model: TEXT_MODEL, messages: [
          { role:"system", content:"Translate the following text to French. Return only the translation, no commentary." },
          { role:"user", content: msg.text||'' }
        ], max_tokens: 1024 })
      });
      const data = await res.json();
      const translation = data.choices?.[0]?.message?.content || "Traduction indisponible";
      addMsg(currentThreadId, { id: Date.now(), sender:"N9chat", type:"received", text:`🌐 **Traduction :**\n\n${translation}` });
    } catch(e) {
      addMsg(currentThreadId, { id: Date.now(), sender:"N9chat", type:"received", text:"Erreur de traduction." });
    } finally { setIsTyping(false); setTypingLabel(""); }
  };

  // ── Regen ─────────────────────────────────────────────────────
  const handleRegen = async (aiMsg) => {
    if (!navigator.onLine) return;
    const idx = currentThread.messages.findIndex(m => m.id === aiMsg.id);
    if (idx < 1) return;
    const prev = currentThread.messages[idx-1];
    if (!prev) return;
    setIsTyping(true); setTypingLabel("Regénération…");
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method:"POST", headers:{"Authorization":`Bearer ${GROQ_API_KEY}`,"Content-Type":"application/json"},
        body: JSON.stringify({ model: profile.selectedModel || TEXT_MODEL,
          messages: [{ role:"system", content: buildSysPrompt(displayName) + " Génère une réponse différente." },
                     { role:"user", content: prev.text||'' }],
          temperature:0.9, max_tokens:2048 })
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "Aucune réponse.";
      setThreads(prev2 => prev2.map(t => t.id === currentThreadId ? {
        ...t, messages: t.messages.map(m => m.id === aiMsg.id ? { ...m, text: reply } : m)
      } : t));
    } catch(e) {}
    setIsTyping(false); setTypingLabel("");
  };

  // ── Backup export ─────────────────────────────────────────────
  const handleBackupExport = () => {
    const data = {
      version: 'n9-v7',
      date: new Date().toISOString(),
      profile: loadProfile(),
      threads: loadThreads(),
      memory: loadMemory(),
      docs: loadDocs(),
      stats: loadStats(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `n9chat-backup-${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href);
  };

  const handleBackupImport = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.profile) saveProfile(data.profile);
      if (data.threads) localStorage.setItem('n9_threads', JSON.stringify(data.threads));
      if (data.memory)  saveMemory(data.memory);
      if (data.docs)    saveDocs(data.docs);
      if (data.stats)   saveStats(data.stats);
      alert('✅ Sauvegarde restaurée ! L\'app va se recharger.');
      location.reload();
    } catch(err) { alert('❌ Fichier invalide.'); }
    e.target.value = '';
  };

  // ── SLASH COMMANDS ────────────────────────────────────────────
  const processSlashCommand = (text) => {
    const cmd = text.trim().toLowerCase();
    if (cmd === '/résumé' || cmd === '/resume')   return "Résume notre conversation en 5 points clés.";
    if (cmd === '/traduis' || cmd === '/translate') return "Traduis mon dernier message en anglais.";
    if (cmd === '/code')   return "Écris du code pour résoudre le problème suivant : ";
    if (cmd === '/plan')   return "Crée un plan d'action structuré pour : ";
    if (cmd === '/analyse')return "Analyse en détail : ";
    if (cmd === '/idées' || cmd === '/idees') return "Génère 10 idées créatives pour : ";
    return null;
  };

  // ── MAIN SEND ─────────────────────────────────────────────────
  const handleSend=async(overrideText=null)=>{
    let rawText=(overrideText!==null?overrideText:inputValue).trim();
    const slashResult = processSlashCommand(rawText);
    if (slashResult) rawText = slashResult;
    const text=rawText;
    const atts=[...attachments];
    if(!text&&!atts.length)return;
    if(isTyping)return;
    setShowSuggestions(false);
    const tid=currentThreadId;
    const audioAtts=atts.filter(a=>a.type==='audio'),imgAtts=atts.filter(a=>a.type==='image'),docAtts=atts.filter(a=>a.type==='doc');
    const displayName=profile.pseudo||profile.name||username;
    if(profile.soundEnabled)playSendSound();

    // Ajouter le message de l'utilisateur immédiatement (toujours, même hors ligne)
    addMsg(tid,{id:Date.now(),sender:displayName,type:"sent",text,attachments:atts.map(a=>({name:a.name,size:a.size,type:a.type,dataUrl:a.type==='image'?a.dataUrl:null}))});
    resetInput();setAttachments([]);

    // ── MODE HORS LIGNE ─────────────────────────────────────────────
    // Le message est sauvegardé. On informe une seule fois puis on arrête.
    if(!navigator.onLine){
      setIsTyping(true);
      await new Promise(r=>setTimeout(r,400)); // petite pause naturelle
      addMsg(tid,{id:Date.now()+1,sender:"N9chat",type:"received",
        text:"📶 **Pas de connexion internet**\n\nTon message est bien **sauvegardé** localement. L'IA te répondra dès que tu seras reconnecté.\n\n*Tu peux continuer à naviguer, lire tes conversations et écrire des messages.*"
      });
      setIsTyping(false);
      return;
    }

    // ── MODE EN LIGNE — appel IA ────────────────────────────────────
    setIsTyping(true);
    try{
      let fullText=text;
      if(audioAtts.length){
        setTypingLabel("Transcription audio Whisper…");
        for(const a of audioAtts){const t=await transcribeAudio(a);fullText+=`\n\n[Transcription – ${a.name}]:\n${t}`;}
      }
      if(docAtts.length){
        setTypingLabel("Lecture des fichiers…");
        for(const d of docAtts){
          try{const t=await d.file.text();fullText+=`\n\n**Fichier : ${d.name}**\n\`\`\`\n${t.slice(0,8000)}\n\`\`\``;}
          catch{fullText+=`\n\n[Fichier binaire : ${d.name}]`;}
        }
      }
      const useVision=imgAtts.length>0;
      setTypingLabel(useVision?"Analyse visuelle…":"");
      const userContent=[];
      imgAtts.forEach(img=>userContent.push({type:"image_url",image_url:{url:img.dataUrl}}));
      if(fullText)userContent.push({type:"text",text:fullText});
      const history=currentThread.messages.slice(-8).map(m=>({role:m.type==='sent'?'user':'assistant',content:m.text||''}));
      const finalContent=userContent.length===1&&userContent[0].type==='text'?userContent[0].text:userContent;

      const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{
        method:"POST",
        headers:{"Authorization":`Bearer ${GROQ_API_KEY}`,"Content-Type":"application/json"},
        body:JSON.stringify({
          model:imgAtts.length>0?VISION_MODEL:(profile.selectedModel||TEXT_MODEL),
          messages:[{role:"system",content:buildSysPrompt(displayName)},...history,{role:"user",content:finalContent}],
          temperature:0.6,max_tokens:2048
        })
      });
      const data=await res.json();
      // Le SW peut renvoyer un JSON d'erreur si la connexion coupe pendant la requête
      if(data.error&&!data.choices){
        addMsg(tid,{id:Date.now()+1,sender:"N9chat",type:"received",
          text:"📶 **Connexion perdue en cours de route**\n\nTon message est sauvegardé. Réessaie dans un instant."
        });
        return;
      }
      const reply=data.choices?.[0]?.message?.content||"Aucune réponse reçue.";
      addMsg(tid,{id:Date.now()+1,sender:"N9chat",type:"received",text:reply});
      bumpStats(reply.length);
      if(profile.soundEnabled)playReceiveSound();
      if(profile.vibrateEnabled)vibrateDevice([20,10,20]);
      sendPushNotification("N9chat Pro",reply.slice(0,80)+(reply.length>80?'…':''));
      const updMsgs=[...currentThread.messages,{type:'sent',text},{type:'received',text:reply}];
      autoSummarize(tid,updMsgs);
    }catch(err){
      // Connexion coupée après le début de la requête
      addMsg(tid,{id:Date.now(),sender:"N9chat",type:"received",
        text:"📶 **Connexion interrompue**\n\nTon message est sauvegardé. Vérifie ta connexion et réessaie."
      });
    }finally{setIsTyping(false);setTypingLabel("");}
  };

  const handleKeyDown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();}};

  // Thread ops
  const newThread=()=>{
    const id=Date.now().toString();
    setThreads(prev=>[...prev,{id,title:`Session ${prev.length+1}`,messages:[{id:0,sender:"N9chat",type:"received",text:"Nouvelle session. Envoyez un message, une image, un fichier ou un audio."}]}]);
    setCurrentThreadId(id);
    if(isMobile)setMobileTab('chat');
  };
  const deleteThread=id=>{
    setThreads(prev=>{const next=prev.filter(t=>t.id!==id);return next.length?next:[DEFAULT_THREAD];});
    setCurrentThreadId(prev=>prev===id?threads.find(t=>t.id!==id)?.id||'1':prev);
    setMenuThreadId(null);
  };
  const startRename=t=>{setRenamingId(t.id);setRenameVal(t.title);setMenuThreadId(null);};
  const commitRename=()=>{
    if(renameVal.trim())setThreads(prev=>prev.map(t=>t.id===renamingId?{...t,title:renameVal.trim()}:t));
    setRenamingId(null);
  };

  const handleLogin=name=>{
    localStorage.setItem('n9_pro_user',name);setUsername(name);
    const existing=loadProfile();
    if(!existing||!existing.pseudo){const p={...DEFAULT_PROFILE,pseudo:name};saveProfile(p);setProfile(p);}
    else{applyTheme(existing.theme,existing.darkMode);}
    setIsLoggedIn(true);
  };
  const handleLogout=()=>{localStorage.clear();location.reload();};
  const handleProfileSave=np=>{saveProfile(np);setProfile(np);applyTheme(np.theme,np.darkMode);};

  const canSend=!isTyping&&(inputValue.trim().length>0||attachments.length>0);
  const displayName=profile.pseudo||profile.name||username;
  const avatarSrc=profile.avatar;
  const backupImportRef = useRef(null);

  if(showSplash)return h(SplashScreen,{onDone:()=>{
    const seen=localStorage.getItem('n9_install_seen');
    const isStandalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;
    if(!seen&&!isStandalone){setShowInstall(true);}
    setShowSplash(false);
  }});
  if(showInstall)return h(InstallBanner,{onContinue:()=>{localStorage.setItem('n9_install_seen','1');setShowInstall(false);},deferredPrompt:deferredPromptRef.current});
  if(!isLoggedIn)return h(LoginScreen,{onLogin:handleLogin});
  if(pinLocked)return h(PinLockScreen,{onUnlock:()=>setPinLocked(false)});
  if(view==='profile')return h(ProfileScreen,{profile,onSave:handleProfileSave,onBack:()=>setView('chat'),onGoStats:()=>setView('stats'),onGoDocs:()=>setView('docs'),onGoMemory:()=>setView('memory'),onExport:handleBackupExport,onImport:handleBackupImport});
  if(view==='stats')return h(StatsScreen,{threads,onBack:()=>setView('profile')});
  if(view==='templates')return h(TemplatesScreen,{onSelect:t=>{setInputValue(t);setView('chat');},onBack:()=>setView('chat')});
  if(view==='docs')return h(DocsScreen,{onBack:()=>setView('profile')});
  if(view==='memory')return h(MemoryScreen,{onBack:()=>setView('profile')});

  // ── Inline thread list (not a sub-component to avoid remount) ──
  const threadListJSX = h("div",{className:"threads-list custom-scrollbar"},
    h("button",{className:"new-thread-btn",onClick:newThread},"+ Nouvelle session"),
    currentThread.summary&&h("div",{className:"thread-summary-card"},
      h("div",{className:"tsummary-label"},h(SparkIcon)," Résumé IA"),
      h("p",{className:"tsummary-text"},currentThread.summary)
    ),
    threads.map(t=>h("div",{key:t.id,className:`thread-item ${t.id===currentThreadId?'active':''}`,style:{position:'relative'}},
      renamingId===t.id
        ?h("input",{ref:renameRef,className:"thread-rename-input",value:renameVal,onChange:e=>setRenameVal(e.target.value),onKeyDown:e=>{if(e.key==='Enter')commitRename();if(e.key==='Escape')setRenamingId(null);},onBlur:commitRename})
        :h("span",{className:"thread-title",onClick:()=>{setCurrentThreadId(t.id);if(isMobile)setMobileTab('chat');}},h("span",{className:"thread-dot"}),t.title),
      h("button",{className:"thread-more-btn",onClick:e=>{e.stopPropagation();setMenuThreadId(menuThreadId===t.id?null:t.id);}},h(MoreIcon)),
      menuThreadId===t.id&&h(ThreadMenu,{onRename:()=>startRename(t),onDelete:()=>deleteThread(t.id),onExportTxt:()=>{exportTxt(t);setMenuThreadId(null);},onExportPdf:()=>{exportPdf(t);setMenuThreadId(null);},onClose:()=>setMenuThreadId(null)})
    ))
  );

  // ── Inline input zone ──────────────────────────────────────────
  const inputZoneJSX = h("div",{className:"input-bar-wrapper"},
    h(AttachmentBar,{attachments,onRemove:removeAtt}),
    showSuggestions&&h(SuggestionsBar,{hasMessages:currentThread.messages.length>1,onSelect:s=>{setShowSuggestions(false);handleSend(s);}}),
    showTemplates&&h("div",{className:"templates-popup"},
      PROMPT_TEMPLATES.map(t=>h("button",{key:t.id,className:"template-popup-item",onClick:()=>{setInputValue(t.prompt);setShowTemplates(false);textareaRef.current?.focus();}},
        h("span",{className:"template-popup-icon"},t.icon),h("span",null,t.title)
      ))
    ),
    h("div",{className:"input-bar"},
      h("div",{className:"input-toolbar"},
        h("button",{className:"toolbar-btn",title:"Image ou fichier",onClick:()=>fileInputRef.current?.click()},h(UploadIcon)),
        h("input",{ref:fileInputRef,type:"file",style:{display:'none'},accept:`${ACCEPT_IMAGES},${ACCEPT_DOCS}`,multiple:true,onChange:onFileChange}),
        h("button",{className:"toolbar-btn",title:"Fichier audio (Whisper)",onClick:()=>audioInputRef.current?.click()},h(AudioIcon)),
        h("input",{ref:audioInputRef,type:"file",style:{display:'none'},accept:ACCEPT_AUDIO,multiple:true,onChange:onAudioChange}),
        h("button",{className:`toolbar-btn ${showSuggestions?'active':''}`,title:"Suggestions rapides",onClick:()=>setShowSuggestions(s=>!s)},h(SparkIcon)),
        h("button",{className:`toolbar-btn ${showTemplates?'active':''}`,title:"Templates de prompts",onClick:()=>setShowTemplates(s=>!s)},h(TemplIcon)),
        h("div",{className:"toolbar-sep"}),
        micOk&&h("button",{className:`toolbar-btn${isRecording?' mic-active':''}`,title:isRecording?"Arrêter":"Micro live",onClick:toggleMic},h(MicIcon,{active:isRecording}),isRecording&&h("span",{className:"rec-dot"}))
      ),
      h("textarea",{ref:textareaRef,className:"main-textarea",rows:1,placeholder:attachments.length?"Ajoutez un message ou envoyez…":"Message ou /template, /résumé, /traduis…",value:inputValue,onChange:handleInputChange,onKeyDown:handleKeyDown,style:{fontSize:(profile.fontSize||14)+'px'}}),
      h("button",{className:"send-btn",onClick:()=>handleSend(),disabled:!canSend},h(SendIcon))
    ),
    // Model selector bar
    h("div",{className:"model-bar"},
      h("span",{className:"model-bar-label"},"Modèle :"),
      h("select",{className:"model-select",value:profile.selectedModel||TEXT_MODEL,onChange:e=>handleProfileSave({...profile,selectedModel:e.target.value})},
        GROQ_MODELS.map(m=>h("option",{key:m.id,value:m.id},m.label))
      )
    ),
    h("div",{className:"input-hint"},
      h("span",null,"📎 Fichiers"),h("span",null,"🎵 Whisper"),
      micOk&&h("span",null,"🎙️ Live"),
      h("span",null,"⭐ Suggestions"),h("span",null,"📄 Templates"),h("span",null,"⏎ Envoyer")
    )
  );

  // ── Inline header right ────────────────────────────────────────
  const headerRightJSX = h("div",{style:{display:'flex',alignItems:'center',gap:'0.5rem'}},
    !isOnline&&h("span",{className:"offline-badge"},"📵 Hors ligne"),
    h("button",{className:"header-icon-btn",title:"Rechercher",onClick:()=>setShowSearch(true)},h(SearchIcon)),
    h("button",{className:"header-icon-btn",title:profile.darkMode?"Mode clair":"Mode sombre",onClick:()=>{const np={...profile,darkMode:!profile.darkMode};handleProfileSave(np);}},profile.darkMode?h(SunIcon):h(MoonIcon)),
    h("span",{style:{fontSize:'0.72rem',fontWeight:700,color:'var(--text-secondary)'},className:"desktop-only"},displayName),
    h("button",{className:"avatar avatar-btn",onClick:()=>setView('profile'),title:"Mon profil"},avatarSrc?h("img",{src:avatarSrc,className:"avatar-img",alt:"avatar"}):displayName[0]?.toUpperCase())
  );

  // ── MOBILE ────────────────────────────────────────────────────
  if(isMobile){
    return h("div",{className:"app-layout mobile"},
      showSearch&&h(SearchOverlay,{threads,onClose:()=>setShowSearch(false),onJump:tid=>{setCurrentThreadId(tid);setMobileTab('chat');}}),
      h("input",{ref:backupImportRef,type:"file",accept:".json",style:{display:'none'},onChange:handleBackupImport}),
      h("header",{className:"app-header"},
        h("div",{className:"header-status"},
          h("div",{className:`status-dot${isOnline?'':' offline'}`}),
          h("span",{style:{color:isOnline?'var(--mint)':'#f59e0b'}},isOnline?currentThread.title:"Hors ligne")
        ),
        headerRightJSX
      ),
      h("div",{className:"mobile-content"},
        mobileTab==='chat'&&h("div",{className:"main-content"},
          h("div",{style:{position:'relative',flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}},
            h("div",{ref:scrollRef,className:"messages-area custom-scrollbar"},
              currentThread.messages.map(m=>h(MessageBubble,{key:m.id,msg:m,onReact:handleReact,onPin:handlePin,onRegen:handleRegen,onTranslate:handleTranslate,fontSize:profile.fontSize||14})),
              isTyping&&h(TypingIndicator,{label:typingLabel})
            ),
            showScrollBtn&&h("button",{className:"scroll-down-btn",onClick:scrollToBottom,"aria-label":"Descendre"},
              h("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2.5,strokeLinecap:"round",strokeLinejoin:"round"},
                h("polyline",{points:"6 9 12 15 18 9"})
              )
            )
          ),
          inputZoneJSX
        ),
        mobileTab==='sessions'&&h("div",{className:"mobile-sessions"},threadListJSX)
      ),
      h("nav",{className:"bottom-nav"},
        h("button",{className:`bottom-nav-item ${mobileTab==='chat'?'active':''}`,onClick:()=>setMobileTab('chat')},h(ChatIcon),h("span",null,"Chat")),
        h("button",{className:`bottom-nav-item ${mobileTab==='sessions'?'active':''}`,onClick:()=>setMobileTab('sessions')},h(ListIcon),h("span",null,"Sessions")),
        h("button",{className:"bottom-nav-item",onClick:()=>setView('profile')},avatarSrc?h("img",{src:avatarSrc,style:{width:22,height:22,borderRadius:'50%',objectFit:'cover'},alt:"p"}):h(UserIcon),h("span",null,"Profil")),
        h("button",{className:"bottom-nav-item",onClick:handleLogout},h(LogOutIcon),h("span",null,"Quitter"))
      )
    );
  }

  // ── DESKTOP ───────────────────────────────────────────────────
  return h("div",{className:"app-layout"},
    showSearch&&h(SearchOverlay,{threads,onClose:()=>setShowSearch(false),onJump:tid=>{setCurrentThreadId(tid);}}),
    h("input",{ref:backupImportRef,type:"file",accept:".json",style:{display:'none'},onChange:handleBackupImport}),
    h("aside",{className:"sidebar"},
      h("div",{className:"sidebar-logo"},h(N9Logo,{size:36}),h("div",{className:"sidebar-logo-text"},h("p",null,"N9chat Pro"),h("p",null,"Android / iOS"))),
      threadListJSX,
      h("button",{className:"sidebar-profile-btn",onClick:()=>setView('profile')},
        avatarSrc?h("img",{src:avatarSrc,className:"sidebar-profile-avatar",alt:"avatar"}):h("div",{className:"sidebar-profile-initials"},displayName[0]?.toUpperCase()),
        h("div",{className:"sidebar-profile-info"},h("span",{className:"sidebar-profile-name"},displayName),h("span",{className:"sidebar-profile-sub"},"Voir le profil")),
        h(UserIcon)
      ),
      h("button",{className:"sidebar-logout",onClick:handleLogout},h(LogOutIcon),"Quitter")
    ),
    h("main",{className:"main-content"},
      h("header",{className:"app-header"},
        h("div",{className:"header-status"},
          h("div",{className:`status-dot${isOnline?'':' offline'}`}),
          h("span",{style:{color:isOnline?'var(--mint)':'#f59e0b'}},isOnline?"Système synchronisé":"Hors ligne — conversations locales")
        ),
        headerRightJSX
      ),
      h("div",{style:{position:'relative',flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}},
        h("div",{ref:scrollRef,className:"messages-area custom-scrollbar"},
          currentThread.messages.map(m=>h(MessageBubble,{key:m.id,msg:m,onReact:handleReact,onPin:handlePin,onRegen:handleRegen,onTranslate:handleTranslate,fontSize:profile.fontSize||14})),
          isTyping&&h(TypingIndicator,{label:typingLabel})
        ),
        showScrollBtn&&h("button",{className:"scroll-down-btn",onClick:scrollToBottom,"aria-label":"Descendre"},
          h("svg",{width:18,height:18,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2.5,strokeLinecap:"round",strokeLinejoin:"round"},
            h("polyline",{points:"6 9 12 15 18 9"})
          )
        )
      ),
      inputZoneJSX
    )
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(h(App));

// Configure marked dès qu'il est disponible
if (window.marked) { marked.setOptions({ breaks: true, gfm: true }); }

// Masquer le boot loader — React est monté
if (typeof window.__N9_READY__ === 'function') { window.__N9_READY__(); }
