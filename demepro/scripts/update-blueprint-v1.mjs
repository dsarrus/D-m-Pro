#!/usr/bin/env node
// scripts/update-blueprint-v1.mjs
//
// Met à jour les fichiers du blueprint DɛmɛPro
// avec les versions intégrant la vision "place de marché hybride"
// (flux ACHETER + TROUVER).
//
// Usage :
//   node scripts/update-blueprint-v1.mjs
//   node scripts/update-blueprint-v1.mjs --dry-run
//   node scripts/update-blueprint-v1.mjs --force

import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

/* ================================================================
 * CONFIGURATION
 * ================================================================ */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const BLUEPRINT = join(ROOT, "docs", "blueprint");

const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

const TODAY = new Date().toISOString().slice(0, 10);

/* ================================================================
 * UTILITAIRES
 * ================================================================ */

const c = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

const log = {
  info: (m) => console.log(`${c.cyan}ℹ${c.reset} ${m}`),
  ok: (m) => console.log(`${c.green}✓${c.reset} ${m}`),
  skip: (m) => console.log(`${c.gray}○${c.reset} ${m}`),
  warn: (m) => console.log(`${c.yellow}⚠${c.reset} ${m}`),
  err: (m) => console.log(`${c.red}✗${c.reset} ${m}`),
  header: (m) => console.log(`\n${c.bold}${m}${c.reset}`),
};

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(d) {
  if (DRY_RUN) return;
  await mkdir(d, { recursive: true });
}

/**
 * Écrit un fichier en respectant les options.
 *
 * - Mode par défaut : écrase si le fichier contient "Statut : 🚧 Draft"
 *   ET version < 0.2.0 (fichier non personnalisé).
 * - Mode --force : écrase toujours.
 * - Mode --dry-run : n'écrit rien, affiche ce qui serait fait.
 */
async function writeBlueprintFile(relPath, content) {
  const absPath = join(BLUEPRINT, relPath);
  const exists_ = await exists(absPath);

  /* Fichier n'existe pas → création */
  if (!exists_) {
    if (DRY_RUN) {
      log.info(`[DRY] CREATE ${relPath}`);
      return "dry-create";
    }
    await ensureDir(dirname(absPath));
    await writeFile(absPath, content.trimEnd() + "\n", "utf-8");
    log.ok(`CREATE ${relPath}`);
    return "create";
  }

  /* Fichier existe → vérifier s'il est personnalisé */
  if (!FORCE) {
    const current = await readFile(absPath, "utf-8");
    const isPlaceholder =
      current.includes("🚧 Draft") &&
      !current.includes("0.2.0") &&
      current.length < 3000;

    if (!isPlaceholder) {
      log.skip(`${relPath} (personnalisé, utilise --force)`);
      return "skip";
    }
  }

  if (DRY_RUN) {
    log.info(`[DRY] UPDATE ${relPath}`);
    return "dry-update";
  }

  await writeFile(absPath, content.trimEnd() + "\n", "utf-8");
  log.ok(`UPDATE ${relPath}`);
  return "update";
}

/* ================================================================
 * EN-TÊTE STANDARD
 * ================================================================ */

const header = (title, section) =>
  `# ${title}

> **Section** : ${section}
> **Statut** : 🚧 Draft
> **Dernière mise à jour** : ${TODAY}`;

const footer = (version = "0.2.0", changes = []) => `
---

## Statut du document

| Champ | Valeur |
|---|---|
| Version | ${version} |
| Statut | 🚧 Draft |
| Auteur | — |
| Relecteurs | — |
| Dernière mise à jour | ${TODAY} |

## Historique

| Date | Version | Changement | Auteur |
|---|---|---|---|
${changes.map((c) => `| ${c.date} | ${c.version} | ${c.change} | ${c.author} |`).join("\n")}`;

const defaultChanges = (initial = false) => [
  {
    date: initial ? "2026-10-10" : TODAY,
    version: "0.1.0",
    change: "Création initiale",
    author: "—",
  },
  {
    date: TODAY,
    version: "0.2.0",
    change: "Intégration vision place de marché hybride",
    author: "—",
  },
];

/* ================================================================
 * FICHIERS — VAGUE 1 (01-product)
 * ================================================================ */

const FILES = {};

/* ------------------------------------------------------------------
 * 01-product/vision.md
 * ------------------------------------------------------------------ */
FILES["01-product/vision.md"] = `
${header("Vision produit", "01-product")}

## En une phrase

> **DɛmɛPro connecte les clients aux artisans et professionnels du Mali
> pour acheter des produits et trouver des services, dans une seule
> plateforme de confiance.**

## Vision long terme (3-5 ans)

D'ici 3 à 5 ans, DɛmɛPro sera **la place de marché de référence au Mali**
pour deux intentions complémentaires :

1. **ACHETER** — Trouver et acheter des produits auprès de boutiques
   d'artisans et de commerçants locaux, avec un catalogue riche
   (variantes, stock, photos, avis).

2. **TROUVER** — Identifier et engager des professionnels qualifiés
   pour des prestations de service (réparation, artisanat, conseil,
   formation), avec un système de devis et de réservation.

Ces deux flux partagent la même infrastructure de confiance :

- **Profils professionnels vérifiés** (KYC, badge de vérification)
- **Système d'avis unifié** (produits, services, professionnels)
- **Paiement sécurisé** (Orange Money, Wave, espèces à la livraison)
- **Notifications transactionnelles** (email, SMS, push)

À terme, DɛmɛPro devient un **écosystème économique local** où chaque
transaction renforce la réputation et la visibilité des professionnels
maliens.

## Mission

**Digitaliser le commerce local malien en offrant aux artisans et
professionnels une vitrine en ligne et un canal de vente direct,
tout en donnant aux clients un accès simplifié à des produits et
services de qualité, en toute confiance.**

Nous croyons que :

- Le savoir-faire local mérite une **visibilité numérique**
- La **confiance** est le socle de toute transaction
- La **simplicité** d'usage prime sur la richesse fonctionnelle
- Les **deux flux** (produits et services) se renforcent mutuellement

## Valeurs

1. **Confiance** — Chaque professionnel est vérifié, chaque avis est
   authentique, chaque transaction est sécurisée. La réputation se
   gagne et se prouve.

2. **Local d'abord** — Nous privilégions les artisans, commerçants et
   prestataires maliens. Notre succès se mesure à leur succès.

3. **Simplicité** — Une plateforme utilisable par tous, même avec une
   connexion limitée ou une faible littératie numérique.

4. **Transparence** — Prix clairs, conditions explicites, pas de frais
   cachés. Le client et le professionnel savent toujours ce qu'ils
   paient et ce qu'ils reçoivent.

5. **Équité** — Pas de mise en avant payante qui écrase les petits
   artisans. La qualité et la satisfaction client déterminent le
   classement.

## Les deux flux de la plateforme

\`\`\`
                    DƐMƐPRO
                       │
          ┌────────────┴────────────┐
          │                         │
      ACHETER                    TROUVER
          │                         │
      PRODUITS                   SERVICES
          │                         │
      BOUTIQUES              PROFESSIONNELS
          │                         │
          └────────────┬────────────┘
                       │
                    BESOIN
                       │
          ┌────────────┴────────────┐
          │                         │
       PRODUIT                    SERVICE
          │                         │
       COMMANDE                   DEMANDE
          │                         │
       LIVRAISON                  DEVIS
          │                         │
          │                     RÉSERVATION
          │                         │
          └────────────┬────────────┘
                       │
                      AVIS
\`\`\`

### Flux ACHETER (produits physiques)

**Pour qui** : Clients cherchant un bien tangible.

**Comment** : Le client parcourt les boutiques, consulte les produits
(avec variantes, photos, stock), ajoute au panier, commande, paie,
et reçoit la livraison.

**Spécificités** :

- Prix fixe défini par le vendeur
- Gestion de stock quantitative
- Transaction immédiate
- Livraison physique

### Flux TROUVER (prestations de service)

**Pour qui** : Clients cherchant une compétence, un savoir-faire,
une prestation.

**Comment** : Le client explore les profils de professionnels, consulte
leurs services, envoie une demande, reçoit un devis, l'accepte, et
réserve un créneau.

**Spécificités** :

- Prix négociable via devis (ou fixe selon le service)
- Disponibilité temporelle (pas de stock)
- Transaction différée (validation du devis)
- Prestation sur site ou à distance

### Le point de convergence

Les deux flux partagent :

- **Le besoin du client** comme point de départ
- **Les professionnels vérifiés** comme fournisseurs
- **L'avis** comme mécanisme de confiance post-transaction
- **Le paiement** comme infrastructure transverse
- **Les notifications** comme fil conducteur

## Ce que nous ne ferons PAS

- **Aucune vente de données personnelles** — La vie privée est non
  négociable.

- **Aucun référencement payant caché** — Pas de mise en avant
  d'un professionnel au détriment d'un autre sans le signaler
  explicitement au client.

- **Aucun service hors Mali au lancement** — Nous nous concentrons
  sur le marché local avant d'étendre.

- **Aucune précarisation des professionnels** — Pas de commission
  abusive, pas de pression sur les prix, pas de concurrence
  déloyale avec les vendeurs de la plateforme.

- **Aucune fonctionnalité qui ne bénéficie pas aux deux côtés** —
  Chaque feature doit servir le client ET le professionnel.

- **Aucune complexité inutile** — Si une fonctionnalité n'est pas
  comprise par un artisan malien moyen, elle n'a pas sa place.

## Ce que nous ferons, mais plus tard

- **Livraison gérée par la plateforme** — Au début, le professionnel
  gère lui-même la livraison.
- **Programme de fidélité** — Après stabilisation du cœur.
- **Application mobile native** — Le web responsive d'abord.
- **Extension à d'autres pays** — Après validation au Mali.
- **Place de marché de gros (B2B)** — Après le B2C.

## Proposition de valeur synthétique

**Pour les clients** :
> Trouvez ce que vous cherchez, achetez ou réservez en confiance,
> auprès d'artisans et professionnels maliens vérifiés.

**Pour les professionnels** :
> Développez votre activité en ligne, atteignez plus de clients,
> et construisez votre réputation — sans compétence technique.

**Pour l'écosystème** :
> Une infrastructure numérique locale qui valorise le savoir-faire
> malien et facilite les échanges économiques.

${footer("0.2.0", defaultChanges(true))}
`;

