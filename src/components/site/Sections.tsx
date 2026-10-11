import { useState } from "react";
import { Check, Minus, Heart, Smartphone, Link2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { templates, tierLabel, type Tier } from "@/data/templates";
import { tiers, comparison, addOns, formatPrice } from "@/data/pricing";
import { site, steps, needFromYou, faqs, whatsappLink, orderMessage } from "@/data/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 md:grid-cols-[1.2fr_1fr] md:py-28">
        <div className="animate-rise">
          <span className="eyebrow text-primary">Digital interactive wedding invites</span>
          <h1 className="mt-5 text-5xl leading-[1.05] text-primary md:text-7xl">
            Your wedding, <em className="text-gold">beautifully</em> invited.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-foreground/80">Premium interactive wedding invitations, designed for your special day. One link, every detail.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg"><a href="#invites">Explore invites</a></Button>
            <Button asChild size="lg" variant="outline"><a href="#pricing">See pricing</a></Button>
          </div>
          <p className="mt-8 text-xs tracking-wide text-muted-foreground">Mobile-first · Your own link · Music, RSVP & maps · Made by our team</p>
        </div>
        <div className="relative mx-auto h-[560px] w-full max-w-sm animate-rise [animation-delay:200ms]">
          <img src={templates[3]?.cover} alt="" aria-hidden className="phone-frame absolute left-0 top-12 w-[58%] rotate-[-8deg] opacity-80" />
          <img src={templates[2]?.cover} alt="Wine Seal invitation on a phone" className="phone-frame absolute right-0 top-0 w-[64%] rotate-[4deg]" />
        </div>
      </div>
      <div className="hairline mx-auto max-w-4xl" />
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section-dark scroll-mt-16">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <div className="text-center">
          <span className="eyebrow text-gold">How it works</span>
          <h2 className="mt-3 text-4xl md:text-5xl">From "yes" to sent, in four steps</h2>
        </div>
        <ol className="mt-16 grid gap-10 md:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="relative text-center md:text-left">
              <span className="font-display text-5xl italic text-gold">0{i + 1}</span>
              <h3 className="mt-3 text-xl">{s.title}</h3>
              <p className="mt-2 text-sm text-ivory/75">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-16 rounded-2xl border border-gold/30 p-8">
          <h3 className="text-2xl text-gold">What we need from you</h3>
          <ul className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {needFromYou.map((n) => <li key={n} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-gold" />{n}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}

const Cell = ({ v }: { v: string | boolean }) =>
  v === true ? <Check className="mx-auto h-4 w-4 text-primary" aria-label="Included" /> :
  v === false ? <Minus className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Not included" /> :
  <span className="text-xs font-medium">{v}</span>;

export function Pricing({ onSeeTier }: { onSeeTier: (t: Tier) => void }) {
  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
      <div className="text-center">
        <span className="eyebrow text-primary">Pricing</span>
        <h2 className="mt-3 text-4xl text-primary md:text-5xl">Simple, honest pricing</h2>
        <p className="mt-4 text-muted-foreground">One price per tier. Share with unlimited guests.</p>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.tier} className={`relative flex flex-col rounded-2xl border p-8 ${t.popular ? "section-dark border-gold" : "border-border bg-card"}`}>
            {t.popular && <span className="eyebrow absolute -top-3 left-8 rounded-full bg-gold px-3 py-1 !text-[0.6rem] text-primary">Most popular</span>}
            <h3 className={`text-2xl ${t.popular ? "text-gold" : "text-primary"}`}>{t.name}</h3>
            <p className="mt-4 font-display text-5xl">{formatPrice(t.price)}</p>
            <p className={`mt-3 text-sm ${t.popular ? "text-ivory/80" : "text-muted-foreground"}`}>{t.tagline}</p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {t.features.map((f) => <li key={f} className="flex gap-2"><Check className={`h-4 w-4 shrink-0 ${t.popular ? "text-gold" : "text-primary"}`} />{f}</li>)}
            </ul>
            <div className="mt-8 flex flex-col gap-2">
              <Button asChild variant={t.popular ? "gold" : "default"}>
                <a href={whatsappLink(`Hi Spondora, I'm interested in the ${t.name} tier.`)} target="_blank" rel="noreferrer">Order on WhatsApp</a>
              </Button>
              <Button variant={t.popular ? "ghostLight" : "outline"} onClick={() => onSeeTier(t.tier)}>See {t.name} designs</Button>
            </div>
          </div>
        ))}
      </div>

      <details className="mt-14 rounded-2xl border border-border bg-card p-6 md:open:p-8" open>
        <summary className="cursor-pointer font-display text-xl text-primary">Compare features</summary>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="border-b border-border"><th className="py-3 text-left font-medium">Feature</th>{tiers.map((t) => <th key={t.tier} className="py-3 font-display text-primary">{t.name}</th>)}</tr></thead>
            <tbody>
              {comparison.map((r) => (
                <tr key={r.feature} className="border-b border-border/60"><td className="py-3">{r.feature}</td>{tiers.map((t) => <td key={t.tier} className="py-3 text-center"><Cell v={r.values[t.tier]} /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-8">
          <h3 className="text-xl text-primary">Add-ons</h3>
          <ul className="mt-4 divide-y divide-border text-sm">
            {addOns.map((a) => <li key={a.name} className="flex justify-between py-3"><span>{a.name}</span><span className="font-medium text-primary">+{formatPrice(a.price)}</span></li>)}
          </ul>
        </div>
        <div className="flex flex-col justify-center rounded-2xl bg-secondary p-8">
          <h3 className="text-2xl text-primary">Need something unique?</h3>
          <p className="mt-3 text-sm text-foreground/80">We design bespoke invitations around your colours, culture and story.</p>
          <Button asChild className="mt-6 self-start"><a href={whatsappLink("Hi Spondora, I'd like a custom invitation design.")} target="_blank" rel="noreferrer">Ask for a custom quote</a></Button>
        </div>
      </div>
    </section>
  );
}

export function WhySpondora() {
  const points = [
    { icon: Heart, title: "Crafted by humans", body: "Every invite is personalised by our design team." },
    { icon: Smartphone, title: "Mobile-first", body: "Made for the phones your guests actually use." },
    { icon: Link2, title: "All in one link", body: "Schedule, venue, music and RSVP — together." },
    { icon: MapPin, title: "Local at heart", body: "বাংলা, Akd-aware and built around Bangladeshi venues." },
  ];
  return (
    <section className="bg-secondary/60">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <p className="mx-auto max-w-2xl text-center font-display text-3xl italic text-primary">"{site.secondary}"</p>
        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {points.map((p) => (
            <div key={p.title} className="text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-gold text-primary"><p.icon className="h-5 w-5" /></span>
              <h3 className="mt-4 text-lg text-primary">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-24">
      <div className="text-center">
        <span className="eyebrow text-primary">FAQ</span>
        <h2 className="mt-3 text-4xl text-primary">Questions, answered</h2>
      </div>
      <div className="mt-12 divide-y divide-border border-y border-border">
        {faqs.map((f) => (
          <details key={f.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between font-display text-lg text-primary">
              {f.q}<span className="text-gold transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm text-foreground/80">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Contact() {
  const [form, setForm] = useState({ name: "", date: "", template: "", message: "" });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = templates.find((x) => x.slug === form.template);
    const lines = [orderMessage(t?.name, t ? tierLabel[t.tier] : undefined), form.name && `Name: ${form.name}`, form.date && `Wedding date: ${form.date}`, form.message].filter(Boolean);
    window.open(whatsappLink(lines.join("\n")), "_blank", "noopener");
  };
  return (
    <section id="contact" className="section-dark scroll-mt-16">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 md:grid-cols-2">
        <div>
          <span className="eyebrow text-gold">Let's begin</span>
          <h2 className="mt-3 text-4xl md:text-5xl">Found the one? Let's make it yours.</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="gold" size="lg"><a href={whatsappLink()} target="_blank" rel="noreferrer">WhatsApp us</a></Button>
            <Button asChild variant="ghostLight" size="lg"><a href={site.instagram} target="_blank" rel="noreferrer">Instagram</a></Button>
            <Button asChild variant="ghostLight" size="lg"><a href={`mailto:${site.email}`}>Email</a></Button>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-background p-7 text-foreground">
          <Input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Your name" />
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-label="Wedding date" />
          <select value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} aria-label="Design"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
            <option value="">Which design? (optional)</option>
            {templates.map((t) => <option key={t.slug} value={t.slug}>{t.name} — {tierLabel[t.tier]}</option>)}
          </select>
          <Textarea placeholder="Anything else?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} aria-label="Message" />
          <Button type="submit" className="w-full" size="lg">Send on WhatsApp</Button>
        </form>
      </div>
    </section>
  );
}
