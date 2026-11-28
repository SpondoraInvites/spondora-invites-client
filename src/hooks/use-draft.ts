/**
 * The editor's draft in localStorage (WT-15).
 *
 * One instance on the editor route owns the form and writes it back 500 ms after the
 * last change. Storage is optional: private mode, a disabled store or a full quota
 * reads as "no draft" and leaves the editor working.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import type { FormState } from "@/lib/editor-form";
import type { TemplateSnapshot } from "@/lib/fields";

export type DraftStatus = "idle" | "saving" | "saved";

/** Both the key and the payload carry the version, so a shape change can never half-match. */
const SCHEMA_VERSION = 1;
const DEBOUNCE_MS = 500;

export function draftKey(templateSlug: string): string {
  return `spondora:draft:v1:${templateSlug}`;
}

/** The stored shape. Everything but the four core keys is optional: an older draft
 *  legitimately lacks `translations` or `touched`. */
interface StoredDraft {
  schemaVersion?: number;
  template?: string;
  values?: unknown;
  translations?: unknown;
  touched?: unknown;
  slug?: unknown;
}

/** Missing or disabled storage is "no draft", never a thrown error. */
function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function remove(key: string) {
  try {
    storage()?.removeItem(key);
  } catch {
    // Nothing was readable, so there is nothing to remove.
  }
}

/** Keep only the ids `fallback` has (the template's current fields), and fill a missing
 *  one from it. An unknown id is dropped instead of merged. `false` is kept as `false`. */
function mergeKnown(stored: unknown, fallback: Record<string, unknown>): Record<string, unknown> {
  const merged = { ...fallback };
  if (!stored || typeof stored !== "object") return merged;
  for (const id of Object.keys(merged)) {
    const value = (stored as Record<string, unknown>)[id];
    if (value !== undefined && value !== null) merged[id] = value;
  }
  return merged;
}

/** The draft, or null when there is none, it is corrupt, or it belongs to another
 *  template or schema. Discarding also removes the key so it is not parsed again. */
function readDraft(
  key: string,
  template: string,
  seed: FormState,
): { form: FormState; slug: string | null } | null {
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
  if (raw === null) return null;

  let draft: StoredDraft;
  try {
    draft = JSON.parse(raw) as StoredDraft;
  } catch {
    remove(key);
    return null;
  }

  if (!draft || draft.schemaVersion !== SCHEMA_VERSION || draft.template !== template) {
    remove(key);
    return null;
  }

  // A draft saved before translations existed loads with none rather than failing.
  const hasTranslations = draft.translations && typeof draft.translations === "object";

  return {
    form: {
      values: mergeKnown(draft.values, seed.values) as FormState["values"],
      translations: hasTranslations
        ? (mergeKnown(draft.translations, seed.translations) as Record<string, string>)
        : {},
      touched: new Set(
        Array.isArray(draft.touched)
          ? draft.touched.filter((item): item is string => typeof item === "string")
          : [],
      ),
    },
    slug: typeof draft.slug === "string" && draft.slug !== "" ? draft.slug : null,
  };
}

function writeDraft(key: string, template: string, form: FormState, slug: string | null): boolean {
  try {
    const store = storage();
    if (!store) return false;
    store.setItem(
      key,
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        template,
        values: form.values,
        translations: form.translations,
        touched: [...form.touched],
        slug,
        savedAt: new Date().toISOString(),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export interface Draft {
  form: FormState;
  setForm: (next: FormState | ((prev: FormState) => FormState)) => void;
  status: DraftStatus;
  clear: () => void;
  savedSlug: string | null;
  setSlug: (slug: string) => void;
  /** The draft has been read (or found absent); the form can show real values now. */
  ready: boolean;
}

export function useDraft(snapshot: TemplateSnapshot, seed: FormState): Draft {
  const template = snapshot.manifest.slug;
  const key = draftKey(template);
  const [form, setFormState] = useState<FormState>(seed);
  const [slug, setSlugState] = useState<string | null>(null);
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [ready, setReady] = useState(false);
  // Only a change the couple made is written; loading a draft never writes it back.
  const dirty = useRef(false);

  // Read once, before the form is shown. Kept out of the initial state so the server
  // and the first client render agree; the route hides the form until `ready`.
  useEffect(() => {
    const draft = readDraft(key, template, seed);
    dirty.current = false;
    setFormState(draft?.form ?? seed);
    setSlugState(draft?.slug ?? null);
    setStatus("idle");
    setReady(true);
  }, [key, template, seed]);

  const setForm = useCallback((next: FormState | ((prev: FormState) => FormState)) => {
    dirty.current = true;
    setStatus("saving");
    setFormState(next);
  }, []);

  const setSlug = useCallback((next: string) => {
    dirty.current = true;
    setStatus("saving");
    setSlugState(next);
  }, []);

  // One write per burst of edits, cleared on unmount or on the next keystroke.
  useEffect(() => {
    if (!ready || !dirty.current) return;
    const timer = setTimeout(() => {
      setStatus(writeDraft(key, template, form, slug) ? "saved" : "idle");
      dirty.current = false;
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [form, slug, key, template, ready]);

  const clear = useCallback(() => {
    remove(key);
    dirty.current = false;
    setFormState(seed);
    setSlugState(null);
    setStatus("idle");
  }, [key, seed]);

  return { form, setForm, status, clear, savedSlug: slug, setSlug, ready };
}
