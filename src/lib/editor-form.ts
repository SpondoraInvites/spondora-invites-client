/**
 * The editor form's state and its one cross-field rule (WT-14a §2–3).
 *
 * Plain state, no react-hook-form: the field list is data, and the only rule that
 * spans fields is "a derived value follows the names until the couple edits it".
 */
import type { Field } from "@/lib/canonical-fields";
import { deriveHashtag, deriveInitials, isoToLocal } from "@/lib/derive";
import { readPath, type TemplateSnapshot } from "@/lib/fields";
import { normaliseValue } from "@/lib/field-schema";

export interface FormState {
  values: Record<string, string>;
  touched: Set<string>;
}

/** The couple's names drive the derived fields, wherever their paths landed. */
const NAME_PATHS = ["couple.name1", "couple.name2"];

export function seedValues(snapshot: TemplateSnapshot, fields: Field[]): Record<string, string> {
  return Object.fromEntries(
    fields.map((field) => {
      const value = readPath(snapshot.defaults, field.path);
      // The input shows local wall-clock time; the template keeps the ISO with its offset.
      return [field.id, field.type === "datetime" ? isoToLocal(value) : value];
    }),
  );
}

function nameValue(values: Record<string, string>, fields: Field[], path: string): string {
  const field = fields.find((item) => item.path.join(".") === path);
  return field ? (values[field.id] ?? "") : "";
}

/** One edit: normalise it, remember it if it is derived, and move the derived values
 *  that are still following the names. */
export function nextForm(
  snapshot: TemplateSnapshot,
  fields: Field[],
  prev: FormState,
  field: Field,
  raw: string,
): FormState {
  const values = { ...prev.values, [field.id]: normaliseValue(field, raw) };
  // Editing a derived field makes it the couple's own; a later name change leaves it alone.
  const touched = field.derived ? new Set(prev.touched).add(field.id) : prev.touched;

  if (!NAME_PATHS.includes(field.path.join("."))) return { values, touched };

  const name1 = nameValue(values, fields, NAME_PATHS[0]!);
  const name2 = nameValue(values, fields, NAME_PATHS[1]!);
  for (const derived of fields) {
    if (!derived.derived || touched.has(derived.id)) continue;
    const next =
      derived.derived === "initials"
        ? deriveInitials(name1, name2, readPath(snapshot.defaults, derived.path))
        : deriveHashtag(name1, name2);
    // An empty result keeps the template's own value (WT-25).
    if (next) values[derived.id] = next;
  }

  return { values, touched };
}