/* ------------------------------------------------------------------
 * 01-product/problem.md
 * ------------------------------------------------------------------ */
FILES["01-product/problem.md"] = `
${header("Problème", "01-product")}

## Contexte

Le Mali compte une **dense communauté d'artisans, de commerçants et de
prestataires de services** (menuisiers, couturiers, réparateurs,
coiffeurs, maçons, électriciens, formateurs…). Ces professionnels
exercent majoritairement dans l'**informel**, avec une présence
numérique quasi nulle ou limitée à des pages Facebook/WhatsApp
difficilement découvrables et non structurées.

En parallèle, les clients maliens — urbains comme ruraux — rencontrent
des **difficultés croissantes** pour :

- Trouver des produits de qualité auprès de vendeurs de confiance
- Identifier des professionnels compétents et fiables pour des services
- Comparer les offres, les prix, les disponibilités
- Payer en toute sécurité
- Se faire livrer ou se faire servir dans des délais raisonnables

Le marché est **fragmenté**, sans **standard de confiance**, sans
**infrastructure numérique unifiée** qui relierait l'offre et la
demande locales.

DɛmɛPro naît de ce constat : **il manque un canal unique qui traite
les deux intentions fondamentales du consommateur malien — ACHETER un
produit et TROUVER un service — avec le même niveau de confiance et de
simplicité.**

## Problèmes identifiés

### Problème 1 — Les professionnels sont invisibles en ligne

- **Qui** : Artisans, commerçants, prestataires de services maliens
- **Quoi** : Pas ou peu de présence numérique structurée.
- **Impact** : Perte de CA potentiel, dépendance au bouche-à-oreille
- **Fréquence** : **Permanent**

### Problème 2 — Les clients ne trouvent pas ce qu'ils cherchent

- **Qui** : Clients maliens, urbains et ruraux
- **Quoi** : Pas de plateforme unifiée, multiplicité des canaux
- **Impact** : Temps perdu, risque d'arnaque, frustration
- **Fréquence** : **Récurrent**

### Problème 3 — La confiance transactionnelle est difficile

- **Qui** : Clients ET professionnels
- **Quoi** : Pas de vérification, pas d'avis authentiques, pas de
  paiement sécurisé adapté
- **Impact** : Hésitation à commander, préférence pour le cash
- **Fréquence** : **Permanent**

### Problème 4 — Les deux besoins sont traités séparément

- **Qui** : Clients ayant des besoins mixtes
- **Quoi** : Aucune plateforme ne couvre produits ET services
- **Impact** : Expérience fragmentée, perte de valeur
- **Fréquence** : **Récurrent**

## Solutions existantes et leurs limites

### Solutions globales

| Solution | Limites |
|---|---|
| Jumia Mali | Focus produits uniquement, pas de services |
| Amazon / Alibaba | Non adapté au marché malien |
| Facebook Marketplace | Pas de catalogue structuré, pas de paiement |

### Solutions locales

| Solution | Limites |
|---|---|
| Pages Facebook de pros | Non découvrables, non catégorisées |
| Groupes WhatsApp | Fermés, non structurés |
| Sites web individuels | Rares, coûteux |
| Marchés physiques | Présentiels uniquement |

## Opportunité

### Pourquoi maintenant ?

1. **Pénétration mobile en forte croissance** — +70% des Maliens
2. **Mobile Money mature** — Orange Money et Wave massivement adoptés
3. **Post-COVID** — Habitudes d'achat en ligne accélérées
4. **Jeunesse connectée** — Génération 18-35 ans habituée aux marketplaces
5. **Absence d'acteur dominant** — Marché malien encore fragmenté

### Pourquoi nous ?

1. **Vision hybride unique** — Seuls à traiter ACHETER et TROUVER
2. **Ancrage local** — Compréhension profonde du contexte malien
3. **Architecture technique solide** — Module Catalog déjà construit
4. **Approche progressive** — Produits puis services
5. **Modèle économique équitable** — Commission raisonnable

### Impact attendu

- **Pour les professionnels** : visibilité, CA, réputation
- **Pour les clients** : accès simplifié, confiance, gain de temps
- **Pour l'écosystème** : digitalisation, valorisation du savoir-faire

## Ce que nous ne résolvons PAS (au lancement)

- Livraison longue distance
- Formation professionnelle
- Financement des professionnels
- Exportation
- Contrats B2B complexes

${footer("0.2.0", defaultChanges(true))}
`;

/* ------------------------------------------------------------------
 * 01-product/value-proposition.md
 * ------------------------------------------------------------------ */
FILES["01-product/value-proposition.md"] = `
${header("Proposition de valeur", "01-product")}

## Déclinaison par acteur

### Pour le client

**Qui** a besoin de trouver et d'acheter des produits locaux, ou
d'engager un professionnel de confiance pour un service.

**Notre produit** est une **place de marché hybride** qui réunit
achat de produits et recherche de services dans une seule plateforme.

**Qui lui permet** de trouver, comparer, payer et recevoir — en toute
confiance, avec des avis authentiques et un paiement adapté au
contexte malien.

**Contrairement** aux pages Facebook éparpillées, aux groupes WhatsApp
fermés, et aux marketplaces internationales mal adaptées.

**Notre produit** centralise l'offre locale, vérifie les
professionnels, structure les transactions, et couvre les **deux
intentions fondamentales** : ACHETER et TROUVER.

### Pour le professionnel

**Qui** a besoin de visibilité en ligne et d'un canal de vente
structuré, sans compétence technique.

**Notre produit** est une **vitrine numérique clé en main** et un
**canal de vente direct**.

**Qui lui permet** d'atteindre plus de clients, de prouver son
savoir-faire, et de construire une **réputation numérique durable**.

**Contrairement** aux solutions complexes ou coûteuses.

**Notre produit** simplifie radicalement la digitalisation.

### Pour l'écosystème malien

**Qui** a besoin d'une infrastructure numérique locale.

**Notre produit** est une **plateforme d'infrastructure économique
locale**.

**Qui profite** à l'ensemble des acteurs.

**Contrairement** aux initiatives fragmentées.

**Notre produit** privilégie la **création de valeur locale**.

## Déclinaison par flux

### Flux ACHETER

> **« Trouvez, achetez et recevez des produits locaux de confiance,
> sans quitter votre téléphone. »**

**Bénéfices clés** :
- Catalogue structuré avec variantes, photos, prix clairs
- Stock visible et à jour
- Avis authentiques (uniquement après achat)
- Paiement mobile (Orange Money, Wave) ou à la livraison
- Suivi de commande

### Flux TROUVER

> **« Décrivez votre besoin, recevez des devis, réservez un créneau —
> avec des professionnels vérifiés. »**

**Bénéfices clés** :
- Portfolio visuel de chaque professionnel
- Devis personnalisés (prix négociable)
- Réservation de créneaux en ligne
- Avis vérifiés post-prestation
- Paiement sécurisé

## Proposition de valeur unifiée

> **« DɛmɛPro, c'est la plateforme qui traite vos deux besoins —
> acheter un produit ou trouver un professionnel — avec le même
> niveau de confiance, de simplicité et d'ancrage local. »**

### Le socle commun : la confiance

| Pilier | Bénéfice |
|---|---|
| **Vérification** | Clients rassurés |
| **Avis authentiques** | Notes fiables |
| **Paiement sécurisé** | Transactions protégées |
| **Historique** | Litiges résolus |
| **Modération** | Écosystème sain |

## Matrice de valeur

| Bénéfice | Pour qui | Preuve |
|---|---|---|
| Catalogue produits complet | Clients | Module Catalog opérationnel, 142 tests verts |
| Visibilité en ligne pour les artisans | Professionnels | Boutique créable en quelques minutes |
| Gestion de stock fiable | Professionnels | Contraintes DB, réservation atomique |
| Avis authentiques | Clients & Pros | Système de review à construire |
| Paiement mobile adapté | Clients | Intégration Orange Money / Wave |
| Recherche de services avec devis | Clients | Module Service à construire |
| Portfolio de services | Professionnels | Module Service à construire |
| Réservation de créneaux | Clients & Pros | Module Booking à construire |
| Confiance transactionnelle unifiée | Tous | Infrastructure KYC + avis + paiement |

## Ce que nous ne promettons PAS

- Livraison express 24h partout
- Zéro frais pour les professionnels
- Garantie de qualité absolue
- Support 24/7 dès le lancement
- Prix les plus bas du marché

## Message clé par canal

| Canal | Message |
|---|---|
| Site web (accueil client) | « Achetez local. Trouvez des pros. En confiance. » |
| Landing professionnel | « Votre boutique et vos services en ligne, en 5 minutes. » |
| Réseaux sociaux | « Le savoir-faire malien, à portée de clic. » |
| Presse / partenaires | « L'infrastructure qui digitalise le commerce local malien. » |

${footer("0.2.0", defaultChanges(true))}
`;

/* ------------------------------------------------------------------
 * 01-product/mvp.md
 * ------------------------------------------------------------------ */
