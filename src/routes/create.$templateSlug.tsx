/**
 * SPIKE — WT-13 vertical slice, not finished code.
 *
 * Five hardcoded inputs prove the loop form value → `#cfg=` hash → template re-render.
 * No draft, no validation, no save, no publish. WT-14 replaces the form with the full
 * field list and WT-15 adds the draft; do not build on this file as-is.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { CANONICAL_FIELDS } from "@/lib/canonical-fields";
import { deriveDateTime, deriveInitials, isoToLocal } from "@/lib/derive";
import { resolveConfig, type TemplateSnapshot } from "@/lib/fields";
import { TEMPLATE_SNAPSHOTS } from "@/data/templates/index";
import { templateOrigin } from "@/lib/template-origins";

export const Route = createFileRoute("/create/$templateSlug")({
  head: () => ({
    meta: [{ title: "Invite editor (preview) — Spondora" }, { name: "robots", content: "noindex" }],
  }),
  component: CreatePage,
});

const SPIKE_FIELD_IDS = [
  "partner1Name",
  "partner2Name",
  "monogramInitials",
  "eventDateTime",
  "venueName",
];
const SPIKE_FIELDS = SPIKE_FIELD_IDS.map((id) =>
  CANONICAL_FIELDS.find((field) => field.id === id),
).filter((field) => field !== undefined);

function readPath(source: Record<string, unknown>, path: string[]): string {
  const value = path.reduce<unknown>(
    (node, key) => (node as Record<string, unknown> | undefined)?.[key],
    source,
  );
  return typeof value === "string" ? value : "";
}

/** The form shows a local datetime; the template needs the ISO with its own offset. */
const DATE_FIELD_ID = "eventDateTime";

function seedValues(snapshot: TemplateSnapshot) {
  return Object.fromEntries(
    SPIKE_FIELDS.map((field) => {
      const value = readPath(snapshot.defaults, field.path);
      return [field.id, field.id === DATE_FIELD_ID ? isoToLocal(value) : value];
    }),
  );
}

/** `datetime-local` value → `2027-02-12T18:00:00+06:00`, keeping the template's offset. */
function toTemplateIso(snapshot: TemplateSnapshot, local: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)) return "";
  const templateIso = String(snapshot.defaults["weddingDateTime"] ?? "");
  const offset = /[+-]\d{2}:\d{2}$/.exec(templateIso)?.[0] ?? "+06:00";
  const event = (snapshot.defaults["events"] as { calTz?: string }[] | undefined)?.[0];
  return deriveDateTime(local, { timeZone: event?.calTz ?? "Asia/Dhaka", offset }).iso;
}

/** The full `#cfg=` hash for one set of form values. */
function hashFor(snapshot: TemplateSnapshot, values: Record<string, string>) {
  const iso = toTemplateIso(snapshot, values[DATE_FIELD_ID] ?? "");
  // An empty or half-typed date would blank the countdown, so it falls back to the default.
  const config = iso
    ? resolveConfig(snapshot, SPIKE_FIELDS, { ...values, [DATE_FIELD_ID]: iso })
    : resolveConfig(
        snapshot,
        SPIKE_FIELDS.filter((field) => field.id !== DATE_FIELD_ID),
        values,
      );

  // Preview-only: no music loop or WhatsApp popups while typing.
  for (const key of ["music", "rsvp", "localization"]) {
    config[key] = { ...(config[key] as object), enabled: false };
  }

  // Send the template's own copy for every locale untouched. The hook replaces each
  // locale wholesale, so sending nothing would keep it too — but the editor must know
  // that copy once WT-14 adds Bangla inputs.
  const payload = Object.keys(snapshot.translations).length
    ? { config, translations: snapshot.translations }
    : { config };
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
  const [values, setValues] = useState(() => seedValues(snapshot));
  const [hash, setHash] = useState(() => hashFor(snapshot, seedValues(snapshot)));
  const [initialsEdited, setInitialsEdited] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The iframe must start loading in the browser, never in the server HTML: if it finishes
  // before hydration, `onLoad` fires with no handler and the loading overlay stays forever.
  useEffect(() => setHydrated(true), []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const update = (id: string, value: string) => {
    const next = { ...values, [id]: value };

    // WT-23 §3.5: the monogram follows the names until the user edits it, then it stays put.
    if (id === "partner1Name" || id === "partner2Name") {
      if (!initialsEdited) {
        const derived = deriveInitials(
          next["partner1Name"] ?? "",
          next["partner2Name"] ?? "",
          readPath(snapshot.defaults, ["couple", "initials"]),
        );
        if (derived) next["monogramInitials"] = derived;
      }
    } else if (id === "monogramInitials") {
      setInitialsEdited(true);
    }

    setValues(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      // The iframe is keyed by the hash, so a new hash remounts it and the template boots fresh.
      setLoaded(false);
      setHash(hashFor(snapshot, next));
    }, 400);
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
              onLoad={() => setLoaded(true)}
              allow="autoplay; fullscreen"
              className="h-full w-full bg-ink"
            />
          )}
        </div>

        <aside className="mx-auto w-full max-w-sm shrink-0 space-y-5 lg:mx-0 lg:w-[26rem] lg:max-w-none">
          <div>
            <span className="eyebrow text-primary">Editor spike</span>
            <h1 className="mt-2 text-3xl text-primary">{snapshot.manifest.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              These inputs write straight into the preview link. Nothing is saved yet.
            </p>
          </div>
          {SPIKE_FIELDS.map((field) => (
            <label key={field.id} className="block">
              <span className="text-sm font-medium">{field.label}</span>
              <Input
                className="mt-1.5"
                type={field.id === DATE_FIELD_ID ? "datetime-local" : "text"}
                value={values[field.id] ?? ""}
                onChange={(event) => update(field.id, event.target.value)}
              />
            </label>
          ))}
        </aside>
      </div>
    </main>
  );
}
