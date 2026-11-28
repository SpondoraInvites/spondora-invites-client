/**
 * The editor form's state and its one cross-field rule (WT-14a §2–3).
 *
 * Plain state, no react-hook-form: the field list is data, and the only rule that
 * spans fields is "a derived value follows the names until the couple edits it".
 */
import type { Field } from "@/lib/canonical-fields";
import { deriveHashtag, deriveInitials, displayDateToIso, isoToLocal } from "@/lib/derive";
import {
  banglaTree,
  bilingualFields,
  primaryFieldId,
  readPath,
  readValue,
  type GroupItem,
  type TemplateSnapshot,
} from "@/lib/fields";
import { normaliseValue, validateField } from "@/lib/field-schema";

/** A field's value: text, the localization toggle, or an events group (WT-17). */
export type FormValue = string | boolean | GroupItem[];

export interface FormState {
  values: Record<string, FormValue>;
  /** Bangla, keyed by the same field id (WT-14c). Empty when the template has no bn tree. */
  translations: Record<string, string>;
  touched: Set<string>;
  /** Keys that have been left once, so their message may show from then on (WT-17d).
   *  Deliberately not part of the draft: a refresh must not greet the couple with red. */
  visited?: ReadonlySet<string>;
}

/** The couple's names drive the derived fields, wherever their paths landed. */
const NAME_PATHS = ["couple.name1", "couple.name2"];

/** One event from the template's config and bn tree: English at the root, Bangla in `bn`. */
function seedGroupItems(snapshot: TemplateSnapshot, field: Field): GroupItem[] {
  const english = readValue(snapshot.defaults, field.path);
  const bn = banglaTree(snapshot.translations);
  const bangla = bn ? readValue(bn, field.path) : undefined;
  const items = Array.isArray(english) ? (english as Record<string, unknown>[]) : [];
  const bnItems = Array.isArray(bangla) ? (bangla as Record<string, unknown>[]) : [];

  return items.map((item, index) => {
    const value: GroupItem = {};
    for (const itemField of field.itemFields ?? []) {
      if (itemField.type === "datetime") {
        // The input is local wall-clock time; the template stores the cal* parts apart.
        const date = readPath(item, ["calDate"]);
        const time = readPath(item, itemField.path);
        value[itemField.id] =
          /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time) ? `${date}T${time}` : "";
        continue;
      }
      value[itemField.id] = readPath(item, itemField.path);
    }

    if (bn) {
      const bnValue: Record<string, string> = {};
      for (const itemField of field.itemFields ?? []) {
        if (itemField.bilingual)
          bnValue[itemField.id] = readPath(bnItems[index] ?? {}, itemField.path);
      }
      value.bn = bnValue;
    }
    return value;
  });
}

export function seedValues(snapshot: TemplateSnapshot, fields: Field[]): Record<string, FormValue> {
  return Object.fromEntries(
    fields.map((field) => {
      if (field.type === "group") return [field.id, seedGroupItems(snapshot, field)];
      const value = readPath(snapshot.defaults, field.path);
      // The toggle is the draft's only boolean: anything but an explicit `false` is on.
      if (field.type === "toggle")
        return [field.id, readValue(snapshot.defaults, field.path) !== false];
      // The input shows local wall-clock time; the template keeps the ISO with its offset.
      if (field.type === "datetime") return [field.id, isoToLocal(value)];
      // A `date` value is the display string the template prints ("20 November 2026").
      // An unreadable one leaves the box empty and the template's own string in place.
      return [field.id, field.type === "date" ? displayDateToIso(value) : value];
    }),
  );
}

function nameValue(values: Record<string, FormValue>, fields: Field[], path: string): string {
  const field = fields.find((item) => item.path.join(".") === path);
  const value = field ? values[field.id] : undefined;
  return typeof value === "string" ? value : "";
}

/** The Bangla values the form starts with, keyed by the same field id (WT-14c). Only the
 *  fields whose bn path this template carries, so a half-migrated design has fewer. */
export function seedTranslations(
  snapshot: TemplateSnapshot,
  fields: Field[],
): Record<string, string> {
  const bn = banglaTree(snapshot.translations);
  if (!bn) return {};
  return Object.fromEntries(
    bilingualFields(snapshot, fields)
      .filter((field) => field.type !== "group")
      .map((field) => [field.id, readPath(bn, field.path)]),
  );
}

/** One edit: normalise it, remember it if it is derived, and move the derived values
 *  that are still following the names. A Bangla edit only touches `translations` — the
 *  derived values come from the English names, never from the Bangla ones. */
