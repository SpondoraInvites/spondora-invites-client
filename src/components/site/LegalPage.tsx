export function LegalPage({ title, sections }: { title: string; sections: { h: string; p: string }[] }) {
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-20">
      <span className="eyebrow text-primary">Legal</span>
      <h1 className="mt-3 text-4xl text-primary">{title}</h1>
      <p className="mt-3 text-xs text-muted-foreground">Starter draft — to be reviewed before launch.</p>
      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-xl text-primary">{s.h}</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">{s.p}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
