/**
 * Derivation helpers (WT-25). The contract is WT-23 §3.
 *
 * Pure functions only: no React, no DOM, no fetch, no clock. A wrong offset
 * breaks every calendar link and a wrong month breaks the hero, so all of it
 * lives here where it can be tested directly and nothing is guessed twice.
 *
 * The offset always comes from the template (or the invite being edited). We
 * never ask `Intl` for it and never go through `toISOString()`: a 6 PM Dhaka
 * wedding would come back as 12 PM UTC and the couple would see the wrong hour.
 */

export interface DateTimeContext {
  timeZone: string; // "Asia/Dhaka"
  offset: string; // "+06:00", taken from the template, never recalculated
  previousCalEnd?: string; // "21:00" — keep the event's existing end when it still fits
}

export interface DerivedDateTime {
  iso: string; // "2027-02-12T18:00:00+06:00"
  calDate: string; // "2027-02-12"
  calStart: string; // "18:00"
  calEnd: string; // "21:00"
  dateEn: string; // "Friday, 12 February 2027"
  timeEn: string; // "6:00 PM"
  dateBn: string; // "শুক্রবার, ১২ ফেব্রুয়ারি, ২০২৭"
  timeBn: string; // "সন্ধ্যা ৬:০০"
}

export interface DerivedRsvpDeadline {
  deadlineEn: string; // "25 January 2027"
  deadlineBn: string; // "২৫ জানুয়ারি, ২০২৭"
  endOfDay: string; // "2027-01-25T23:59:00+06:00"
}

/** Bangla part of day, by 24-hour hour. `Intl` gives the numerals but not this. */
function banglaDayPart(hour: number): string {
  if (hour >= 20 || hour < 5) return "রাত";
  if (hour < 12) return "সকাল";
  if (hour < 16) return "দুপুর";
  if (hour < 18) return "বিকেল";
  return "সন্ধ্যা";
}

/**
 * One date string, in either language. bn-BD adds a comma before the year.
 * `weekday` is only ever on for the event date, never for the RSVP deadline.
 */
function displayDate(
  iso: string,
  timeZone: string,
  locale: "en-GB" | "bn-BD",
  weekday = false,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    ...(weekday ? { weekday: "long" as const } : {}),
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** `calStart` + 3 h, clamped to 23:59 so the calendar link stays inside one day. */
function defaultCalEnd(calStart: string): string {
  const [h = 0, m = 0] = calStart.split(":").map(Number);
  const minutes = h * 60 + m + 180;
  if (minutes >= 24 * 60) return "23:59";
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function deriveDateTime(local: string, ctx: DateTimeContext): DerivedDateTime {
  const calDate = local.slice(0, 10); // "2027-02-12"
  const calStart = local.slice(11, 16); // "18:00"
  const iso = `${calDate}T${calStart}:00${ctx.offset}`;
  const hour = Number(calStart.slice(0, 2));

  // A template's old calEnd is kept when it is still after the new start;
  // otherwise the event gets the standard three hours.
  const calEnd =
    ctx.previousCalEnd && ctx.previousCalEnd > calStart
      ? ctx.previousCalEnd
      : defaultCalEnd(calStart);

  // bn-BD 12-hour output is "৬:০০ PM"; the part of day replaces the AM/PM.
  const numeralsBn = new Intl.DateTimeFormat("bn-BD", {
    timeZone: ctx.timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(new Date(iso))
    .replace(/\s*[AP]M\s*$/i, "")
    .trim();

  return {
    iso,
    calDate,
    calStart,
    calEnd,
    dateEn: displayDate(iso, ctx.timeZone, "en-GB", true),
    // en-GB renders 12-hour time as "6:00 pm"; the templates print "6:00 PM".
    timeEn: new Intl.DateTimeFormat("en-US", {
      timeZone: ctx.timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso)),
    dateBn: displayDate(iso, ctx.timeZone, "bn-BD", true),
    timeBn: `${banglaDayPart(hour)} ${numeralsBn}`,
  };
}

export function deriveRsvpDeadline(
  date: string,
  ctx: Pick<DateTimeContext, "timeZone" | "offset">,
): DerivedRsvpDeadline {
  // Noon, so the picked day survives being formatted in the template's zone.
  const iso = `${date}T12:00:00${ctx.offset}`;
  return {
    deadlineEn: displayDate(iso, ctx.timeZone, "en-GB"),
    deadlineBn: displayDate(iso, ctx.timeZone, "bn-BD"),
    endOfDay: `${date}T23:59:00${ctx.offset}`,
  };
}

/**
 * The reverse trip for pre-filling `<input type="datetime-local">`.
 * The stored ISO already carries local wall-clock time plus the offset, so the
 * first 16 characters are the answer — no conversion, by design.
 */
export function isoToLocal(iso: string): string {
  return iso.slice(0, 16);
}

/** First Latin letter of the name, skipping leading punctuation ("Md. Rafi" → "M"). */
function firstLetter(name: string): string {
  return (
    name
      .trim()
      .match(/\p{Script=Latin}/u)?.[0]
      .toUpperCase() ?? ""
  );
}

/** The separator the template already uses in its initials: "S&Z" → "&". */
function initialsSeparator(templateDefault: string): string {
  // Everything between the first and last letter, so "A · I" keeps " · ".
  const inner = templateDefault
    .trim()
    .replace(/^\p{L}/u, "")
    .replace(/\p{L}$/u, "");
  return inner && !/\p{L}/u.test(inner) ? inner : "&";
}

export function deriveInitials(name1: string, name2: string, templateDefault: string): string {
  const a = firstLetter(name1);
  const b = firstLetter(name2);
  // Blank name: the caller keeps the template's own initials.
  if (!a || !b) return "";
  return `${a}${initialsSeparator(templateDefault)}${b}`;
}

function pascalFirstWord(name: string): string {
  const word = name.trim().split(/\s+/)[0] ?? "";
  const stripped = word
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // Zoë → Zoe
    .replace(/[^\p{L}\p{N}]/gu, "");
  if (!stripped) return "";
  return stripped.charAt(0).toUpperCase() + stripped.slice(1).toLowerCase();
}

export function deriveHashtag(name1: string, name2: string): string {
  const a = pascalFirstWord(name1);
  const b = pascalFirstWord(name2);
  if (!a || !b) return "";
  return `#${a}And${b}`;
}

const COUNTRIES = new Set([
  "bangladesh",
  "বাংলাদেশ",
  "india",
  "ভারত",
  "pakistan",
  "nepal",
  "sri lanka",
  "singapore",
  "malaysia",
  "uae",
  "united arab emirates",
  "saudi arabia",
  "qatar",
  "usa",
  "united states",
  "uk",
  "united kingdom",
  "canada",
  "australia",
]);

export function deriveCity(address: string): string {
  const segments = address
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // Fewer than two segments means nobody wrote a city; keep the template's.
  if (segments.length < 2) return "";

  // shortcut: only COUNTRIES is recognised as a trailing country, extend the
  // list when a couple's address ends in a country it does not name.
  const last = segments.at(-1) ?? "";
  const country = COUNTRIES.has(last.toLowerCase());
  const city = country ? (segments.at(-2) ?? "") : last;

  // Strip a trailing token that carries digits: "Dhaka 1212", "Dhaka-1212",
  // "London NW1", "ঢাকা ১২১২". A city name has no digits in it.
  return city.replace(/\s*[-–—]?\s*[\p{L}]*[\d\u09E6-\u09EF][\p{L}\d\u09E6-\u09EF]*$/u, "").trim();
}
