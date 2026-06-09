# Prompt de démarrage — Claude Cowork

> Copie-colle ce prompt pour lancer ta première session de développement avec Cowork, une fois le dossier (avec `CAHIER_DES_CHARGES.md` et `CLAUDE.md`) partagé.

---

Salut. On démarre le développement d'un nouveau projet ensemble. Tu as accès à un dossier contenant deux fichiers de référence : `CAHIER_DES_CHARGES.md` (la spec complète) et `CLAUDE.md` (les règles et conventions à respecter pendant tout le dev).

**Commence par lire ces deux fichiers en entier avant de proposer quoi que ce soit.**

Le projet en résumé : une plateforme web + PWA de paris sportifs en argent fictif (points gratuits, vrais matchs, vraies cotes, classement mensuel, récompenses en cartes cadeaux pour les meilleurs). Stack : React + Vite + Tailwind + Supabase + Vercel.

Mon profil : je suis développeur frontend (React/JavaScript), à l'aise sur le front, moins sur la partie backend/infra. Sois pédagogue sur Supabase (Edge Functions, cron, Realtime, RLS) où j'ai moins d'expérience. Je préfère les réponses directes et actionnables.

**Pour cette première session, je voudrais qu'on cale ensemble :**

1. Une **revue rapide de la spec** : est-ce que tu vois des incohérences, des trous, ou des décisions techniques à trancher avant de coder ? Dis-le-moi franchement.
2. La **mise en place du socle** : initialisation du projet Vite + Tailwind, structure de dossiers, connexion à Supabase, et création des premières tables (`profiles`, `seasons`, `balances`) avec leurs politiques RLS.
3. Un **plan de développement** découpé en tranches verticales (suis l'ordre suggéré dans le CLAUDE.md, mais propose des ajustements si pertinent).

Ne code pas tout d'un coup : on avance tranche par tranche, et on teste à chaque étape avant de continuer. Si tu as besoin d'infos de ma part (clés API, choix de nom, préférences), demande-les-moi avant de supposer.

On commence par les points 1 et 3 (revue + plan), puis on attaque le socle. C'est parti.
