# CLAUDE.md — Guide de développement Betiz

> Ce fichier garde Claude Cowork aligné sur la vision et les conventions du projet tout au long du développement. À lire au début de chaque session.

## Le projet en une phrase

**Betiz** (domaine : betiz.app) — plateforme web + PWA de paris sportifs en **argent fictif** : les joueurs reçoivent des points gratuits, parient sur de vrais matchs avec de vraies cotes, et s'affrontent dans un classement mensuel avec récompenses réelles (cartes cadeaux) pour les meilleurs.

Le cahier des charges complet est dans `CAHIER_DES_CHARGES.md`. **Le lire avant toute décision d'architecture.**

## Règles absolues (ne jamais enfreindre)

1. **Aucun argent réel côté joueur.** Jamais d'achat de points, jamais de conversion points → argent. C'est ce qui garde le projet légal (hors régime ANJ). Toute fonctionnalité qui s'en approche doit être signalée, pas implémentée.
2. **Plafond de cote totale par ticket = ×50**, combiné inclus. Vérifié côté serveur, jamais seulement côté client.
3. **Tous les crédits de points sont idempotents.** Un cron peut tourner deux fois : un joueur ne doit jamais recevoir deux fois sa recharge du jour. Passer par la table `point_grants`.
4. **Toute logique sensible (résolution de paris, crédit de points, calcul du classement) est côté serveur** (Edge Functions / SQL), jamais dans le client. Le front n'est jamais source de vérité sur les points.

## Stack et conventions

- **Frontend :** React + Vite + TailwindCSS. Composants fonctionnels, hooks.
- **Backend :** Supabase (Postgres, Auth, Realtime, Edge Functions, pg_cron).
- **Temps réel :** Supabase Realtime pour le classement (pas de polling).
- **Hébergement :** Vercel.
- **Langue du code :** noms de variables/fonctions en anglais, commentaires en français OK.
- **Langue de l'UI :** français.

## Ordre de construction recommandé (MVP)

Construire par tranches verticales fonctionnelles, pas couche par couche. Suggestion :

1. **Socle :** projet Vite + Tailwind, connexion Supabase, schéma de base (tables `profiles`, `seasons`, `balances`).
2. **Auth :** inscription/connexion email + vérification email + confirmation d'âge 18+. Création automatique du profil + dotation initiale.
3. **Distribution de points :** cron recharge quotidienne + dotation mensuelle, table `point_grants` idempotente. Tester les doublons.
4. **Matchs & cotes :** intégration API (pré-match), import en cache dans `matches` / `odds`.
5. **Paris :** placement de ticket (simple + combiné), validation du plafond ×50 côté serveur, débit de la mise.
6. **Résolution :** cron qui récupère les résultats, résout les tickets, crédite les gains.
7. **Classement :** vue classement mensuelle, mise à jour temps réel via Realtime.
8. **Notifications :** PWA push (Android) + fallback in-app/email. Pousser l'installation PWA.
9. **Badges :** catalogue + évaluation après résolution.
10. **Récompenses :** désignation des gagnants en fin de saison, table `rewards`, process manuel d'envoi des cartes au début.

À chaque tranche : tester avant de passer à la suivante. Garder l'app fonctionnelle en permanence.

## Principes de design produit (le "pourquoi")

Ces décisions ont été pesées, ne pas les remettre en cause sans raison forte :

- **Reset mensuel du classement ET des points**, mais **badges persistants.** Le reset crée la compétition récurrente et l'égalité de départ ; les badges donnent un acquis qu'on ne perd jamais. C'est l'équilibre entre fraîcheur compétitive et sentiment de progression.
- **Recharges volontairement modestes.** Assez pour ne jamais être bloqué et toujours espérer remonter, pas assez pour que farmer des points batte un bon parieur. Si ça déséquilibre, on baissera ou on passera au classement ROI (prévu V2).
- **Pré-match only en V1.** Le live est techniquement coûteux (c'est ce qui a plombé un prédécesseur, Beticious). On le garde pour la V2.
- **Récompenses bornées au classement.** Le coût est fixe et prévisible quel que soit le nombre de joueurs — c'est ce qui rend le modèle soutenable là où le seuil-à-débloquer ne l'était pas.

## Ce qui est explicitement reporté (ne pas construire en V1)

Groupes/amis, classement vanité, paris live, paliers de récompenses étendus, affiliation bookmaker, vérification téléphone. Prévoir l'architecture pour ne pas se bloquer, mais ne pas implémenter.

## Anti-fraude

Le multicompte est le risque n°1. Dès la V1 : vérif email obligatoire + champs `device_fingerprint`, `signup_ip`, `is_flagged`, `phone_verified` présents en base même si pas tous exploités. La vérif téléphone au moment de réclamer une récompense viendra en V2.

## Email / SMTP — guider l'utilisateur pas à pas

Le SMTP intégré de Supabase est bridé (quelques mails/heure) et inutilisable en prod comme en test. **Il faut brancher un SMTP custom (Resend recommandé) sur Supabase Auth dès la mise en place de l'authentification.**

L'utilisateur est développeur frontend et a moins d'expérience sur cette partie infra. **Le guider explicitement, étape par étape** : création du compte Resend, vérification du domaine d'envoi (enregistrements DNS), récupération des identifiants SMTP, saisie dans les réglages Auth de Supabase, et test d'envoi. Ne pas supposer que c'est déjà fait : vérifier avec lui avant de passer à la suite. Ce même canal servira ensuite aux notifications par email.
