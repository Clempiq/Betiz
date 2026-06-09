# Cahier des charges — Betiz

> **Nom du projet :** Betiz — **Domaine :** betiz.app
> Plateforme de paris sportifs en argent fictif.
> Projet de side project. Document technique de référence pour le développement.
> Version 1 (MVP). Dernière mise à jour : juin 2026.

---

## 1. Vision du projet

Plateforme web (site + PWA) de paris sportifs **en argent fictif**. Les joueurs reçoivent des points gratuits, parient sur de vrais matchs avec de vraies cotes, et s'affrontent dans un **classement mensuel**. Les meilleurs gagnent des récompenses réelles (cartes cadeaux).

**Principe non négociable : aucun argent réel n'entre jamais dans le système côté joueur.** L'inscription et l'obtention de points sont 100 % gratuites. Le joueur ne peut jamais payer pour obtenir des points. C'est ce qui maintient le projet hors du régime des jeux d'argent régulés (ANJ).

**Objectif du projet** : actif d'audience + plaisir de construction + terrain de jeu pour une niche (Pokémon TCG / paris / streaming à terme). Pas une source de revenu attendue à court terme.

---

## 2. Périmètre V1 (MVP)

### Inclus dans la V1
- Inscription / connexion par email
- Confirmation d'âge 18+ à l'inscription (case à cocher / date de naissance)
- Distribution de points (dotation mensuelle + recharge quotidienne + pub récompensée)
- Paris pré-match sur de vrais matchs avec vraies cotes
- Plafond de cote totale par ticket
- Classement général mensuel avec reset
- Mise à jour du classement en temps réel
- Résolution automatique des paris après les matchs
- Notifications (PWA + fallback)
- Récompenses : cartes cadeaux pour le top du classement (financées manuellement au lancement)
- Système de badges / trophées (achievements)
- Vérification anti-multicompte (champs prévus en base dès le départ)

### Reporté en V1.5 / V2
- Système de groupes (compétition entre amis)
- Classement "vanité" (stats fun, sans récompense)
- Paris LIVE (cotes qui évoluent pendant le match)
- Récompenses par paliers étendus (top 100, top 500…) — dépend du budget
- Affiliation bookmaker / freebets
- Vérification téléphone au moment de réclamer une récompense

---

## 3. Économie de points

| Mécanisme | Valeur | Notes |
|-----------|--------|-------|
| Dotation de début de mois | 1000 points | Identique pour tous, au reset mensuel |
| Recharge quotidienne | 100 points/jour | Robinet anti-blocage, crée l'habitude de retour |
| Pub récompensée | 100 points | **1 pub/jour maximum** — soupape + micro-revenu. Via Google AdSense ou réseau similaire. En V1 dev : pub simulée (bouton "Regarder une pub" qui déclenche le crédit après X secondes). Le crédit réel sera déclenché par le callback du réseau pub en prod. |
| Plancher | Pas de blocage à zéro | Les recharges garantissent qu'on peut toujours rejouer |

**Logique de design :** perdre doit faire mal (il faut faire ×10 sur 100 points pour revenir à 1000), mais on peut toujours espérer remonter. Les recharges restent volontairement **modestes** pour que le classement reflète la performance et non le volume de points farmés.

**Reset mensuel :** au 1er de chaque mois, tous les soldes et le classement repartent à zéro. Tout le monde redémarre à 1000 points. C'est le principe d'une saison.

---

## 4. Mécanique de pari

- **Source des matchs et cotes :** API externe (voir section 8). **Pré-match uniquement en V1.**
- **Cote figée à la prise du pari :** la cote est enregistrée au moment où le joueur valide son ticket. Aucune réévaluation ensuite.
- **Plafond de cote totale par ticket : ×50.** S'applique à la **cote totale du ticket, combiné inclus** (pas par sélection individuelle). Verrou anti-YOLO de fin de mois.
- **Types de paris V1 :** simple et combiné.
- **Résolution :** automatique. Un job récupère les résultats des matchs terminés, calcule les gains (mise × cote pour les tickets gagnants), crédite les points, déclenche les notifications.

---

## 5. Classement

- **Base de classement V1 :** points accumulés (solde du joueur sur le mois).
- **Reset mensuel :** le classement et les soldes repartent à zéro le 1er du mois.
- **Mise à jour temps réel :** via Supabase Realtime (websockets). Le classement se met à jour automatiquement quand un joueur gagne, sans refresh manuel.
- **Récompenses V1 :** cartes cadeaux pour le haut du classement. Nombre limité au lancement (financement manuel). Le système doit permettre d'**augmenter facilement le nombre de gagnants récompensés** plus tard (paliers) sans refonte.

> Point de vigilance documenté : si les données montrent que le top est trusté par du volume plutôt que par de bons multiplicateurs, prévoir l'ajout d'un classement au ROI (rendement) en V2. Architecture à garder ouverte.

---

## 6. Badges / Trophées (achievements)

