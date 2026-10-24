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
    previewUrl: "https://template1-luxury.pages.dev/",
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
    previewUrl: "https://template2-luxury.pages.dev/",
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
    previewUrl: "https://template1-standard.pages.dev/",
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
    previewUrl: "https://template3-premium.pages.dev/",
    cover: "/images/templates/template-3-premium.jpg",
    description: "Formal burgundy with bride & groom profiles and an evening programme.",
    features: ["Couple profiles", "Order of the evening", "Countdown", "RSVP"],
    languages: ["en"],
    sortOrder: 4,
  },
  {
    slug: "template3-standard",
    name: "Terracotta Botanical",
    tier: "standard",
    tags: ["cream", "floral", "envelope"],
    previewUrl: "https://template3-standard.pages.dev/",
    cover: "/images/templates/template3-standard.jpg",
    description: "Cream paper, terracotta botanicals and falling petals.",
    features: ["Sealed-envelope reveal", "Nature sounds", "Story timeline", "Countdown", "RSVP"],
    languages: ["en"],
    sortOrder: 5,
  },
  {
    slug: "template4-premium",
    name: "Maroon Monogram",
    tier: "premium",
    tags: ["maroon", "gold", "monogram"],
    previewUrl: "https://template4-premium.pages.dev/",
    cover: "/images/templates/template4-premium.jpg",
    description:
      "A deep maroon envelope and gold wax seal, for a faceless monogram couple and a two-day Nikah & Walima.",
    features: [
      "Tap-seal opening",
      "Monogram couple",
      "Order of the day",
      "Countdown",
      "Add to Calendar",
      "EN / বাং",
    ],
    languages: ["en", "bn"],
    sortOrder: 6,
  },
  {
    slug: "template2-standard",
    name: "Emerald Arch",
    tier: "standard",
    tags: ["emerald", "gold", "arch"],
    previewUrl: "https://spondora-template2-standard.vercel.app/",
    cover: "/images/templates/template2-standard.jpg",
    description: "Emerald and gold with a Moorish arch hero, family welcome and one-tap share.",
    features: [
      "Wax-seal monogram",
      "Family welcome",
      "Countdown",
      "Venue map",
      "Add to Calendar",
      "EN / বাং",
    ],
    languages: ["en", "bn"],
    sortOrder: 7,
  },
  {
    slug: "template1-standard",
    name: "Rosewood Blush",
    tier: "standard",
    tags: ["rosewood", "wine", "rose gold"],
    previewUrl: "https://template1-standard.pages.dev/",
    cover: "/images/templates/template1-standard.jpg",
    description:
      "Romantic rosewood — blush paper, deep wine and rose gold — with a wax-sealed envelope intro and a photo gallery.",
    features: [
      "Envelope intro",
      "Our story timeline",
      "Photo gallery",
      "RSVP",
      "Background music",
      "EN / বাং",
    ],
    languages: ["en", "bn"],
    sortOrder: 8,
  },
  {
    slug: "template5-premium",
    name: "Navy Blossom",
    tier: "premium",
    tags: ["navy", "ivory", "floral"],
    previewUrl: "https://template5-premium.pages.dev/",
    cover: "/images/templates/template5-premium.jpg",
    description:
      "Navy and ivory with a cinematic monogram opening, delicate florals and an English / বাংলা toggle.",
    features: [
      "Tap-to-open intro",
      "Our story timeline",
      "Photo gallery",
      "Countdown",
      "WhatsApp RSVP",
      "EN / বাং",
    ],
    languages: ["en", "bn"],
    sortOrder: 9,
  },
  {
    slug: "template6-luxury",
    name: "Plum Night & Rose Gold",
    tier: "luxury",
    tags: ["plum", "rose gold", "art deco"],
    previewUrl: "https://template-6-luxury.spondorainvites.com/",
    cover: "/images/templates/template6-luxury.jpg",
    description:
      "Deep plum velvet and rose-gold art deco — a cinematic tap-to-open cover over a pearl, blush-tinted site with scroll choreography throughout.",
    features: [
      "Cinematic cover reveal",
      "Our story timeline",
      "Countdown",
      "Photo gallery",
      "WhatsApp RSVP",
      "Background music",
    ],
    languages: ["en"],
    sortOrder: 10,
  },
].sort((a, b) => a.sortOrder - b.sortOrder) as InviteTemplate[];

export const tierLabel: Record<Tier, string> = {
  standard: "Standard",
  premium: "Premium",
  luxury: "Luxury",
};

export const getTemplate = (slug: string) => templates.find((t) => t.slug === slug);
