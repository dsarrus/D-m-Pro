
# Acteurs

> **Section** : 03-domain
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : 2026-10-11

## Introduction

Les **acteurs** sont les entités (humaines ou systèmes) qui
interagissent avec le domaine DɛmɛPro. Chaque acteur a un **rôle
métier** clair et un **périmètre d'action** défini.

## Acteurs humains

### 🌐 Visiteur

- **Description** : Utilisateur non authentifié
- **Peut faire** :
  - Parcourir les produits ACTIVE
  - Consulter les boutiques et catégories
  - Voir les avis publics
  - S'inscrire
- **Ne peut PAS faire** :
  - Acheter
  - Voir les produits DRAFT ou ARCHIVED
  - Laisser un avis
- **Permissions RBAC** : aucune (endpoints publics uniquement)

### 👤 Client

- **Description** : Utilisateur authentifié avec rôle CLIENT
- **Peut faire** :
  - Tout ce que fait le visiteur
  - Passer commande
  - Payer
  - Voir ses commandes
  - Laisser des avis après livraison
  - Gérer ses adresses
  - Demander un devis (Phase 2)
  - Réserver une prestation (Phase 2)
- **Ne peut PAS faire** :
  - Créer une boutique
  - Publier des produits
  - Modifier les produits d'autrui
  - Accéder aux commandes d'autres clients
- **Permissions RBAC** :
  - `catalog.product.read`
  - `order.create`
  - `order.read.own`
  - `review.create`
  - `address.*`

### 🛠️ Professionnel

- **Description** : Utilisateur avec rôle PROFESSIONAL et profil vérifié
- **Peut faire** :
  - Gérer une ou plusieurs boutiques
  - Créer / modifier / archiver des produits
  - Gérer les variantes et le stock
  - Uploader des images
  - Voir les commandes reçues
  - Expédier / livrer les commandes
  - Proposer des services (Phase 2)
  - Répondre aux devis (Phase 2)
- **Ne peut PAS faire** :
  - Modifier les produits d'autres professionnels
  - Accéder aux commandes d'autres boutiques
  - Valider son propre KYC
- **Permissions RBAC** :
  - `catalog.product.*` (sur ses propres ressources)
  - `catalog.inventory.*`
  - `store.read.own`, `store.update.own`
  - `order.read.store`, `order.ship.store`
  - `service.*` (Phase 2)

### 👑 Admin

- **Description** : Utilisateur avec rôle ADMIN
- **Peut faire** :
  - Vérifier les profils professionnels
  - Suspendre une boutique
  - Modérer les avis signalés
  - Consulter les signalements
  - Accéder au dashboard global
- **Ne peut PAS faire** :
  - Modifier les produits des professionnels (sauf modération)
  - Voir les données sensibles (mots de passe, tokens)
- **Permissions RBAC** :
  - `admin.verification.*`
  - `admin.moderation.*`
  - `admin.store.suspend`
  - `catalog.product.read`

### 🔱 Super Admin

- **Description** : Utilisateur avec rôle SUPER_ADMIN
- **Peut faire** : tout, y compris les actions critiques
- **Restrictions** :
  - Actions sensibles tracées dans un audit log
  - Double validation pour les suppressions de comptes

## Acteurs système

### 💳 Payment Provider

- **Description** : Orange Money, Wave (Phase 2 : Stripe, PayPal)
- **Rôle** : Traiter les paiements, envoyer des webhooks
- **Protocole** : REST + Webhooks signés
- **Fiabilité** : retry automatique, idempotence requise

### 📧 Notification Provider

- **Description** : SendGrid (email), Twilio (SMS)
- **Rôle** : Envoyer les notifications transactionnelles
- **Protocole** : REST
- **Retry** : exponentiel en cas d'échec

### 🗄️ Storage Provider

- **Description** : SeaweedFS (S3-compatible)
- **Rôle** : Stocker les images produits, logos boutiques
- **Protocole** : S3 API
- **Sécurité** : Signed URLs avec expiration

### ⏰ Scheduler

- **Description** : Job interne (BullMQ ou cron)
- **Rôle** : Expiration des devis, purge des idempotency keys,
  nettoyage des sessions, rappels
- **Fréquence** : quotidien ou horaire selon le job

### 📊 Analytics

- **Description** : Service interne (PostgreSQL + vues matérialisées)
- **Rôle** : Agréger les événements métier
- **Protocole** : interne (async, post-commit)

## Matrice d'interactions

| Acteur | Catalog | Order | Payment | Service | Review |
|---|---|---|---|---|---|
| Visiteur | read | — | — | read | read |
| Client | read | CRUD own | create | CRUD own (P2) | create |
| Professionnel | CRUD own | read own | — | CRUD own (P2) | read |
| Admin | read | read all | read | read all | moderate |
| Super Admin | tout | tout | tout | tout | tout |
| Payment Provider | — | — | webhook | — | — |
| Notification | — | read | read | read | read |
| Scheduler | read | read | read | read | read |

## Interactions détaillées

```
Visiteur ──► [API publique] ──► Catalog (read)
Client ──► [API auth] ──► Catalog + Order + Payment + Review
Professionnel ──► [API auth] ──► Catalog + Store + Order
Admin ──► [API admin] ──► tous les modules (modération)
Payment Provider ──► [Webhook] ──► Payment
Scheduler ──► [API interne] ──► tous les modules (maintenance)
```

## Anti-patterns à éviter

- ❌ Un professionnel qui agit sur les produits d'un autre
- ❌ Un client qui accède aux commandes d'un autre
- ❌ Un admin qui modifie silencieusement un produit
- ❌ Un visiteur qui voit des produits non publiés
- ❌ Un acteur système sans authentification

## Implémentation

### Middleware d'authentification

```typescript
// Injecte req.user
export function authenticate(req, res, next) { /* JWT */ }
```

### Middleware de permission

```typescript
// Vérifie la permission RBAC
export function requirePermission(permission: string) { /* ... */ }
```

### Vérification d'ownership

```typescript
// Dans chaque service
if (resource.ownerId !== ctx.userId) {
  throw new CatalogError("UNAUTHORIZED_STORE", "...");
}
```


---

## Statut du document

| Champ | Valeur |
|---|---|
| Version | 0.2.0 |
| Statut | 🚧 Draft |
| Auteur | — |
| Relecteurs | — |
| Dernière mise à jour | 2026-10-11 |

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
| 2026-10-10 | 0.1.0 | Création initiale | — |
| 2026-10-11 | 0.2.0 | Intégration vision place de marché hybride | — |
