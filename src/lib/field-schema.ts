/**
 * What each field accepts (WT-14a §3).
 *
 * Validation never blocks the preview: the couple sees what they typed either way, so
 * these rules only decide what the form says under the input.
 */
import { z } from "zod";
import type { Field, FieldType } from "@/lib/canonical-fields";

const MESSAGES = {
  required: "This is required.",
  tel: "Enter 8–15 digits, including the country code.",
  email: "Enter a valid email address.",
  monogram: "Use Latin letters, & · . ' - and spaces, 1–8 characters.",
} as const;

export const MONOGRAM_MAX = 8;

/** Latin letters plus the separators a wax seal can carry. A Bengali entry is rejected, not drawn. */
const MONOGRAM_PATTERN = new RegExp(`^[\\p{Script=Latin}&·.'\\- ]{1,${MONOGRAM_MAX}}$`, "u");

/** Format per type. Required is separate, because an optional field may be cleared. */
const FORMAT: Partial<Record<FieldType, z.ZodTypeAny>> = {
  tel: z.string().refine((value) => /^\d{8,15}$/.test(normaliseTel(value)), MESSAGES.tel),
  email: z.string().email(MESSAGES.email),
};

const MONOGRAM = z
  .string()
  .trim()
  .refine((value) => MONOGRAM_PATTERN.test(value), MESSAGES.monogram);

/** Digits only, so "+880 1353-218337" and "8801353218337" are the same number. */
export function normaliseTel(value: string): string {
  return value.replace(/\D/g, "");
}

/** Trim the ends only: the inner spacing of "A · I" is the template's own. */
export function normaliseMonogram(value: string): string {
  return value.trim();
}

/** Exactly one leading "#", or empty. Extra "#"s are dropped so the tag still reads as one. */
export function normaliseHashtag(value: string): string {
  const words = value.replace(/^#+/, "");
  return words === "" ? "" : `#${words}`;
}

/** The value the form keeps for what was just typed. */
export function normaliseValue(field: Field, raw: string): string {
  if (field.type === "tel") return normaliseTel(raw);
  if (field.derived === "hashtag") return normaliseHashtag(raw);
  return raw;
}

/** The error for one field, or undefined when it is valid. An empty optional field is valid. */
export function validateField(field: Field, raw: string): string | undefined {
  if (raw.trim() === "") return field.required ? MESSAGES.required : undefined;

  const format = field.derived === "initials" ? MONOGRAM : FORMAT[field.type];
  if (!format) return undefined;

  const result = format.safeParse(raw);
  return result.success ? undefined : result.error.issues[0]?.message;
}
