export const site = {
  name: "Spondora Invites",
  tagline: "Your wedding, beautifully invited.",
  secondary: "More than an invitation. A wedding experience.",
  whatsapp: "8801353218337",
  email: "hello@spondora.com",
  instagram: "https://www.instagram.com/spondora_invites/",
  facebook: "https://www.facebook.com/profile.php?id=61594435060189",
};

export const steps = [
  { title: "Choose your design", body: "Preview any invite live, right here on the site." },
  { title: "Share your details", body: "Names, photos, events and venue — over WhatsApp or the form." },
  { title: "We personalise it", body: "Our team builds your invite and sends a first draft within 2–3 days." },
  { title: "Review & share", body: "Approve it, then send one link to every guest." },
];

export const needFromYou = [
  "Couple's & parents' names",
  "Date and time of each event",
  "Venue + Google Maps link",
  "A few photos",
  "Your story (optional)",
  "Language: English, বাংলা or both",
];

export const faqs = [
  { q: "How long does delivery take?", a: "Your first draft usually arrives within 2–3 working days after we receive all your details." },
  { q: "What do I need to send?", a: "Names, event dates and times, venue and map link, and a few photos. We'll guide you on WhatsApp." },
  { q: "How many guests can I share with?", a: "Unlimited. It's one link — share it on WhatsApp, Messenger, SMS or anywhere." },
  { q: "Can I change details after approval?", a: "Yes, small corrections are included. Larger changes may carry a small fee." },
  { q: "How long does my link stay live?", a: "Your invitation stays live for at least 12 months after the wedding." },
  { q: "Can guests RSVP, and do I get the replies?", a: "Yes. Premium and Luxury include RSVP; reply delivery to WhatsApp or email is available as an add-on." },
  { q: "Can I add my own music?", a: "No. We don't use client-chosen songs or any instruments. Sound on every invite is limited to nature sounds or halal, instrument-free nasheeds. Guests tap to start it." },
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
