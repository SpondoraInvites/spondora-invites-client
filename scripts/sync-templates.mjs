#!/usr/bin/env node
/**
 * Snapshots every migrated template into src/data/templates/ (WT-16).
 *
 *   node scripts/sync-templates.mjs
 *
 * Reads every `../template*` folder next to this repo, keeps the ones with a `template.json`
 * (printing `skipped <dir>: no template.json` for the rest), and writes:
 *
 *   src/data/templates/<slug>.json   manifest + defaults + translations + derived fields
 *   src/data/templates/index.ts      the generated barrel the editor reads
 *
 * Everything is validated and loaded before anything is written: one bad manifest or one
 * config.js that fails to load aborts the run instead of leaving half a new set behind.
 *
 * Fields are derived from `CANONICAL_FIELDS` by path existence, so a template gains a form
 * question by having the key — nobody lists fields per template. `select` is kept in the type
 * union but never emitted today: a `select` without `options` is dropped instead of becoming a
 * one-option dropdown (WT-23 removed `theme` and `localization.default`).
 *
 * Node 22.18+ / 23.6+ imports `canonical-fields.ts` directly by stripping its types.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { CANONICAL_FIELDS } from "../src/lib/canonical-fields.ts";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SIBLINGS = resolve(HERE, "../.."); // folder holding every template repo
const OUT = resolve(HERE, "../src/data/templates");

/** Picker order: cheap tiers first, then the slug, so the list never reshuffles. */
const TIER_ORDER = { standard: 0, premium: 1, luxury: 2 };
const STYLES = new Set(["classic", "module"]);

/** `style: "module"` imports the file; `style: "classic"` is a CommonJS script. */
async function loadConfig(folder, style) {
  const path = join(folder, "config.js");
  if (style === "classic") {
    const mod = createRequire(import.meta.url)(path);
    return { config: mod.INVITE_CONFIG ?? mod, translations: mod.INVITE_TRANSLATIONS ?? {} };
  }
  const mod = await import(pathToFileURL(path).href);
  return { config: mod.INVITE_CONFIG, translations: mod.INVITE_TRANSLATIONS ?? {} };
}

/** Every problem with a manifest, so one run reports them all instead of one at a time. */
function manifestProblems(manifest) {
  const problems = [];
  for (const key of ["slug", "directory", "name"]) {
    if (typeof manifest[key] !== "string" || manifest[key].trim() === "") {
      problems.push(`${key} must be a non-empty string`);
    }
  }
  if (!Object.hasOwn(TIER_ORDER, manifest.tier)) {
    problems.push("tier must be standard|premium|luxury");
  }
  if (!STYLES.has(manifest.style)) problems.push("style must be classic|module");
  if (typeof manifest.origin !== "string" || !manifest.origin.endsWith("/")) {
    problems.push("origin must end with /");
  }
  if (!Array.isArray(manifest.languages) || manifest.languages.length === 0) {
    problems.push("languages must be a non-empty array");
  }
  if (typeof manifest.copyRendered !== "boolean") problems.push("copyRendered must be a boolean");
  return problems;
}

/** Walk a path; true only when every segment already exists. */
function resolvesIn(root, path) {
  let node = root;
  for (const key of path) {
    if (node === null || typeof node !== "object" || !(key in node)) return false;
    node = node[key];
  }
  return true;
}

/** The group's first item (the first event) is the sample its item paths must resolve in. */
function firstGroupItem(defaults, path) {
  const value = path.reduce((node, key) => {
    return node && typeof node === "object" ? node[key] : undefined;
  }, defaults);
  return Array.isArray(value) && value.length > 0 ? value[0] : undefined;
}

/** `fields` = CANONICAL_FIELDS limited to the paths this template's defaults actually have. */
function deriveFields(defaults) {
  const fields = [];
  for (const field of CANONICAL_FIELDS) {
    if (!resolvesIn(defaults, field.path)) continue;
    // A one-option picker is noise; WT-23's list has no select at all today.
    if (field.type === "select" && (field.options?.length ?? 0) < 2) continue;
    if (field.type !== "group") {
      fields.push(field);
      continue;
    }
    const sample = firstGroupItem(defaults, field.path);
    const itemFields = (field.itemFields ?? []).filter((item) => resolvesIn(sample, item.path));
    if (itemFields.length > 0) fields.push({ ...field, itemFields });
  }
  return fields;
}

