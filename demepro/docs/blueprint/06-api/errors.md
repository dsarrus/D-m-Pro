# Erreurs API

> **Section** : 06-api
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Format standard

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_SKU",
    "message": "Le SKU \"CH-41\" est déjà utilisé.",
    "statusCode": 409,
    "details": {}
  }
}