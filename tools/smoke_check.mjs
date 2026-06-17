import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const SITE_ORIGIN = "https://activity-game.ru";
const MODES = ["DRAW", "EXPLAIN", "ACT"];
const LEVELS = ["3", "4", "5"];

const STATIC_ROUTES = [
  { route: "/", file: "index.html" },
  { route: "/activity-online/", file: "activity-online/index.html" },
  { route: "/rules/", file: "rules/index.html" },
  { route: "/words/", file: "words/index.html" },
  { route: "/dictionaries/", file: "dictionaries/index.html" },
  { route: "/games-for-company/", file: "games-for-company/index.html" },
  { route: "/crocodile-alias-activity/", file: "crocodile-alias-activity/index.html" },
  { route: "/offer/", file: "offer/index.html" },
  { route: "/access/", file: "access/index.html" },
  { route: "/requisites/", file: "requisites/index.html" },
  { route: "/privacy/", file: "privacy/index.html" },
];

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith("--")) continue;
  const next = process.argv[i + 1];
  if (next && !next.startsWith("--")) {
    args.set(arg, next);
    i += 1;
  } else {
    args.set(arg, true);
  }
}

const failures = [];
const passes = [];

function filePath(file) {
  return path.join(ROOT, file);
}

function read(file) {
  return fs.readFileSync(filePath(file), "utf8");
}

function assert(condition, message) {
  if (condition) {
    passes.push(message);
  } else {
    failures.push(message);
  }
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function hasFunction(text, name) {
  return text.includes(`function ${name}`) || text.includes(`window.${name} = function`);
}

function normalizeRoute(href, fromRoute) {
  if (!href || href.startsWith("#")) return null;
  if (/^(https?:|mailto:|tel:|tg:)/i.test(href)) return null;
  if (href.startsWith("//")) return null;
  const base = new URL(fromRoute, SITE_ORIGIN);
  const url = new URL(href, base);
  if (url.origin !== SITE_ORIGIN) return null;
  return url.pathname;
}

function routeExists(route) {
  if (STATIC_ROUTES.some((item) => item.route === route)) return true;
  const withoutLeading = route.replace(/^\/+/, "");
  if (!withoutLeading) return true;
  return fs.existsSync(filePath(withoutLeading));
}

function runNodeCheck(file) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert(result.status === 0, `node --check ${file}`);
  if (result.status !== 0) {
    failures.push((result.stderr || result.stdout || "").trim());
  }
}

function validateDictionaries() {
  const catalog = JSON.parse(read("dictionaries.json"));
  assert(Array.isArray(catalog), "dictionaries.json is an array");

  for (const entry of catalog) {
    assert(Boolean(entry.id && entry.name && entry.file), `dictionary metadata is complete for ${entry.id || entry.name}`);
    assert(fs.existsSync(filePath(entry.file)), `dictionary file exists: ${entry.file}`);
    const dictionary = JSON.parse(read(entry.file));
    let count = 0;
    for (const mode of MODES) {
      for (const level of LEVELS) {
        const bucket = dictionary[mode]?.[level];
        assert(Array.isArray(bucket), `${entry.id} has ${mode}-${level}`);
        if (Array.isArray(bucket)) count += bucket.length;
      }
    }
    assert(count === Number(entry.wordCount), `${entry.id} wordCount matches file (${count})`);
  }
}

function validateStaticPages() {
  const sitemap = read("sitemap.xml");
  for (const page of STATIC_ROUTES) {
    assert(fs.existsSync(filePath(page.file)), `static page exists: ${page.file}`);
    const html = read(page.file);
    assert(/<title>[^<]+<\/title>/i.test(html), `${page.route} has title`);
    assert(/<meta name="description" content="[^"]+"/i.test(html), `${page.route} has meta description`);
    assert(html.includes(`rel="canonical" href="${SITE_ORIGIN}${page.route}"`), `${page.route} has canonical`);
    assert(html.includes(`property="og:url" content="${SITE_ORIGIN}${page.route}"`), `${page.route} has og:url`);
    assert(sitemap.includes(`<loc>${SITE_ORIGIN}${page.route}</loc>`), `sitemap includes ${page.route}`);

    const hrefs = [...html.matchAll(/\s(?:href|src)="([^"]+)"/gi)].map((match) => match[1]);
    for (const href of hrefs) {
      const route = normalizeRoute(href, page.route);
      if (!route) continue;
      assert(routeExists(route), `${page.file} links to existing internal route or asset: ${href}`);
    }
  }
}

