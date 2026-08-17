/**
 * Guards the site-URL resolver against every shape the env var actually
 * arrives in. An empty NEXT_PUBLIC_SITE_URL once took the entire build down
 * with ERR_INVALID_URL on /_not-found, so this asserts the resolver never
 * throws and always returns something `new URL()` accepts.
 *
 *   node scripts/check-site-url.mjs
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const cases = [
  { name: "unset", env: {}, expect: "http://localhost:3100" },
  { name: "empty string", env: { NEXT_PUBLIC_SITE_URL: "" }, expect: "http://localhost:3100" },
  { name: "whitespace", env: { NEXT_PUBLIC_SITE_URL: "   " }, expect: "http://localhost:3100" },
  { name: "full https", env: { NEXT_PUBLIC_SITE_URL: "https://cairn.app" }, expect: "https://cairn.app" },
  { name: "trailing slash", env: { NEXT_PUBLIC_SITE_URL: "https://cairn.app/" }, expect: "https://cairn.app" },
  { name: "with a path", env: { NEXT_PUBLIC_SITE_URL: "https://cairn.app/x" }, expect: "https://cairn.app" },
  { name: "bare domain", env: { NEXT_PUBLIC_SITE_URL: "cairn.app" }, expect: "https://cairn.app" },
  { name: "padded", env: { NEXT_PUBLIC_SITE_URL: "  https://cairn.app  " }, expect: "https://cairn.app" },
  { name: "garbage", env: { NEXT_PUBLIC_SITE_URL: "://" }, expect: "http://localhost:3100" },
  { name: "vercel auto", env: { VERCEL_URL: "cairn-abc.vercel.app" }, expect: "https://cairn-abc.vercel.app" },
  {
    name: "production url beats preview",
    env: { VERCEL_URL: "preview.vercel.app", VERCEL_PROJECT_PRODUCTION_URL: "cairn.app" },
    expect: "https://cairn.app",
  },
  {
    name: "explicit beats vercel",
    env: { NEXT_PUBLIC_SITE_URL: "https://real.com", VERCEL_URL: "x.vercel.app" },
    expect: "https://real.com",
  },
];

// Lift the real function out of site.ts so this cannot drift from the source.
const text = readFileSync(new URL("../src/lib/site.ts", import.meta.url), "utf8");
const start = text.indexOf("function resolveSiteUrl()");
const end = text.indexOf("\n}", start) + 2;
if (start === -1 || end < 2) {
  console.error("resolveSiteUrl() not found in src/lib/site.ts");
  process.exit(1);
}
// The function closes over FALLBACK_URL, so lift that too or every
// fall-through case dies on an undefined reference.
const constMatch = text.match(/const FALLBACK_URL = "[^"]+";/);
if (!constMatch) {
  console.error("FALLBACK_URL not found in src/lib/site.ts");
  process.exit(1);
}
const body = text.slice(start, end).replace(/: string/g, "");
const program = `${constMatch[0]}\n${body}\nprocess.stdout.write(resolveSiteUrl());`;

let failed = 0;
for (const c of cases) {
  const r = spawnSync(process.execPath, ["-e", program], {
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ...c.env },
    encoding: "utf8",
  });
  const got = (r.stdout || "").trim();
  const threw = r.status !== 0;
  const ok = !threw && got === c.expect;
  if (!ok) failed++;
  console.log(
    `${ok ? "ok  " : "FAIL"}  ${c.name.padEnd(28)} -> ` +
      (threw ? `THREW: ${(r.stderr || "").split("\n")[0]}` : got) +
      (ok ? "" : `   (expected ${c.expect})`),
  );
}

console.log(failed ? `\n${failed} case(s) failed` : `\nAll ${cases.length} cases pass.`);
process.exit(failed ? 1 : 0);
