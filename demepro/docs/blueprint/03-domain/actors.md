# Acteurs

> **Section** : 03-domain
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Acteurs humains

| Acteur | Description | Permissions |
|---|---|---|
| Visiteur | Non authentifié | Lecture publique |
| Client | Acheteur authentifié | Achat, consultation |
| Professionnel | Vendeur | Gestion boutique |
| Admin | Administrateur | Modération |
| Super Admin | — | Tout |

## Acteurs système

| Acteur | Description |
|---|---|
| Payment Provider | Orange Money, Wave, etc. |
| Notification Service | Email, SMS |
| Storage | S3 / CDN |

## Interactions

```
Client ──► [API] ──► Catalog
Professionnel ──► [API] ──► Catalog + Store
Payment Provider ──► [Webhook] ──► Payment
```

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
