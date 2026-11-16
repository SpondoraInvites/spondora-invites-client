/**
 * The one field list shared by every template (WT-23).
 *
 * `path` points into a template's canonical INVITE_CONFIG. A `bilingual` field
 * carries the same path into INVITE_TRANSLATIONS[locale], so one Bangla input
 * covers it. Which fields a given template shows is derived at sync time by
 * walking `path` against that template's defaults — never hand-written per
 * template.
 *
 * Single-valued (no Bangla input, WT-23 §2): eventDateTime, monogramInitials,
 * hashtag, venueMapQuery, rsvpWhatsapp, rsvpEmail, rsvpDeadline,
 * localizationEnabled. Each is a technical or brand value, and typing it twice
 * would create two sources of truth that can disagree.
 *
 * Derived values (initials, hashtag, dates, city) are computed by the resolver
 * from WT-25, never typed by hand.
 */

export const FIELD_TYPES = [
  "text",
  "textarea",
  "datetime",
  "date",
  "toggle",
  "group",
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
  type: FieldType;
  section?: string; // form grouping
  label?: string;
  hint?: string;
  options?: string[];

  /** Same path also exists in INVITE_TRANSLATIONS[locale]. */
  bilingual?: boolean;
  /** Must be non-empty in every language the invite publishes. */
  required?: boolean;
  /** Re-derives from the couple's names until the user edits it (WT-23 §3.5). */
  derived?: "initials" | "hashtag";
  /** Follows the primary value until this item is touched (WT-23 §3.5). */
  inherits?: true;

  /** `type: "group"` only. `itemFields[].path` is relative to one item. */
  itemLabel?: string;
  min?: number;
  max?: number;
  itemFields?: Field[];
}

export const CANONICAL_FIELDS: Field[] = [
  {
    id: "partner1Name",
    path: ["couple", "name1"],
    section: "Couple",
    label: "Partner 1 name",
    type: "text",
    bilingual: true,
    required: true,
  },
  {
    id: "partner2Name",
    path: ["couple", "name2"],
    section: "Couple",
    label: "Partner 2 name",
    type: "text",
    bilingual: true,
    required: true,
  },
  {
    id: "familyLine1",
    path: ["welcome", "parents1"],
    section: "Family",
    label: "Bride's family line",
    type: "text",
    bilingual: true,
    required: true,
  },
  {
    id: "familyLine2",
    path: ["welcome", "parents2"],
    section: "Family",
    label: "Groom's family line",
    type: "text",
    bilingual: true,
    required: true,
  },
  {
    id: "venueName",
    path: ["venue", "name"],
    section: "Where",
    label: "Venue name",
    type: "text",
    bilingual: true,
    required: true,
  },
  {
    id: "venueAddress",
    path: ["venue", "address"],
    section: "Where",
    label: "Address",
    type: "textarea",
    bilingual: true,
    required: true,
  },
  {
    id: "eventDateTime",
    path: ["weddingDateTime"],
    section: "When",
    label: "Wedding date & time",
    type: "datetime",
    bilingual: false, // single-valued: drives every derived date
    required: true,
  },
  {
    id: "venueMapQuery",
    path: ["venue", "mapQuery"],
    section: "Where",
    label: "Google Maps search",
    type: "text",
    hint: "Paste the venue name exactly as Google Maps knows it, coordinates, or a Plus Code.",
    bilingual: false, // single-valued: one search string, no Bangla form
    required: true,
  },
  {
    id: "rsvpWhatsapp",
    path: ["rsvp", "whatsapp"],
    section: "RSVP",
    label: "WhatsApp number",
    type: "tel",
    hint: "Include the country code, e.g. 8801353218337.",
    bilingual: false, // single-valued: a phone number has no Bangla form
    required: true,
  },
  {
    id: "rsvpEmail",
    path: ["rsvp", "email"],
    section: "RSVP",
    label: "Fallback email",
    type: "email",
    bilingual: false, // single-valued
    required: false,
  },
  {
    id: "rsvpDeadline",
    path: ["rsvp", "deadline"],
    section: "RSVP",
    label: "Reply by",
    type: "date",
    hint: "The whole day counts; replies close at midnight.",
    bilingual: false, // single-valued: the display string in both languages is derived
    required: true,
  },
  {
    id: "monogramInitials",
    path: ["couple", "initials"],
    section: "Couple",
    label: "Monogram letters",
    type: "text",
    bilingual: false, // single-valued
    derived: "initials",
    required: false,
    hint: "Used on the wax seal — 2–3 letters work best, e.g. S&Z",
  },
  {
    id: "hashtag",
    path: ["couple", "hashtag"],
    section: "Couple",
    label: "Hashtag",
    type: "text",
    bilingual: false, // single-valued
    derived: "hashtag",
    required: false,
    hint: "We add the # for you — type the words only, e.g. SumaiyaAndZayan",
  },
  {
    id: "localizationEnabled",
    path: ["localization", "enabled"],
    section: "Language",
    label: "Publish the Bangla version",
    type: "toggle",
    bilingual: false, // single-valued
    required: false,
  },
  {
    id: "events",
    path: ["events"],
    section: "Events",
    label: "Events",
    type: "group",
    bilingual: true,
    itemLabel: "Event",
    min: 1,
    max: 4,
    itemFields: [
      {
        id: "tag",
        path: ["tag"],
        label: "Tag",
        type: "text",
        bilingual: true,
        required: true,
      },
      {
        id: "name",
        path: ["name"],
        label: "Event name",
        type: "text",
        bilingual: true,
        required: true,
      },
      {
        id: "dateTime",
        path: ["calStart"], // the input is a local datetime; cal* and date/time are derived
        label: "Date & time",
        type: "datetime",
        inherits: true,
      },
      {
        id: "venueName",
        path: ["venue"],
        label: "Venue",
        type: "text",
        bilingual: true,
        inherits: true,
      },
      {
        id: "venueAddress",
        path: ["address"],
        label: "Address",
        type: "textarea",
        bilingual: true,
        inherits: true,
      },
      {
        id: "mapQuery",
        path: ["mapQuery"],
        label: "Google Maps search",
        type: "text",
        inherits: true,
      },
    ],
  },
];
