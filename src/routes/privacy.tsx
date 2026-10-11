import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Spondora Invites" },
      { name: "description", content: "How Spondora Invites handles the personal details and photos you share." },
      { property: "og:title", content: "Privacy Policy — Spondora Invites" },
      { property: "og:description", content: "How we handle your wedding details and photos." },
    ],
  }),
  component: () => (
    <LegalPage title="Privacy Policy" sections={[
      { h: "What we collect", p: "Only the details needed to build your invitation: names, dates, venues, photos and contact info." },
      { h: "How we use it", p: "We use your details solely to create and host your invitation. We never sell your data." },
      { h: "Guest RSVPs", p: "RSVP information is shared only with the couple." },
      { h: "Removal", p: "Email us any time to remove your invitation and data." },
    ]} />
  ),
});
