import { useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tierLabel, type InviteTemplate } from "@/data/templates";
import { orderMessage, whatsappLink } from "@/data/site";

interface Props {
  template: InviteTemplate;
  onPrev: () => void;
  onNext: () => void;
}

export function PreviewFrame({ template, onPrev, onNext }: Props) {
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [loaded, setLoaded] = useState<string | null>(null);
  const isLoading = loaded !== template.slug + device;

  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row lg:gap-10">
      <div className="flex flex-1 items-center justify-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={onPrev} aria-label="Previous design"><ChevronLeft /></Button>
        <div
          className={device === "phone" ? "phone-frame relative h-[min(72vh,760px)] aspect-[390/844]" : "relative h-[min(65vh,640px)] w-full max-w-4xl overflow-hidden rounded-xl border-4 border-ink bg-ink"}
        >
          {isLoading && (
            <div className="absolute inset-2 grid place-items-center rounded-[2.2rem] bg-ink text-xs text-gold/80 animate-pulse">Loading invitation…</div>
          )}
          <iframe
            key={template.slug + device}
            src={template.previewUrl}
            title={`${template.name} live preview`}
            onLoad={() => setLoaded(template.slug + device)}
            allow="autoplay; fullscreen"
            className={`h-full w-full bg-ink ${device === "phone" ? "rounded-[2.2rem]" : "rounded-md"}`}
          />
        </div>
        <Button variant="ghost" size="icon" onClick={onNext} aria-label="Next design"><ChevronRight /></Button>
      </div>

      <aside className="mx-auto w-full max-w-sm lg:w-80 lg:self-center">
        <span className="eyebrow text-primary">{tierLabel[template.tier]}</span>
        <h2 className="mt-2 text-3xl text-primary">{template.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{template.description}</p>
        <p className="mt-4 font-display text-sm italic text-primary">Tap the seal to open. Turn sound on for nature audio or nasheed.</p>
        <div className="mt-5 inline-flex rounded-full border border-border p-1">
          {(["phone", "desktop"] as const).map((d) => (
            <button key={d} onClick={() => setDevice(d)} aria-pressed={device === d}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${device === d ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}>
              {d === "phone" ? <Smartphone className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}{d === "phone" ? "Phone" : "Desktop"}
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <Button asChild size="lg">
            <a href={whatsappLink(orderMessage(template.name, tierLabel[template.tier]))} target="_blank" rel="noreferrer">Choose this design</a>
          </Button>
          <Button asChild variant="outline">
            <a href={template.previewUrl} target="_blank" rel="noreferrer"><ExternalLink /> Open in new tab</a>
          </Button>
        </div>
      </aside>
    </div>
  );
}