/** Recursively sort object keys so the output only changes when a value changes. */
function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sorted(value[key])]),
    );
  }
  return value;
}

function identifier(slug) {
  return slug.replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase());
}

function snapshotSource(ordered) {
  const imports = ordered.map(({ manifest }) => {
    return `import ${identifier(manifest.slug)} from "./${manifest.slug}.json";`;
  });
  const entries = ordered.map(({ manifest }) => {
    return `  "${manifest.slug}": ${identifier(manifest.slug)} as unknown as TemplateSnapshot,`;
  });
  const slugs = ordered.map(({ manifest }) => `"${manifest.slug}"`).join(", ");

  return `// Generated by scripts/sync-templates.mjs — do not edit by hand.
// The marketing list is ../template-list.ts; this barrel is "@/data/templates".
import type { TemplateSnapshot } from "@/lib/fields";

${imports.join("\n")}

export const TEMPLATE_SNAPSHOTS: Record<string, TemplateSnapshot> = {
${entries.join("\n")}
};

export const TEMPLATE_SLUGS: string[] = [${slugs}];
`;
}

// ─── Read and validate every manifest before touching any file ────────────────

if (!existsSync(SIBLINGS)) {
  console.error(`Cannot find ${SIBLINGS}; run this script from inside the editor repo.`);
  process.exit(1);
}

const dirs = readdirSync(SIBLINGS)
  .filter((name) => name.startsWith("template"))
  .filter((name) => statSync(join(SIBLINGS, name)).isDirectory())
  .sort();

const problems = [];
const manifests = [];
for (const dir of dirs) {
  const path = join(SIBLINGS, dir, "template.json");
  if (!existsSync(path)) {
    console.log(`skipped ${dir}: no template.json`);
    continue;
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    problems.push(`${dir}/template.json: ${error.message}`);
    continue;
  }
  const manifestIssues = manifestProblems(manifest);
  if (manifestIssues.length > 0) {
    problems.push(`${dir}/template.json: ${manifestIssues.join("; ")}`);
    continue;
  }
  manifests.push({ dir, manifest });
}

// ─── Load configs, derive fields, then write everything ──────────────────────

const snapshots = [];
for (const { dir, manifest } of manifests) {
  const folder = join(SIBLINGS, dir);
  let loaded;
  try {
    loaded = await loadConfig(folder, manifest.style);
  } catch (error) {
    problems.push(`${dir}/config.js: ${error.message}`);
    continue;
  }
  if (typeof loaded.config !== "object" || loaded.config === null) {
    problems.push(`${dir}/config.js: did not export an INVITE_CONFIG object`);
    continue;
  }
  snapshots.push({
    manifest,
    defaults: loaded.config,
    translations: sorted(loaded.translations),
    fields: deriveFields(loaded.config),
  });
}

if (problems.length > 0) {
  console.error("Nothing written. Fix these first:");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

for (const snapshot of snapshots) {
  writeFileSync(
    join(OUT, `${snapshot.manifest.slug}.json`),
    `${JSON.stringify(sorted(snapshot), null, 2)}\n`,
  );
}

const ordered = [...snapshots].sort((a, b) => {
  return (
    TIER_ORDER[a.manifest.tier] - TIER_ORDER[b.manifest.tier] ||
    a.manifest.slug.localeCompare(b.manifest.slug)
  );
});
writeFileSync(join(OUT, "index.ts"), snapshotSource(ordered));

// ─── Summary ──────────────────────────────────────────────────────────────────

const rows = [
  ["slug", "style", "fields", "copyRendered"],
  ...ordered.map(({ manifest, fields }) => [
    manifest.slug,
    manifest.style,
    String(fields.length),
    String(manifest.copyRendered),
  ]),
];
const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
for (const row of rows) {
  console.log(row.map((cell, column) => cell.padEnd(widths[column])).join("  "));
}
