import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "bcryptjs",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  const commonOptions = {
    platform: "node" as const,
    bundle: true,
    format: "cjs" as const,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    alias: {
      "@shared": "./shared",
    },
    logLevel: "info" as const,
  };

  await esbuild({
    ...commonOptions,
    entryPoints: ["server/index.ts"],
    outfile: "dist/index.cjs",
  });

  console.log("building vercel api...");
  await esbuild({
    ...commonOptions,
    entryPoints: ["server/vercel/handler.ts"],
    outfile: "dist/vercel-handler.cjs",
    format: "cjs" as const,
    external: ["pg-native"],
    footer: {
      js: "if(typeof module.exports.default==='function'){module.exports=module.exports.default;}",
    },
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
