export type Tier = "standard" | "premium" | "luxury";

export interface InviteTemplate {
  slug: string;
  name: string; // working name — confirm with owner
  tier: Tier;
  tags: string[];
  previewUrl: string;
  cover: string;
  description: string;
  features: string[];
  languages: ("en" | "bn")[];
  sortOrder: number;
}

export const templates: InviteTemplate[] = [
  {
    slug: "template1-luxury",
    name: "Noir & Gold",
    tier: "luxury",
    tags: ["dark", "gold", "cinematic"],
    previewUrl: "https://spondora-template1-luxury.netlify.app/",
    cover: "/images/templates/template1-luxury.jpg",
    description: "Near-black and gold, cinematic from the very first frame.",
    features: ["Bismillah intro", "Our story", "Multi-evening events", "Gallery", "Multi-event RSVP"],
    languages: ["en"],
    sortOrder: 1,
  },
  {
    slug: "template2-luxury",
    name: "Ivory Garden",
    tier: "luxury",
    tags: ["ivory", "garden", "light"],
    previewUrl: "https://spondora-template2-luxury.netlify.app/",
    cover: "/images/templates/template2-luxury.jpg",
    description: "Soft ivory and a garden canopy, with an English / বাংলা toggle.",
    features: ["Bismillah intro", "Our story", "Gallery", "Venue map", "EN / বাং"],
    languages: ["en", "bn"],
    sortOrder: 2,
  },
  {
    slug: "template2-premium",
    name: "Wine Seal",
    tier: "premium",
    tags: ["wine", "wax seal", "envelope"],
    previewUrl: "https://spondora-template2-premium.netlify.app/",
    cover: "/images/templates/template2-premium.jpg",
    description: "A deep wine envelope that opens with a tap of the wax seal.",
    features: ["Tap-seal opening", "Countdown", "Venue map", "Add to Calendar", "EN / বাং"],
    languages: ["en", "bn"],
    sortOrder: 3,
  },
  {
    slug: "template-3-premium",
    name: "Burgundy Heirloom",
    tier: "premium",
    tags: ["burgundy", "formal", "classic"],
    previewUrl: "https://spondora-template-3-premium.netlify.app/",
    cover: "/images/templates/template-3-premium.jpg",
    description: "Formal burgundy with bride & groom profiles and an evening programme.",
    features: ["Couple profiles", "Order of the evening", "Countdown", "RSVP + song request"],
    languages: ["en"],
    sortOrder: 4,
  },
  {
    slug: "template3-standard",
    name: "Terracotta Botanical",
    tier: "standard",
    tags: ["cream", "floral", "envelope"],
    previewUrl: "https://spondora-template3-standard.netlify.app/",
    cover: "/images/templates/template3-standard.jpg",
    description: "Cream paper, terracotta botanicals and falling petals.",
    features: ["Sealed-envelope reveal", "Music box", "Story timeline", "Countdown", "RSVP"],
    languages: ["en"],
    sortOrder: 5,
  },
].sort((a, b) => a.sortOrder - b.sortOrder) as InviteTemplate[];

export const tierLabel: Record<Tier, string> = {
  standard: "Standard",
  premium: "Premium",
  luxury: "Luxury",
};

export const getTemplate = (slug: string) => templates.find((t) => t.slug === slug);
