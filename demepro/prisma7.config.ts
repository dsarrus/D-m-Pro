// prisma7.config.ts (racine)
import { config } from "dotenv";
import { resolve } from "path";
import { defineConfig, env } from "prisma/config";

// Debug : afficher ce que Prisma voit au chargement
console.log(
  "[prisma7.config] DATABASE_URL at load:",
  process.env.DATABASE_URL?.replace(/:[^:@]*@/, ":****@") ?? "(undefined)",
);

if (!process.env.DATABASE_URL) {
  console.log("[prisma7.config] Loading .env...");
  config({ path: resolve(__dirname, ".env") });
}

console.log(
  "[prisma7.config] DATABASE_URL after dotenv:",
  process.env.DATABASE_URL?.replace(/:[^:@]*@/, ":****@") ?? "(undefined)",
);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
