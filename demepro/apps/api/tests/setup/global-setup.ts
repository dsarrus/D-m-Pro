import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const API_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://demepro:demepro@localhost:5432/demepro_test";

export async function setup() {
  console.log("[globalSetup] applying migrations to demepro_test…");
  execSync("pnpm db:migrate:deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "inherit",
    cwd: API_ROOT,
    shell: true,
  });
}