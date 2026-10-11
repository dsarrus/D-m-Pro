
---

## 📄 Fichier 5 — `docs/blueprint/10-decisions/ADR-006-prisma.md`

**Statut** : ⚠️ **Vide.** Juste un template. À remplir avec la vraie décision Prisma.

**Patch — remplace le contenu par :**

```markdown
# ADR-006 — Prisma ORM

- **Date** : 2026-10-10
- **Statut** : Accepté
- **Décideurs** : Équipe DɛmɛPro
- **Consultés** : —

## Contexte

Le projet DɛmɛPro nécessite un ORM TypeScript pour PostgreSQL, avec les contraintes
suivantes :

- Typage strict de bout en bout (schéma → types TS)
- Migrations versionnées et déterministes
- Support des transactions (notamment Serializable pour l'inventaire)
- Compatible avec un monorepo pnpm
- Doit pouvoir tourner en serverless à terme

Les alternatives considérées étaient Drizzle, TypeORM, Kysely, ou du SQL brut.

## Décision

Nous utilisons **Prisma 7** avec :

- **Driver adapter** `@prisma/adapter-pg` (au lieu du connecteur natif)
- **Config centralisée** dans `prisma7.config.ts` à la racine du monorepo
- **Client généré** dans `apps/api/src/generated/prisma/`
- **Singleton lazy** via Proxy (`apps/api/src/infrastructure/database/prisma.ts`)

## Conséquences

### Positives

- **Typage end-to-end** : les types du schéma sont générés et utilisés partout
- **Migrations versionnées** : chaque changement de schéma est un fichier SQL signé
- **Prisma Studio** : outil d'exploration visuel
- **Driver adapter** : permet de passer à Neon, Vercel Postgres, ou un pooler
  sans changer le code métier
- **Lazy singleton** : pas de connexion instanciée avant le premier accès,
  ce qui permet d'override `DATABASE_URL` dans les tests

### Négatives

- **Bundle size** : le client Prisma est volumineux (~3 MB), acceptable côté serveur
- **Runtime** : engine binaire, plus lourd que Drizzle ou Kysely
- **Config centralisée** : les chemins relatifs (`--config ../../prisma7.config.ts`)
  doivent être maintenus si le monorepo change

### Neutres

- **Syntaxe** : API Prisma, largement adoptée dans la communauté TypeScript
- **Contraintes CHECK** : non supportées nativement par Prisma → écrites dans
  des migrations SQL manuelles (`inventory_xor_owner_check`)
- **Extensions PostgreSQL** : `pgcrypto` pour `gen_random_uuid()` (natif depuis PG 13)

## Alternatives considérées

### Alternative 1 — Drizzle ORM

- **Avantages** : léger, SQL-like, pas d'engine binaire
- **Inconvénients** : moins mature, écosystème plus petit, migrations moins
  outillées
- **Raison du rejet** : Prisma offre un meilleur DX pour l'équipe, notamment
  avec Prisma Studio et le typage généré

### Alternative 2 — TypeORM

- **Avantages** : mature, écosystème large
- **Inconvénients** : typage moins strict, migrations fragiles, API décorateurs
  qui se marient mal avec l'approche fonctionnelle
- **Raison du rejet** : Prisma plus adapté au typage strict

### Alternative 3 — SQL brut (Kysely ou pg)

- **Avantages** : contrôle total, performance maximale
- **Inconvénients** : duplication de code, perte du typage automatique,
  maintenance plus lourde
- **Raison du rejet** : le gain de performance ne justifie pas le coût de maintenance

## Références

- [Prisma 7 docs](https://www.prisma.io/docs)
- [Driver adapters](https://www.prisma.io/docs/orm/overview/databases/database-drivers)
- `apps/api/src/infrastructure/database/prisma.ts` — Singleton lazy
- `prisma7.config.ts` — Configuration centralisée
- `docs/blueprint/08-engineering/testing-strategy.md` — Réutilisation du singleton en test