FILES["01-product/mvp.md"] = `
${header("MVP (Minimum Viable Product)", "01-product")}

## Définition du MVP

Le MVP de DɛmɛPro est une **place de marché hybride** permettant à :

1. Un **professionnel** de créer une boutique, publier des produits,
   gérer son stock, et recevoir des commandes.
2. Un **client** de parcourir les produits, commander, payer, et
   laisser un avis.

Le MVP **couvre uniquement le flux ACHETER**. Le flux TROUVER
(services) est **explicitement exclu** du MVP et reporté en phase 2.

**Objectif** : valider le modèle économique et l'adoption du flux
produit avant d'investir dans la complexité des services.

## Périmètre du MVP

### Inclus (Phase 1 — ACHETER)

#### 🔐 Authentification & comptes
- [x] Inscription (client, professionnel)
- [x] Connexion / déconnexion
- [x] Gestion du profil de base
- [x] Rôles et permissions

#### 🏪 Boutique
- [ ] Créer une boutique
- [ ] Modifier sa boutique
- [ ] Activer / suspendre
- [ ] Voir ses statistiques

#### 📦 Catalogue
- [x] Créer un produit simple
- [x] Créer un produit à variantes
- [x] Modifier un produit
- [x] Archiver / supprimer
- [x] Activer un produit
- [x] Gérer les variantes
- [x] Gérer les images
- [x] Gérer le stock

#### 🛒 Navigation client
- [x] Parcourir les catégories
- [x] Voir la liste des produits
- [x] Voir le détail d'un produit
- [x] Voir les boutiques
- [ ] Rechercher un produit

#### 🛍️ Panier & commande
- [ ] Ajouter au panier
- [ ] Modifier les quantités
- [ ] Passer commande
- [ ] Choisir une adresse
- [ ] Choisir un mode de paiement

#### 💳 Paiement
- [ ] Orange Money
- [ ] Wave
- [ ] Paiement à la livraison
- [ ] Webhook de confirmation

#### 📋 Suivi de commande
- [ ] Voir mes commandes
- [ ] Changer le statut
- [ ] Annuler une commande

#### ⭐ Avis
- [ ] Laisser un avis
- [ ] Voir les avis

#### 🔔 Notifications
- [ ] Email transactionnel
- [ ] SMS transactionnel

#### 🛠️ Administration
- [ ] Vérifier les pros
- [ ] Suspendre une boutique
- [ ] Tableau de bord

### Exclus du MVP (backlog Phase 2+)

- Flux TROUVER (services)
- Livraison gérée par la plateforme
- Portefeuille professionnel
- Application mobile native
- Multi-langue
- Analytics avancé
- Programme de fidélité

## User stories critiques

### Authentification
| ID | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-001 | Visiteur | M'inscrire client | Acheter | P0 |
| US-002 | Visiteur | M'inscrire pro | Vendre | P0 |
| US-003 | Utilisateur | Me connecter | Accéder | P0 |

### Catalogue
| ID | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-020 | Pro | Créer un produit simple | Le rendre visible | P0 |
| US-021 | Pro | Créer un produit à variantes | Proposer options | P0 |
| US-022 | Pro | Uploader photos | Montrer | P0 |
| US-023 | Pro | Définir prix et stock | Vendre | P0 |

### Navigation client
| ID | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-030 | Client | Parcourir par catégorie | Découvrir | P0 |
| US-031 | Client | Voir le détail d'un produit | Décider | P0 |
| US-032 | Client | Voir les variantes | Choisir | P0 |

### Commande
| ID | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-040 | Client | Ajouter au panier | Commander | P0 |
| US-042 | Client | Passer commande | Acheter | P0 |
| US-043 | Client | Choisir une adresse | Être livré | P0 |

### Paiement
| ID | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-050 | Client | Payer avec Orange Money | Régler | P0 |
| US-051 | Client | Payer avec Wave | Choisir | P0 |

### Suivi
| ID | En tant que | Je veux | Afin de | Priorité |
|---|---|---|---|---|
| US-060 | Client | Voir mes commandes | Suivre | P0 |
| US-062 | Pro | Voir les commandes reçues | Traiter | P0 |
| US-063 | Pro | Marquer comme expédiée | Informer | P0 |

## Critères de sortie du MVP

### Fonctionnels
- [ ] Un professionnel peut créer sa boutique et publier 3 produits
      minimum en moins de 10 minutes
- [ ] Un client peut commander, payer et suivre sa commande
- [ ] Le flux réservation → commit → livraison est testé sous
      concurrence
- [ ] Les avis vérifiés fonctionnent
- [ ] Les notifications email partent à chaque étape

### Techniques
- [ ] Zéro bug critique pendant 2 semaines
- [ ] 95%+ de tests passent en CI
- [ ] Temps de réponse API < 500ms en p95
- [ ] Uptime > 99% sur 30 jours

### Adoption
- [ ] 50 professionnels actifs
- [ ] 200 clients inscrits
- [ ] 100 commandes complétées
- [ ] Taux de satisfaction > 4/5

## Timeline

| Phase | Durée | Livrable |
|---|---|---|
| Alpha | 4-6 semaines | Version testée en interne |
| Beta | 4-6 semaines | 5-10 pros pilotes, 20-30 clients |
| GA | continue | Ouverture publique |

## Ce qui suit le MVP

**Phase 2 — SERVICES** :
- Service (portfolio)
- Availability (créneaux)
- Quote (devis)
- Booking (réservation)

**Phase 3 — Écosystème** :
- Programme de fidélité
- Mobile natif
- Analytics avancé

## Risques identifiés

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Adoption lente des pros | Moyenne | Élevé | Onboarding accompagné |
| Complexité paiement mobile | Moyenne | Élevé | Partenariats directs |
| Concurrence internationale | Faible | Moyen | Ancrage local |
| Logistique de livraison | Élevée | Moyen | Gérée par le pro |
| Bugs critiques en prod | Faible | Élevé | Tests E2E, staging |
| Manque de confiance | Moyenne | Élevé | Avis vérifiés |

${footer("0.2.0", defaultChanges(true))}
`;

/* ------------------------------------------------------------------
 * 01-product/users.md
 * ------------------------------------------------------------------ */
FILES["01-product/users.md"] = `
${header("Utilisateurs", "01-product")}

## Typologie d'utilisateurs

DɛmɛPro adresse **deux grandes catégories** d'utilisateurs :

1. **Les clients** — Ceux qui achètent des produits ou cherchent des
   services.
2. **Les professionnels** — Ceux qui vendent des produits ou
   proposent des services.

S'y ajoutent les **administrateurs** qui opèrent la plateforme.

## Personas

### 👤 Persona 1 — Awa, la cliente urbaine connectée

- **Âge** : 28 ans
- **Rôle** : Employée de banque, cliente
- **Localisation** : Bamako (Hamdallaye)
- **Objectifs** : Acheter local sans sortir, gagner du temps,
  soutenir les artisans, trouver des professionnels
- **Frustrations** : Pages Facebook non structurées, ruptures non
  annoncées, livraisons non fiables
- **Besoins** : Catalogue clair, paiement mobile, suivi transparent,
  avis authentiques
- **Habitudes** : Smartphone Android 4G, active sur WhatsApp /
  Instagram / Facebook, paie par Orange Money

### 👤 Persona 2 — Moussa, le client rural pragmatique

- **Âge** : 42 ans
- **Rôle** : Agriculteur / commerçant
- **Localisation** : Ségou
- **Objectifs** : Acheter outils et matériel à distance, trouver un
  réparateur
- **Frustrations** : Difficulté à vérifier la qualité, peur des
  arnaques, connexion limitée
- **Besoins** : Interface simple, paiement à la livraison,
  notifications SMS
- **Habitudes** : Smartphone basique 3G, WhatsApp, paiement cash

### 👤 Persona 3 — Fatou, l'artisane vendeuse

- **Âge** : 35 ans
- **Rôle** : Couturière / styliste
- **Localisation** : Bamako (Badalabougou)
- **Objectifs** : Vendre au-delà de son quartier, toucher une
  clientèle connectée
- **Frustrations** : Dépendance au bouche-à-oreille, WhatsApp non
  suivi
- **Besoins** : Boutique en ligne simple, gestion variantes, stock,
  notifications automatiques
- **Habitudes** : Android 4G, Instagram + Facebook, Orange Money

### 👤 Persona 4 — Ibrahim, le prestataire de services

- **Âge** : 48 ans
- **Rôle** : Menuisier / ébéniste
- **Localisation** : Bamako (Sabalibougou)
- **Objectifs** : Trouver des clients, valoriser son savoir-faire,
  négocier ses prix
- **Frustrations** : Bouche-à-oreille uniquement, impossible de
  montrer un portfolio
- **Besoins** : Portfolio visuel, système de devis et réservation,
  zones d'intervention
- **Habitudes** : Android 3G/4G, WhatsApp, photos téléphone

### 👤 Persona 5 — Mariam, la cliente mixte

- **Âge** : 31 ans
- **Rôle** : Chef de projet événementiel
- **Localisation** : Bamako
- **Objectifs** : Organiser un événement, acheter produits + engager
  prestataires
- **Frustrations** : Jonglage entre 5-6 canaux, devis éparpillés
- **Besoins** : Plateforme unifiée produits + services, devis rapides
- **Habitudes** : Smartphone + laptop, WhatsApp, virement / OM / cash

### 👤 Persona 6 — Karim, l'administrateur plateforme

- **Âge** : 26 ans
- **Rôle** : Admin / opérateur
- **Localisation** : Bamako
- **Objectifs** : Vérifier les pros, modérer les contenus, résoudre
  les litiges
- **Besoins** : Dashboard clair, vérification KYC efficace

## Segments

### Par rôle

| Segment | Taille | Priorité |
|---|---|---|
| Clients urbains connectés | Grande | **P0** |
| Clients ruraux pragmatiques | Moyenne | P1 |
| Clients mixtes | Petite | P1 |
| Artisans vendeurs | Grande | **P0** |
| Prestataires de service | Moyenne | **Phase 2** |
| Administrateurs | Très petite | **P0** |

### Par maturité numérique

| Segment | Priorité |
|---|---|
| Digitally native (18-35) | **P0** |
| Digitally comfortable (35-50) | **P0** |
| Digitally hesitant (50+) | P1 |

### Par intention

| Segment | Phase |
|---|---|
| Acheteurs | **Phase 1 (MVP)** |
| Chercheurs | Phase 2 |
| Mixtes | Phase 2 |

## Parcours utilisateur

### Parcours 1 — Client : premier achat

\`\`\`
Découverte → Découverte produit → Inscription → Achat
    → Suivi → Réception & Avis → Fidélisation
\`\`\`

### Parcours 2 — Professionnel : mise en ligne

\`\`\`
Éveil → Inscription → Création boutique → Catalogue
    → Première vente → Réputation → Croissance
\`\`\`

### Parcours 3 — Professionnel : prestataire (Phase 2)

\`\`\`
Éveil → Inscription → Création profil services → Première demande
    → Prestation → Réputation
\`\`\`

### Parcours 4 — Client mixte (Phase 2)

\`\`\`
Besoin complexe → Découverte → Achat produits → Demande de devis
    → Réservation → Paiement → Avis & Fidélisation
\`\`\`

## Insights clés

### Pour le design produit
1. Mobile-first
2. Simplicité radicale
3. Français simplifié
4. Paiement flexible
5. Confiance visible

### Pour le marketing
1. Canaux : WhatsApp, Instagram, Facebook, radio
2. Messages clés par cible
3. Preuves sociales
4. Onboarding accompagné

### Pour le support
1. WhatsApp prioritaire
2. SMS pour les transactions
3. Support français + bambara

${footer("0.2.0", defaultChanges(true))}
`;

