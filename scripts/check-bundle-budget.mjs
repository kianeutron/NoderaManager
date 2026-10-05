// Reports the first-load JavaScript of every route (gzip) from the last `next build`, and fails when a route is over budget.
// Budgets: docs/15-performance/00-overview-and-budgets.md. Run: pnpm size (after pnpm build).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const buildDirectory = ".next";
const appDirectory = join(buildDirectory, "server", "app");
const kilobytes = 1024;
// Sign-in is the page everyone sees first and needs no app code, so it has the tighter budget.
const budgets = new Map([["/auth/sign-in", 120 * kilobytes]]);
const defaultBudget = 200 * kilobytes;

function manifests(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return manifests(path);
    return entry === "page_client-reference-manifest.js" ? [path] : [];
  });
}

const gzipSize = (file) => {
  try { return gzipSync(readFileSync(join(buildDirectory, file)), { level: 6 }).length; } catch { return 0; }
};

const rows = manifests(appDirectory).map((manifest) => {
  // A route group such as (dashboard) is not part of the URL.
  const route = `/${relative(appDirectory, dirname(manifest)).replace(/\(.*?\)\/?/g, "")}`.replace(/\/$/, "") || "/";
  const chunks = new Set(readFileSync(manifest, "utf8").match(/static\/chunks\/[\w.-]+\.js/g) ?? []);
  const size = [...chunks].reduce((total, chunk) => total + gzipSize(chunk), 0);
  return { route, size, budget: budgets.get(route) ?? defaultBudget };
}).filter((row) => !row.route.startsWith("/_")).sort((left, right) => right.size - left.size);

let failed = false;
for (const { route, size, budget } of rows) {
  const over = size > budget;
  failed ||= over;
  console.log(`${over ? "OVER " : "ok   "} ${route.padEnd(22)} ${(size / kilobytes).toFixed(0).padStart(4)} KB gzip  (budget ${budget / kilobytes} KB)`);
}
if (failed) process.exitCode = 1;