Système de récompenses symboliques à collectionner, pour donner un sentiment de progression même sans gagner le classement. Exemples :
- Faire passer un ticket à cote ×10 (ou paliers : ×10, ×20, ×50)
- Atteindre 500 000 points sur un mois
- Série de X paris gagnants consécutifs
- Premier pari, 100e pari, etc.
- (V2) Gagner un classement de groupe entre amis

Les badges sont **persistants** (ne se resettent pas avec le mois). C'est le contre-poids au reset : même si tu repars de zéro en points, tu gardes ta collection.

---

## 7. Lutte anti-multicompte

Le multicompte est le risque n°1 d'un classement avec récompense. Mesures V1 :
- Inscription par email avec **vérification email obligatoire**
- Champs prévus en base dès le départ pour le contrôle anti-fraude (voir modèle de données) : empreinte d'appareil/IP, statut de vérification, flags de comportement suspect
- (V2) Vérification téléphone (OTP) **au moment de réclamer une récompense** — c'est le point de contrôle le plus efficace car il ne gêne pas l'usage normal et bloque la fraude là où elle compte

Le plafond de cote (×50) limite aussi mécaniquement l'intérêt du multicompte (pas de jackpot loterie possible).

---

## 8. Stack technique

| Couche | Choix |
|--------|-------|
| Frontend | React + Vite + TailwindCSS |
| Format | Site web responsive + PWA installable |
| Backend / DB / Auth | Supabase (PostgreSQL, Auth, Realtime, Edge Functions) |
| Temps réel | Supabase Realtime (websockets natifs) |
| Tâches planifiées | Supabase Cron (pg_cron) / Edge Functions schedulées |
| Hébergement front | Vercel |
| Email (SMTP) | Resend (ou Brevo/Mailgun) — SMTP custom branché sur Supabase Auth |
| API cotes | The Odds API (démarrage) ou API-Football / API-Sports |

### Notes API cotes
- **The Odds API** : free tier ~500 req/mois, cotes pré-match multi-bookmakers. Payant au-delà.
- **API-Football (API-Sports)** : free tier ~100 req/jour, très complet (cotes, events, scores).
- Démarrer en pré-match. Mettre en cache les cotes pour limiter la consommation d'API.
- **Stratégie de consommation API (The Odds API) :** une seule requête retourne toutes les cotes de tous les matchs à venir pour un sport/league donné. Pour rester dans les 500 req/mois avec 2-3 leagues : ne rafraîchir que dans les 48h précédant les matchs (pas de polling permanent). Concrètement : cron toutes les 2h qui ne fait la requête que si des matchs sont prévus dans les prochaines 48h. Affiner au moment de l'intégration. Au lancement : limiter à 1-2 leagues pour garder de la marge.

