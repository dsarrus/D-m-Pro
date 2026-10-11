# Sécurité des fichiers

> **Section** : 07-security
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-10

## Upload

- Validation MIME + extension
- Taille max 10 Mo
- Scan antivirus (ClamAV)
- Stockage dans un bucket privé

## Accès

- **Signed URLs** avec expiration 15 min
- Pas d'accès direct public
- CDN avec token

## Nommage

- UUID comme nom de fichier (pas de nom original)
- Préfixe par type : `products/`, `avatars/`

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
