## 📄 Fichier 2 — `docs/blueprint/08-engineering/quality-gates.md`

**Changements :**
- Note sur les 142 tests actuels
- Cohérence avec la nouvelle stratégie de test

```markdown
# Quality Gates

> **Section** : 08-engineering
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## CI Pipeline
Push → Lint → Typecheck → Unit → Integration → Build → Deploy
```

## Bloquants

| Étape | Bloquant | Détail |
|---|---|---|
| ESLint | ✅ | Zéro erreur |
| TypeScript | ✅ | Zéro erreur de type |
| Tests unit | ✅ | Tous verts |
| Tests integration | ✅ | Tous verts (142 tests actuels) |
| Tests e2e | ✅ | Tous verts (inclus dans integration) |
| Build | ✅ | Build API + Web + Admin |
| Coverage < 80% | ⚠️ Warning | Non bloquant pour l'instant |

## Tests requis avant merge

Toute PR qui touche `apps/api/src/modules/catalog/**` doit garantir :

- ✅ Tous les tests unitaires passent
- ✅ Tous les tests d'intégration passent
- ✅ Les invariants documentés dans `testing-strategy.md` restent verts
- ✅ Aucune régression de couverture

### Vérification locale avant push

```bash
# 1. Lint
pnpm lint

# 2. Typecheck
pnpm typecheck

# 3. Tests unit
pnpm --filter @demepro/api test:unit

# 4. Tests intégration
pnpm --filter @demepro/api test:integration
