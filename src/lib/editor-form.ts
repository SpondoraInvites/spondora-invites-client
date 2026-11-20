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
  type EventItem,
  type TemplateSnapshot,
} from "@/lib/fields";
import { normaliseValue } from "@/lib/field-schema";

/** A field's value: text, the localization toggle, or an events group (WT-17). */
export type FormValue = string | boolean | EventItem[];

export interface FormState {
  values: Record<string, FormValue>;
  /** Bangla, keyed by the same field id (WT-14c). Empty when the template has no bn tree. */
  translations: Record<string, string>;
  touched: Set<string>;
}

/** The couple's names drive the derived fields, wherever their paths landed. */
const NAME_PATHS = ["couple.name1", "couple.name2"];

/** One event from the template's config and bn tree: English at the root, Bangla in `bn`. */
function seedEventItems(snapshot: TemplateSnapshot, field: Field): EventItem[] {
  const english = readValue(snapshot.defaults, field.path);
  const bn = banglaTree(snapshot.translations);
  const bangla = bn ? readValue(bn, field.path) : undefined;
  const items = Array.isArray(english) ? (english as Record<string, unknown>[]) : [];
  const bnItems = Array.isArray(bangla) ? (bangla as Record<string, unknown>[]) : [];

  return items.map((item, index) => {
    const value: EventItem = {};
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
      if (field.type === "group") return [field.id, seedEventItems(snapshot, field)];
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
function eventItems(state: FormState, groupId: string): EventItem[] {
  const value = state.values[groupId];
  return Array.isArray(value) ? value : [];
}

function withEvents(
  state: FormState,
  groupId: string,
  items: EventItem[],
  touched: ReadonlySet<string> = state.touched,
): FormState {
  return {
    ...state,
    values: { ...state.values, [groupId]: items },
    touched: new Set(touched),
  };
}

/** Move the group's touch keys with its items, so a reordered event keeps its own date. */
function remapTouched(
  touched: ReadonlySet<string>,
  groupId: string,
  map: (index: number) => number | null,
): Set<string> {
  const next = new Set<string>();
  for (const key of touched) {
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
export function editEventItem(
  state: FormState,
  group: Field,
  index: number,
  itemField: Field,
  raw: string,
  bn = false,
): FormState {
  const items = eventItems(state, group.id).map((item, position) => {
    if (position !== index) return item;
    if (!bn) return { ...item, [itemField.id]: raw };
    return { ...item, bn: { ...item.bn, [itemField.id]: raw } };
  });
  return withEvents(state, group.id, items);
}

/** "Different from the main event": checking copies the primary in and records the touch,
 *  unchecking clears both languages so the event follows the primary again. */
export function setEventInherits(
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

  const items = eventItems(state, group.id).map((item, position) => {
    if (position !== index) return item;
    const next: EventItem = {
      ...item,
      [itemField.id]: different && typeof english === "string" ? english : "",
    };
    if (itemField.bilingual) {
      next.bn = { ...item.bn, [itemField.id]: different ? bangla : "" };
    }
    return next;
  });
  return withEvents(state, group.id, items, touched);
}

/** A new event starts blank in both languages; its date and venue stay inherited, and the
 *  resolver keeps the unexposed template keys (`icon`, `calTz`). */
export function addEvent(state: FormState, group: Field): FormState {
  const items = eventItems(state, group.id);
  if (items.length >= (group.max ?? Infinity)) return state;
  return withEvents(state, group.id, [...items, { bn: {} }]);
}

/** The last card cannot be removed: every invite has at least one event. */
export function removeEvent(state: FormState, group: Field, index: number): FormState {
  const items = eventItems(state, group.id);
  if (items.length <= Math.max(group.min ?? 0, 1)) return state;
  const touched = remapTouched(state.touched, group.id, (position) =>
    position === index ? null : position > index ? position - 1 : position,
  );
  return withEvents(
    state,
    group.id,
    items.filter((_, position) => position !== index),
    touched,
  );
}

/** Up or down by one card. The ends are no-ops. */
export function moveEvent(
  state: FormState,
  group: Field,
  index: number,
  offset: -1 | 1,
): FormState {
  const items = eventItems(state, group.id);
  const target = index + offset;
  if (target < 0 || target >= items.length) return state;
  const next = [...items];
  next[index] = items[target]!;
  next[target] = items[index]!;
  const touched = remapTouched(state.touched, group.id, (position) =>
    position === index ? target : position === target ? index : position,
  );
  return withEvents(state, group.id, next, touched);
}
