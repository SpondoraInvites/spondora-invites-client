import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { templates } from "@/data/templates";
import { TEMPLATE_SNAPSHOTS, TEMPLATE_SLUGS } from "@/data/templates/index";
import { CANONICAL_FIELDS } from "@/lib/canonical-fields";

// Vitest runs from the repo root, so `..` is the folder holding the template repos.
const SIBLINGS = resolve(process.cwd(), "..");
const TIERS = new Set(["standard", "premium", "luxury"]);
const STYLES = new Set(["classic", "module"]);
const FORBIDDEN_DEFAULTS_KEYS = ["bn", "i18n", "locales", "defaultLocale"];

interface DiskManifest {
  slug: string;
  directory: string;
}

/** Manifests next to this repo. Empty when the sibling template repos are not checked out. */
function manifestsOnDisk(): DiskManifest[] {
  if (!existsSync(SIBLINGS)) return [];
  return readdirSync(SIBLINGS)
    .filter((name) => name.startsWith("template"))
    .map((name) => join(SIBLINGS, name, "template.json"))
    .filter((path) => existsSync(path))
    .map((path) => JSON.parse(readFileSync(path, "utf8")) as DiskManifest);
}

const onDisk = manifestsOnDisk();
const hasSiblings = onDisk.length > 0;

if (!hasSiblings) {
  console.log("template-contract: no sibling templates found — on-disk checks skipped.");
}

/** The dotted path prefix that stops existing, or undefined when the whole path resolves. */
function missingSegment(root: unknown, path: string[]): string | undefined {
  let node = root;
  for (const [index, key] of path.entries()) {
    if (node === null || typeof node !== "object" || !(key in node)) {
      return path.slice(0, index + 1).join(".");
    }
    node = (node as Record<string, unknown>)[key];
  }
  return undefined;
}

function valueAt(root: unknown, path: string[]): unknown {
  return path.reduce<unknown>((node, key) => {
    return node !== null && typeof node === "object"
      ? (node as Record<string, unknown>)[key]
      : undefined;
  }, root);
}

/** Import a config in plain Node (no window) and return what it exports. */
function loadInPlainNode(configPath: string): unknown {
  const script = `
    import { pathToFileURL } from "node:url";
    const mod = await import(pathToFileURL(process.env.CONFIG_PATH).href);
    const config = mod.INVITE_CONFIG ?? mod.default?.INVITE_CONFIG ?? mod.default ?? mod;
    process.stdout.write(JSON.stringify(config));
  `;
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    env: { ...process.env, CONFIG_PATH: configPath },
    encoding: "utf8",
  });
  return JSON.parse(output);
}

/** A hook that is still the last statement leaves only whitespace after its closing `);`. */
function hookIsLast(source: string): boolean {
  const trimmed = source.trimEnd();
  if (trimmed.lastIndexOf("(function (target, translations) {") === -1) return false;
  return /typeof INVITE_TRANSLATIONS !== "undefined" \? INVITE_TRANSLATIONS : null\);$/.test(
    trimmed,
  );
}

describe("snapshot coverage", () => {
  it("has no snapshot outside the marketing list", () => {
    const listed = new Set(templates.map((template) => template.slug));

    for (const slug of TEMPLATE_SLUGS) {
      expect(listed.has(slug), `${slug} is not listed in src/data/templates.ts`).toBe(true);
    }
    expect(Object.keys(TEMPLATE_SNAPSHOTS).sort()).toEqual([...TEMPLATE_SLUGS].sort());
  });

  it.skipIf(!hasSiblings)("covers every on-disk manifest that is for sale", () => {
    const listed = new Set(templates.map((template) => template.slug));

    for (const manifest of onDisk) {
      if (!listed.has(manifest.slug)) continue;
      expect(
        TEMPLATE_SNAPSHOTS[manifest.slug],
        `${manifest.slug} has a template.json but no snapshot — run npm run sync:templates`,
      ).toBeDefined();
    }
  });
});