/* ------------------------------------------------------------------
 * 01-product/business-model.md
 * ------------------------------------------------------------------ */
FILES["01-product/business-model.md"] = `
${header("Modèle économique", "01-product")}

## Principes économiques

1. **Équité** — Pas de commissions abusives
2. **Progressivité** — Gratuit puis monétisation à valeur ajoutée
3. **Dualité** — Deux flux, deux sources de revenus
4. **Ancrage local** — Adapté au contexte malien

## Sources de revenus

| Source | Démarrage | Part An 3 |
|---|---|---|
| Commission produit | Mois 1 | 40% |
| Commission service | Mois 8 | 25% |
| Abonnements Pro | Mois 6 | 20% |
| Mise en avant | Mois 10 | 10% |
| Services financiers | Mois 18 | 5% |

### Détail

**1. Commission produit** : 5-8% dégressif selon volume
**2. Commission service** : 10-12% (Phase 2)
**3. Abonnements** : Découverte (gratuit), Pro (5 000), Business (15 000)
**4. Mise en avant** : 500-5 000 FCFA/jour
**5. Services financiers** : 0.5% + avances trésorerie

## Structure de coûts

| Poste | Part An 3 |
|---|---|
| Équipe | 45% |
| Marketing | 25% |
| Infrastructure | 10% |
| Paiement | 8% |
| Support | 7% |
| Juridique & admin | 3% |
| Divers | 2% |

## Pricing

### Pour les clients
**100% gratuit** (inscription, navigation, achat, devis, réservation)

### Pour les professionnels

| Plan | Prix/mois | Commission | Cible |
|---|---|---|---|
| **Découverte** | 0 FCFA | 8% | Débutants |
| **Pro** | 5 000 FCFA | 6% | Pros établis |
| **Business** | 15 000 FCFA | 5% | Gros vendeurs |

## Projections financières

| Année | Revenus | Coûts | Résultat | GMV |
|---|---|---|---|---|
| **An 1** | 3,4 M | 25,6 M | -22,2 M | 48 M |
| **An 2** | 29,7 M | 39 M | -9,3 M | 360 M |
| **An 3** | 196 M | 196,4 M | ≈ 0 | 2,16 Mds |
| **An 4** | 550 M | 420 M | +130 M | 5 Mds |

**Unité** : FCFA

## Financement

- **Phase 1** : Seed (50-80 M FCFA)
- **Phase 2** : Série A (300-500 M FCFA)
- **Phase 3** : Autofinancement

## Points de vigilance

| Risque | Mitigation |
|---|---|
| Adoption lente | Réduire coûts variables |
| Concurrence agressive | Fidélisation |
| Frais mobile money élevés | Négocier taux volume |
| Non-paiement des commissions | Prélèvement auto |
| Coûts acquisition élevés | Marketing organique |

${footer("0.2.0", defaultChanges(true))}
`;

/* ------------------------------------------------------------------
 * 01-product/success-metrics.md
 * ------------------------------------------------------------------ */
FILES["01-product/success-metrics.md"] = `
${header("Métriques de succès", "01-product")}

## North Star Metric

### 🎯 GMV (Gross Merchandise Volume)

**Définition** : Valeur totale des transactions complétées sur la
plateforme (produits + services), sur une période donnée.

**Formule** :
\`\`\`
GMV = Σ (commandes produits livrées) + Σ (réservations services complétées)
\`\`\`

**Pourquoi ?** Mesure l'activité économique réelle, commune aux deux
flux, corrélée aux revenus ET à la valeur créée pour les pros.

### Cibles GMV

| Phase | GMV mensuel | GMV annuel |
|---|---|---|
| Alpha | 500 K | 6 M |
| Beta | 5 M | 60 M |
| GA (fin An 1) | 10 M | 48 M |
| An 2 | 50 M | 360 M |
| An 3 | 250 M | 2,16 Mds |
| An 4 | 600 M | 5 Mds |

## Métriques par catégorie

### 📈 Acquisition

| Métrique | Alpha | An 1 | An 3 |
|---|---|---|---|
| Nouveaux clients/mois | 50 | 500 | 5 000 |
| Nouveaux pros/mois | 10 | 50 | 500 |
| CAC client | 2 000 | 1 500 | 1 000 |
| CAC pro | 10 000 | 8 000 | 5 000 |
| Taux de conversion inscription | 5% | 8% | 12% |

### 🚀 Activation

| Métrique | Alpha | An 1 | An 3 |
|---|---|---|---|
| Taux activation client | 20% | 35% | 50% |
| Taux activation pro | 50% | 70% | 85% |
| Time-to-first-sale (pro) | 15 j | 10 j | 5 j |
| Time-to-first-purchase (client) | 7 j | 5 j | 3 j |

### 🔄 Rétention

| Métrique | Alpha | An 1 | An 3 |
|---|---|---|---|
| Rétention client M1 | 30% | 45% | 60% |
| Rétention client M3 | 15% | 25% | 40% |
| Rétention pro M3 | 60% | 75% | 85% |
| Fréquence d'achat | 0.5 | 1.2 | 2.5 |

### 💰 Revenu

| Métrique | Alpha | An 1 | An 3 |
|---|---|---|---|
| GMV mensuel | 500 K | 10 M | 250 M |
| Revenu mensuel | 0 | 300 K | 16 M |
| Panier moyen | 5 000 | 8 000 | 12 000 |
| Commission moyenne | 0% | 7% | 7,5% |
| Taux d'abonnement | 0% | 10% | 20% |

### 💚 Référence

| Métrique | Alpha | An 1 | An 3 |
|---|---|---|---|
| NPS client | 20 | 40 | 60 |
| NPS pro | 15 | 35 | 55 |
| Taux de recommandation | 5% | 15% | 30% |
| Taux d'avis laissés | 20% | 40% | 60% |
| Note moyenne | 3.5 | 4.2 | 4.5 |
| Taux de réachat | 10% | 30% | 55% |

## Métriques par flux

### 🛒 Flux ACHETER

| Métrique | An 1 | An 3 |
|---|---|---|
| Produits publiés | 2 000 | 50 000 |
| Commandes/mois | 500 | 15 000 |
| Panier moyen | 8 000 | 12 000 |
| Conversion visite→commande | 1.5% | 3% |

### 🎯 Flux TROUVER (Phase 2)

| Métrique | An 2 | An 3 |
|---|---|---|
| Services publiés | 500 | 5 000 |
| Demandes de devis/mois | 100 | 3 000 |
| Taux de réponse pro | 60% | 85% |
| Taux d'acceptation | 30% | 45% |

## Métriques techniques

| Métrique | Cible |
|---|---|
| Uptime API | > 99,5% |
| Latence API p95 | < 500 ms |
| Taux d'erreur API | < 0,1% |
| Couverture de tests | > 80% |
| Taux de tests CI passants | 100% |

## Tableau de bord synthétique

| Indicateur | Cible An 1 |
|---|---|
| GMV mensuel | 10 M |
| Revenus mensuels | 300 K |
| Pros actifs | 100 |
| Clients actifs | 2 000 |
| NPS client | 40 |
| Rétention pro M3 | 75% |

## Ce que nous ne mesurons PAS

- Nombre d'inscriptions brutes
- Temps passé sur la plateforme
- Nombre de clics
- Followers sur les réseaux
- Nombre de fonctionnalités livrées

${footer("0.2.0", defaultChanges(true))}
`;

/* ================================================================
 * FICHIERS — VAGUE 2 (03-domain)
 * ================================================================ */

/* ------------------------------------------------------------------
 * 03-domain/domain-overview.md
 * ------------------------------------------------------------------ */