### Notes email (SMTP)
- **Ne pas utiliser le SMTP intégré de Supabase :** il est bridé (quelques mails/heure) et explicitement déconseillé en production. Il bloque aussi bien les tests que l'usage réel.
- **Brancher un SMTP custom dès le départ** dans les réglages Auth de Supabase. Recommandé : **Resend** (gratuit jusqu'à ~3000 mails/mois, orienté dev, simple). Alternatives : Brevo, Mailgun.
- **Un seul setup couvre deux besoins :** la vérification email à l'inscription ET les notifications par email (fallback push). Même canal.
- Le design des mails (vérification, notifs) est géré côté projet, pas par les templates par défaut Supabase.

### Notes PWA / Notifications
- **Android :** notifications push PWA pleinement supportées.
- **iOS :** push uniquement si l'utilisateur a "ajouté à l'écran d'accueil" la PWA (iOS 16.4+). Sinon pas de push.
- **Conséquence :** pousser activement à l'installation de la PWA + prévoir un **fallback** (notification in-app et/ou email) pour les utilisateurs sans push.
- **Événements notifiés :** pari gagné/perdu, crédit de la dotation mensuelle, recharge quotidienne disponible, changement de position notable au classement, badge débloqué.

---

## 9. Modèle de données (schéma indicatif Supabase / PostgreSQL)

> Schéma de départ, à affiner pendant le dev.

### `profiles`
- `id` (uuid, FK auth.users)
- `username` (text, unique)
- `email_verified` (bool)
- `date_of_birth` (date, nullable) — vérif âge 18+
- `age_confirmed` (bool, default false) — confirmation 18+ à l'inscription
- `created_at` (timestamp)
- `device_fingerprint` (text, nullable) — anti-fraude
- `signup_ip` (text, nullable) — anti-fraude
- `is_flagged` (bool, default false) — anti-fraude
- `phone_verified` (bool, default false) — pour V2, présent dès le départ

### `balances`
Le "porte-monnaie" du joueur — une ligne par joueur par saison.
- `user_id` (uuid, FK profiles)
- `season_id` (FK seasons)
- `points` (bigint)
- `updated_at` (timestamp)

> **Lifecycle :** à l'inscription, création d'une ligne pour la saison active avec 1000 pts. Au reset mensuel (cron 1er du mois) : la saison se clôture (status → closed), le classement final est snapshot dans `rewards`, puis une nouvelle saison est créée et une ligne à 1000 pts est insérée pour chaque joueur ayant un profil actif.

### `seasons`
- `id` (uuid)
- `month` (date) — le mois concerné
- `started_at` / `ends_at`
- `status` (enum: active, closed)

### `point_grants` (traçabilité de toute distribution de points)
- `id` (uuid)
- `user_id`
- `season_id`
- `type` (enum: monthly, daily, ad_reward)
- `amount` (int)
- `granted_at` (timestamp)
- > Sert à empêcher les doubles crédits (1 daily/jour, 1 ad/jour max).

### `matches`
- `id` (uuid)
- `external_id` (text) — id côté API cotes
- `sport` / `league`
- `home_team` / `away_team`
- `start_time`
- `status` (enum: upcoming, live, finished)
- `result` (jsonb, nullable)

### `odds`
- `id`
- `match_id` (FK matches)
- `market` (text) — 1N2, etc.
- `selection` (text)
- `value` (numeric) — la cote
- `updated_at`

### `bets`
- `id` (uuid)
- `user_id`
- `season_id`
- `stake` (int) — mise en points
- `total_odds` (numeric) — cote totale figée, ≤ 50
- `potential_payout` (bigint)
- `status` (enum: pending, won, lost, void)
- `placed_at`
- `settled_at` (nullable)

### `bet_selections` (lignes d'un combiné)
- `id`
- `bet_id` (FK bets)
- `match_id`
- `market` / `selection`
- `odds_value` — cote figée de cette sélection
- `status` (enum: pending, won, lost, void)

### `achievements` (catalogue de badges)
- `id`
- `code` (text, unique)
- `name` / `description`
- `criteria` (jsonb)

### `user_achievements` (badges débloqués — persistants, hors saison)
- `user_id`
- `achievement_id`
- `unlocked_at`

### `rewards` (récompenses distribuées)
- `id`
- `season_id`
- `user_id`
- `rank` (int) — position finale
- `type` (enum: gift_card, freebet, badge)
- `value` / `details` (jsonb)
- `status` (enum: pending, sent, claimed)

---

## 10. Tâches planifiées (crons)

| Cron | Fréquence | Rôle |
|------|-----------|------|
| Distribution mensuelle | 1er du mois 00:00 | Clôture saison N-1, calcule les gagnants, crée la saison N, crédite 1000 pts à tous |
| Recharge quotidienne | Chaque jour 00:00 | Crédite 100 pts à chaque joueur (idempotent via `point_grants`) |
| Import des matchs/cotes | Plusieurs fois/jour | Récupère matchs à venir et cotes depuis l'API, met en cache |
| Résolution des paris | Toutes les X min | Récupère résultats des matchs terminés, résout `bets` et `bet_selections`, crédite gains, déclenche notifs |
| Évaluation des badges | Après résolution | Vérifie les critères d'achievement et débloque |

**Idempotence impérative :** chaque crédit de points doit être protégé contre les doubles exécutions (le cron peut tourner deux fois). D'où la table `point_grants` qui trace chaque distribution unique (user + type + jour).

---

## 11. Cadre légal (rappel)

- Modèle gratuit en entrée = jeu-concours / loterie publicitaire, hors régime ANJ. **Ne jamais introduire d'achat de points** (basculerait en jeu d'argent illégal).
- **Vérification d'âge 18+** à prévoir (dès qu'il y a des récompenses à valeur réelle).
- **Mentions légales jeu responsable** sur le site.
- CGU claires : les points n'ont aucune valeur monétaire, ne sont pas convertibles en argent, ne sont pas remboursables.
- RGPD : consentement, politique de confidentialité, gestion des données anti-fraude (IP, fingerprint) à documenter.

---

## 12. Risques connus et parades

| Risque | Parade |
|--------|--------|
| YOLO de fin de mois sur grosse cote | Plafond cote totale ×50 |
| Multicompte pour multiplier les tickets | Vérif email + champs anti-fraude en base + vérif téléphone au claim (V2) |
| Farming de points faciles fausse le classement | Recharges modestes ; option classement ROI en V2 |
| Démotivation du milieu de tableau | Badges persistants ; paliers de récompenses quand le budget suit |
| Coût des récompenses non soutenable (cf. échec Beticious) | Récompenses bornées au classement (coût fixe et prévisible) ; financement manuel maîtrisé au début |
| Sur-investissement technique (le live a coûté cher à Beticious) | Pré-match only en V1, live repoussé en V2 |
| Pas d'audience au lancement = premier tournoi vide | Lancer sur une niche déjà accessible (Pokémon/streaming) ; stratégie de comm à définir |
| Push iOS limité | Pousser l'installation PWA + fallback in-app/email |
