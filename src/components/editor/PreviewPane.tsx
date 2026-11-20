/**
 * The frame the editor shows an invitation in: container, loading overlay, failure panel and
 * the device toggle that sizes it. The marketing `PreviewFrame` keeps its own copy of the
 * markup because its frame floats differently (phone shell, carousel).
 */
import { useEffect, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";

export type Device = "phone" | "desktop";

const DEVICES = ["phone", "desktop"] as const;

export function DeviceToggle({
  device,
  onChange,
}: {
  device: Device;
  onChange: (device: Device) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-border p-1">
      {DEVICES.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={device === option}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
            device === option ? "bg-primary text-primary-foreground" : "text-foreground/70"
          }`}
        >
          {option === "phone" ? (
            <Smartphone className="h-3.5 w-3.5" />
          ) : (
            <Monitor className="h-3.5 w-3.5" />
          )}
          {option === "phone" ? "Phone" : "Desktop"}
        </button>
      ))}
    </div>
  );
}

interface Props {
  src: string;
  title: string;
  slug: string;
  device: Device;
}

/** A preview that has not loaded within this long is treated as broken, not slow. */
const LOAD_TIMEOUT_MS = 15_000;

export function PreviewPane({ src, title, slug, device }: Props) {
  // The key carries the device, so switching reloads the frame exactly as the marketing
  // preview does: a template's layout keys off the viewport width at load.
  const key = `${device}-${src}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const loaded = loadedKey === key;
  const failed = failedKey === key;
  // The iframe must start loading in the browser, never in the server HTML: if it finishes
  // before hydration, `onLoad` fires with no handler and the loading overlay stays forever.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // React does not listen for `error` on an iframe and browsers do not fire it for a failed
  // navigation, so a `load` that never arrives is the only signal a dead origin gives us.
  useEffect(() => {
    if (!hydrated || loaded || failed) return;
    const timer = setTimeout(() => setFailedKey(key), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [hydrated, loaded, failed, key]);

  const origin = new URL(src, "http://localhost").origin;

  // A dead server still fires `load` — it is the browser's own error page in there — so on
  // every load ask the origin itself whether it is up. `no-cors` keeps the check silent.
  useEffect(() => {
    if (!hydrated || !loaded) return;
    let cancelled = false;
    fetch(origin, { method: "HEAD", mode: "no-cors", cache: "no-store" }).catch(() => {
      if (!cancelled) setFailedKey(key);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, loaded, origin, key]);

  return (
    <div
      // 900px floor on purpose: the template's cover scales its type by width but lays it
      // out by height, so a shorter pane makes the lines overlap.
      className={`relative h-[clamp(900px,82vh,1150px)] w-full overflow-hidden rounded-xl border border-border bg-ink lg:h-full ${
        device === "phone" ? "mx-auto max-w-[420px]" : ""
      }`}
    >
      {!failed && loadedKey !== key && (
        <div className="absolute inset-0 grid place-items-center text-xs text-gold/80 animate-pulse">
          Loading invitation…
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div>
            <p className="text-sm text-gold">Could not load {origin}</p>
            <p className="mt-2 text-xs text-gold/70">
              Make sure “{slug}” is deployed, or run the local server from WT-13 §5 and point
              LOCAL_TEMPLATE_ORIGINS at it. Switching the device retries.
            </p>
          </div>
        </div>
      )}
      {hydrated && (
        <iframe
          key={key}
          src={src}
          title={title}
          onLoad={() => setLoadedKey(key)}
          allow="autoplay; fullscreen"
          className="h-full w-full bg-ink"
        />
      )}
    </div>
  );
}