FILES["03-domain/domain-overview.md"] = `
${header("Vue d'ensemble du domaine", "03-domain")}

## Introduction

Le domaine DɛmɛPro se structure autour de **deux flux métier
parallèles** qui partagent une **infrastructure de confiance commune** :

1. **Flux ACHETER** — Vente de produits physiques (e-commerce)
2. **Flux TROUVER** — Prestation de services (marketplace de
   compétences)

Ces deux flux convergent sur quatre **points de jonction** :
le besoin du client, les professionnels vérifiés, la transaction
sécurisée, et l'avis post-transaction.

## Carte des domaines

\`\`\`
                    ┌─────────────────────┐
                    │     IDENTITY        │
                    │  (User, Role, KYC)  │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                                 │
              ▼                                 ▼
   ┌──────────────────────┐       ┌──────────────────────┐
   │   FLUX ACHETER       │       │   FLUX TROUVER       │
   │   (produits)         │       │   (services)         │
   ├──────────────────────┤       ├──────────────────────┤
   │  Catalog             │       │  Service             │
   │  Store               │       │  Professional        │
   │  Order               │       │  Quote               │
   │  Delivery            │       │  Booking             │
   └──────────┬───────────┘       └──────────┬───────────┘
              │                              │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │     TRANSVERSE                │
              │  Payment • Review             │
              │  Address • Notification       │
              │  Analytics                    │
              └──────────────────────────────┘
\`\`\`

## Bounded Contexts

### 1. Identity Context

**Responsabilité** : Authentification, autorisation, profils, KYC.

**Entités** : User, Role, Permission, UserRoleAssignment,
ProfessionalProfile, VerificationRequest

**Statut** : 🟡 60%

### 2. ACHETER Context

**Responsabilité** : Vente de produits physiques.

**Sous-contextes** :

| Sous-contexte | Entités | Statut |
|---|---|---|
| Catalog | Product, Variant, Image, Inventory, Category | ✅ 100% |
| Store | Store, StoreHour | 🟡 15% |
| Order | Order, OrderItem, OrderStatusHistory | ❌ 0% |
| Delivery | Delivery | ❌ 0% |

### 3. TROUVER Context

**Responsabilité** : Prestation de services.

**Sous-contextes** :

| Sous-contexte | Entités | Statut |
|---|---|---|
| Service | Service, ServiceImage, ServiceZone, Availability | ❌ 0% |
| Quote | Quote, QuoteItem, QuoteResponse | ❌ 0% |
| Booking | Booking, BookingSlot | ❌ 0% |

### 4. Transverse Context

| Sous-contexte | Entités | Statut |
|---|---|---|
| Payment | Payment, Transaction, Refund | ❌ 0% |
| Review | Review, Rating, Report | ❌ 0% |
| Address | Address | ❌ 0% |
| Notification | Notification, Template | ❌ 0% |
| Analytics | Event, Metric | ❌ 0% |

## Relations entre contextes

\`\`\`
Identity ─────► Tous les autres (identité + permissions)
Catalog ──────► Order
Store ────────► Catalog, Order
Order ────────► Payment, Review
Service ──────► Quote
Quote ────────► Booking
Booking ──────► Payment, Review
Payment ──────► Notification
\`\`\`

## État d'avancement

| Contexte | Statut | Tests | Priorité |
|---|---|---|---|
| Identity | 🟡 60% | — | P0 |
| Catalog | ✅ 100% | 142 | ✅ |
| Store | 🟡 15% | — | P0 |
| Category | 🟡 15% | — | P0 |
| Order | ❌ 0% | — | P0 |
| Payment | ❌ 0% | — | P0 |
| Service | ❌ 0% | — | P1 (Phase 2) |
| Quote | ❌ 0% | — | P1 (Phase 2) |
| Booking | ❌ 0% | — | P1 (Phase 2) |
| Review | ❌ 0% | — | P1 |
| Address | ❌ 0% | — | P1 |
| Notification | ❌ 0% | — | P1 |
| Analytics | ❌ 0% | — | P2 |

## Frontières du domaine

### Dans le domaine

- Gestion utilisateurs et rôles
- Catalogue produits
- Gestion boutiques
- Commandes et cycle de vie
- Prestations de service
- Devis et réservation
- Paiements (via providers)
- Avis et réputation
- Notifications transactionnelles

### Hors du domaine (intégrations)

- Systèmes de paiement (Orange Money, Wave)
- Fournisseurs SMS/Email (Twilio, SendGrid)
- CDN / Stockage (S3, SeaweedFS)
- Auth OAuth (Google, Facebook)
- Logistique externe
- Comptabilité

## Évolution du domaine

### Phase 1 — MVP (ACHETER uniquement)
Identity ✅, Catalog ✅, Store 🟡, Category 🟡, Order ❌,
Payment ❌, Review ❌, Address ❌, Notification ❌

### Phase 2 — Extension (TROUVER)
Service ❌, Quote ❌, Booking ❌

### Phase 3 — Écosystème
Analytics ❌, Programme de fidélité ❌, API publique ❌

### Phase 4 — Expansion
Multi-pays, multi-devises, multi-langues, B2B

## Décisions structurantes

1. **Modular Monolith** — Un seul déployable
2. **Catalog comme socle** — Réutilisable par les deux flux
3. **Deux flux, une confiance** — Mécanismes mutualisés
4. **DDD léger** — Principes sans dogmatisme
5. **API-first** — API claire par contexte

${footer("0.2.0", defaultChanges(true))}
`;

/* ------------------------------------------------------------------
 * 03-domain/entities.md
 * ------------------------------------------------------------------ */
