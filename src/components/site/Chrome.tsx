import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Instagram, Facebook, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { site, whatsappLink } from "@/data/site";

const nav = [
  { href: "/#invites", label: "Invites" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center" aria-label="Spondora Invites home">
      <img
        src="/logo-lockup.png"
        alt="Spondora Invites"
        width={158}
        height={103}
        className={`w-auto object-contain ${light ? "h-14" : "h-12"}`}
      />
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4">Skip to content</a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">{n.label}</a>
          ))}
          <Button asChild size="sm"><a href={whatsappLink()} target="_blank" rel="noreferrer">Order on WhatsApp</a></Button>
        </nav>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-border bg-background px-5 py-4 md:hidden" aria-label="Mobile">
          {nav.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="block py-3 font-display text-lg text-primary">{n.label}</a>
          ))}
          <Button asChild className="mt-3 w-full"><a href={whatsappLink()} target="_blank" rel="noreferrer">Order on WhatsApp</a></Button>
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="section-dark">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-4 font-display italic text-gold">{site.tagline}</p>
        </div>
        <nav className="grid grid-cols-2 gap-2 text-sm text-ivory/80" aria-label="Footer">
          {nav.map((n) => <a key={n.href} href={n.href} className="hover:text-gold">{n.label}</a>)}
          <Link to="/terms" className="hover:text-gold">Terms</Link>
          <Link to="/privacy" className="hover:text-gold">Privacy</Link>
          <Link to="/refund-policy" className="hover:text-gold">Refund policy</Link>
        </nav>
        <div className="flex items-start gap-3 md:justify-end">
          <a href={site.instagram} aria-label="Instagram" className="rounded-full border border-gold/40 p-2.5 text-gold hover:bg-gold hover:text-primary"><Instagram className="h-4 w-4" /></a>
          <a href={site.facebook} aria-label="Facebook" className="rounded-full border border-gold/40 p-2.5 text-gold hover:bg-gold hover:text-primary"><Facebook className="h-4 w-4" /></a>
          <a href={`mailto:${site.email}`} aria-label="Email" className="rounded-full border border-gold/40 p-2.5 text-gold hover:bg-gold hover:text-primary"><Mail className="h-4 w-4" /></a>
        </div>
      </div>
      <div className="border-t border-gold/20 py-5 text-center text-xs text-ivory/60">© {new Date().getFullYear()} Spondora Invites · {site.email}</div>
    </footer>
  );
}
