#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = 'demepro';

// Arborescence complète
const structure = {
  'apps/web/app/(public)/produits': null,
  'apps/web/app/(public)/services': null,
  'apps/web/app/(public)/professionnels': null,
  'apps/web/app/(public)/boutiques': null,
  'apps/web/app/(public)/recherche': null,
  'apps/web/app/(public)/[vertical]': null,
  'apps/web/app/(auth)/connexion': null,
  'apps/web/app/(auth)/inscription': null,
  'apps/web/app/(auth)/mot-de-passe-oublie': null,
  'apps/web/app/(customer)/compte': null,
  'apps/web/app/(customer)/commandes': null,
  'apps/web/app/(customer)/demandes': null,
  'apps/web/app/(customer)/rendez-vous': null,
  'apps/web/app/(customer)/favoris': null,
  'apps/web/app/(customer)/messages': null,
  'apps/web/app/(professional)/professionnel': null,
  'apps/web/app/(professional)/services': null,
  'apps/web/app/(professional)/produits': null,
  'apps/web/app/(professional)/commandes': null,
  'apps/web/app/(professional)/demandes': null,
  'apps/web/app/(professional)/devis': null,
  'apps/web/app/(professional)/disponibilites': null,
  'apps/web/components/ui': null,
  'apps/web/components/layout': null,
  'apps/web/components/navigation': null,
  'apps/web/components/product': null,
  'apps/web/components/service': null,
  'apps/web/components/professional': null,
  'apps/web/components/cart': null,
  'apps/web/components/order': null,
  'apps/web/features/auth': null,
  'apps/web/features/products': null,
  'apps/web/features/services': null,
  'apps/web/features/requests': null,
  'apps/web/features/cart': null,
  'apps/web/features/orders': null,
  'apps/web/features/bookings': null,
  'apps/web/features/messaging': null,
  'apps/web/features/reviews': null,
  'apps/web/lib/api': null,
  'apps/web/lib/auth': null,
  'apps/web/lib/seo': null,
  'apps/web/lib/utils': null,
  'apps/web/providers': null,
  'apps/web/hooks': null,
  'apps/web/types': null,
  'apps/web/styles': null,

  'apps/api/src/app': null,
  'apps/api/src/config': null,
  'apps/api/src/modules/identity': null,
  'apps/api/src/modules/users': null,
  'apps/api/src/modules/professionals': null,
  'apps/api/src/modules/stores': null,
  'apps/api/src/modules/catalog': null,
  'apps/api/src/modules/requests': null,
  'apps/api/src/modules/matching': null,
  'apps/api/src/modules/quotes': null,
  'apps/api/src/modules/bookings': null,
  'apps/api/src/modules/cart': null,
  'apps/api/src/modules/orders': null,
  'apps/api/src/modules/payments': null,
  'apps/api/src/modules/deliveries': null,
  'apps/api/src/modules/reviews': null,
  'apps/api/src/modules/messaging': null,
  'apps/api/src/modules/notifications': null,
  'apps/api/src/modules/verification': null,
  'apps/api/src/modules/moderation': null,
  'apps/api/src/modules/administration': null,
  'apps/api/src/infrastructure/database': null,
  'apps/api/src/infrastructure/cache': null,
  'apps/api/src/infrastructure/queue': null,
  'apps/api/src/infrastructure/storage': null,
  'apps/api/src/infrastructure/payments': null,
  'apps/api/src/infrastructure/delivery': null,
  'apps/api/src/middleware': null,
  'apps/api/src/shared/errors': null,
  'apps/api/src/shared/http': null,
  'apps/api/src/shared/logging': null,
  'apps/api/src/shared/security': null,
  'apps/api/src/shared/types': null,

  'apps/admin/app/connexion': null,
  'apps/admin/app/dashboard/users': null,
  'apps/admin/app/dashboard/professionals': null,
  'apps/admin/app/dashboard/stores': null,
  'apps/admin/app/dashboard/products': null,
  'apps/admin/app/dashboard/services': null,
  'apps/admin/app/dashboard/orders': null,
  'apps/admin/app/dashboard/bookings': null,
  'apps/admin/app/dashboard/reports': null,
  'apps/admin/app/dashboard/audit': null,
  'apps/admin/components': null,
  'apps/admin/features': null,
  'apps/admin/lib': null,
  'apps/admin/types': null,

  'packages/types': null,
  'packages/validation': null,
  'packages/ui': null,
  'packages/config': null,
  'packages/utils': null,

  'prisma/migrations': null,
  'docs/architecture/ADR': null,
  'docs/api': null,
  'docs/database': null,
  'docs/business': null,
  'docs/product': null,
  'tests/e2e': null,
  'tests/integration': null,
  'tests/fixtures': null,
  'docker/postgres': null,
  'docker/redis': null,
  'docker/minio': null,
  '.developer/agents': null,
  '.developer/skills': null,
  '.developer/rules': null,
  '.developer/hooks': null,
  '.github/workflows': null,
};

// Sous-structure pour chaque module API (DDD)
const moduleSubDirs = ['domain', 'application', 'infrastructure', 'presentation'];