function validateSourceContracts() {
  const index = read("index.html");
  const style = read("style.css");
  const script = read("script.js");
  const sitemap = read("sitemap.xml");
  const wrangler = read("wrangler.jsonc");

  assert(index.includes('class="skip-link"'), "index has skip link");
  assert(index.includes('onclick="showScreen(\'setup\')"'), "skip link opens visible setup screen");
  assert(index.includes('class="quick-start"'), "index has quick-start");
  assert(index.includes('class="turn-tip"'), "index has turn handoff tip");
  assert(index.includes('href="/privacy/"'), "index links privacy page");
  assert(countMatches(index, /<nav class="nav-pill"/g) === 3, "index has three nav landmarks");
  assert(countMatches(index, /<button type="button" class="nav-item/g) === 9, "top nav items are native buttons");
  assert(countMatches(index, /aria-current="page"/g) === 3, "active nav buttons expose aria-current");
  assert(countMatches(index, /<button type="button" class="diff-card"/g) === 3, "difficulty cards are native buttons");
  assert(index.includes('id="go-summary-meta"') && index.includes('id="go-team-stats"') && index.includes('id="go-highlights"'), "game-over summary containers exist");
  assert(index.includes('id="gd-summary-meta"') && index.includes('id="gd-team-stats"') && index.includes('id="gd-highlights"'), "game-details summary containers exist");

  assert(style.includes(".skip-link"), "style has skip-link rules");
  assert(style.includes(":focus-visible"), "style has visible focus rules");
  assert(style.includes(".quick-start"), "style has quick-start rules");
  assert(style.includes(".summary-details"), "style has compact summary details rules");
  assert(style.includes(".player-stats-table{display:block;overflow-x:auto;white-space:nowrap}"), "mobile player stats table scrolls");
  assert(style.includes(".nav-pill{width:100%}"), "mobile nav expands to full width");

  assert(script.includes("function showScreen(id)"), "script defines showScreen");
  for (const fn of ["goTurnStart", "goCardSelection", "goPreview", "goExplaining", "endTurn", "endOpenRound", "buildGameSummary", "showGameOver", "renderSummaryInto"]) {
    assert(hasFunction(script, fn), `script defines ${fn}`);
  }
  assert(script.includes("function renderSummaryInto(summary, ids, options = {})"), "renderSummaryInto supports options");
  assert(script.includes("{ compact: true }"), "showGameOver uses compact summary rendering");
  assert(countMatches(script, /ts-back-to-menu-btn'\)\.addEventListener/g) === 1, "turn-start back button has one listener");

  const lockedStart = script.indexOf("window.selectLockedDict = function");
  const lockedEnd = script.indexOf("window.buyDictionaryAccess = async function", lockedStart);
  const lockedBlock = lockedStart >= 0 && lockedEnd > lockedStart ? script.slice(lockedStart, lockedEnd) : "";
  assert(Boolean(lockedBlock), "selectLockedDict block exists");
  assert(!lockedBlock.includes("alert("), "selectLockedDict does not use alert");

  assert(sitemap.includes("<loc>https://activity-game.ru/privacy/</loc>"), "sitemap includes privacy");
  for (const protectedDictionary of ["/words_around_us.json", "/words_cinema.json", "/words_science.json"]) {
    assert(wrangler.includes(`"${protectedDictionary}"`), `wrangler runs Worker first for ${protectedDictionary}`);
  }
}

async function fetchStatus(base, route) {
  const url = new URL(route, base).toString();
  const response = await fetch(url, { redirect: "manual" });
  return { url, status: response.status, text: await response.text() };
}

async function validateHttpBase(base) {
  for (const page of STATIC_ROUTES) {
    const result = await fetchStatus(base, page.route);
    assert(result.status >= 200 && result.status < 300, `${result.url} returns 2xx`);
    assert(result.text.includes("<!DOCTYPE html>"), `${result.url} returns HTML`);
  }
}

async function validateProduction(base) {
  await validateHttpBase(base);

  for (const route of ["/README.md", "/.agent-pipeline/AGENT_PIPELINE.md", "/tools/smoke_check.mjs"]) {
    const result = await fetchStatus(base, route);
    assert(result.status === 404, `${result.url} is not publicly exposed`);
  }

  for (const route of ["/words_around_us.json", "/words_cinema.json", "/words_science.json"]) {
    const result = await fetchStatus(base, route);
    assert(result.status === 401 || result.status === 403, `${result.url} requires login anonymously`);
  }
}

async function main() {
  runNodeCheck("script.js");
  runNodeCheck("src/worker.js");
  validateDictionaries();
  validateStaticPages();
  validateSourceContracts();

  if (args.has("--base")) {
    await validateHttpBase(String(args.get("--base")));
  }
  if (args.has("--production")) {
    await validateProduction(String(args.get("--production")));
  }

  if (failures.length) {
    console.error(`Smoke check failed: ${failures.length} issue(s)`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Smoke check passed: ${passes.length} assertions`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
