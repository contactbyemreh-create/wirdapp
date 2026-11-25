# Wird — ta part du jour

Appli web installable (PWA) pour **finir le Coran** et **le mémoriser**, calée sur les heures de prière.
Un seul Worker Cloudflare sert le site, les comptes, la synchro, les rappels et la préparation de l’appli Android.

Site en ligne : https://wird.contact-byemreh.workers.dev

## Contenu du dépôt

```
wird/
├─ wrangler.toml          réglages de publication (base D1, Cron, date de compatibilité)
├─ src/
│  ├─ worker.js           le Worker complet (API + page + icônes + service worker)
│  └─ app.html            la page servie par le Worker, lisible et modifiable
├─ scripts/
│  └─ build.mjs           recolle app.html dans worker.js
├─ demo/
│  └─ wird.html           version démo autonome, sans comptes ni rappels
└─ brand/
   ├─ brand.html          charte de marque
   ├─ wird-logo.svg       logo vectoriel (ورد en calligraphie dorée sur vert)
   ├─ wird-logo.png       logo 1024 px
   └─ icon-192.png, icon-512.png   icônes d’appli
```

## Déploiement

```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

## Modifier la page

La page vit dans `src/app.html`. Après modification :

```bash
node scripts/build.mjs   # recolle app.html dans src/worker.js
wrangler deploy
```

## Configuration

- **D1** : base de données `wird` (liaison `DB`), dont `database_id` est dans `wrangler.toml`.
- **Cron** : déclencheur chaque minute pour les rappels de prière.
- **Compatibility date** : 2025-09-01.

### Liaisons et variables

| Nom | Type | Obligatoire | Rôle |
|-----|------|-------------|------|
| `DB` | base D1 | oui | comptes, sessions, progression, rappels |
| `APK` | bucket R2 | non | fichier `wird.apk` servi sur `/wird.apk` |

Aucun secret à définir : la clé VAPID des notifications est générée au premier appel et stockée dans la table `kv`.

## Base de données

Les tables sont créées automatiquement au premier appel.

| Table | Contenu |
|-------|---------|
| `users` | identifiant, sel, empreinte du mot de passe, empreinte du code de récupération, compteur d’échecs |
| `sessions` | jetons de session (stockés hachés), expiration |
| `progress` | progression synchronisée (JSON) et horodatage |
| `subs` | abonnements aux rappels (adresse du service de notification, ville, prières choisies) |
| `patches` | retouches de la page : chaque ligne remplace le texte `a` par `b` (visible en moins d’une minute) |
| `kv` | clés : `apk_url`, `assetlinks`, `vapid` (clé privée : ne pas supprimer ni partager), `origin` |

## Routes

| Route | Rôle |
|-------|------|
| `GET /` | la page |
| `GET /manifest.webmanifest`, `/sw.js`, `/icon-192.png`, `/icon-512.png` | appli installable |
| `GET /wird.apk` | APK (R2 `APK`, sinon redirection vers `kv.apk_url`) |
| `GET /.well-known/assetlinks.json` | contenu de `kv.assetlinks` (Android, sans barre d’adresse) |
| `GET /api/health` | contrôle et nombre de retouches appliquées |
| `GET /api/app` | clé publique des notifications, présence d’un APK |
| `POST /api/register`, `/api/login`, `/api/logout`, `/api/reset`, `/api/delete` | comptes |
| `GET /api/me`, `GET`/`POST /api/sync` | session et synchro de la progression |
| `POST /api/push`, `/api/push/off` | abonnement aux rappels |

## Sécurité

- Le mot de passe est dérivé **dans le navigateur** (PBKDF2, 300 000 itérations) : le serveur ne le voit jamais en clair et reste dans la limite de calcul du plan gratuit.
- Pas d’e-mail : un **code de récupération** est donné une seule fois à l’inscription.
- Sessions : cookie `HttpOnly`, `Secure`, `SameSite=Lax`, 90 jours, jeton stocké haché.
- Blocage 15 minutes après 8 essais ratés.
- Les requêtes `POST` doivent venir de la même origine.
- Rappels : seules les adresses des services Google, Mozilla, Apple et Windows sont acceptées ; 45 envois par minute et 5 000 abonnements au maximum.
- En-têtes : CSP, HSTS, `Permissions-Policy`.

## Appli Android (APK)

1. Sur pwabuilder.com, colle l’adresse du site et génère le paquet Android (active la délégation des notifications et de la position si elle est proposée). Garde la clé de signature.
2. Héberge l’APK sur un lien HTTPS, puis dans la console D1 :
   ```sql
   INSERT OR REPLACE INTO kv VALUES('apk_url','https://…/wird.apk');
   ```
3. Pour retirer la barre d’adresse, colle le contenu du fichier `assetlinks.json` de PWABuilder :
   ```sql
   INSERT OR REPLACE INTO kv VALUES('assetlinks','…contenu du fichier…');
   ```

## Limites

- Rappels sur le plan gratuit : environ 45 envois par minute.
- iPhone : les rappels exigent que le site soit ajouté à l’écran d’accueil.
- Horaires de prière calculés dans le navigateur (angles 12°, comme l’UOIF) : le calendrier de la mosquée fait foi.
- Textes de la page « Savoir » : traductions du sens, à faire relire par un savant.
- Testé en simulation et dans un navigateur de test, pas encore sur un parc d’appareils réels.