// Fichiers avec contenu par défaut
const files = {
  'package.json': JSON.stringify({
    name: 'demepro',
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'pnpm --parallel -r dev',
      build: 'pnpm -r build',
      test: 'pnpm -r test',
      lint: 'pnpm -r lint',
    },
    packageManager: 'pnpm@9.0.0',
  }, null, 2) + '\n',

  'pnpm-workspace.yaml': `packages:\n  - 'apps/*'\n  - 'packages/*'\n`,

  'tsconfig.base.json': JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      resolveJsonModule: true,
      isolatedModules: true,
      declaration: true,
      sourceMap: true,
    },
  }, null, 2) + '\n',

  '.env.example': `NODE_ENV=development\nDATABASE_URL=postgresql://user:password@localhost:5432/demepro\nREDIS_URL=redis://localhost:6379\n`,

  '.gitignore': `node_modules/\n.next/\ndist/\nbuild/\n.env\n.env.local\n*.log\ncoverage/\n.turbo/\n`,

  'prisma/schema.prisma': `generator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n`,

  'prisma/seed.ts': `// Seed script\nasync function main() {\n  console.log('Seeding...');\n}\n\nmain().catch(console.error);\n`,

  'README.md': `# DɛmɛPro\n\nMonorepo DɛmɛPro.\n`,

  'docker-compose.yml': `version: '3.9'\nservices:\n  postgres:\n    image: postgres:16\n    environment:\n      POSTGRES_USER: user\n      POSTGRES_PASSWORD: password\n      POSTGRES_DB: demepro\n    ports:\n      - "5432:5432"\n  redis:\n    image: redis:7\n    ports:\n      - "6379:6379"\n  minio:\n    image: minio/minio\n    command: server /data --console-address ":9001"\n    ports:\n      - "9000:9000"\n      - "9001:9001"\n`,
};

// Fichiers API spécifiques
const apiFiles = {
  'apps/api/src/app/app.ts': `import express from 'express';\n\nexport const app = express();\n`,
  'apps/api/src/app/routes.ts': `import { Router } from 'express';\n\nexport const routes = Router();\n`,
  'apps/api/src/app/server.ts': `import { app } from './app';\n\nconst PORT = process.env.PORT || 3001;\napp.listen(PORT, () => console.log(\`API on \${PORT}\`));\n`,
};

// Fichiers Web spécifiques
const webFiles = {
  'apps/web/app/layout.tsx': `export default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="fr">\n      <body>{children}</body>\n    </html>\n  );\n}\n`,
  'apps/web/app/loading.tsx': `export default function Loading() {\n  return <div>Chargement...</div>;\n}\n`,
  'apps/web/app/error.tsx': `'use client';\n\nexport default function Error({ error }: { error: Error }) {\n  return <div>Erreur: {error.message}</div>;\n}\n`,
  'apps/web/app/not-found.tsx': `export default function NotFound() {\n  return <div>Page introuvable</div>;\n}\n`,
  'apps/web/app/(public)/page.tsx': `export default function HomePage() {\n  return <main>Accueil DɛmɛPro</main>;\n}\n`,
};

// Fichiers index.ts pour chaque module API
function getModuleIndexContent(moduleName) {
  return `// Module ${moduleName}\nexport {};\n`;
}

// Création de répertoire
function mkdir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// Création de fichier
function writeFile(filePath, content) {
  mkdir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

// Main
function main() {
  console.log('🚀 Création de l\'architecture DɛmɛPro...\n');

  // Créer la racine
  mkdir(ROOT);

  // Créer tous les répertoires
  Object.keys(structure).forEach((dir) => {
    mkdir(path.join(ROOT, dir));
  });

  // Créer les sous-dossiers DDD pour chaque module API
  const modules = [
    'identity', 'users', 'professionals', 'stores', 'catalog', 'requests',
    'matching', 'quotes', 'bookings', 'cart', 'orders', 'payments',
    'deliveries', 'reviews', 'messaging', 'notifications', 'verification',
    'moderation', 'administration',
  ];

  modules.forEach((mod) => {
    moduleSubDirs.forEach((sub) => {
      mkdir(path.join(ROOT, 'apps/api/src/modules', mod, sub));
    });
    writeFile(
      path.join(ROOT, 'apps/api/src/modules', mod, 'index.ts'),
      getModuleIndexContent(mod)
    );
  });

  // Créer les fichiers racine
  Object.entries(files).forEach(([file, content]) => {
    writeFile(path.join(ROOT, file), content);
  });

  // Créer les fichiers API
  Object.entries(apiFiles).forEach(([file, content]) => {
    writeFile(path.join(ROOT, file), content);
  });

  // Créer les fichiers Web
  Object.entries(webFiles).forEach(([file, content]) => {
    writeFile(path.join(ROOT, file), content);
  });

  // Créer les index.ts pour les packages
  ['types', 'validation', 'ui', 'config', 'utils'].forEach((pkg) => {
    writeFile(
      path.join(ROOT, 'packages', pkg, 'index.ts'),
      `// Package ${pkg}\nexport {};\n`
    );
    writeFile(
      path.join(ROOT, 'packages', pkg, 'package.json'),
      JSON.stringify({
        name: `@demepro/${pkg}`,
        version: '0.1.0',
        main: 'index.ts',
        types: 'index.ts',
        private: true,
      }, null, 2) + '\n'
    );
  });

  // Créer les package.json des apps
  ['web', 'api', 'admin'].forEach((appName) => {
    writeFile(
      path.join(ROOT, 'apps', appName, 'package.json'),
      JSON.stringify({
        name: `@demepro/${appName}`,
        version: '0.1.0',
        private: true,
        scripts: { dev: 'echo "dev"', build: 'echo "build"' },
      }, null, 2) + '\n'
    );
  });

  console.log('✅ Architecture DɛmɛPro créée avec succès !\n');
  console.log('📁 Structure générée dans ./demepro/\n');
  console.log('Prochaines étapes :');
  console.log('  1. cd demepro');
  console.log('  2. pnpm install');
  console.log('  3. docker-compose up -d');
  console.log('  4. pnpm dev\n');
}

main();