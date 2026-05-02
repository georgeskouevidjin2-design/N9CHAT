# N9chat Pro — Guide de déploiement complet

## Architecture

```
n9chat-pro/
├── index.html        ← Frontend PWA
├── app.js            ← Application React
├── api.js            ← Client API (nouveau)
├── style.css         ← Styles
├── sw.js             ← Service Worker
├── manifest.json     ← PWA manifest
└── backend/
    ├── server.js     ← Serveur Express + SQLite
    ├── package.json
    ├── .env.example  ← Copier en .env
    └── data/
        └── n9chat.db ← Base SQLite (créée automatiquement)
```

---

## Démarrage rapide (local)

### 1. Backend
```bash
cd backend
cp .env.example .env
# Éditez .env et changez JWT_SECRET
npm install
npm start
# → http://localhost:3001/api/health
```

### 2. Frontend
Ouvrez `index.html` dans un serveur local :
```bash
# Option A — Python
python3 -m http.server 5500

# Option B — VS Code Live Server
# Clic droit → Open with Live Server
```

---

## Déploiement en production

### Backend — Options recommandées

#### Option A : Railway (gratuit, 500h/mois)
1. Créez un compte sur [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Pointez vers le dossier `backend/`
4. Variables d'environnement :
   - `PORT` = 3001
   - `JWT_SECRET` = (clé aléatoire longue)
   - `NODE_ENV` = production

#### Option B : Render (gratuit)
1. [render.com](https://render.com) → New Web Service
2. Root Directory : `backend`
3. Build Command : `npm install`
4. Start Command : `npm start`

#### Option C : VPS (DigitalOcean, OVH, etc.)
```bash
# Sur le serveur
git clone votre-repo
cd backend
npm install
cp .env.example .env
nano .env   # remplir JWT_SECRET et PORT

# Avec PM2 (process manager)
npm install -g pm2
pm2 start server.js --name n9chat-backend
pm2 save
pm2 startup
```

### Frontend — Options recommandées

#### Option A : Netlify (gratuit, recommandé)
1. [netlify.com](https://netlify.com) → New site from Git
2. Publish directory : `/` (racine)
3. Variable d'environnement dans `index.html` :
   Remplacez `http://localhost:3001` par votre URL backend

#### Option B : Vercel
```bash
npm install -g vercel
vercel --prod
```

#### Option C : GitHub Pages
1. Push le code sur GitHub
2. Settings → Pages → Source: main branch
3. Votre site : `username.github.io/n9chat-pro`

---

## Configuration de l'URL backend

Une fois le backend déployé, mettez à jour l'URL dans `index.html` :

```html
<script>
  window.N9_BACKEND_URL = 'https://votre-backend.railway.app/api';
</script>
```

Ajoutez cette ligne **avant** le chargement de `api.js`.

---

## Endpoints API

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| GET | /api/health | Statut serveur | Non |
| POST | /api/auth/register | Inscription | Non |
| POST | /api/auth/login | Connexion | Non |
| GET | /api/auth/me | Mon compte | Oui |
| POST | /api/auth/change-password | Changer mdp | Oui |
| GET/PUT | /api/profile | Profil utilisateur | Oui |
| GET/POST | /api/threads | Sessions | Oui |
| PATCH/DELETE | /api/threads/:id | Modifier/suppr session | Oui |
| GET/POST | /api/threads/:id/messages | Messages | Oui |
| PATCH/DELETE | /api/messages/:id | Modifier/suppr message | Oui |
| GET/POST/DELETE | /api/memories | Mémoires IA | Oui |
| GET/POST/DELETE | /api/documents | Base documentaire | Oui |
| GET | /api/stats | Statistiques | Oui |
| GET | /api/search?q=... | Recherche globale | Oui |
| GET | /api/backup | Export complet JSON | Oui |

---

## Base de données SQLite

Le fichier `backend/data/n9chat.db` est créé automatiquement.

### Tables
- **users** — Comptes utilisateurs (id, username, password hashé, email)
- **profiles** — Profils (thème, langue, persona, avatar...)
- **threads** — Sessions de conversation
- **messages** — Messages avec réactions, épinglage
- **memories** — Mémoire long terme de l'IA
- **documents** — Base documentaire personnelle
- **stats** — Statistiques d'utilisation
- **refresh_tokens** — Tokens de session

### Sauvegarde
Le fichier `.db` est auto-persisté à chaque écriture.
Pour sauvegarder : copiez simplement `backend/data/n9chat.db`.

---

## Mode hors ligne

Le client API (`api.js`) inclut un fallback automatique :
- Si le backend est inaccessible → utilise `localStorage`
- Si la connexion revient → synchro transparente

---

## Sécurité

✅ Mots de passe hashés avec bcrypt (10 rounds)  
✅ Tokens JWT avec expiration 7 jours  
✅ Rate limiting (200 req/15min, 20 login/15min)  
✅ Helmet (headers de sécurité HTTP)  
✅ CORS restrictif (origines whitelist)  
✅ Validation des entrées sur tous les endpoints  
✅ Isolation des données par user_id  
✅ Chaque requête vérifie l'appartenance des ressources  
