# Ctrl+Zen 🌿

> 404 : stress not found

Webapp iPhone (à installer sur l'écran d'accueil) pour s'envoyer des rappels doux : respiration, exos, pauses… avec des citations motivantes, psychologiques ou philosophiques.

## Ce que fait l'app

- **Rappels** : tout de suite, une fois (date + heure), chaque jour (jours au choix + heure) ou plusieurs fois par jour (toutes les X heures entre deux horaires).
- **Citations** : ~100 citations en français en 3 types (Motivation, Psychologie, Philosophie) + les tiennes, avec favoris. Une notif peut piocher une citation au hasard dans les types choisis.
- **Citation du jour** : notif quotidienne réglable dans Réglages (heure + types).
- **Catégories** : 24 icônes ou un emoji, 8 couleurs pastel.
- **Modèles** : notifs toutes prêtes, à envoyer en un tap.
- **Mode calme** : pas de rappels réguliers la nuit (22:00 → 7:00 par défaut).
- **Raccourcis iOS / scripts** : `POST /api/send` pour t'envoyer une notif depuis n'importe où.

## Comment c'est construit

Tout tient dans **un seul Worker Cloudflare** (gratuit, sans carte bancaire) :

| Morceau | Rôle |
| --- | --- |
| `src/` | L'interface (Preact + Vite) |
| `public/sw.js` | Le service worker qui affiche les notifications |
| `worker/index.ts` | L'API + la vérification chaque minute des notifs à envoyer (cron) |
| `worker/push.ts` | Le chiffrement et l'envoi Web Push (VAPID), sans dépendance |
| `shared/schedule.ts` | Le calcul des prochaines dates (fuseau horaire, heure d'été) |
| `migrations/` | La base D1 (tables, catégories, modèles et citations de départ) |

## Mettre l'app en ligne (une seule fois)

Il te faut un compte Cloudflare gratuit : https://dash.cloudflare.com/sign-up

Dans un terminal, dans le dossier `ctrl-zen` :

1. **Se connecter à Cloudflare** (ouvre le navigateur) :
   ```bash
   npx wrangler login
   ```
2. **Créer la base de données** :
   ```bash
   npx wrangler d1 create ctrl-zen-db
   ```
   Copie le `database_id` affiché dans `wrangler.jsonc` (à la place des zéros).
3. **Créer les tables et les citations** :
   ```bash
   npm run db:remote
   ```
4. **Générer les clés** (clés de signature des notifs + ton code d'accès) :
   ```bash
   npm run vapid
   ```
   Puis enregistre chacune des 3 valeurs affichées :
   ```bash
   npx wrangler secret put VAPID_PUBLIC_KEY
   npx wrangler secret put VAPID_PRIVATE_KEY
   npx wrangler secret put APP_SECRET
   ```
   ⚠️ Garde `APP_SECRET` : c'est ton **code d'accès** à l'app.
5. **Publier** :
   ```bash
   npm run deploy
   ```
   L'adresse de l'app s'affiche, du genre `https://ctrl-zen.<toi>.workers.dev`.
6. (Conseillé) Donne cette adresse comme « sujet » des notifications, Apple aime bien :
   ```bash
   npx wrangler secret put VAPID_SUBJECT
   ```
   (valeur : l'adresse de l'app, en `https://…`)

## Installer sur l'iPhone

1. Ouvre l'adresse de l'app dans **Safari** (iOS 16.4 minimum).
2. **Partager → Sur l'écran d'accueil**.
3. Ouvre Ctrl+Zen **depuis l'icône**, entre ton code d'accès.
4. Touche **Active les notifications** et accepte.
5. Réglages → **Tester** : une notif doit arriver 🎉

## Raccourcis iOS

Action « Obtenir le contenu de l'URL » :

- URL : `https://<ton-app>/api/send` · Méthode : **POST**
- En-tête : `Authorization` = `Bearer <ton code d'accès>`
- Corps (JSON) : `title`, `body`, et si tu veux `quote` = `motivation`, `psychologie`, `philosophie` ou `any`

Ou un modèle tout prêt : `{ "templateId": 1 }`.

## Développer en local

```bash
npm install
node scripts/gen-vapid.mjs --dev   # crée .dev.vars (clés locales)
npm run db:local                   # base locale
npm run worker:dev                 # http://localhost:8787
```

- `npm test` : tests (chiffrement push vérifié avec la bibliothèque de référence, calcul des dates).
- `npm run icons` : régénère les icônes PNG depuis le dessin « Abricot ».
- `POST /api/tick` : force la vérification des notifs à envoyer (sinon, c'est automatique chaque minute en ligne).

Les vraies notifications iPhone ne marchent qu'une fois l'app en ligne (HTTPS + installée sur l'écran d'accueil).
