/**
 * The invite editor (WT-13 spike, generic form from WT-14a, dates from WT-14b, bilingual
 *  inputs from WT-14c, draft persistence from WT-15).
 *
 * Values live in the draft and are written into the preview link's `#cfg=` hash.
 * The shell is WT-18.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { FormSections } from "@/components/editor/FormSections";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { TEMPLATE_SNAPSHOTS } from "@/data/templates/index";
import { useDraft } from "@/hooks/use-draft";
import type { Field } from "@/lib/canonical-fields";
import {
  dateTargets,
  deriveDateTime,
  deriveRsvpDeadline,
  rsvpDeadlineTargets,
  type DateTimeContext,
  type DerivedTargets,
} from "@/lib/derive";
import { nextForm, seedTranslations, seedValues, type FormState } from "@/lib/editor-form";
import { normaliseMonogram, normaliseValue, validateField } from "@/lib/field-schema";
import {
  readPath,
  resolveConfig,
  resolveTranslations,
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

/** The template's language switch field, when its config has one. */
function toggleField(snapshot: TemplateSnapshot) {
  return snapshot.fields.find((field) => field.type === "toggle");
}

/** The full `#cfg=` hash for one set of form values. */
function hashFor(
  snapshot: TemplateSnapshot,
  fields: Field[],
  form: Pick<FormState, "values" | "translations">,
  bilingual: boolean,
) {
  const { values } = form;
  const ctx = dateContext(snapshot);
  const dateField = fields.find((field) => field.type === "datetime");
  const deadlineField = fields.find((field) => field.type === "date");

  const localValue = dateField ? values[dateField.id] : "";
  const local = typeof localValue === "string" ? localValue : "";
  const date = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)
    ? deriveDateTime(local, ctx)
    : undefined;
  // `<input type="date">` gives "2027-01-25"; an empty or half-picked day writes nothing.
  const dayValue = deadlineField ? values[deadlineField.id] : "";
  const day = typeof dayValue === "string" ? dayValue : "";
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(day) ? deriveRsvpDeadline(day, ctx) : undefined;

  // The date inputs' own writes are the derived strings below, never the raw input value.
  const written = fields.filter((field) => field !== deadlineField);
  const config = resolveConfig(
    snapshot,
    date ? written : written.filter((field) => field !== dateField),
    date && dateField ? { ...values, [dateField.id]: date.iso } : values,
  );

  const translations = resolveTranslations(snapshot, fields, form.translations);
  if (date) applyTargets(config, translations, dateTargets(date));
  if (deadline) applyTargets(config, translations, rsvpDeadlineTargets(deadline));

  // Preview-only: no music loop or WhatsApp popups while typing.
  for (const key of ["music", "rsvp"]) {
    config[key] = { ...(config[key] as object), enabled: false };
  }
  // The toggle drives the preview's language switch instead: off hides it and pins English.
  if (config["localization"]) {
    config["localization"] = { ...(config["localization"] as object), enabled: bilingual };
  }
  // Bangla off: send the empty tree publish would send, so the preview cannot show it.
  if (!bilingual && translations["bn"]) translations["bn"] = {};

  // Send the template's own copy for every locale untouched. The hook replaces each
  // locale wholesale, so sending nothing would keep it too.
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
  return <Editor key={snapshot.manifest.slug} snapshot={snapshot} />;
}

function Editor({ snapshot }: { snapshot: TemplateSnapshot }) {
  const fields = useMemo(() => scalarFields(snapshot), [snapshot]);
  const toggle = useMemo(() => toggleField(snapshot), [snapshot]);
  // The toggle rides in `values`, so its boolean is part of the draft (WT-15).
  const seed = useMemo<FormState>(
    () => ({
      values: seedValues(snapshot, toggle ? [...fields, toggle] : fields),
      translations: seedTranslations(snapshot, fields),
      touched: new Set<string>(),
    }),
    [snapshot, fields, toggle],
  );
  const { form, setForm, status, clear, ready } = useDraft(snapshot, seed);
  // Bangla is collected unless the template's own config says otherwise. A template with
  // no toggle at all publishes English only.
  const bilingual = toggle ? form.values[toggle.id] === true : false;
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [hash, setHash] = useState(() => hashFor(snapshot, fields, seed, bilingual));
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
    const timer = setTimeout(() => setHash(hashFor(snapshot, fields, form, bilingual)), 400);
    return () => clearTimeout(timer);
  }, [snapshot, fields, form, bilingual]);

  const update = (field: Field, raw: string, bn = false) => {
    setForm((prev) => nextForm(snapshot, fields, prev, field, raw, bn));
    // Once a field shows an error, validate while it is fixed instead of waiting for blur.
    const key = bn ? `${field.id}:bn` : field.id;
    if (errors[key] !== undefined) {
      setErrors((prev) => ({
        ...prev,
        [key]: validateField(field, bn ? raw : normaliseValue(field, raw)),
      }));
    }
  };

  const blur = (field: Field, bn = false) => {
    const key = bn ? `${field.id}:bn` : field.id;
    const raw = bn ? form.translations[field.id] : form.values[field.id];
    const current = typeof raw === "string" ? raw : "";
    const value = !bn && field.derived === "initials" ? normaliseMonogram(current) : current;
    if (value !== current) {
      setForm((prev) =>
        bn
          ? { ...prev, translations: { ...prev.translations, [field.id]: value } }
          : { ...prev, values: { ...prev.values, [field.id]: value } },
      );
    }
    setErrors((prev) => ({ ...prev, [key]: validateField(field, value) }));
  };

  const setBilingual = (on: boolean) => {
    if (!toggle) return;
    setForm((prev) => ({ ...prev, values: { ...prev.values, [toggle.id]: on } }));
  };

  return (
    <main className="w-full px-6 py-8 lg:px-10">
      {/* 4rem header + this 2rem padding top and bottom is what the viewport must give up.
          The 900px floor is what the invitation's cover needs: it scales its type by width
          but lays it out by height, so a shorter pane makes the lines overlap. */}
      <div className="flex flex-col gap-8 lg:h-[max(900px,calc(100vh-8rem))] lg:flex-row lg:items-stretch lg:gap-10">
        <div className="relative h-[clamp(900px,82vh,1150px)] overflow-hidden rounded-xl border border-border bg-ink lg:h-full lg:flex-1">
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

        <aside className="mx-auto w-full max-w-sm shrink-0 space-y-5 lg:mx-0 lg:h-full lg:w-[26rem] lg:max-w-none lg:overflow-y-auto">
          <div>
            <span className="eyebrow text-primary">Editor preview</span>
            <h1 className="mt-2 text-3xl text-primary">{snapshot.manifest.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              These inputs write straight into the preview link. Your details are saved in this
              browser as you type.
            </p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "\u00a0"}
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  Start over
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Start over?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This clears the details saved in this browser and puts the sample data back. It
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my details</AlertDialogCancel>
                  <AlertDialogAction onClick={clear}>Start over</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {ready ? (
            <FormSections
              fields={fields}
              values={form.values}
              translations={form.translations}
              errors={errors}
              bilingual={bilingual}
              onBilingualChange={setBilingual}
              toggleField={toggle}
              onEdit={update}
              onBlur={blur}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Loading your draft…</p>
          )}
        </aside>
      </div>
    </main>
  );
}
