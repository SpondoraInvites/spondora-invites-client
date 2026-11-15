#!/usr/bin/env node
/**
 * Snapshots every template into src/data/templates/<slug>.json (WT-13).
 *
 *   node scripts/sync-templates.mjs
 *
 * Reads every `../template*` folder next to this repo that has a `template.json`, and writes one
 * file per template: the manifest as-is, plus the config module's `INVITE_CONFIG` (defaults) and
 * its `INVITE_TRANSLATIONS` (so the editor can preview Bangla without re-reading the template).
 * Keys are sorted, so running it twice produces no diff.
 *
 * This is the small version of WT-16. Templates without a `template.json` are skipped.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SIBLINGS = resolve(HERE, "../.."); // folder holding every template repo
const OUT = resolve(HERE, "../src/data/templates");

/** `style: "module"` imports the file; `style: "classic"` is a CommonJS script. */
async function loadConfig(folder, style) {
  const path = join(folder, "config.js");
  const mod =
    style === "classic"
      ? createRequire(import.meta.url)(path)
      : await import(pathToFileURL(path).href);
  return {
    config: mod.INVITE_CONFIG ?? mod.config ?? mod,
    translations: mod.INVITE_TRANSLATIONS ?? {},
  };
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

const folders = readdirSync(SIBLINGS).filter((dir) =>
  existsSync(join(SIBLINGS, dir, "template.json")),
);

mkdirSync(OUT, { recursive: true });

for (const dir of folders) {
  const folder = join(SIBLINGS, dir);
  const manifest = JSON.parse(readFileSync(join(folder, "template.json"), "utf8"));
  const { config, translations } = await loadConfig(folder, manifest.style);
  const snapshot = { manifest, defaults: config, translations };
  writeFileSync(
    join(OUT, `${manifest.slug}.json`),
    `${JSON.stringify(sorted(snapshot), null, 2)}\n`,
  );
  console.log(`${manifest.slug}: ${Object.keys(config).length} config keys`);
}
