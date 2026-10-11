
---

## 📄 Fichier 3 — `docs/blueprint/09-infrastructure/local-development.md`

**Changements :**
- Ajout de la création de `demepro_test` comme prérequis
- Note sur `NODE_ENV=test` et les headers `X-Test-*`
- Commandes de test mises à jour

```markdown
# Développement local

> **Section** : 09-infrastructure
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Prérequis

- Node.js 20+
- pnpm 10+
- Docker Desktop (mode Linux containers)
- PostgreSQL 17 (via Docker — container `demepro-postgres`)
- Redis 7 (via Docker)
- SeaweedFS (via Docker)

## Setup initial

```bash
# 1. Installer les dépendances
pnpm install

# 2. Configurer l'environnement
cp .env.example .env

# 3. Démarrer les services Docker
pnpm docker:up

# 4. Appliquer les migrations sur la base de dev
pnpm db:migrate

# 5. (Une seule fois) Créer la base de test
docker exec -it demepro-postgres psql -U demepro -c "CREATE DATABASE demepro_test;"

# 6. Lancer
pnpm dev