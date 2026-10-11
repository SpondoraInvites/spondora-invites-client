// PLACEHOLDER contact details — confirm WhatsApp number and Instagram handle.
export const site = {
  name: "Spondora Invites",
  tagline: "Your wedding, beautifully invited.",
  secondary: "More than an invitation. A wedding experience.",
  whatsapp: "8801700000000",
  email: "hello@spondora.com",
  instagram: "https://instagram.com/spondora.invites",
  facebook: "https://facebook.com/spondora.invites",
};

export const steps = [
  { title: "Choose your design", body: "Preview any invite live, right here on the site." },
  { title: "Share your details", body: "Names, photos, events, venue and music — over WhatsApp or the form." },
  { title: "We personalise it", body: "Our team builds your invite and sends a first draft within 2–3 days." },
  { title: "Review & share", body: "Approve it, then send one link to every guest." },
];

export const needFromYou = [
  "Couple's & parents' names",
  "Date and time of each event",
  "Venue + Google Maps link",
  "A few photos",
  "Your story (optional)",
  "A song you love",
  "Language: English, বাংলা or both",
];

export const faqs = [
  { q: "How long does delivery take?", a: "Your first draft usually arrives within 2–3 working days after we receive all your details." },
  { q: "What do I need to send?", a: "Names, event dates and times, venue and map link, a few photos and your song choice. We'll guide you on WhatsApp." },
  { q: "How many guests can I share with?", a: "Unlimited. It's one link — share it on WhatsApp, Messenger, SMS or anywhere." },
  { q: "Can I change details after approval?", a: "Yes, small corrections are included. Larger changes may carry a small fee." },
  { q: "How long does my link stay live?", a: "Your invitation stays live for at least 12 months after the wedding." },
  { q: "Can guests RSVP, and do I get the replies?", a: "Yes. Premium and Luxury include RSVP; reply delivery to WhatsApp or email is available as an add-on." },
  { q: "Can I add music?", a: "Every invite includes background music. Guests tap to start it." },
  { q: "Do you do custom designs?", a: "Yes — message us on WhatsApp for a bespoke quote." },
  { q: "How do I pay?", a: "bKash, Nagad or bank transfer. We'll share details when you order." },
  { q: "What is your refund policy?", a: "See our refund policy page. In short: full refund before work begins." },
];

export function whatsappLink(message?: string) {
  const text = message ?? "Hi Spondora, I'd like to order a wedding invitation.";
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function orderMessage(templateName?: string, tierName?: string) {
  if (!templateName) return "Hi Spondora, I'd like to order a wedding invitation.";
  return `Hi Spondora, I'd like the *${templateName}*${tierName ? ` (${tierName})` : ""} invitation.`;
}
