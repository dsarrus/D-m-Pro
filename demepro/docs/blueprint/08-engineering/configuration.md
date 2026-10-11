# Configuration

> **Section** : 08-engineering
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Variables d'environnement

| Variable | Description | Requis |
|---|---|---|
| NODE_ENV | development / production | ✅ |
| DATABASE_URL | URL PostgreSQL | ✅ |
| JWT_SECRET | Clé de signature JWT | ✅ |
| JWT_EXPIRES_IN | Durée access token | ✅ |
| LOG_LEVEL | Niveau de log | ❌ |
| S3_BUCKET | Bucket de stockage | ✅ |
| S3_REGION | Région S3 | ✅ |

## Validation

Au démarrage, toutes les variables sont validées :

```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});
```

## Secrets

- Jamais commités
- Utiliser un vault (AWS Secrets Manager, Doppler)
- Rotation régulière

---

## Statut du document

| Champ | Valeur |
|---|---|
| Version | 0.1.0 |
| Statut | 🚧 Draft |
| Auteur | — |
| Relecteurs | — |
| Dernière mise à jour | 2026-10-10 |

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
