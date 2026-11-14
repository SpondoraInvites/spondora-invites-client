/**
 * The one field list shared by every template (WT-1 §2).
 *
 * `path` points into a template's canonical INVITE_CONFIG. Which fields a given
 * template actually shows is derived at sync time by walking `path` against that
 * template's defaults — never hand-written per template.
 */

export const FIELD_TYPES = [
  "text",
  "textarea",
  "datetime",
  "select",
  "tel",
  "email",
  "url",
  "image",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export interface Field {
  id: string; // stable name for the stored draft
  path: string[]; // canonical location inside INVITE_CONFIG
  section: string; // form grouping
  label: string;
  type: FieldType;
  hint?: string;
  options?: string[];
}

export const CANONICAL_FIELDS: Field[] = [
  {
    id: "partner1Name",
    path: ["couple", "name1"],
    section: "Couple",
    label: "Partner 1 name",
    type: "text",
  },
  {
    id: "partner2Name",
    path: ["couple", "name2"],
    section: "Couple",
    label: "Partner 2 name",
    type: "text",
  },
  {
    id: "monogramInitials",
    path: ["couple", "initials"],
    section: "Couple",
    label: "Monogram letters",
    type: "text",
  },
  { id: "hashtag", path: ["couple", "hashtag"], section: "Couple", label: "Hashtag", type: "text" },
  {
    id: "weddingDateTime",
    path: ["weddingDateTime"],
    section: "When",
    label: "Wedding date & time",
    type: "datetime",
  },
  {
    id: "dateDisplay",
    path: ["dateDisplay"],
    section: "When",
    label: "Date as written on the invite",
    type: "text",
  },
  { id: "city", path: ["city"], section: "When", label: "City", type: "text" },
  { id: "venueName", path: ["venue", "name"], section: "Where", label: "Venue name", type: "text" },
  {
    id: "venueAddress",
    path: ["venue", "address"],
    section: "Where",
    label: "Address",
    type: "text",
  },
  {
    id: "venueMapQuery",
    path: ["venue", "mapQuery"],
    section: "Where",
    label: "Google Maps search",
    type: "text",
    hint: "Paste the venue name exactly as Google Maps knows it, or coordinates.",
  },
  {
    id: "familyLine1",
    path: ["welcome", "parents1"],
    section: "Family",
    label: "Bride's family line",
    type: "text",
  },
  {
    id: "familyLine2",
    path: ["welcome", "parents2"],
    section: "Family",
    label: "Groom's family line",
    type: "text",
  },
  {
    id: "welcomeLine",
    path: ["welcome", "inviteLine"],
    section: "Family",
    label: "Invitation paragraph",
    type: "textarea",
  },
  { id: "blessing", path: ["blessing"], section: "Words", label: "Blessing", type: "textarea" },
  { id: "closingLine", path: ["closing"], section: "Words", label: "Closing line", type: "text" },
  {
    id: "creditLine",
    path: ["credit"],
    section: "Words",
    label: "Footer credit",
    type: "text",
    hint: "Leave empty to remove the studio credit.",
  },
  {
    id: "rsvpWhatsapp",
    path: ["rsvp", "whatsapp"],
    section: "RSVP",
    label: "WhatsApp number",
    type: "tel",
    hint: "Digits only, international format, no + or dashes.",
  },
  {
    id: "rsvpEmail",
    path: ["rsvp", "email"],
    section: "RSVP",
    label: "Fallback email",
    type: "email",
  },
  {
    id: "rsvpDeadline",
    path: ["rsvp", "deadline"],
    section: "RSVP",
    label: "Reply by",
    type: "text",
  },
  { id: "theme", path: ["theme"], section: "Style", label: "Colour theme", type: "select" },
  {
    id: "language",
    path: ["localization", "default"],
    section: "Style",
    label: "First language shown",
    type: "select",
    options: ["en", "bn"],
  },
  {
    id: "heroPhoto",
    path: ["heroPhoto", "src"],
    section: "Photos",
    label: "Main couple photo",
    type: "image",
  },
];
