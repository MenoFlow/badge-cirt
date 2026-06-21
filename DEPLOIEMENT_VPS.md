# Déploiement VPS Par Conteneurisation

Guide de mise en production de CIRT Event Pass sur un VPS avec Docker Compose.

## Pré-requis

- VPS Ubuntu/Debian à jour
- Nom de domaine pointant vers le VPS
- Docker et Docker Compose installés
- Ports `80` et `443` ouverts

## 1. Préparer Le Projet

```bash
git clone <URL_DU_DEPOT> cirt-event-pass
cd cirt-event-pass
cp .env.example .env
```

Configurer `.env`:

```env
NODE_ENV=production
APP_PORT=3330
PUBLIC_BASE_URL=https://votre-domaine.example
CORS_ORIGIN=https://votre-domaine.example

MYSQL_DATABASE=cirt_badge
MYSQL_USER=cirt
MYSQL_PASSWORD=mot-de-passe-fort
MYSQL_ROOT_PASSWORD=mot-de-passe-root-fort
DATABASE_URL=mysql://cirt:mot-de-passe-fort@mysql:3306/cirt_badge

JWT_SECRET=secret-long-aleatoire
SESSION_SECRET=secret-long-aleatoire
COOKIE_SECURE=true

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=mot-de-passe-admin-fort
ADMIN_NAME=Admin CIRT
```

## 2. Construire Et Lancer

```bash
docker compose up -d --build
docker compose logs -f app
```

Le conteneur `app` applique Prisma puis lance le backend qui sert aussi le
frontend buildé.

## 3. Reverse Proxy HTTPS

Exemple Caddy:

```caddyfile
votre-domaine.example {
  reverse_proxy 127.0.0.1:3330
}
```

Exemple Nginx:

```nginx
server {
  listen 80;
  server_name votre-domaine.example;

  location / {
    proxy_pass http://127.0.0.1:3330;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Ajouter Certbot ou utiliser Caddy pour générer automatiquement le certificat TLS.

## 4. Vérifications

```bash
docker compose ps
docker compose logs --tail=100 app
docker compose logs --tail=100 mysql
```

Tester:

- `https://votre-domaine.example`
- Connexion admin
- Import participant
- Génération PDF d'un badge
- Scan d'un QR code public

## 5. Sauvegarde

Sauvegarde MySQL:

```bash
docker compose exec mysql mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" cirt_badge > backup.sql
```

Restauration:

```bash
docker compose exec -T mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" cirt_badge < backup.sql
```

Sauvegarder aussi le volume `uploads_data`, car il contient les photos, logos et
gabarits.

## 6. Mise À Jour

```bash
git pull
docker compose up -d --build
docker compose logs -f app
```

Ne pas réécrire l'historique Git publié sur la branche connectée à Lovable.

## 7. Commandes Utiles

```bash
docker compose restart app
docker compose logs -f app
docker compose down
docker compose up -d
```
