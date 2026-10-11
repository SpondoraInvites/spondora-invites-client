import type { Tier } from "./templates";

// PLACEHOLDER prices — confirm with owner. Every price on the site reads from here.
export const currency = { code: "BDT", symbol: "৳" };

export interface PricingTier {
  tier: Tier;
  name: string;
  price: number;
  tagline: string;
  popular?: boolean;
  features: string[];
}

export const tiers: PricingTier[] = [
  {
    tier: "standard",
    name: "Standard",
    price: 2500,
    tagline: "A beautiful, interactive invite with every essential.",
    features: ["Envelope opening", "Countdown & schedule", "Venue + map", "Background music", "Basic RSVP"],
  },
  {
    tier: "premium",
    name: "Premium",
    price: 4500,
    tagline: "Richer design, full RSVP and a Bangla/English toggle.",
    popular: true,
    features: ["Everything in Standard", "Wax-seal opening", "Full RSVP + song request", "Add to Calendar", "Bangla / English"],
  },
  {
    tier: "luxury",
    name: "Luxury",
    price: 7500,
    tagline: "The full cinematic experience for multi-day weddings.",
    features: ["Everything in Premium", "Cinematic intro", "Photo gallery", "Multi-event RSVP", "Our-story timeline"],
  },
];

export const comparison: { feature: string; values: Record<Tier, string | boolean> }[] = [
  { feature: "Interactive opening (envelope / seal)", values: { standard: true, premium: true, luxury: true } },
  { feature: "Countdown, schedule, venue + map", values: { standard: true, premium: true, luxury: true } },
  { feature: "Add to Calendar", values: { standard: true, premium: true, luxury: true } },
  { feature: "Background music", values: { standard: true, premium: true, luxury: true } },
  { feature: "RSVP", values: { standard: "Basic", premium: true, luxury: "Multi-event" } },
  { feature: "Our-story timeline", values: { standard: true, premium: false, luxury: true } },
  { feature: "Photo gallery", values: { standard: false, premium: false, luxury: true } },
  { feature: "Bangla / English toggle", values: { standard: false, premium: true, luxury: true } },
];

export const addOns = [
  { name: "Express delivery", price: 1000 },
  { name: "Extra language", price: 800 },
  { name: "RSVP replies to WhatsApp / email", price: 1200 },
  { name: "Extra event page", price: 700 },
];

export const formatPrice = (n: number) => `${currency.symbol}${n.toLocaleString("en-US")}`;
