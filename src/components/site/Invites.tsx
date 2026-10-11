import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { templates, tierLabel, type Tier } from "@/data/templates";
import { orderMessage, whatsappLink } from "@/data/site";
import { PreviewFrame } from "./PreviewFrame";

const filters: ("all" | Tier)[] = ["all", "standard", "premium", "luxury"];

export function Invites({ filter, setFilter }: { filter: "all" | Tier; setFilter: (f: "all" | Tier) => void }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const shown = templates.filter((t) => filter === "all" || t.tier === filter);
  const move = (d: number) => setOpenIdx((i) => (i === null ? i : (i + d + templates.length) % templates.length));

  return (
    <section id="invites" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
      <div className="text-center">
        <span className="eyebrow text-primary">The collection</span>
        <h2 className="mt-3 text-4xl text-primary md:text-5xl">Choose your invitation</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Every design below is a real, working invitation. Open one and tap through it like your guests will.</p>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-2" role="group" aria-label="Filter by tier">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
            className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground/75 hover:border-primary"}`}>
            {f === "all" ? "All" : tierLabel[f]}
          </button>
        ))}
      </div>

      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((t) => (
          <article key={t.slug} className="lift group overflow-hidden rounded-2xl border border-border bg-card">
            <button onClick={() => setOpenIdx(templates.indexOf(t))} className="relative block w-full overflow-hidden bg-ink" aria-label={`Preview ${t.name}`}>
              <img src={t.cover} alt={`${t.name} invitation opening screen`} width={390} height={844} loading="lazy"
                className="aspect-[4/5] w-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
              <span className="eyebrow absolute left-4 top-4 rounded-full bg-ivory/90 px-3 py-1 !text-[0.6rem] text-primary">{tierLabel[t.tier]}</span>
            </button>
            <div className="p-6">
              <h3 className="text-2xl text-primary">{t.name}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {t.tags.map((tag) => <span key={tag} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">{tag}</span>)}
              </div>
              <div className="mt-5 flex gap-2">
                <Button className="flex-1" onClick={() => setOpenIdx(templates.indexOf(t))}>Preview</Button>
                <Button asChild variant="outline" className="flex-1">
                  <a href={whatsappLink(orderMessage(t.name, tierLabel[t.tier]))} target="_blank" rel="noreferrer">Choose</a>
                </Button>
              </div>
              <Link to="/preview/$slug" params={{ slug: t.slug }} className="mt-3 block text-center text-xs text-muted-foreground underline-offset-4 hover:underline">Full-screen preview</Link>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={openIdx !== null} onOpenChange={(o) => !o && setOpenIdx(null)}>
        <DialogContent className="max-h-[95vh] w-[96vw] max-w-6xl overflow-y-auto bg-background p-4 sm:p-8">
          {openIdx !== null && templates[openIdx] && (
            <>
              <DialogTitle className="sr-only">{templates[openIdx]!.name} preview</DialogTitle>
              <DialogDescription className="sr-only">Live interactive preview of the invitation.</DialogDescription>
              <PreviewFrame template={templates[openIdx]!} onPrev={() => move(-1)} onNext={() => move(1)} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