FILES["03-domain/entities.md"] = `
${header("Entités", "03-domain")}

## Introduction

Ce document recense **toutes les entités du domaine DɛmɛPro**,
organisées par contexte borné. Pour chaque entité :

- **Identité** : comment elle est identifiée de façon unique
- **Propriétés** : ses attributs
- **Invariants** : les règles qui doivent toujours être vraies
- **Relations** : ses liens avec d'autres entités

## Contexte Identity

### User

- **Identité** : \`id\` (UUID)
- **Propriétés** : email, passwordHash, firstName, lastName, phone,
  status, createdAt, updatedAt
- **Invariants** :
  - email unique global
  - passwordHash non vide
  - status ∈ {ACTIVE, SUSPENDED, DELETED}
- **Relations** : 1-1 ProfessionalProfile, 1-N Order, Quote, Booking,
  Review, Address, Notification

### Role

- **Identité** : \`id\` (UUID)
- **Propriétés** : code, name, isSystem
- **Invariants** : code unique global, ∈ {CLIENT, PROFESSIONAL,
  ADMIN, SUPER_ADMIN}

### Permission

- **Identité** : \`id\` (UUID)
- **Propriétés** : code, description, resource, action
- **Invariants** : code unique global, format \`<module>.<entity>.<action>\`

### ProfessionalProfile

- **Identité** : \`id\` (UUID)
- **Propriétés** : userId, businessName, slug, description,
  verificationStatus, verifiedAt, phone, email
- **Invariants** : userId unique, slug unique, verificationStatus ∈
  {PENDING, VERIFIED, REJECTED}

### VerificationRequest

- **Identité** : \`id\` (UUID)
- **Propriétés** : professionalId, status, submittedAt, reviewedAt,
  reviewedBy, documents, notes
- **Invariants** : status ∈ {PENDING, APPROVED, REJECTED}

## Contexte ACHETER — Catalog

### Category

- **Identité** : \`id\` (UUID)
- **Propriétés** : verticalId, parentId?, name, slug, type, status,
  sortOrder
- **Invariants** : slug unique par vertical, type ∈ {PRODUCT, SERVICE},
  pas de cycle parent

### Product

- **Identité** : \`id\` (UUID)
- **Propriétés** : storeId, categoryId, name, slug, sku, description,
  status, hasVariants, price, currency
- **Invariants** :
  - slug unique par store
  - price obligatoire si hasVariants=false
  - price null si hasVariants=true
  - status ∈ {DRAFT, ACTIVE, OUT_OF_STOCK, INACTIVE, ARCHIVED}

### ProductVariant

- **Identité** : \`id\` (UUID)
- **Propriétés** : productId, name, sku, price, currency, attributes,
  isActive
- **Invariants** :
  - sku unique global
  - ne peut exister que si product.hasVariants=true
  - impossible de désactiver la dernière variante active

### ProductImage

- **Identité** : \`id\` (UUID)
- **Propriétés** : productId, objectKey, altText, sortOrder, isPrimary
- **Invariants** : au plus un isPrimary=true par productId,
  première image = primaire auto

### Inventory

- **Identité** : \`id\` (UUID)
- **Propriétés** : productId?, variantId?, quantity, reserved
- **Invariants** :
  - XOR(productId, variantId)
  - reserved ≤ quantity
  - quantity ≥ 0, reserved ≥ 0

## Contexte ACHETER — Store

### Store

- **Identité** : \`id\` (UUID)
- **Propriétés** : professionalId, name, slug, description, logoKey,
  bannerKey, status
- **Invariants** : slug unique, status ∈ {PENDING, ACTIVE, SUSPENDED,
  CLOSED}

### StoreHour

- **Identité** : \`id\` (UUID)
- **Propriétés** : storeId, dayOfWeek, openTime, closeTime, isClosed
- **Invariants** : dayOfWeek ∈ [0,6], si isClosed=false, openTime <
  closeTime

## Contexte ACHETER — Order

### Order

- **Identité** : \`id\` (UUID)
- **Propriétés** : userId, storeId, status, totalAmount, currency,
  deliveryAddress, deliveryFee
- **Invariants** :
  - status ∈ {PENDING, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED}
  - totalAmount ≥ 0
  - transitions valides uniquement

### OrderItem

- **Identité** : \`id\` (UUID)
- **Propriétés** : orderId, productId?, variantId?, productName,
  variantName, quantity, unitPrice, subtotal
- **Invariants** :
  - quantity > 0
  - XOR(productId, variantId)
  - snapshots immuables (productName, unitPrice)

### OrderStatusHistory

- **Identité** : \`id\` (UUID)
- **Propriétés** : orderId, fromStatus, toStatus, changedBy, changedAt,
  reason
- **Invariants** : fromStatus ≠ toStatus

## Contexte ACHETER — Delivery

### Delivery

- **Identité** : \`id\` (UUID)
- **Propriétés** : orderId, status, trackingNumber, carrier, shippedAt,
  deliveredAt
- **Invariants** : status ∈ {PREPARING, SHIPPED, IN_TRANSIT, DELIVERED,
  FAILED}

## Contexte TROUVER — Service

### Service

- **Identité** : \`id\` (UUID)
- **Propriétés** : professionalId, categoryId?, name, slug,
  description, pricingModel, basePrice, currency, durationMinutes,
  isActive
- **Invariants** :
  - slug unique global
  - pricingModel ∈ {QUOTE, FIXED, HOURLY}
  - si FIXED ou HOURLY → basePrice non null

### ServiceImage

- **Identité** : \`id\` (UUID)
- **Propriétés** : serviceId, objectKey, altText, sortOrder, isPrimary
- **Invariants** : au plus un isPrimary=true par serviceId

### ServiceZone

- **Identité** : \`id\` (UUID)
- **Propriétés** : serviceId, city, region, radiusKm
- **Invariants** : au moins un des 3 champs non null

### Availability

- **Identité** : \`id\` (UUID)
- **Propriétés** : serviceId, dayOfWeek?, startTime?, endTime?,
  specificDate?, isRecurring
- **Invariants** :
  - si isRecurring=true → dayOfWeek + startTime < endTime
  - si isRecurring=false → specificDate non null

## Contexte TROUVER — Quote

### Quote

- **Identité** : \`id\` (UUID)
- **Propriétés** : userId, serviceId, status, description, address,
  preferredDate, budget, expiresAt
- **Invariants** :
  - status ∈ {PENDING, RESPONDED, ACCEPTED, REJECTED, EXPIRED,
    CONVERTED}
  - si ACCEPTED → Booking existe

### QuoteResponse

- **Identité** : \`id\` (UUID)
- **Propriétés** : quoteId, professionalId, proposedPrice, currency,
  message, proposedDate, expiresAt
- **Invariants** : quoteId unique, expiresAt > createdAt

## Contexte TROUVER — Booking

### Booking

- **Identité** : \`id\` (UUID)
- **Propriétés** : userId, serviceId, quoteId?, status, scheduledAt,
  duration, address, totalAmount, currency
- **Invariants** :
  - status ∈ {CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW}
  - un créneau ne peut être réservé qu'une fois

## Contexte Transverse

### Address

- **Identité** : \`id\` (UUID)
- **Propriétés** : userId, label, line1, line2, city, region, country,
  postalCode, phone, isDefault
- **Invariants** : au plus un isDefault=true par userId

### Payment

- **Identité** : \`id\` (UUID)
- **Propriétés** : orderId?, bookingId?, amount, currency, status,
  provider, providerRef, paidAt, refundedAt
- **Invariants** :
  - XOR(orderId, bookingId)
  - status ∈ {PENDING, PROCESSING, PAID, FAILED, REFUNDED,
    PARTIALLY_REFUNDED}

### Transaction

- **Identité** : \`id\` (UUID)
- **Propriétés** : paymentId, type, amount, providerRef, status
- **Invariants** : type ∈ {CHARGE, REFUND, REVERSAL}

### Review

- **Identité** : \`id\` (UUID)
- **Propriétés** : userId, rating, comment, productId?, variantId?,
  serviceId?, storeId?, professionalId?, orderId?, bookingId?,
  isVerifiedPurchase
- **Invariants** :
  - rating ∈ [1, 5]
  - au moins un lien non null
  - un seul avis par order/booking

### ReviewReport

- **Identité** : \`id\` (UUID)
- **Propriétés** : reviewId, reportedBy, reason, status
- **Invariants** : status ∈ {PENDING, RESOLVED, DISMISSED}

### Notification

- **Identité** : \`id\` (UUID)
- **Propriétés** : userId, type, channel, title, body, readAt, sentAt
- **Invariants** : type et channel valides, title non vide

### NotificationTemplate

- **Identité** : \`id\` (UUID)
- **Propriétés** : type, channel, subjectTemplate, bodyTemplate,
  variables, isActive
- **Invariants** : type+channel unique

### AnalyticsEvent

- **Identité** : \`id\` (UUID)
- **Propriétés** : type, userId?, entityType, entityId, metadata,
  occurredAt
- **Invariants** : type non vide

## Diagramme de relations global

\`\`\`
User ─┬─► ProfessionalProfile ─┬─► Store ─┬─► Product ─┬─► Variant ──► Inventory
      │                        │          │            └─► Image
      │                        │          └─► Order ─┬─► OrderItem
      │                        │                     ├─► Payment ──► Transaction
      │                        │                     ├─► Delivery
      │                        │                     └─► Review
      │                        │
      │                        └─► Service ─┬─► ServiceImage
      │                                     ├─► ServiceZone
      │                                     ├─► Availability
      │                                     ├─► Quote ─┬─► QuoteResponse
      │                                     │          └─► Booking ─┬─► Payment
      │                                     │                       └─► Review
      │                                     └─► Review
      ├─► Order, Quote, Booking, Review
      ├─► Address
      └─► Notification
\`\`\`

## Value Objects

| VO | Contexte | Description |
|---|---|---|
| Money | Transverse | Montant + devise |
| Slug | Catalog, Store | Identifiant URL-friendly |
| SKU | Catalog | Stock Keeping Unit |
| Phone | Identity | Téléphone normalisé |
| Email | Identity | Email validé |
| Address | Transverse | Adresse structurée |
| TimeRange | Service | Créneau horaire |
| Rating | Review | Note 1-5 |

## Compteurs

| Contexte | Entités | Statut |
|---|---|---|
| Identity | 5 | 🟡 60% |
| Catalog | 5 | ✅ 100% |
| Store | 2 | 🟡 15% |
| Order | 3 | ❌ 0% |
| Delivery | 1 | ❌ 0% |
| Service | 4 | ❌ 0% |
| Quote | 2 | ❌ 0% |
| Booking | 1 | ❌ 0% |
| Transverse | 6 | ❌ 0% |
| **Total** | **29** | **~30%** |

${footer("0.2.0", defaultChanges(true))}
`;

/* ------------------------------------------------------------------
 * 03-domain/aggregates.md
 * ------------------------------------------------------------------ */
FILES["03-domain/aggregates.md"] = `
${header("Agrégats", "03-domain")}

## Introduction

Un **agrégat** est un groupe d'entités et de value objects traités
comme une **unité transactionnelle cohérente**. Chaque agrégat a une
**racine (Aggregate Root)** qui est le seul point d'entrée pour
modifier l'agrégat.

**Règles fondamentales** :

1. **Une transaction = un agrégat** (dans la mesure du possible)
2. **On ne référence que l'ID** d'un autre agrégat, jamais son objet
3. **L'accès aux entités internes passe par la racine**
4. **Les invariants sont garantis par la racine**

## Carte des agrégats

\`\`\`
FLUX ACHETER
─────────────
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Product      │    │      Store      │    │      Order      │
│   (agrégat)     │    │    (agrégat)    │    │   (agrégat)     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Product       │    │ • Store         │    │ • Order         │
│ • Variant[]     │    │ • StoreHour[]   │    │ • OrderItem[]   │
│ • Image[]       │    │                 │    │ • StatusHistory │
│ • Inventory     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘

FLUX TROUVER
────────────
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Service      │    │      Quote      │    │     Booking     │
│   (agrégat)     │    │   (agrégat)     │    │   (agrégat)     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Service       │    │ • Quote         │    │ • Booking       │
│ • Image[]       │    │ • QuoteResponse │    │                 │
│ • Zone[]        │    │                 │    │                 │
│ • Availability[]│    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘

TRANSVERSE
──────────
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Payment      │    │     Review      │    │      User       │
│   (agrégat)     │    │   (agrégat)     │    │   (agrégat)     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Payment       │    │ • Review        │    │ • User          │
│ • Transaction[] │    │ • Report[]      │    │ • Address[]     │
│                 │    │                 │    │ • Notif[]       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
\`\`\`

## 🏗️ Agrégat Product

\`\`\`
Product (ROOT)
  ├── ProductVariant[]
  ├── ProductImage[]
  └── Inventory (1-0..1)
\`\`\`

**Invariants garantis par la racine** :
- slug unique par store
- price cohérent avec hasVariants
- Au plus une ProductImage.isPrimary = true
- Inventory.reserved ≤ Inventory.quantity
- Une variante ne peut exister que si hasVariants = true

**Opérations sur la racine** :
- createProduct, updateProduct, enableVariants, disableVariants,
  activateProduct, archiveProduct, deleteProduct

**Opérations sur les enfants** :
- addVariant, updateVariant, removeVariant
- addImage, removeImage, reorderImages
- reserveStock, releaseStock, commitStock

**Ce qui N'EST PAS dans l'agrégat** :
- Store, Category, Order (référencés par ID)

## 🏗️ Agrégat Order

\`\`\`
Order (ROOT)
  ├── OrderItem[]
  └── OrderStatusHistory[]
\`\`\`

**Invariants** :
- status valide et transitions autorisées
- totalAmount = Σ OrderItem.subtotal
- Un OrderItem référence soit un produit, soit une variante
- productName, variantName, unitPrice sont **snapshotés**

**Opérations** :
- createOrder (Serializable, réserve stock)
- confirmPayment (Serializable, commit stock)
- ship, deliver, cancel, refund

## 🏗️ Agrégat Service

\`\`\`
Service (ROOT)
  ├── ServiceImage[]
  ├── ServiceZone[]
  └── Availability[]
\`\`\`

**Invariants** :
- slug unique global
- pricingModel cohérent avec basePrice
- Au plus une ServiceImage.isPrimary = true

## 🏗️ Agrégat Quote

\`\`\`
Quote (ROOT)
  └── QuoteResponse (1-0..1)
\`\`\`

**Invariants** :
- status valide
- Si ACCEPTED → Booking existe
- Au plus une QuoteResponse par Quote

## 🏗️ Agrégat Booking

\`\`\`
Booking (ROOT)
\`\`\`

**Invariants** :
- status valide
- scheduledAt non null
- Un créneau ne peut être réservé qu'une fois

## 🏗️ Agrégat User

\`\`\`
User (ROOT)
  ├── Address[]
  └── Notification[]
\`\`\`

**Invariants** :
- email unique global
- passwordHash non vide
- Au plus une Address.isDefault = true

## 🏗️ Agrégat Payment

\`\`\`
Payment (ROOT)
  └── Transaction[]
\`\`\`

**Invariants** :
- XOR(orderId, bookingId)
- status valide
- providerRef unique si non null

## 🏗️ Agrégat Review

\`\`\`
Review (ROOT)
  └── ReviewReport[]
\`\`\`

**Invariants** :
- rating ∈ [1, 5]
- Au moins un lien non null
- Un seul avis par order/booking

## Règles d'agrégat

### 1. Une transaction = un agrégat (principe)

Dans la mesure du possible, une transaction ne modifie qu'un seul
agrégat.

### 2. Transactions inter-agrégats (exceptions)

Certaines opérations touchent plusieurs agrégats. On utilise alors :
- **Isolation Serializable**
- **Retry automatique** sur P2034
- **Compensation** en cas d'échec partiel

| Opération | Agrégats | Stratégie |
|---|---|---|
| Créer commande | Product + Order | Serializable |
| Confirmer paiement | Product + Order + Payment | Serializable |
| Annuler commande | Product + Order | Serializable |
| Créer réservation | Service + Booking | Serializable |

### 3. Référencement par ID uniquement

On ne stocke jamais une référence directe à un objet d'un autre
agrégat. On stocke l'ID et on recharge si nécessaire.

**Exception — snapshot** : pour préserver l'historique, on copie
certains champs immuables.

### 4. Cohérence eventual entre agrégats

Entre deux agrégats, la cohérence est eventual (pas immédiate).

### 5. Événements de domaine

Chaque agrégat peut émettre des Domain Events :
- OrderCreated → Notification, Analytics
- OrderPaid → Product (commit), Notification
- BookingConfirmed → Notification, Analytics

## Transactions inter-agrégats critiques

### Scénario 1 — Créer une commande

\`\`\`
BEGIN TRANSACTION (Serializable)
  Pour chaque item :
    UPDATE inventory SET reserved = reserved + qty
    WHERE quantity - reserved >= qty
    Si 0 ligne affectée → ROLLBACK
  INSERT Order (PENDING)
  INSERT OrderItems
COMMIT
\`\`\`

### Scénario 2 — Confirmer un paiement

\`\`\`
BEGIN TRANSACTION (Serializable)
  Pour chaque item :
    UPDATE inventory
    SET quantity = quantity - qty, reserved = reserved - qty
    WHERE reserved >= qty
  UPDATE Order SET status = PAID
  UPDATE Payment SET status = PAID
COMMIT
POST-COMMIT (async)
  Email + SMS + Analytics
\`\`\`

### Scénario 3 — Annuler une commande

\`\`\`
BEGIN TRANSACTION (Serializable)
  Vérifier Order.status = PENDING
  Pour chaque item :
    UPDATE inventory SET reserved = reserved - qty
  UPDATE Order SET status = CANCELLED
COMMIT
\`\`\`

## Résumé — Agrégats et transactions

| Agrégat | Complexité | Isolation |
|---|---|---|
| Product | Élevée | Serializable |
| Store | Faible | Read Committed |
| Order | Élevée | Serializable |
| Service | Faible | Read Committed |
| Quote | Moyenne | Read Committed |
| Booking | Moyenne | Serializable |
| User | Faible | Read Committed |
| Payment | Élevée | Serializable |
| Review | Faible | Read Committed |

## Décisions structurantes

1. Product + Inventory = un seul agrégat
2. Order référence Product par ID + snapshot
3. Service + Availability = un seul agrégat
4. Quote + QuoteResponse = un seul agrégat
5. Payment séparé de Order
6. Review séparé (peut concerner plusieurs entités)

${footer("0.2.0", defaultChanges(true))}
`;