export function nextForm(
  snapshot: TemplateSnapshot,
  fields: Field[],
  prev: FormState,
  field: Field,
  raw: string,
  bn = false,
): FormState {
  if (bn) {
    return {
      ...prev,
      translations: { ...prev.translations, [field.id]: raw },
      touched: new Set(prev.touched).add(`${field.id}:bn`),
    };
  }

  const values = { ...prev.values, [field.id]: normaliseValue(field, raw) };
  // Editing a derived field makes it the couple's own; a later name change leaves it alone.
  const touched = field.derived ? new Set(prev.touched).add(field.id) : prev.touched;

  if (!NAME_PATHS.includes(field.path.join("."))) return { ...prev, values, touched };

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

  return { ...prev, values, touched };
}

/** One group's items as the form holds them. */
function groupItems(state: FormState, groupId: string): GroupItem[] {
  const value = state.values[groupId];
  return Array.isArray(value) ? value : [];
}

function withGroupItems(
  state: FormState,
  groupId: string,
  items: GroupItem[],
  changed: { touched?: ReadonlySet<string>; visited?: ReadonlySet<string> } = {},
): FormState {
  return {
    ...state,
    values: { ...state.values, [groupId]: items },
    touched: new Set(changed.touched ?? state.touched),
    ...(changed.visited ? { visited: changed.visited } : {}),
  };
}

/** Mark one key as visited, so its message may show from now on (WT-17d). */
export function markVisited(state: FormState, key: string): FormState {
  return { ...state, visited: new Set(state.visited).add(key) };
}

/** Move the group's keys with its items, so a reordered event keeps its own date and its
 *  own "already blurred" state (WT-17d). */
function remapGroupKeys(
  keys: ReadonlySet<string> | undefined,
  groupId: string,
  map: (index: number) => number | null,
): Set<string> {
  const next = new Set<string>();
  for (const key of keys ?? []) {
    const [group, index, ...rest] = key.split(".");
    if (group !== groupId || rest.length === 0) {
      next.add(key);
      continue;
    }
    const moved = map(Number(index));
    if (moved !== null) next.add([group, moved, ...rest].join("."));
  }
  return next;
}

/** One input of one event card. A Bangla edit stays inside the item's `bn` (WT-17a). */
export function editGroupItem(
  state: FormState,
  group: Field,
  index: number,
  itemField: Field,
  raw: string,
  bn = false,
): FormState {
  const items = groupItems(state, group.id).map((item, position) => {
    if (position !== index) return item;
    if (!bn) return { ...item, [itemField.id]: raw };
    return { ...item, bn: { ...item.bn, [itemField.id]: raw } };
  });
  return withGroupItems(state, group.id, items);
}

/** "Different from the main event": checking copies the primary in and records the touch,
 *  unchecking clears both languages so the event follows the primary again. */
export function setItemInherits(
  state: FormState,
  group: Field,
  index: number,
  itemField: Field,
  different: boolean,
): FormState {
  const primaryId = primaryFieldId(itemField.id);
  const english = state.values[primaryId];
  const bangla = state.translations[primaryId] ?? "";
  const key = `${group.id}.${index}.${itemField.id}`;
  const touched = new Set(state.touched);
  if (different) touched.add(key);
  else touched.delete(key);

  const items = groupItems(state, group.id).map((item, position) => {
    if (position !== index) return item;
    const next: GroupItem = {
      ...item,
      [itemField.id]: different && typeof english === "string" ? english : "",
    };
    if (itemField.bilingual) {
      next.bn = { ...item.bn, [itemField.id]: different ? bangla : "" };
    }
    return next;
  });
  return withGroupItems(state, group.id, items, { touched });
}

/** A new event starts blank in both languages; its date and venue stay inherited, and the
 *  resolver keeps the unexposed template keys (`icon`, `calTz`). */
export function addGroupItem(state: FormState, group: Field): FormState {
  const items = groupItems(state, group.id);
  if (items.length >= (group.max ?? Infinity)) return state;
  return withGroupItems(state, group.id, [...items, { bn: {} }]);
}

/** The last card cannot be removed: every invite has at least one event. */
export function removeGroupItem(state: FormState, group: Field, index: number): FormState {
  const items = groupItems(state, group.id);
  if (items.length <= Math.max(group.min ?? 0, 1)) return state;
  const map = (position: number) =>
    position === index ? null : position > index ? position - 1 : position;
  return withGroupItems(
    state,
    group.id,
    items.filter((_, position) => position !== index),
    {
      touched: remapGroupKeys(state.touched, group.id, map),
      visited: remapGroupKeys(state.visited, group.id, map),
    },
  );
}

