/**
 * The invite editor (WT-13 spike, generic form from WT-14a, dates from WT-14b).
 *
 * Values live in local state and are written into the preview link's `#cfg=` hash.
 * Nothing is saved yet (WT-15) and the shell is WT-18.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { FormSections } from "@/components/editor/FormSections";
import { TEMPLATE_SNAPSHOTS } from "@/data/templates/index";
import type { Field } from "@/lib/canonical-fields";
import {
  dateTargets,
  deriveDateTime,
  deriveRsvpDeadline,
  rsvpDeadlineTargets,
  type DateTimeContext,
  type DerivedTargets,
} from "@/lib/derive";
import { nextForm, seedValues, type FormState } from "@/lib/editor-form";
import { normaliseMonogram, normaliseValue, validateField } from "@/lib/field-schema";
import {
  readPath,
  resolveConfig,
  scalarFields,
  setAtPath,
  type TemplateSnapshot,
} from "@/lib/fields";
import { templateOrigin } from "@/lib/template-origins";

export const Route = createFileRoute("/create/$templateSlug")({
  head: () => ({
    meta: [{ title: "Invite editor (preview) — Spondora" }, { name: "robots", content: "noindex" }],
  }),
  component: CreatePage,
});

/** The template's own zone and offset, so a picked wall-clock time is never recalculated. */
function dateContext(snapshot: TemplateSnapshot): DateTimeContext {
  const templateIso = readPath(snapshot.defaults, ["weddingDateTime"]);
  const event = (
    snapshot.defaults["events"] as { calTz?: string; calEnd?: string }[] | undefined
  )?.[0];
  const calEnd = event?.calEnd ?? "";
  return {
    offset: /[+-]\d{2}:\d{2}$/.exec(templateIso)?.[0] ?? "+06:00",
    timeZone: event?.calTz ?? "Asia/Dhaka",
    // A readable end keeps the event's duration: a 6–10 pm wedding stays 4 hours.
    ...(/^\d{2}:\d{2}$/.test(calEnd) ? { previousCalEnd: calEnd } : {}),
  };
}

/** Write the derived strings the resolver cannot reach: display paths and the Bangla copy. */
function applyTargets(
  config: Record<string, unknown>,
  translations: Record<string, unknown>,
  targets: DerivedTargets,
) {
  for (const [path, value] of targets.config) setAtPath(config, path, value);
  for (const [path, value] of targets.translations) setAtPath(translations, path, value);
}

/** The full `#cfg=` hash for one set of form values. */
function hashFor(snapshot: TemplateSnapshot, fields: Field[], values: Record<string, string>) {
  const ctx = dateContext(snapshot);
  const dateField = fields.find((field) => field.type === "datetime");
  const deadlineField = fields.find((field) => field.type === "date");

  const local = dateField ? (values[dateField.id] ?? "") : "";
  const date = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)
    ? deriveDateTime(local, ctx)
    : undefined;
  // `<input type="date">` gives "2027-01-25"; an empty or half-picked day writes nothing.
  const day = deadlineField ? (values[deadlineField.id] ?? "") : "";
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(day) ? deriveRsvpDeadline(day, ctx) : undefined;

  // The date inputs' own writes are the derived strings below, never the raw input value.
  const written = fields.filter((field) => field !== deadlineField);
  const config = resolveConfig(
    snapshot,
    date ? written : written.filter((field) => field !== dateField),
    date && dateField ? { ...values, [dateField.id]: date.iso } : values,
  );

  const translations = structuredClone(snapshot.translations);
  if (date) applyTargets(config, translations, dateTargets(date));
  if (deadline) applyTargets(config, translations, rsvpDeadlineTargets(deadline));

  // Preview-only: no music loop or WhatsApp popups while typing.
  for (const key of ["music", "rsvp", "localization"]) {
    config[key] = { ...(config[key] as object), enabled: false };
  }

  // Send the template's own copy for every locale untouched. The hook replaces each
  // locale wholesale, so sending nothing would keep it too — but the editor must know
  // that copy once WT-14c adds Bangla inputs.
  const payload = Object.keys(translations).length ? { config, translations } : { config };
  return `#cfg=${encodeURIComponent(JSON.stringify(payload))}`;
}

