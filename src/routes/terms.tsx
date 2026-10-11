import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Spondora Invites" },
      { name: "description", content: "The terms for ordering a digital wedding invitation from Spondora Invites." },
      { property: "og:title", content: "Terms of Service — Spondora Invites" },
      { property: "og:description", content: "The terms for ordering a Spondora digital invitation." },
    ],
  }),
  component: () => (
    <LegalPage title="Terms of Service" sections={[
      { h: "Orders", p: "An order is confirmed once we receive your details and payment. We then personalise your chosen design." },
      { h: "Revisions", p: "Small corrections are included after the first draft. Larger design changes may carry an extra fee." },
      { h: "Your content", p: "You confirm you have the right to use the names, photos and music you send us." },
      { h: "Link availability", p: "Your invitation link stays live for at least 12 months after the wedding date." },
    ]} />
  ),
});
