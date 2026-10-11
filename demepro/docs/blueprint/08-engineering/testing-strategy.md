# Stratégie de tests

> **Section** : 08-engineering
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Pyramide

```
        ▲
       ╱ ╲         E2E (peu)
      ╱───╲
     ╱     ╲       Integration (moyen)
    ╱───────╲
   ╱         ╲     Unit (beaucoup)
  ╱───────────╲
```

## Types

| Type | Outil | Cible | Base de données |
|---|---|---|---|
| Unit | Vitest | Fonctions pures, logique isolée | ❌ Aucune |
| Integration | Vitest | Services + Repositories + DB | ✅ `demepro_test` |
| E2E | Vitest + Supertest | Routes HTTP complètes | ✅ `demepro_test` |

## Couverture cible

| Couche | Cible |
|---|---|
| Services | 90% |
| Repositories | 80% |
| Controllers | 70% |
| Global | 80% |

## Conventions

- Un fichier de test par fichier source
- `*.test.ts` → tests unitaires
- `*.integration.test.ts` → tests DB et services
- `*.e2e.test.ts` → tests HTTP bout-en-bout
- Nommer les tests avec un verbe d'action (`crée`, `refuse`, `empêche`, `accumule`)

## Architecture des tests d'intégration

### Base de données

Les tests d'intégration et e2e utilisent la base **`demepro_test`**, hébergée dans le container
`demepro-postgres` partagé avec l'environnement de développement local.

**Prérequis** (à faire une seule fois) :

```bash
# Vérifier que demepro-postgres tourne
docker ps | grep demepro-postgres

# Créer la base de test
docker exec -it demepro-postgres psql -U demepro -c "CREATE DATABASE demepro_test;"
