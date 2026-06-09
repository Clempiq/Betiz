# ROADMAP — Betiz MVP (Coupe du Monde 2026)

> Contexte : la Coupe du Monde 2026 commence le **11 juin 2026**. On a 2 jours pour avoir une V1 jouable. Ce document est la feuille de route à suivre à la lettre. Mettre à jour le statut de chaque étape au fur et à mesure.
>
> Légende : ⬜ À faire · 🔄 En cours · ✅ Fait · ⏭️ Reporté V2

---

## PRÉ-REQUIS MANUELS (à faire avant de coder)

Ces étapes ne peuvent pas être faites par Claude — elles nécessitent la création de comptes et la récupération de clés.

- [ ] **Supabase** : créer un projet sur [supabase.com](https://supabase.com). Récupérer : `Project URL`, `anon key`, `service_role key`.
- [ ] **Vercel** : compte connecté au repo GitHub du projet.
- [ ] **The Odds API** : créer un compte sur [the-odds-api.com](https://the-odds-api.com) (free tier). Récupérer la clé API.
- [ ] **Resend** : créer un compte sur [resend.com](https://resend.com), vérifier le domaine `betiz.app`, récupérer les identifiants SMTP. Les brancher dans Supabase Auth → Settings → SMTP.
- [ ] **Repo GitHub** : créer le repo `betiz` (privé ou public), le cloner en local.

---

## PHASE 1 — Socle technique ⬜

> Durée estimée : 1-2h | Objectif : projet qui tourne en local avec Supabase connecté.

### 1.1 Init projet
- [ ] `npm create vite@latest betiz -- --template react`
- [ ] Installer TailwindCSS v3 + PostCSS
- [ ] Installer `@supabase/supabase-js`
- [ ] Créer `.env.local` avec les variables Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] Créer `src/lib/supabase.js` (client Supabase)
- [ ] Vérifier que `npm run dev` fonctionne

### 1.2 Structure de dossiers
```
src/
  components/       # composants UI réutilisables
  pages/            # pages principales (Auth, Home, Matches, Bets, Leaderboard)
  hooks/            # custom hooks React
  lib/              # supabase.js, helpers
  contexts/         # AuthContext
```

### 1.3 Schéma de base de données (migration SQL Supabase)
Créer via Supabase Dashboard → SQL Editor ou Supabase CLI :

- [ ] Table `profiles` (id, username, email_verified, date_of_birth, age_confirmed, device_fingerprint, signup_ip, is_flagged, phone_verified, created_at)
- [ ] Table `seasons` (id, month, started_at, ends_at, status)
- [ ] Table `balances` (user_id, season_id, points, updated_at) — clé primaire composite (user_id, season_id)
- [ ] Table `point_grants` (id, user_id, season_id, type, amount, granted_at) — contrainte UNIQUE (user_id, type, date_trunc('day', granted_at)) pour idempotence
- [ ] Table `matches` (id, external_id, sport, league, home_team, away_team, start_time, status, result)
- [ ] Table `odds` (id, match_id, market, selection, value, updated_at)
- [ ] Table `bets` (id, user_id, season_id, stake, total_odds, potential_payout, status, placed_at, settled_at)
- [ ] Table `bet_selections` (id, bet_id, match_id, market, selection, odds_value, status)
- [ ] Table `achievements` (id, code, name, description, criteria)
- [ ] Table `user_achievements` (user_id, achievement_id, unlocked_at)
- [ ] Table `rewards` (id, season_id, user_id, rank, type, value, details, status)

### 1.4 Politiques RLS
- [ ] Activer RLS sur toutes les tables
- [ ] `profiles` : SELECT public, INSERT/UPDATE own row only
- [ ] `balances` : SELECT public (pour le classement), INSERT/UPDATE own row only
- [ ] `bets` / `bet_selections` : SELECT/INSERT own rows only
- [ ] `matches` / `odds` : SELECT public (lecture seule pour les joueurs)
- [ ] `point_grants` : SELECT own rows only, INSERT via service_role uniquement
- [ ] `user_achievements` : SELECT public, INSERT via service_role uniquement

### 1.5 Trigger SQL : création automatique du profil
- [ ] Créer un trigger `on_auth_user_created` sur `auth.users` → insère dans `profiles` + crée la ligne `balances` pour la saison active à 1000 pts

**✅ Validation phase 1 :** l'app tourne en local, le client Supabase est connecté, les tables existent dans Supabase.

---

## PHASE 2 — Authentification ⬜

> Durée estimée : 2-3h | Objectif : inscription, connexion, déconnexion fonctionnelles.

- [ ] `AuthContext` React (user, session, loading)
- [ ] Page `/auth` : formulaire inscription (email, password, username, date de naissance, case 18+)
- [ ] Page `/auth` : formulaire connexion (email, password)
- [ ] Validation côté client : âge ≥ 18, tous les champs requis
- [ ] Gestion de l'email de vérification (page "Vérifie ton email")
- [ ] Route protégée : redirect vers `/auth` si non connecté
- [ ] Déconnexion
- [ ] **Setup Resend + SMTP Supabase** (guide pas à pas si pas encore fait)

**✅ Validation phase 2 :** je peux m'inscrire, recevoir l'email de vérification, me connecter, voir mon profil, me déconnecter.

---

## PHASE 3 — Distribution de points ⬜

> Durée estimée : 2h | Objectif : les points arrivent automatiquement, sans doublon possible.

- [ ] **Créer la saison initiale** : insérer manuellement la première saison (juin 2026) en base
- [ ] **Edge Function** `daily-grant` : crédite 100 pts/jour à chaque joueur (idempotent via `point_grants`)
- [ ] **Edge Function** `monthly-reset` : clôture la saison, snapshot classement, crée la nouvelle saison, crédite 1000 pts à tous
- [ ] **Cron pg_cron** : `daily-grant` tous les jours à 00:00 UTC
- [ ] **Cron pg_cron** : `monthly-reset` le 1er du mois à 00:00 UTC
- [ ] Afficher le solde de points dans le header/profil

**✅ Validation phase 3 :** le solde est visible, la fonction `daily-grant` peut être appelée manuellement et ne crédite pas deux fois.

---

## PHASE 4 — Matchs & Cotes (Coupe du Monde uniquement) ⬜

> Durée estimée : 2-3h | Objectif : les matchs de la CdM 2026 sont visibles avec leurs cotes.

- [ ] **Edge Function** `sync-matches` :
  - Appel The Odds API : sport = `soccer_fifa_world_cup` (vérifier le slug exact)
  - Upsert dans `matches` et `odds` (éviter les doublons via `external_id`)
  - Ne déclencher que si des matchs sont prévus dans les 48h suivantes
- [ ] **Cron pg_cron** : `sync-matches` toutes les 2h
- [ ] Appel manuel initial pour peupler la base avant le lancement
- [ ] Page `/matches` : liste des matchs à venir avec leurs cotes (1 / N / 2)
- [ ] Affichage : nom des équipes, heure du match, cotes

**✅ Validation phase 4 :** les matchs CdM sont visibles sur l'app avec leurs cotes réelles.

---

## PHASE 5 — Placement de paris ⬜

> Durée estimée : 3-4h | Objectif : je peux parier sur un match, mon solde est débité.

- [ ] **Edge Function** `place-bet` (logique côté serveur uniquement) :
  - Vérifier solde suffisant
  - Vérifier plafond cote totale ≤ 50 (×50)
  - Débiter la mise de `balances`
  - Insérer dans `bets` + `bet_selections`
  - Retourner le ticket créé
- [ ] Page `/matches` : bouton "Parier" sur chaque cote → ouvre un panneau de pari
- [ ] Composant ticket de pari : sélection, mise, cote totale, gain potentiel, bouton valider
- [ ] Pari simple d'abord, combiné en second (même Edge Function, plusieurs `bet_selections`)
- [ ] Page `/bets` ou onglet "Mes paris" : historique (pending / won / lost)

**✅ Validation phase 5 :** je peux parier sur un match, mon solde diminue, le pari apparaît dans mes paris en attente.

---

## PHASE 6 — Résolution des paris ⬜

> Durée estimée : 2-3h | Objectif : les paris se résolvent automatiquement après les matchs.

- [ ] **Edge Function** `settle-bets` :
  - Récupérer les matchs terminés (status `finished`) via The Odds API (scores)
  - Mettre à jour `matches.result` et `matches.status`
  - Pour chaque `bet_selection` concernée : vérifier si la sélection est gagnante, mettre à jour le statut
  - Pour chaque `bet` dont toutes les sélections sont résolues : calculer le statut global (won / lost), créditer les gains si won
  - Marquer le `bet` comme settled
- [ ] **Cron pg_cron** : `settle-bets` toutes les 15 minutes
- [ ] Mettre à jour l'affichage du statut des paris dans `/bets`

**✅ Validation phase 6 :** après un match terminé, les paris sont résolus et les gains crédités.

---

## PHASE 7 — Classement ⬜

> Durée estimée : 1-2h | Objectif : un classement en temps réel des joueurs.

- [ ] Vue SQL `leaderboard` : classement par solde DESC pour la saison active (avec username, rang, points)
- [ ] Page `/leaderboard` : tableau du classement
- [ ] **Supabase Realtime** : souscription aux changements de `balances` pour la saison active → mise à jour du classement sans refresh
- [ ] Mettre en évidence la position du joueur connecté

**✅ Validation phase 7 :** le classement se met à jour en temps réel quand quelqu'un gagne.

---

## PHASE 8 — Déploiement ⬜

> Durée estimée : 1h | Objectif : l'app est accessible sur betiz.app.

- [ ] Pusher le code sur GitHub
- [ ] Connecter le repo à Vercel, configurer les variables d'environnement (Supabase URL, anon key, etc.)
- [ ] Configurer le domaine `betiz.app` sur Vercel
- [ ] Vérifier les Edge Functions en prod (les redéployer depuis Supabase si nécessaire)
- [ ] Test end-to-end en prod : inscription → pari → classement

**✅ Validation phase 8 :** l'app est live sur betiz.app, fonctionnelle de bout en bout.

---

## PHASE 9 — Finitions avant lancement ⬜

> À faire entre la mise en ligne et le coup d'envoi du 11 juin.

- [ ] **PWA** : `manifest.json` (nom, icône, couleurs), `service-worker` minimal pour "Ajouter à l'écran d'accueil"
- [ ] Page d'accueil `/` : pitch du projet, bouton inscription/connexion
- [ ] **Pub simulée** : bouton "Regarder une pub (+100 pts)" avec compte à rebours 30s, appel Edge Function pour créditer (idempotent, 1/jour)
- [ ] Mentions légales : CGU rapide (points sans valeur monétaire), vérification d'âge, jeu responsable
- [ ] Meta tags / OG pour le partage social
- [ ] Design/UI : cohérence des couleurs, logo Betiz

---

## PHASE 10 — Post-lancement (pendant la CdM) ⏭️

> À planifier après le lancement, selon les retours.

- [ ] Badges / trophées (critères simples : premier pari, cote ×10, etc.)
- [ ] Notifications in-app (pari résolu, recharge disponible)
- [ ] PWA push notifications (Android)
- [ ] Combiné amélioré (UI multi-sélection plus fluide)
- [ ] Récompenses : désignation manuelle des gagnants en fin de saison
- [ ] Pub récompensée via Google AdSense (remplace la pub simulée)

---

## VARIABLES D'ENVIRONNEMENT À CONFIGURER

```env
# .env.local (front)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Supabase Edge Functions (secrets)
SUPABASE_SERVICE_ROLE_KEY=
ODDS_API_KEY=
```

---

## NOTES DE SESSION

> Utiliser cette section pour noter les décisions prises en cours de dev, les blocages, les choses à ne pas oublier.

- **Seul sport en V1 :** Coupe du Monde FIFA 2026 (`soccer_fifa_world_cup` — slug à vérifier dans The Odds API)
- **Cote max ticket :** ×50, vérifié côté serveur dans `place-bet`
- **Idempotence :** toute distribution de points passe par `point_grants` (contrainte unique user + type + jour)
- **Pub V1 :** simulée avec compte à rebours, créditée via Edge Function (même idempotence que les autres grants)
- **Resend SMTP :** à brancher AVANT de tester l'inscription (sinon les emails de vérification ne partent pas)