/** Up or down by one card. The ends are no-ops. */
export function moveGroupItem(
  state: FormState,
  group: Field,
  index: number,
  offset: -1 | 1,
): FormState {
  const items = groupItems(state, group.id);
  const target = index + offset;
  if (target < 0 || target >= items.length) return state;
  const next = [...items];
  next[index] = items[target]!;
  next[target] = items[index]!;
  const map = (position: number) =>
    position === index ? target : position === target ? index : position;
  return withGroupItems(state, group.id, next, {
    touched: remapGroupKeys(state.touched, group.id, map),
    visited: remapGroupKeys(state.visited, group.id, map),
  });
}

/** The fields grouped the way `FormSections` renders them: sections in the order their first
 *  field appears, fields in declaration order. */
export function sectionGroups(fields: Field[]): [string, Field[]][] {
  const sections = new Map<string, Field[]>();
  for (const field of fields) {
    const section = field.section ?? "Details";
    sections.set(section, [...(sections.get(section) ?? []), field]);
  }
  return [...sections];
}

/** One rendered answer that is still missing, in form order. */
interface MissingAnswer {
  /** The key the form stores its interaction state under: `fieldId`, `fieldId:bn`,
   *  `events.<i>.<itemId>` or `events.<i>.<itemId>:bn`. */
  key: string;
  label: string;
  error: string;
}

/** Every rendered answer that is still missing or malformed, in form order. The rules are
 *  WT-14a's (`validateField`), plus WT-14c's toggle and WT-17a's inheritance. */
function missingList(
  fields: Field[],
  form: Pick<FormState, "values" | "translations" | "touched">,
  bilingual: boolean,
): MissingAnswer[] {
  const missing: MissingAnswer[] = [];
  const add = (key: string, label: string, error: string | undefined) => {
    if (error) missing.push({ key, label, error });
  };
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const bnLabel = (field: Field) => field.labelBn ?? field.label ?? field.id;

  for (const [, sectionFields] of sectionGroups(fields)) {
    for (const field of sectionFields) {
      if (field.type === "group") {
        const items = form.values[field.id];
        if (!Array.isArray(items)) continue;
        items.forEach((item, index) => {
          const title = `${field.itemLabel ?? "Item"} ${index + 1}`;
          for (const itemField of field.itemFields ?? []) {
            const key = `${field.id}.${index}.${itemField.id}`;
            // An untouched inherited item is the primary event's, never the card's own.
            if (itemField.inherits && !form.touched.has(key)) continue;
            add(
              key,
              `${title}: ${itemField.label ?? itemField.id}`,
              validateField(itemField, text(item[itemField.id])),
            );
            if (!bilingual || !itemField.bilingual) continue;
            add(
              `${key}:bn`,
              `${title}: ${bnLabel(itemField)}`,
              validateField(itemField, text(item.bn?.[itemField.id])),
            );
          }
        });
        continue;
      }
      if (field.type === "toggle" || !(field.id in form.values)) continue;
      add(field.id, field.label ?? field.id, validateField(field, text(form.values[field.id])));
      // A field with no key in `translations` has no Bangla input, so no Bangla obligation;
      // with the toggle off there are none at all (WT-14c §4).
      if (!bilingual || !(field.id in form.translations)) continue;
      add(
        `${field.id}:bn`,
        bnLabel(field),
        validateField(field, text(form.translations[field.id])),
      );
    }
  }
  return missing;
}

/** Every rendered answer that is still missing or malformed, keyed the way the form stores
 *  interaction state. Empty when the form is publishable. */
export function formErrors(
  fields: Field[],
  form: Pick<FormState, "values" | "translations" | "touched">,
  bilingual: boolean,
): Record<string, string> {
  return Object.fromEntries(
    missingList(fields, form, bilingual).map(({ key, error }) => [key, error]),
  );
}

/** The count and the first key, for the badge and (WT-21b) the publish tooltip. */
export function missingAnswers(
  fields: Field[],
  form: Pick<FormState, "values" | "translations" | "touched">,
  bilingual: boolean,
): { count: number; first?: { key: string; label: string } } {
  const missing = missingList(fields, form, bilingual);
  const [first] = missing;
  return {
    count: missing.length,
    ...(first ? { first: { key: first.key, label: first.label } } : {}),
  };
}