function CreatePage() {
  const { templateSlug } = Route.useParams();
  const snapshot = TEMPLATE_SNAPSHOTS[templateSlug];
  if (!snapshot) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-24">
        <h1 className="text-2xl font-semibold">No synced template named “{templateSlug}”</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Run <code>npm run sync:templates</code> to snapshot the templates this editor knows.
        </p>
      </main>
    );
  }
  return <Editor snapshot={snapshot} />;
}

function Editor({ snapshot }: { snapshot: TemplateSnapshot }) {
  const fields = useMemo(() => scalarFields(snapshot), [snapshot]);
  const [form, setForm] = useState<FormState>(() => ({
    values: seedValues(snapshot, fields),
    touched: new Set<string>(),
  }));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [hash, setHash] = useState(() => hashFor(snapshot, fields, seedValues(snapshot, fields)));
  // The hash the iframe last finished loading. Deriving `loaded` from it means a hash that is
  // set but never remounts (the first effect run) cannot hide or strand the overlay.
  const [loadedHash, setLoadedHash] = useState<string>();
  const loaded = loadedHash === hash;
  const [hydrated, setHydrated] = useState(false);

  // The iframe must start loading in the browser, never in the server HTML: if it finishes
  // before hydration, `onLoad` fires with no handler and the loading overlay stays forever.
  useEffect(() => setHydrated(true), []);

  // Debounced so the iframe remounts once after a burst of typing, not on every key.
  useEffect(() => {
    const timer = setTimeout(() => setHash(hashFor(snapshot, fields, form.values)), 400);
    return () => clearTimeout(timer);
  }, [snapshot, fields, form.values]);

  const update = (field: Field, raw: string) => {
    setForm((prev) => nextForm(snapshot, fields, prev, field, raw));
    // Once a field shows an error, validate while it is fixed instead of waiting for blur.
    if (errors[field.id] !== undefined) {
      setErrors((prev) => ({
        ...prev,
        [field.id]: validateField(field, normaliseValue(field, raw)),
      }));
    }
  };

  const blur = (field: Field) => {
    const current = form.values[field.id] ?? "";
    const value = field.derived === "initials" ? normaliseMonogram(current) : current;
    if (value !== current) {
      setForm((prev) => ({ ...prev, values: { ...prev.values, [field.id]: value } }));
    }
    setErrors((prev) => ({ ...prev, [field.id]: validateField(field, value) }));
  };

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-10">
        <div className="relative h-[clamp(900px,82vh,1150px)] overflow-hidden rounded-xl border border-border bg-ink lg:flex-1">
          {!loaded && (
            <div className="absolute inset-0 grid place-items-center text-xs text-gold/80 animate-pulse">
              Loading invitation…
            </div>
          )}
          {hydrated && (
            <iframe
              key={hash}
              src={`${templateOrigin(snapshot.manifest.slug, snapshot.manifest.origin)}${hash}`}
              title={`${snapshot.manifest.name} live preview`}
              onLoad={() => setLoadedHash(hash)}
              allow="autoplay; fullscreen"
              className="h-full w-full bg-ink"
            />
          )}
        </div>

        <aside className="mx-auto w-full max-w-sm shrink-0 space-y-5 lg:mx-0 lg:w-[26rem] lg:max-w-none">
          <div>
            <span className="eyebrow text-primary">Editor preview</span>
            <h1 className="mt-2 text-3xl text-primary">{snapshot.manifest.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              These inputs write straight into the preview link. Nothing is saved yet.
            </p>
          </div>
          <FormSections
            fields={fields}
            values={form.values}
            errors={errors}
            onChange={update}
            onBlur={blur}
          />
        </aside>
      </div>
    </main>
  );
}
