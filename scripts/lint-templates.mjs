#!/usr/bin/env node
/**
 * Reports how far each sibling template repo is from the canonical INVITE_CONFIG (WT-1 §3).
 *
 *   node scripts/lint-templates.mjs
 *
 * Reads every `../template*` folder next to this repo. Nothing is modified. Exit code is 1 if any
 * template fails, so this can be wired into CI once WT-2 … WT-11 have landed.
 *
 * Hook and template.json are warnings in this ticket: no template has either yet, and
 * WT-1 is not allowed to touch them. WT-12's contract test turns both into hard failures.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SIBLINGS = resolve(HERE, "../.."); // folder holding every template repo

/** Every top-level key a template's INVITE_CONFIG may declare (WT-1 §1). */
const CANONICAL_KEYS = new Set([
  "theme",
  "couple",
  "weddingDateTime",
  "dateDisplay",
  "city",
  "blessing",
  "welcome",
  "countdownNote",
  "events",
  "venue",
  "closing",
  "credit",
  "rsvp",
  "localization",
  "ogImage",
  "intro",
  "heroPhoto",
  "heroEyebrow",
  "epigraph",
  "countdownToday",
  "countdownMarried",
  "story",
  "details",
  "gallery",
  "music",
  "extras",
]);

const FORBIDDEN_KEYS = ["bn", "i18n", "locales", "defaultLocale"];
const MANIFEST_KEYS = [
  "slug",
  "directory",
  "name",
  "tier",
  "style",
  "origin",
  "languages",
  "copyRendered",
];
const MANIFEST_TIERS = new Set(["standard", "premium", "luxury"]);
const MANIFEST_STYLES = new Set(["classic", "module"]);

/** Byte-identical copy of WT-2 §4. Any drift in a template is reported. */
const HOOK = `/* ── Invite platform hook — identical in every template ────────────────────
   Publish:  the platform writes window.__INVITE_CONFIG__ before this file runs.
   Preview:  the editor passes #cfg=<url-encoded json>.
   Editing config.js by hand still works; this only overrides what it is given. */
(function (target) {
  if (!target || typeof window === "undefined") return;
  var patch = window.__INVITE_CONFIG__;
  if (!patch) {
    var m = /#cfg=(.*)$/.exec(location.hash);
    try { patch = m ? JSON.parse(decodeURIComponent(m[1])) : null; } catch (e) { patch = null; }
  }
  if (patch) Object.keys(patch).forEach(function (k) { target[k] = patch[k]; });
})(typeof INVITE_CONFIG !== "undefined" ? INVITE_CONFIG :
   typeof config !== "undefined" ? config : null);`;

const labelWidth = 24;

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** Canonical config object from whichever export shape the template uses. */
async function loadConfig(configPath) {
  const mod = await import(pathToFileURL(configPath).href);
  return mod.INVITE_CONFIG ?? mod.config ?? mod.default;
}

function hookState(src) {
  if (src.trimEnd().endsWith(HOOK.trim())) return "ok";
  return src.includes("__INVITE_CONFIG__") ? "not-last" : "missing";
}

function manifestProblems(manifest) {
  const problems = [];
  for (const key of MANIFEST_KEYS) {
    if (!(key in manifest)) problems.push(`${key} missing`);
  }
  if (typeof manifest.tier === "string" && !MANIFEST_TIERS.has(manifest.tier)) {
    problems.push(`tier "${manifest.tier}" not standard|premium|luxury`);
  }
  if (typeof manifest.style === "string" && !MANIFEST_STYLES.has(manifest.style)) {
    problems.push(`style "${manifest.style}" not classic|module`);
  }
  if (typeof manifest.origin === "string" && !manifest.origin.endsWith("/")) {
    problems.push("origin must end with /");
  }
  if (!Array.isArray(manifest.languages) || manifest.languages.length === 0) {
    problems.push("languages must be a non-empty array");
  }
  return problems;
}

/** Informational only: strings in index.html that came from the config's couple names. */
function copyInHtml(repoDir, config) {
  const htmlPath = join(repoDir, "index.html");
  if (!existsSync(htmlPath)) return "unknown (no index.html)";
  const names = [config?.couple?.name1, config?.couple?.name2].filter(
    (name) => typeof name === "string" && name.length > 0,
  );
  if (names.length === 0) return "unknown (no couple names in config)";
  const html = readFileSync(htmlPath, "utf8");
  const found = names.filter((name) => html.includes(name));
  return found.length === 0 ? "none" : `${found.length} couple name(s) hardcoded`;
}

