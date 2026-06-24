/**
 * CRA/webpack 5 expects ajv@8 for ajv-keywords@5 nested deps.
 * Force-install ajv 8 at repo root when postinstall runs (Vercel + local).
 */
const { execSync } = require("child_process");

try {
  require.resolve("ajv/dist/compile/codegen");
} catch {
  console.log("[postinstall] Installing ajv@8 for webpack schema-utils compatibility…");
  execSync("npm install ajv@8.17.1 --no-save --legacy-peer-deps", {
    stdio: "inherit",
  });
}
