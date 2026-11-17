/**
 * Template snapshots and the resolver that writes form values into them (WT-16).
 *
 * A snapshot is what `scripts/sync-templates.mjs` writes: the template's manifest, the
 * full `INVITE_CONFIG` (so a shallow assign can never drop a key the form does not
 * mention), its `INVITE_TRANSLATIONS` by locale, and the form fields derived from the
 * paths this template actually has. The generated data itself lives in `src/data/templates/`.
 */
import type { Field, FieldType } from "@/lib/canonical-fields";

export interface TemplateSnapshot {
  manifest: {
    slug: string;
    directory: string;
    style: string;
    origin: string;
    tier: string;
    languages: string[];
    copyRendered: boolean;
    name: string;
  };
  defaults: Record<string, unknown>;
  translations: Record<string, Record<string, unknown>>;
  fields: Field[];
}

/** One raw value at a path, or undefined when the path is missing. */
export function readValue(root: Record<string, unknown>, path: string[]): unknown {
  return path.reduce<unknown>(
    (node, key) => (node as Record<string, unknown> | undefined)?.[key],
    root,
  );
}

/** One value at a path, or "" when the path is missing or holds something else. */
export function readPath(root: Record<string, unknown>, path: string[]): string {
  const value = readValue(root, path);
  return typeof value === "string" ? value : "";
}

/** The template's Bangla tree, when it publishes one (WT-24). A snapshot from a template
 *  that has not migrated yet may carry no `translations` at all. */
export function banglaTree(
  translations: Record<string, Record<string, unknown>> | null | undefined,
) {
  const bn = translations?.["bn"];
  return bn && typeof bn === "object" ? bn : undefined;
}

/** The fields that get a Bangla input: marked bilingual, and the bn tree carries their path.
 *  A half-migrated template legitimately has fewer — a field without a bn path is skipped. */
export function bilingualFields(snapshot: TemplateSnapshot, fields: Field[]): Field[] {
  const bn = banglaTree(snapshot.translations);
  if (!bn) return [];
  return fields.filter((field) => field.bilingual && readValue(bn, field.path) !== undefined);
}

/** Write the Bangla values into a clone of the template's bn tree. Never creates a path
 *  the template does not have, and leaves the other locales as they are. */
export function resolveTranslations(
  snapshot: TemplateSnapshot,
  fields: Field[],
  translations: Record<string, string>,
): Record<string, Record<string, unknown>> {
  const tree = structuredClone(snapshot.translations ?? {});
  const bn = banglaTree(tree);
  if (!bn) return tree;
  for (const field of bilingualFields(snapshot, fields)) {
    const value = translations[field.id];
    if (value !== undefined) setAtPath(bn, field.path, value);
  }
  return tree;
}

/** The types the form renders as inputs. `toggle` renders above the form (WT-14c), `group`
 *  is WT-17. */
const SCALAR_FORM_TYPES = new Set<FieldType>([
  "text",
  "textarea",
  "tel",
  "email",
  "datetime",
  "date",
]);

/**
 * The form's field list, in canonical order. A hashtag the template never displays
 * (`couple.hashtag: ""`) is left out instead of becoming an empty question.
 */
export function scalarFields(snapshot: TemplateSnapshot): Field[] {
  return snapshot.fields.filter(
    (field) =>
      SCALAR_FORM_TYPES.has(field.type) &&
      !(field.derived === "hashtag" && readPath(snapshot.defaults, field.path) === ""),
  );
}

/**
 * Write one value at a path that already exists. A missing parent skips the write
 * instead of creating the path, so a typo in a template's config cannot invent keys.
 */
export function setAtPath(target: Record<string, unknown>, path: string[], value: unknown) {
  const last = path[path.length - 1]!;
  const parent = path
    .slice(0, -1)
    .reduce<Record<string, unknown> | undefined>(
      (node, key) => (node ? (node[key] as Record<string, unknown>) : undefined),
      target,
    );
  if (parent) parent[last] = value;
}

/** Write form values into a clone of the template defaults at their declared paths.
 *  Never creates a path that does not already exist. */
export function resolveConfig(
  snapshot: TemplateSnapshot,
  fields: Pick<Field, "id" | "path">[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const config = structuredClone(snapshot.defaults);
  for (const field of fields) {
    if (!(field.id in values)) continue;
    setAtPath(config, field.path, values[field.id]);
  }
  return config;
}
