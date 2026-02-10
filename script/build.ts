import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, mkdir, cp, writeFile } from "fs/promises";

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

  console.log("building vercel handler...");
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

  console.log("building vercel output...");
  const vercelOut = ".vercel/output";
  await rm(".vercel", { recursive: true, force: true });

  const { existsSync } = await import("fs");
  if (!existsSync("dist/public")) {
    throw new Error("dist/public not found — client build may have failed");
  }
  if (!existsSync("dist/vercel-handler.cjs")) {
    throw new Error("dist/vercel-handler.cjs not found — server build may have failed");
  }

  await mkdir(`${vercelOut}/static`, { recursive: true });
  await cp("dist/public", `${vercelOut}/static`, { recursive: true });

  const funcDir = `${vercelOut}/functions/api.func`;
  await mkdir(funcDir, { recursive: true });
  await cp("dist/vercel-handler.cjs", `${funcDir}/index.cjs`);

  await writeFile(`${funcDir}/.vc-config.json`, JSON.stringify({
    runtime: "nodejs20.x",
    handler: "index.cjs",
    launcherType: "Nodejs",
    maxDuration: 30,
  }, null, 2));

  await writeFile(`${vercelOut}/config.json`, JSON.stringify({
    version: 3,
    routes: [
      {
        src: "/assets/(.*)",
        headers: { "Cache-Control": "public, max-age=31536000, immutable" },
        continue: true,
      },
      {
        src: "/(.*\\.(?:js|css|woff2?|ttf|eot|ico|svg|png|jpg|jpeg|gif|webp))",
        headers: { "Cache-Control": "public, max-age=31536000, immutable" },
        continue: true,
      },
      { src: "/api/(.*)", dest: "/api" },
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/index.html" },
    ],
  }, null, 2));

  console.log("vercel build output created at .vercel/output/");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
