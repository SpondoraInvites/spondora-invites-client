/**
 * Template snapshots and the resolver that writes form values into them (WT-16).
 *
 * A snapshot is what `scripts/sync-templates.mjs` writes: the template's manifest, the
 * full `INVITE_CONFIG` (so a shallow assign can never drop a key the form does not
 * mention), its `INVITE_TRANSLATIONS` by locale, and the form fields derived from the
 * paths this template actually has. The generated data itself lives in `src/data/templates/`.
 */
import type { Field, FieldType } from "@/lib/canonical-fields";
import { deriveDateTime, type DateTimeContext } from "@/lib/derive";

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

/** One event as the editor holds it: English at the root, Bangla under `bn`. */
export interface EventItem {
  bn?: Record<string, string>;
  [itemId: string]: string | Record<string, string> | undefined;
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
  values: Record<string, unknown> = {},
  touched: ReadonlySet<string> = new Set(),
): Record<string, Record<string, unknown>> {
  const tree = structuredClone(snapshot.translations ?? {});
  const bn = banglaTree(tree);
  if (!bn) return tree;
  for (const field of bilingualFields(snapshot, fields)) {
    if (field.type === "group") {
      if (field.id in values)
        setAtPath(
          bn,
          field.path,
          resolveEventTranslations(snapshot, field, values, translations, touched),
        );
      continue;
    }
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

/** A field the resolver can read: the scalar tests pass only id/path, groups carry more. */
type EditableField = Pick<Field, "id" | "path"> & {
  type?: FieldType;
  itemFields?: Field[];
  min?: number;
  max?: number;
};

/** Write form values into a clone of the template defaults at their declared paths.
 *  Never creates a path that does not already exist. */
export function resolveConfig(
  snapshot: TemplateSnapshot,
  fields: EditableField[],
  values: Record<string, unknown>,
  touched: ReadonlySet<string> = new Set(),
): Record<string, unknown> {
  const config = structuredClone(snapshot.defaults);
  for (const field of fields) {
    if (!(field.id in values)) continue;
    if (field.type === "group") {
      setAtPath(config, field.path, resolveEventItems(snapshot, field, values, touched));
      continue;
    }
    setAtPath(config, field.path, values[field.id]);
  }
  return config;
}

/** Item field id → the primary form field it follows while untouched. */
const PRIMARY_FIELD: Record<string, string> = {
  dateTime: "eventDateTime",
  mapQuery: "venueMapQuery",
};

export function primaryFieldId(itemFieldId: string): string {
  return PRIMARY_FIELD[itemFieldId] ?? itemFieldId;
}

function itemText(item: EventItem | undefined, id: string): string {
  const value = item?.[id];
  return typeof value === "string" ? value : "";
}

function itemBnText(item: EventItem | undefined, id: string): string {
  const value = item?.bn?.[id];
  return typeof value === "string" ? value : "";
}

function primaryText(values: Record<string, unknown>, itemFieldId: string): string {
  const value = values[primaryFieldId(itemFieldId)];
  return typeof value === "string" ? value : "";
}

function primaryBnText(translations: Record<string, string>, itemFieldId: string): string {
  return translations[primaryFieldId(itemFieldId)] ?? "";
}

function templateRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

function itemCount(field: Pick<Field, "min" | "max">, provided: unknown[]): number {
  const min = field.min ?? 0;
  const max = field.max ?? provided.length;
  return Math.min(Math.max(provided.length, min), max);
}

function eventItems(values: Record<string, unknown>, id: string): EventItem[] {
  const value = values[id];
  return Array.isArray(value) ? (value as EventItem[]) : [];
}

function templateOffset(snapshot: TemplateSnapshot): string {
  const iso = readPath(snapshot.defaults, ["weddingDateTime"]);
  return /[+-]\d{2}:\d{2}$/.exec(iso)?.[0] ?? "+06:00";
}

function eventContext(template: Record<string, unknown>, offset: string): DateTimeContext {
  const calEnd = typeof template["calEnd"] === "string" ? template["calEnd"] : "";
  return {
    offset,
    timeZone: typeof template["calTz"] === "string" ? template["calTz"] : "Asia/Dhaka",
    ...(/^\d{2}:\d{2}$/.test(calEnd) ? { previousCalEnd: calEnd } : {}),
  };
}

/** The item's date input, local wall-clock time, or first 16 characters of the primary's. */
function eventLocalDateTime(
  itemFields: Field[],
  source: EventItem | undefined,
  values: Record<string, unknown>,
  groupId: string,
  index: number,
  touched: ReadonlySet<string>,
): string {
  const field = itemFields.find((itemField) => itemField.type === "datetime");
  if (!field) return "";
  const inherited = field.inherits && !touched.has(`${groupId}.${index}.${field.id}`);
  const local = inherited
    ? primaryText(values, field.id)
    : source
      ? itemText(source, field.id)
      : "";
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local) ? local : "";
}

function applyEventDate(
  item: Record<string, unknown>,
  local: string,
  template: Record<string, unknown>,
  offset: string,
  bn = false,
) {
  const derived = deriveDateTime(local, eventContext(template, offset));
  item["date"] = bn ? derived.dateBn : derived.dateEn;
  item["time"] = bn ? derived.timeBn : derived.timeEn;
  if (bn) return;
  item["calDate"] = derived.calDate;
  item["calStart"] = derived.calStart;
  item["calEnd"] = derived.calEnd;
}

/** Inherited item fields the template already shows differently from the primary, so seeding
 *  does not collapse a multi-event template onto the main date and venue. */
export function seedTouched(
  snapshot: TemplateSnapshot,
  fields: EditableField[],
  values: Record<string, unknown>,
  translations: Record<string, string>,
): Set<string> {
  const touched = new Set<string>();
  const bn = banglaTree(snapshot.translations);
  for (const field of fields) {
    if (field.type !== "group" || !(field.id in values)) continue;
    const items = eventItems(values, field.id);
    const bnItems = bn ? templateRecords(readValue(bn, field.path)) : [];
    items.forEach((item, index) => {
      for (const itemField of field.itemFields ?? []) {
        if (!itemField.inherits) continue;
        const key = `${field.id}.${index}.${itemField.id}`;
        const englishDiffers = itemText(item, itemField.id) !== primaryText(values, itemField.id);
        const banglaDiffers =
          itemField.bilingual &&
          index < bnItems.length &&
          itemBnText(item, itemField.id) !== primaryBnText(translations, itemField.id);
        if (englishDiffers || banglaDiffers) touched.add(key);
      }
    });
  }
  return touched;
}

/** The group's English items: exposed fields, unexposed template keys, derived dates. */
function resolveEventItems(
  snapshot: TemplateSnapshot,
  field: EditableField,
  values: Record<string, unknown>,
  touched: ReadonlySet<string>,
): Record<string, unknown>[] {
  const itemFields = field.itemFields ?? [];
  const provided = eventItems(values, field.id);
  const templates = templateRecords(readValue(snapshot.defaults, field.path));
  const offset = templateOffset(snapshot);

  return Array.from({ length: itemCount(field, provided) }, (_, index) => {
    const source = provided[index];
    const template = templates[index] ?? templates[0] ?? {};
    const item: Record<string, unknown> = { ...template };

    for (const itemField of itemFields) {
      if (itemField.type === "datetime") continue;
      const key = `${field.id}.${index}.${itemField.id}`;
      const value =
        itemField.inherits && !touched.has(key)
          ? primaryText(values, itemField.id)
          : source
            ? itemText(source, itemField.id)
            : readPath(template, itemField.path);
      setAtPath(item, itemField.path, value);
    }

    const local = eventLocalDateTime(itemFields, source, values, field.id, index, touched);
    if (local) applyEventDate(item, local, template, offset);
    return item;
  });
}

/** The group's Bangla items: bilingual fields only, inherited from the Bangla primary. */
function resolveEventTranslations(
  snapshot: TemplateSnapshot,
  field: EditableField,
  values: Record<string, unknown>,
  translations: Record<string, string>,
  touched: ReadonlySet<string>,
): Record<string, unknown>[] {
  const itemFields = field.itemFields ?? [];
  const bilingual = itemFields.filter((itemField) => itemField.bilingual);
  const provided = eventItems(values, field.id);
  const englishTemplates = templateRecords(readValue(snapshot.defaults, field.path));
  const bn = banglaTree(snapshot.translations);
  const bnTemplates = bn ? templateRecords(readValue(bn, field.path)) : [];
  const offset = templateOffset(snapshot);

  return Array.from({ length: itemCount(field, provided) }, (_, index) => {
    const source = provided[index];
    const bnTemplate = bnTemplates[index] ?? bnTemplates[0] ?? {};
    const englishTemplate = englishTemplates[index] ?? englishTemplates[0] ?? {};
    const item: Record<string, unknown> = { ...bnTemplate };

    for (const itemField of bilingual) {
      const key = `${field.id}.${index}.${itemField.id}`;
      const value =
        itemField.inherits && !touched.has(key)
          ? primaryBnText(translations, itemField.id)
          : source
            ? itemBnText(source, itemField.id)
            : readPath(bnTemplate, itemField.path);
      setAtPath(item, itemField.path, value);
    }

    const local = eventLocalDateTime(itemFields, source, values, field.id, index, touched);
    if (local) applyEventDate(item, local, englishTemplate, offset, true);
    return item;
  });
}
