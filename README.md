# CIRT Event Pass

Application web de gestion des badges, participants, scans d'entrée/sortie,
présence et rapports pour les évènements CIRT.

## Stack

- Frontend: React 19, TanStack Start/Router, TanStack Query, Vite, Tailwind CSS v4, shadcn/ui
- Backend: Node.js, Express, TypeScript, Prisma, MySQL
- Badges: QR code, aperçu web responsive, génération PDF
- Import/export: Excel, rapports, lots de badges
- Sécurité: JWT en cookie HTTP-only, rôles, Helmet, CORS, rate-limit

## Structure

```text
/
├── src/                 Frontend React
├── server/              API Express + Prisma
├── public/favicon.ico   Icône de l'application
├── uploads/             Photos, gabarits et logos en runtime
├── Dockerfile
└── docker-compose.yml
```

## Démarrage Local

Installer les dépendances du frontend et du backend:

```bash
npm install
cd server && npm install && cd ..
```

Préparer l'environnement:

```bash
cp .env.example .env
```

Variables importantes:

- `APP_PORT=3330` pour le backend
- `PUBLIC_BASE_URL=http://localhost:3330` pour les QR codes
- `CORS_ORIGIN=http://localhost:2221,http://localhost:3330`
- `DATABASE_URL` pour MySQL local, par défaut `mysql://cirt:cirtpass@127.0.0.1:3306/cirt_badge`
- `JWT_SECRET`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`

Lancer le backend:

```bash
npm run server:dev
```

En Docker Compose, l'application utilise automatiquement l'hôte interne
`mysql:3306`; en développement local, le backend utilise `127.0.0.1:3306`.

Lancer le frontend:

```bash
npm run dev
```

Accès local:

- Frontend: `http://localhost:2221`
- Backend/API: `http://localhost:3330`

Le frontend écoute sur `0.0.0.0`, donc il est accessible depuis le même réseau
via `http://IP_DE_LA_MACHINE:2221`.

## Base De Données

Depuis le dossier `server`:

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
```

Le seed crée l'administrateur initial depuis les variables `ADMIN_*`.

## Fonctionnalités

- Tableau de bord de présence
- Ajout minute, avec saisie paginée d'un membre par page
- Import Excel avec prévisualisation et détection des doublons
- Liste participants avec recherche, filtres, pagination et suppression
- Génération de badges individuels, de groupe et en lot
- Aperçu badge responsive avec adaptation automatique des noms longs
- Scan QR ou saisie manuelle du badge
- Alertes de sorties longues
- Rapports et exports
- Paramètres d'évènement et gestion utilisateurs

## Docker

```bash
npm run docker:up
npm run docker:logs
```

L'application conteneurisée expose le service web/API sur `3330` par défaut.

```bash
npm run docker:down
```

## Production

Voir [DEPLOIEMENT_VPS.md](./DEPLOIEMENT_VPS.md) pour une mise en production sur
VPS par conteneurisation avec reverse proxy HTTPS.
