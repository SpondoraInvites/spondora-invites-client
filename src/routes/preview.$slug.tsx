import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { getTemplate, templates } from "@/data/templates";
import { PreviewFrame } from "@/components/site/PreviewFrame";

export const Route = createFileRoute("/preview/$slug")({
  loader: ({ params }) => {
    const template = getTemplate(params.slug);
    if (!template) throw notFound();
    return { template };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Design not found — Spondora" }, { name: "robots", content: "noindex" }] };
    const t = loaderData.template;
    return {
      meta: [
        { title: `${t.name} — Live preview | Spondora Invites` },
        { name: "description", content: t.description },
        { property: "og:title", content: `${t.name} wedding invitation — Spondora` },
        { property: "og:description", content: t.description },
      ],
    };
  },
  component: PreviewPage,
});

function PreviewPage() {
  const { template } = Route.useLoaderData();
  const navigate = useNavigate();
  const idx = templates.indexOf(template);
  const go = (d: number) => navigate({ to: "/preview/$slug", params: { slug: templates[(idx + d + templates.length) % templates.length]!.slug } });
  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/" hash="invites" className="mb-6 inline-flex items-center gap-2 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> All invites</Link>
      <PreviewFrame template={template} onPrev={() => go(-1)} onNext={() => go(1)} />
    </main>
  );
}