/* ------------------------------------------------------------------
 * 03-domain/workflows.md
 * ------------------------------------------------------------------ */
FILES["03-domain/workflows.md"] = `
${header("Workflows", "03-domain")}

## Introduction

Ce document décrit les **workflows métier** du domaine DɛmɛPro,
organisés par flux. Chaque workflow spécifie : déclencheur, étapes,
règles, sortie.

## Flux ACHETER

### 🏪 WF-001 — Création de produit simple

**Acteur** : Professionnel
**Déclencheur** : \`POST /catalog/products\`
**Agrégats** : Product

\`\`\`
POST /catalog/products
  ├── 1. authenticate (JWT)
  ├── 2. requirePermission("catalog.product.create")
  ├── 3. validate(createProductSchema)
  ├── 4. BEGIN TRANSACTION (Serializable)
  │       ├── Vérif Store + ownership
  │       ├── Vérif Category
  │       ├── Vérif slug unique
  │       ├── Vérif SKU unique
  │       └── INSERT Product (DRAFT)
  └── 5. COMMIT
\`\`\`

**Statut** : ✅ **Implémenté** (25 tests)

### 🏪 WF-002 — Création de produit à variantes (atomique)

**Déclencheur** : \`POST /catalog/products/full\`

Règles :
- Atomicité complète
- Idempotence supportée

**Statut** : ✅ **Implémenté** (E2E testé)

### 🏪 WF-003 — Activation de produit

**Déclencheur** : \`POST /catalog/products/:id/activate\`

Règles :
- Refus si aucun stock
- Refus si produit archivé

**Statut** : ✅ **Implémenté**

### 🏪 WF-004 — Archivage de produit

**Déclencheur** : \`DELETE /catalog/products/:id\`

Effets :
- status = ARCHIVED
- toutes les variantes isActive = false
- stock conservé

**Statut** : ✅ **Implémenté**

### 🛒 WF-005 — Création de commande

**Déclencheur** : \`POST /orders\`
**Isolation** : Serializable

\`\`\`
BEGIN TRANSACTION (Serializable)
  Pour chaque item :
    Vérif produit ACTIVE
    Vérif variante isActive
    Vérif stock disponible
    RESERVE stock (UPDATE atomique)
  INSERT Order (PENDING)
  INSERT OrderItems (snapshot prix/nom)
COMMIT
POST-COMMIT (async)
  Notification "Commande créée"
\`\`\`

**Statut** : ❌ **À implémenter**

### 💳 WF-006 — Paiement de commande

**Déclencheur** : \`POST /orders/:id/pay\` + webhook

\`\`\`
POST /orders/:id/pay
  Créer Payment PENDING
  Rediriger vers provider
  Provider → webhook
POST /webhooks/payment
  Vérif signature
  BEGIN TRANSACTION
    Pour chaque item :
      UPDATE inventory SET quantity -= qty, reserved -= qty
    UPDATE Order SET status = PAID
    UPDATE Payment SET status = PAID
  COMMIT
  POST-COMMIT
    Email + SMS + Notif pro
\`\`\`

**Statut** : ❌ **À implémenter**

### 🚚 WF-007 — Expédition de commande

**Déclencheur** : \`POST /store/orders/:id/ship\`

**Statut** : ❌ **À implémenter**

### 📦 WF-008 — Livraison de commande

**Déclencheur** : \`POST /store/orders/:id/deliver\`

**Statut** : ❌ **À implémenter**

### ❌ WF-009 — Annulation de commande

**Déclencheur** : \`POST /orders/:id/cancel\`
**Isolation** : Serializable

Règles :
- Annulation si PENDING ou PAID
- Si PAID → déclencher refund
- Refus si SHIPPED ou DELIVERED

**Statut** : ❌ **À implémenter**

## Flux TROUVER

### 🎨 WF-010 — Création de service
**Statut** : ❌ **Phase 2**

### 📋 WF-011 — Demande de devis
**Statut** : ❌ **Phase 2**

### 💬 WF-012 — Réponse à un devis
**Statut** : ❌ **Phase 2**

### ✅ WF-013 — Acceptation de devis
**Statut** : ❌ **Phase 2**

### 📅 WF-014 — Réalisation de prestation
**Statut** : ❌ **Phase 2**

## Workflows transverses

### 💳 WF-015 — Remboursement
**Statut** : ❌ **À implémenter**

### ⭐ WF-016 — Création d'avis
**Statut** : ❌ **À implémenter**

### 🔔 WF-017 — Envoi de notification
**Statut** : ❌ **À implémenter**

## Matrice des workflows

| ID | Nom | Acteur | Agrégats | Statut |
|---|---|---|---|---|
| WF-001 | Créer produit simple | Pro | Product | ✅ |
| WF-002 | Créer produit complet | Pro | Product | ✅ |
| WF-003 | Activer produit | Pro | Product | ✅ |
| WF-004 | Archiver produit | Pro | Product | ✅ |
| WF-005 | Créer commande | Client | Product + Order | ❌ |
| WF-006 | Payer commande | Client | Product + Order + Payment | ❌ |
| WF-007 | Expédier commande | Pro | Order + Delivery | ❌ |
| WF-008 | Livrer commande | Pro | Order + Delivery | ❌ |
| WF-009 | Annuler commande | Client/Pro | Product + Order | ❌ |
| WF-010 | Créer service | Pro | Service | ❌ P2 |
| WF-011 | Demander devis | Client | Quote | ❌ P2 |
| WF-012 | Répondre devis | Pro | Quote | ❌ P2 |
| WF-013 | Accepter devis | Client | Quote + Booking | ❌ P2 |
| WF-014 | Réaliser prestation | Pro | Booking | ❌ P2 |
| WF-015 | Rembourser | Admin | Payment + Order | ❌ |
| WF-016 | Créer avis | Client | Review + Order | ❌ |
| WF-017 | Envoyer notification | Système | Notification | ❌ |

${footer("0.2.0", defaultChanges(true))}
`;

