# C4 — Container View

> **Section** : 04-architecture
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Conteneurs

| Conteneur | Technologie | Responsabilité |
|---|---|---|
| Web | Next.js | Interface client |
| Admin | Next.js | Backoffice |
| API | Express + TS | Backend |
| DB | PostgreSQL 16 | Persistance |
| Cache | Redis (à venir) | Sessions, cache |
| Storage | S3 / MinIO | Fichiers |

## Diagramme

```
[Client] ──► [Web] ──► [API] ──► [DB]
                        │
                        ├──► [Storage]
                        └──► [Payment]
```

## Communication

| Source | Cible | Protocole |
|---|---|---|
| Web | API | REST / JSON |
| API | DB | Prisma / TCP |
| API | Storage | S3 API |

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