async function inspect(dir) {
  const repoDir = join(SIBLINGS, dir);
  const failures = [];
  const warnings = [];
  const rows = []; // [label, message]
  const row = (label, message) => rows.push([label, message]);

  // 1. config.js at the repo root
  const rootConfig = join(repoDir, "config.js");
  const strayConfig = ["js/config.js", "assets/config.js"].find((rel) =>
    existsSync(join(repoDir, rel)),
  );
  const configPath = existsSync(rootConfig)
    ? rootConfig
    : strayConfig
      ? join(repoDir, strayConfig)
      : null;
  if (strayConfig) {
    failures.push("config.js not at repo root");
    row("config.js", `${strayConfig} (must be at repo root)`);
  } else if (!configPath) {
    failures.push("config.js missing");
    row("config.js", "missing");
  }

  const manifestPath = join(repoDir, "template.json");
  const manifest = existsSync(manifestPath) ? readJson(manifestPath) : null;

  const src = configPath ? readFileSync(configPath, "utf8") : "";

  // 2. platform hook (warning in this ticket)
  if (src) {
    const state = hookState(src);
    if (state !== "ok") {
      warnings.push(`hook ${state}`);
      row(
        "hook",
        state === "missing" ? "missing" : "present but not the last statement in the file",
      );
    }
  }

  // 7. Node-load sanity
  let config = null;
  if (configPath) {
    try {
      config = await loadConfig(configPath);
      if (typeof config !== "object" || config === null) {
        failures.push("config.js did not export an object");
        row("load", "did not export an object");
        config = null;
      }
    } catch (error) {
      failures.push("config.js failed to load in Node");
      row("load", String(error.message ?? error));
    }
  }

  if (config) {
    // 3. canonical allowlist
    const unknown = Object.keys(config).filter((key) => !CANONICAL_KEYS.has(key));
    if (unknown.length > 0) {
      failures.push(`unknown top-level keys: ${unknown.join(", ")}`);
      row("unknown top-level keys", unknown.join(", "));
    }

    // 4. no translations inside the config
    const forbidden = FORBIDDEN_KEYS.filter((key) => key in config);
    if (forbidden.length > 0) {
      failures.push("translations inside config");
      row("translations", `${forbidden.join(", ")} (must use INVITE_TRANSLATIONS)`);
    }

    if (Number.isNaN(Date.parse(config.weddingDateTime))) {
      failures.push("weddingDateTime does not parse");
      row("weddingDateTime", "missing or not a date");
    }
  }

  // 6. copy rendered from config vs hardcoded in index.html (informational)
  if (config) row("copy in index.html", copyInHtml(repoDir, config));

  // 5. template.json (warning in this ticket)
  if (!manifest) {
    warnings.push("template.json missing");
    row("template.json", "missing");
  } else {
    const problems = manifestProblems(manifest);
    if (problems.length > 0) {
      warnings.push("template.json incomplete");
      row("template.json", problems.join(", "));
    }
  }

  return { name: dir, failures, warnings, rows };
}

const templates = readdirSync(SIBLINGS)
  .filter((name) => name.startsWith("template"))
  .filter((name) => statSync(join(SIBLINGS, name)).isDirectory())
  .sort();

const results = [];
for (const dir of templates) results.push(await inspect(dir));

for (const result of results) {
  const status = result.failures.length > 0 ? "FAIL" : "PASS";
  const suffix =
    result.warnings.length > 0 && result.failures.length === 0
      ? ` (${result.warnings.join(", ")})`
      : "";
  console.log(`${result.name.padEnd(labelWidth + 1)}${status}${suffix}`);
  for (const [label, message] of result.rows) {
    console.log(`  ${label.padEnd(labelWidth)}${message}`);
  }
  console.log("");
}

const passed = results.filter((r) => r.failures.length === 0).length;
const failed = results.length - passed;
console.log(`${results.length} templates: ${passed} passing, ${failed} failing`);
if (failed > 0) process.exitCode = 1;
