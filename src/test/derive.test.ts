import { it } from "vitest";

// WT-23 §3 is the contract; the implementations and real assertions are WT-25.
// These are the expectations WT-25 has to satisfy, listed here so the contract
// does not get lost between tickets.

it.todo("deriveDateTime: builds ISO with the template offset, not UTC");
it.todo("deriveDateTime: keeps a negative offset (America/New_York, -05:00)");
it.todo("deriveDateTime: the offset passed in wins, even across DST");
it.todo("deriveDateTime: en date says February, bn date uses Bengali numerals and month");
it.todo("deriveDateTime: calDate/calStart/calEnd are YYYY-MM-DD and HH:MM");
it.todo("isoToLocal round-trips a deriveDateTime offset");
it.todo("dateDisplay follows the main event, never a range across events");
it.todo("deriveRsvpDeadline: both display strings, no weekday, end of day at 23:59");
it.todo("deriveInitials: keeps the template's separator, blank name returns empty");
it.todo("deriveHashtag: #PascalCaseAndPascalCase, letters and digits only");
it.todo("deriveCity: last comma segment without the postcode, Bangla addresses too");
