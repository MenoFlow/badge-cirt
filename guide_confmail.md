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

L'application envoie maintenant un objet sobre du type :

```text
[CTF / Hackathon 2026] Votre badge de participant
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

### Diagnostic actuel du domaine

Le domaine public `badge-cirt.soozey.com` ne suffit pas a ameliorer la delivrabilite si l'expediteur reste `cirtmdg@gmail.com`.

Le DNS actuel de `soozey.com` indique un SPF oriente Hostinger :

```text
v=spf1 include:_spf.mail.hostinger.com include:_spf.reach.hostinger.com ~all
```

Et DMARC est en observation :

```text
v=DMARC1; p=none
```

Donc, pour une meilleure delivrabilite, il faut choisir une strategie coherente :

1. Continuer avec Gmail personnel `cirtmdg@gmail.com` : simple, mais la delivrabilite depend de la reputation du compte Gmail et Gmail peut classer les PDF en spam.
2. Utiliser une adresse du domaine `@soozey.com` via Hostinger SMTP : plus coherent avec le SPF actuel.
3. Utiliser Google Workspace pour `@soozey.com` : il faudra alors remplacer le SPF par une configuration incluant Google, activer DKIM Google Workspace et ajouter DMARC progressivement.

La recommandation production est l'option 2 ou 3, avec une adresse expediteur du domaine officiel.

## 8. Test rapide avec mail-tester.com

Avant un envoi massif :

1. Va sur `https://www.mail-tester.com/`.
2. Copie l'adresse de test fournie.
3. Cree temporairement un participant avec cette adresse email.
4. Envoie-lui un badge depuis `Participants > Actions > Envoi badge`.
5. Consulte le score sur mail-tester.

Le rapport indiquera precisement les problemes restants : SPF, DKIM, DMARC, IP ou reputation.

## 9. Configuration recommandee pour la production

Evite d'envoyer les badges en masse avec une adresse `@gmail.com`.

Preferer une adresse officielle du domaine, par exemple :

```text
inscription@soozey.com
badge@soozey.com
contact@soozey.com
```

Deux options propres :

1. SMTP Hostinger avec une adresse `@soozey.com`, puisque le SPF actuel autorise deja Hostinger.
2. Service specialise d'envoi transactionnel : Brevo, Resend, Mailgun, SendGrid.

Dans tous les cas, verifier :

```text
SPF   autorise le serveur SMTP utilise
DKIM  signe les emails du domaine expediteur
DMARC existe et commence idealement par p=none, puis durcit apres validation
```

Pour Gmail/Google Workspace avec `@soozey.com`, il faut configurer Google Workspace, activer DKIM dans la console Google Admin, et adapter le SPF pour inclure Google.

## 10. Piece jointe PDF

Le badge PDF genere par l'application est tres leger lors des tests locaux, environ quelques kilo-octets par badge. Il est donc acceptable en piece jointe.

Si un score mail-tester indique encore une penalite liee aux pieces jointes, la prochaine option serait de remplacer la piece jointe par un lien de telechargement public securise. Ce n'est pas active actuellement, car le besoin demande un badge en piece jointe.

## 7. Reprise apres coupure

Chaque badge envoye avec succes est memorise en base de donnees. Si l'envoi global est interrompu :

1. Retourne dans `Badges`.
2. Clique sur `Continuer l'envoi`.
3. Les badges deja envoyes seront sautes automatiquement.

Les echecs seront retentes, tandis que les succes ne seront pas renvoyes sauf si l'API est appelee avec l'option force cote serveur.
