import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Spondora Invites" },
      { name: "description", content: "When and how refunds work for Spondora digital wedding invitations." },
      { property: "og:title", content: "Refund Policy — Spondora Invites" },
      { property: "og:description", content: "Refunds for Spondora digital invitations." },
    ],
  }),
  component: () => (
    <LegalPage title="Refund Policy" sections={[
      { h: "Before work begins", p: "Full refund if you cancel before we start personalising your invitation." },
      { h: "After the first draft", p: "Because the work is custom, payments are non-refundable once your first draft is delivered." },
      { h: "How to request", p: "Message us on WhatsApp or email with your order details." },
    ]} />
  ),
});
