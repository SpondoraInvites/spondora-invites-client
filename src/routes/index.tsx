import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Hero, HowItWorks, Pricing, WhySpondora, Faq, Contact } from "@/components/site/Sections";
import { Invites } from "@/components/site/Invites";
import type { Tier } from "@/data/templates";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spondora Invites — Digital Interactive Wedding Invitations" },
      { name: "description", content: "Premium interactive wedding invitations for Bangladesh. Preview live designs, see pricing and order on WhatsApp." },
      { property: "og:title", content: "Spondora Invites — Your wedding, beautifully invited." },
      { property: "og:description", content: "Interactive wedding invites with music, RSVP, maps and countdown. One link, every detail." },
    ],
  }),
  component: Index,
});

function Index() {
  const [filter, setFilter] = useState<"all" | Tier>("all");
  return (
    <>
      <Hero />
      <Invites filter={filter} setFilter={setFilter} />
      <HowItWorks />
      <Pricing onSeeTier={(t) => { setFilter(t); document.getElementById("invites")?.scrollIntoView(); }} />
      <WhySpondora />
      <Faq />
      <Contact />
    </>
  );
}
