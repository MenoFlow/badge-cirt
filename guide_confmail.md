# Guide de configuration email pour l'envoi des badges

Ce projet envoie les badges PDF par SMTP. L'adresse qui envoie les emails doit etre configuree dans le fichier `.env`.

## 1. Choisir le compte envoyeur

Utilise une adresse dediee, par exemple une adresse organisationnelle de type `badge@votre-domaine.tld`.

Dans ton message, l'adresse exacte n'apparait pas apres "l'email qui envoi doit etre le suivant". Il reste donc a renseigner cette adresse dans les variables `SMTP_USER` et `SMTP_FROM`.

## 2. Configurer le SMTP dans `.env`

Ajoute ou complete les variables suivantes :

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=badge@votre-domaine.tld
SMTP_PASS=mot-de-passe-smtp-ou-mot-de-passe-application
SMTP_FROM="CIRT Badge <badge@votre-domaine.tld>"
```

Pour un serveur SMTP en SSL direct, utilise plutot :

```env
SMTP_PORT=465
SMTP_SECURE=true
```

## 3. Cas Gmail / Google Workspace

Si l'adresse envoyeur est un compte Gmail ou Google Workspace :

1. Active la validation en deux etapes sur le compte Google.
2. Cree un mot de passe d'application.
3. Utilise cette configuration :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=votre-adresse@gmail.com
SMTP_PASS=mot-de-passe-application-google
SMTP_FROM="CIRT Badge <votre-adresse@gmail.com>"
```

N'utilise pas le mot de passe principal du compte Google.

## 4. Redemarrer l'application

Apres modification de `.env`, redemarre le backend pour recharger la configuration SMTP.

En developpement :

```bash
npm run server:dev
```

En production conteneurisee, redemarre le conteneur applicatif :

```bash
docker compose up -d --build
```

## 5. Tester

1. Va dans `Badges`.
2. Selectionne un participant qui possede un email.
3. Clique sur `Envoi badge` pour le groupe, ou utilise `Participants > Actions > Envoi badge` pour un envoi individuel.
4. Pour envoyer tous les badges, utilise le bouton `Envoyer tous` a cote de la recherche dans `Badges`.

Les participants sans email seront signales comme echecs dans la popup de progression.

## 6. Eviter que les emails arrivent en spam

L'application envoie maintenant un objet explicite du type :

```text
[CIRT Badge Check] Votre badge d'accès - CIRT-000001
```

Si les emails arrivent encore en spam, ce n'est generalement pas lie a l'objet seul. Verifie surtout :

1. Le compte Gmail doit etre actif, avec une boite propre et pas utilisee pour des envois massifs suspects.
2. Les destinataires doivent eviter de marquer ces emails comme spam.
3. Evite les liens `localhost` dans les emails. Ils sont suspects pour les filtres antispam et inutilisables par les destinataires.
4. Evite d'envoyer trop vite un grand volume depuis un nouveau compte Gmail. Gmail peut limiter ou classer en spam.
5. Demande aux premiers destinataires de marquer l'email comme "Non spam" si necessaire.
6. Si tu utilises plus tard une adresse sur ton propre domaine, configure SPF, DKIM et DMARC.

### Tests en localhost

En localhost, les emails peuvent aller en spam meme si le SMTP fonctionne. Pour tester correctement :

1. Envoie d'abord a une seule adresse de test, idealement une adresse Gmail personnelle.
2. Ouvre le spam, clique sur `Non spam`, puis reessaie un nouvel envoi.
3. Ajoute `cirtmdg@gmail.com` dans les contacts du destinataire de test.
4. N'envoie pas tout le lot pendant les tests, car un gros volume depuis un compte Gmail neuf augmente le risque de spam.
5. Garde l'email simple : pas de lien localhost, pas de texte trop court, une piece jointe PDF claire.

Pour un usage plus fiable en production, utilise un domaine dedie avec DNS configure :

```text
SPF   autorise le serveur d'envoi
DKIM  signe les emails
DMARC indique aux boites mail comment verifier SPF/DKIM
```

Avec Gmail personnel, tu ne controles pas SPF/DKIM du domaine `gmail.com`, mais Google signe normalement les emails envoyes par `smtp.gmail.com`. La reputation du compte et le comportement des destinataires restent donc importants.

## 7. Reprise apres coupure

Chaque badge envoye avec succes est memorise en base de donnees. Si l'envoi global est interrompu :

1. Retourne dans `Badges`.
2. Clique sur `Continuer l'envoi`.
3. Les badges deja envoyes seront sautes automatiquement.

Les echecs seront retentes, tandis que les succes ne seront pas renvoyes sauf si l'API est appelee avec l'option force cote serveur.