/* ------------------------------------------------------------------
 * 03-domain/state-machines.md
 * ------------------------------------------------------------------ */
FILES["03-domain/state-machines.md"] = `
${header("Machines à états", "03-domain")}

## Introduction

Ce document décrit les **machines à états** des entités du domaine.
Chaque machine définit : états, transitions autorisées, événements,
invariants.

## Flux ACHETER

### 📦 ProductStatus

**États** : DRAFT, ACTIVE, OUT_OF_STOCK, INACTIVE, ARCHIVED

\`\`\`
        ┌─────────┐
        │  DRAFT  │
        └────┬────┘
             │ activate
             ▼
        ┌─────────┐
        │ ACTIVE  │◄─────┐
        └────┬────┘      │
             │           │
    stock=0  │           │ restock
             ▼           │
    ┌────────────────┐   │
    │ OUT_OF_STOCK   │───┘
    └────────────────┘
             │ archive
             ▼
        ┌─────────┐
        │ARCHIVED │
        └─────────┘
\`\`\`

**Transitions autorisées** :

| De | Vers | Événement | Condition |
|---|---|---|---|
| DRAFT | ACTIVE | activate | stock > 0 |
| DRAFT | INACTIVE | deactivate | — |
| DRAFT | ARCHIVED | archive | — |
| ACTIVE | OUT_OF_STOCK | stock depleted | auto |
| ACTIVE | INACTIVE | deactivate | — |
| ACTIVE | ARCHIVED | archive | — |
| OUT_OF_STOCK | ACTIVE | restock | stock > 0 |
| OUT_OF_STOCK | ARCHIVED | archive | — |
| INACTIVE | ACTIVE | activate | stock > 0 |
| INACTIVE | ARCHIVED | archive | — |
| ARCHIVED | (terminal) | — | — |

\`\`\`typescript
const PRODUCT_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  DRAFT: ["ACTIVE", "INACTIVE", "ARCHIVED"],
  ACTIVE: ["OUT_OF_STOCK", "INACTIVE", "ARCHIVED"],
  OUT_OF_STOCK: ["ACTIVE", "ARCHIVED"],
  INACTIVE: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: [], // terminal
};
\`\`\`

**Statut** : ✅ **Implémenté**

### 📋 OrderStatus

**États** : PENDING, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED

\`\`\`
PENDING ──► PAID ──► SHIPPED ──► DELIVERED ──► REFUNDED
   │         │
   │         └──► CANCELLED
   │              (release + refund)
   └──► CANCELLED
        (release stock)
\`\`\`

**Transitions autorisées** :

| De | Vers | Événement | Condition |
|---|---|---|---|
| PENDING | PAID | confirmPayment | paiement réussi |
| PENDING | CANCELLED | cancel | — |
| PAID | SHIPPED | ship | — |
| PAID | CANCELLED | cancel | release + refund |
| PAID | REFUNDED | refund | — |
| SHIPPED | DELIVERED | deliver | — |
| DELIVERED | REFUNDED | refund | dans les 30 jours |
| CANCELLED | (terminal) | — | — |
| REFUNDED | (terminal) | — | — |

\`\`\`typescript
const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

const REFUND_WINDOW_DAYS = 30;
\`\`\`

**Statut** : ❌ **À implémenter**

### 🏪 StoreStatus

**États** : PENDING, ACTIVE, SUSPENDED, CLOSED

| De | Vers | Par qui |
|---|---|---|
| PENDING | ACTIVE | Admin |
| PENDING | REJECTED | Admin |
| ACTIVE | SUSPENDED | Admin |
| ACTIVE | CLOSED | Propriétaire/Admin |
| SUSPENDED | ACTIVE | Admin |
| SUSPENDED | CLOSED | Admin |
| REJECTED | (terminal) | — |
| CLOSED | (terminal) | — |

**Statut** : 🟡 **Modèle DB existe**

## Flux TROUVER

### 📋 QuoteStatus

**États** : PENDING, RESPONDED, ACCEPTED, REJECTED, EXPIRED, CONVERTED

| De | Vers | Par qui |
|---|---|---|
| PENDING | RESPONDED | Professionnel |
| PENDING | EXPIRED | Système |
| RESPONDED | ACCEPTED | Client |
| RESPONDED | REJECTED | Client |
| RESPONDED | EXPIRED | Système |
| ACCEPTED | CONVERTED | Système |
| REJECTED | (terminal) | — |
| EXPIRED | (terminal) | — |
| CONVERTED | (terminal) | — |

\`\`\`typescript
const QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  PENDING: ["RESPONDED", "EXPIRED"],
  RESPONDED: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: ["CONVERTED"],
  REJECTED: [],
  EXPIRED: [],
  CONVERTED: [],
};

const QUOTE_EXPIRY_DAYS = 7;
\`\`\`

**Statut** : ❌ **Phase 2**

### 📅 BookingStatus

**États** : CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW

| De | Vers | Par qui |
|---|---|---|
| CONFIRMED | IN_PROGRESS | Professionnel |
| CONFIRMED | CANCELLED | Client/Pro (> 24h avant) |
| CONFIRMED | NO_SHOW | Professionnel |
| IN_PROGRESS | COMPLETED | Professionnel |
| IN_PROGRESS | CANCELLED | Exceptionnel |
| COMPLETED | (terminal) | — |
| CANCELLED | (terminal) | — |
| NO_SHOW | (terminal) | — |

**Statut** : ❌ **Phase 2**

### 🎨 ServiceStatus

**États** : DRAFT, ACTIVE, INACTIVE, ARCHIVED

**Statut** : ❌ **Phase 2**

## Flux Transverse

### 💳 PaymentStatus

**États** : PENDING, PROCESSING, PAID, FAILED, REFUNDED,
PARTIALLY_REFUNDED

| De | Vers | Événement |
|---|---|---|
| PENDING | PROCESSING | process |
| PENDING | FAILED | fail |
| PROCESSING | PAID | confirm |
| PROCESSING | FAILED | fail |
| PAID | REFUNDED | refund (total) |
| PAID | PARTIALLY_REFUNDED | partialRefund |
| PARTIALLY_REFUNDED | REFUNDED | refund (solde) |

**Statut** : ❌ **À implémenter**

### 🚚 DeliveryStatus

**États** : PREPARING, SHIPPED, IN_TRANSIT, DELIVERED, FAILED

**Statut** : ❌ **À implémenter**

## Tableau récapitulatif

| Machine | États | Statut |
|---|---|---|
| ProductStatus | 5 | ✅ |
| OrderStatus | 6 | ❌ |
| StoreStatus | 4 | 🟡 |
| QuoteStatus | 6 | ❌ Phase 2 |
| BookingStatus | 5 | ❌ Phase 2 |
| ServiceStatus | 4 | ❌ Phase 2 |
| PaymentStatus | 6 | ❌ |
| DeliveryStatus | 5 | ❌ |

## Bonnes pratiques

### 1. Centralisation

Chaque machine doit être définie en un seul endroit :
\`apps/api/src/modules/<module>/domain/state-machines.ts\`

### 2. Validation centralisée

\`\`\`typescript
export function assertTransition<S extends string>(
  transitions: Record<S, S[]>,
  from: S,
  to: S,
  errorCode: CatalogErrorCode,
): void {
  if (!transitions[from].includes(to)) {
    throw new CatalogError(errorCode,
      \`Transition interdite : \${from} → \${to}\`);
  }
}
\`\`\`

### 3. Historique des transitions

Pour Order et Payment : tracer dans une table d'historique.

### 4. Guards sur les transitions

Vérifier conditions supplémentaires (délai remboursement,
permissions, etc.).

### 5. Tests exhaustifs

Chaque transition doit être testée (autorisée + interdite).

${footer("0.2.0", defaultChanges(true))}
`;

/* ================================================================
 * MAIN
 * ================================================================ */

async function main() {
  console.log(`\n${c.bold}📚 Mise à jour blueprint DɛmɛPro${c.reset}`);
  console.log(`${c.gray}Racine : ${BLUEPRINT}${c.reset}`);

  if (DRY_RUN) log.warn("Mode DRY-RUN — aucun fichier ne sera écrit");
  if (FORCE) log.warn("Mode FORCE — écrasement systématique");

  const stats = {
    create: 0,
    update: 0,
    skip: 0,
    "dry-create": 0,
    "dry-update": 0,
    error: 0,
  };

  log.header("📝 Traitement des fichiers");

  for (const [relPath, content] of Object.entries(FILES)) {
    try {
      const result = await writeBlueprintFile(relPath, content);
      stats[result] = (stats[result] ?? 0) + 1;
    } catch (error) {
      log.err(`${relPath} : ${error.message}`);
      stats.error++;
    }
  }

  /* Résumé */
  log.header("📊 Résumé");
  console.log(`  ${c.green}Créés       :${c.reset} ${stats.create}`);
  console.log(`  ${c.green}Mis à jour  :${c.reset} ${stats.update}`);
  console.log(`  ${c.gray}Ignorés     :${c.reset} ${stats.skip}`);
  if (DRY_RUN) {
    console.log(`  ${c.cyan}Dry create  :${c.reset} ${stats["dry-create"]}`);
    console.log(`  ${c.cyan}Dry update  :${c.reset} ${stats["dry-update"]}`);
  }
  if (stats.error > 0) {
    console.log(`  ${c.red}Erreurs     :${c.reset} ${stats.error}`);
  }
  console.log(`  ${c.bold}Total       :${c.reset} ${Object.keys(FILES).length}`);

  if (stats.skip > 0 && !FORCE) {
    log.warn(
      `Certains fichiers ont été ignorés. Utilise ${c.bold}--force${c.reset} pour les écraser.`,
    );
  }

  log.ok("\n✨ Blueprint à jour !\n");
}

main().catch((error) => {
  log.err(`Échec : ${error.message}`);
  if (VERBOSE) console.error(error);
  process.exit(1);
});