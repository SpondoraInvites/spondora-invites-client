/**
 * Template snapshots and the resolver that writes form values into them (WT-16).
 *
 * A snapshot is what `scripts/sync-templates.mjs` writes: the template's manifest, the
 * full `INVITE_CONFIG` (so a shallow assign can never drop a key the form does not
 * mention), its `INVITE_TRANSLATIONS` by locale, and the form fields derived from the
 * paths this template actually has. The generated data itself lives in `src/data/templates/`.
 */
import type { Field } from "@/lib/canonical-fields";

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

/**
 * Write one value at a path that already exists. A missing parent skips the write
 * instead of creating the path, so a typo in a template's config cannot invent keys.
 */
function setAtPath(target: Record<string, unknown>, path: string[], value: unknown) {
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