for (const slug of TEMPLATE_SLUGS) {
  const snapshot = TEMPLATE_SNAPSHOTS[slug]!;
  const sibling = join(SIBLINGS, snapshot.manifest.directory);
  const siblingExists = existsSync(join(sibling, "template.json"));

  describe(slug, () => {
    it("has a valid manifest", () => {
      expect(snapshot.manifest.origin.endsWith("/"), "origin must end with /").toBe(true);
      expect(STYLES.has(snapshot.manifest.style), `style "${snapshot.manifest.style}"`).toBe(true);
      expect(TIERS.has(snapshot.manifest.tier), `tier "${snapshot.manifest.tier}"`).toBe(true);
      expect(snapshot.manifest.languages.length).toBeGreaterThan(0);
    });

    it("has defaults with a parseable wedding date", () => {
      expect(Object.keys(snapshot.defaults).length).toBeGreaterThan(0);
      expect(Number.isNaN(Date.parse(String(snapshot.defaults["weddingDateTime"])))).toBe(false);
    });

    it("resolves every derived field path", () => {
      for (const field of snapshot.fields) {
        const missing = missingSegment(snapshot.defaults, field.path);
        expect(
          missing,
          `${slug}: field "${field.id}" path ${field.path.join(".")} — missing "${missing}"`,
        ).toBeUndefined();

        if (field.type !== "group") continue;
        const zone = valueAt(snapshot.defaults, field.path);
        const sample = Array.isArray(zone) ? zone[0] : undefined;
        for (const item of field.itemFields ?? []) {
          const itemMissing = missingSegment(sample, item.path);
          expect(
            itemMissing,
            `${slug}: field "${field.id}[0]" item "${item.id}" path ${item.path.join(".")} — missing "${itemMissing}"`,
          ).toBeUndefined();
        }
      }
    });

    it("uses canonical field ids once each", () => {
      const canonicalIds = new Set(CANONICAL_FIELDS.map((field) => field.id));
      const seen = new Set<string>();

      for (const field of snapshot.fields) {
        expect(canonicalIds.has(field.id), `${slug}: unknown field id "${field.id}"`).toBe(true);
        expect(seen.has(field.id), `${slug}: duplicate field id "${field.id}"`).toBe(false);
        seen.add(field.id);

        const canonical = CANONICAL_FIELDS.find((item) => item.id === field.id);
        const itemIds = new Set((canonical?.itemFields ?? []).map((item) => item.id));
        for (const item of field.itemFields ?? []) {
          expect(
            itemIds.has(item.id),
            `${slug}: unknown item field id "${field.id}.${item.id}"`,
          ).toBe(true);
        }
      }
    });

    it("emits no field without a widget", () => {
      const unbuilt = new Set(["select", "url", "image"]);
      for (const field of snapshot.fields) {
        expect(unbuilt.has(field.type), `${slug}: field "${field.id}" has type ${field.type}`).toBe(
          false,
        );
        for (const item of field.itemFields ?? []) {
          expect(unbuilt.has(item.type), `${slug}: item "${item.id}" has type ${item.type}`).toBe(
            false,
          );
        }
      }
    });

    it("omits partner names when copy is rendered", () => {
      if (snapshot.manifest.copyRendered) return;
      const ids = new Set(snapshot.fields.map((field) => field.id));
      expect(ids.has("partner1Name")).toBe(false);
      expect(ids.has("partner2Name")).toBe(false);
    });

    it("keeps translations out of defaults", () => {
      for (const key of FORBIDDEN_DEFAULTS_KEYS) {
        expect(
          snapshot.defaults,
          `${slug}: defaults.${key} must live in translations`,
        ).not.toHaveProperty(key);
      }
    });

    it.skipIf(!siblingExists)("matches the template on disk", () => {
      const configPath = join(sibling, "config.js");
      expect(existsSync(configPath), `${slug}: config.js must be at the repo root`).toBe(true);
      expect(
        existsSync(join(sibling, "js", "config.js")),
        `${slug}: js/config.js must not exist`,
      ).toBe(false);

      const source = readFileSync(configPath, "utf8");
      expect(source).toContain("window.__INVITE_CONFIG__");
      expect(source).toContain("#cfg=");
      expect(hookIsLast(source), `${slug}: the platform hook must be the last statement`).toBe(
        true,
      );

      // Plain Node has no window, so a hook without its guard throws at import time.
      expect(loadInPlainNode(configPath)).toEqual(snapshot.defaults);
    });
  });
}
