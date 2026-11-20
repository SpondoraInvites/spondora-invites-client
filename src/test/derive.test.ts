import { describe, expect, it } from "vitest";
import {
  dateTargets,
  deriveCity,
  deriveDateTime,
  deriveHashtag,
  deriveInitials,
  deriveRsvpDeadline,
  displayDateToIso,
  isoToLocal,
  rsvpDeadlineTargets,
} from "@/lib/derive";
import { setAtPath } from "@/lib/fields";

// WT-23 §3 is the contract. Every expectation below is quoted from it.
const dhaka = { timeZone: "Asia/Dhaka", offset: "+06:00" };

describe("deriveDateTime", () => {
  it("builds ISO with the template offset, not UTC", () => {
    const d = deriveDateTime("2027-02-12T18:00", dhaka);
    expect(d.iso).toBe("2027-02-12T18:00:00+06:00");
    expect(d.iso.endsWith("+06:00")).toBe(true);
    expect(d.calDate).toBe("2027-02-12");
    expect(d.calStart).toBe("18:00");
    expect(d.calEnd).toBe("21:00");
    expect(d.timeEn).toBe("6:00 PM");
    expect(d.timeBn).toBe("সন্ধ্যা ৬:০০");
  });

  it("keeps a negative offset (America/New_York, -05:00)", () => {
    const d = deriveDateTime("2027-02-12T18:00", {
      timeZone: "America/New_York",
      offset: "-05:00",
    });
    expect(d.iso).toBe("2027-02-12T18:00:00-05:00");
    expect(d.calStart).toBe("18:00");
    expect(d.timeEn).toBe("6:00 PM");
  });

  it("lets the offset passed in win, even across a DST boundary", () => {
    // US DST starts 14 March 2027: -05:00 before, -04:00 after. The function
    // must not recalculate either from the zone name.
    const winter = deriveDateTime("2027-03-13T18:00", {
      timeZone: "America/New_York",
      offset: "-05:00",
    });
    const summer = deriveDateTime("2027-03-15T18:00", {
      timeZone: "America/New_York",
      offset: "-04:00",
    });
    expect(winter.iso).toBe("2027-03-13T18:00:00-05:00");
    expect(summer.iso).toBe("2027-03-15T18:00:00-04:00");
    expect(winter.calStart).toBe("18:00");
    expect(summer.calStart).toBe("18:00");
    expect(winter.timeEn).toBe("6:00 PM");
    expect(summer.timeEn).toBe("6:00 PM");
  });

  it("renders February in English and Bengali numerals plus month in Bangla", () => {
    const d = deriveDateTime("2027-02-12T18:00", dhaka);
    expect(d.dateEn).toBe("Friday, 12 February 2027");
    expect(d.dateBn).toContain("১২");
    expect(d.dateBn).toContain("ফেব্রুয়ারি");
    expect(d.dateBn).toContain("শুক্রবার");
  });

  it("keeps an existing calEnd when it is still after the start", () => {
    const d = deriveDateTime("2027-02-12T18:00", { ...dhaka, previousCalEnd: "22:30" });
    expect(d.calEnd).toBe("22:30");
  });

  it("ignores an existing calEnd that no longer fits and clamps past midnight", () => {
    expect(deriveDateTime("2027-02-12T18:00", { ...dhaka, previousCalEnd: "17:00" }).calEnd).toBe(
      "21:00",
    );
    // 22:00 + 3 h would be the next day; the calendar link stays single-day.
    expect(deriveDateTime("2027-02-12T22:00", dhaka).calEnd).toBe("23:59");
  });

  it("maps the hour to the Bangla part of day", () => {
    const timeBn = (local: string) => deriveDateTime(local, dhaka).timeBn;
    expect(timeBn("2027-02-12T09:00")).toBe("সকাল ৯:০০");
    expect(timeBn("2027-02-12T13:00")).toBe("দুপুর ১:০০");
    expect(timeBn("2027-02-12T17:00")).toBe("বিকেল ৫:০০");
    expect(timeBn("2027-02-12T19:00")).toBe("সন্ধ্যা ৭:০০");
    expect(timeBn("2027-02-12T23:00")).toBe("রাত ১১:০০");
  });

  it("round-trips back into the datetime-local input", () => {
    for (const local of ["2027-02-12T18:00", "2027-12-31T23:59", "2027-01-01T00:00"]) {
      expect(isoToLocal(deriveDateTime(local, dhaka).iso)).toBe(local);
    }
  });

  it("keeps dateDisplay on the main event, never a range across events", () => {
    // template1-standard ships these three events; the hero still shows one date.
    const first = "2027-02-11T18:30";
    const main = "2027-02-12T18:00"; // the event behind weddingDateTime
    const last = "2027-02-13T19:00";
    expect(deriveDateTime(main, dhaka).dateEn).toBe("Friday, 12 February 2027");
    // Each event carries its own date, so 11 and 13 February are their own strings.
    expect(deriveDateTime(first, dhaka).dateEn).toBe("Thursday, 11 February 2027");
    expect(deriveDateTime(last, dhaka).dateEn).toBe("Saturday, 13 February 2027");
  });
});

describe("deriveRsvpDeadline", () => {
  it("gives both display strings with no weekday and a 23:59 end of day", () => {
    const d = deriveRsvpDeadline("2027-01-25", dhaka);
    expect(d.deadlineEn).toBe("25 January 2027");
    expect(d.deadlineBn).toBe("২৫ জানুয়ারি, ২০২৭");
    expect(d.endOfDay).toBe("2027-01-25T23:59:00+06:00");
  });

  it("cannot slip a day on a late-evening pick", () => {
    expect(deriveRsvpDeadline("2027-01-25", dhaka).deadlineEn).toBe("25 January 2027");
    expect(
      deriveRsvpDeadline("2027-01-25", { timeZone: "America/New_York", offset: "-05:00" })
        .deadlineEn,
    ).toBe("25 January 2027");
  });
});

describe("displayDateToIso", () => {
  it("round-trips every deadline the templates ship", () => {
    for (const display of [
      "20 November 2026",
      "25 January 2027",
      "1 March 2027",
      "1 February 2027",
    ]) {
      const iso = displayDateToIso(display);
      expect(iso).not.toBe("");
      expect(deriveRsvpDeadline(iso, dhaka).deadlineEn).toBe(display);
    }
    expect(displayDateToIso("1 March 2027")).toBe("2027-03-01");
  });

  it("returns empty for anything it cannot read literally", () => {
    // The Bangla copy, a month-first date and a numeric one are not the shape it knows.
    for (const display of [
      "",
      "২০ নভেম্বর ২০২৬",
      "November 20, 2026",
      "20/11/2026",
      "20 Nov 2026",
    ]) {
      expect(displayDateToIso(display)).toBe("");
    }
  });
});

describe("dateTargets", () => {
  it("writes the main event's strings in both languages, with the live-call values", () => {
    expect(dateTargets(deriveDateTime("2027-02-12T18:00", dhaka))).toEqual({
      config: [
        [["dateDisplay"], "Friday, 12 February 2027"],
        [["events", "0", "date"], "Friday, 12 February 2027"],
        [["events", "0", "time"], "6:00 PM"],
        [["events", "0", "calDate"], "2027-02-12"],
        [["events", "0", "calStart"], "18:00"],
        [["events", "0", "calEnd"], "21:00"],
      ],
      translations: [
        [["bn", "dateDisplay"], "শুক্রবার, ১২ ফেব্রুয়ারি, ২০২৭"],
        [["bn", "events", "0", "date"], "শুক্রবার, ১২ ফেব্রুয়ারি, ২০২৭"],
        [["bn", "events", "0", "time"], "সন্ধ্যা ৬:০০"],
      ],
    });
  });

  it("leaves later events alone when the wedding runs three days", () => {
    // template1-standard's shape: 11, 12 and 13 February, with 12 behind weddingDateTime.
    const config: Record<string, unknown> = {
      dateDisplay: "Thursday, 11 February 2027",
      events: [
        { date: "Thursday, 11 February 2027", calDate: "2027-02-11" },
        { date: "Thursday, 11 February 2027", calDate: "2027-02-11" },
        { date: "Saturday, 13 February 2027", calDate: "2027-02-13" },
      ],
    };
    const applied = structuredClone(config);
    for (const [path, value] of dateTargets(deriveDateTime("2027-02-12T18:00", dhaka)).config) {
      setAtPath(applied, path, value);
    }

    expect(applied["dateDisplay"]).toBe("Friday, 12 February 2027");
    expect((applied["events"] as unknown[])[1]).toEqual({
      date: "Thursday, 11 February 2027",
      calDate: "2027-02-11",
    });
    expect((applied["events"] as unknown[])[2]).toEqual({
      date: "Saturday, 13 February 2027",
      calDate: "2027-02-13",
    });
  });
});

describe("rsvpDeadlineTargets", () => {
  it("writes the display strings, never the ISO day or the end-of-day instant", () => {
    expect(rsvpDeadlineTargets(deriveRsvpDeadline("2027-01-25", dhaka))).toEqual({
      config: [[["rsvp", "deadline"], "25 January 2027"]],
      translations: [[["bn", "rsvp", "deadline"], "২৫ জানুয়ারি, ২০২৭"]],
    });
  });
});

describe("deriveInitials", () => {
  it("uses the template's separator", () => {
    expect(deriveInitials("Sumaiya Karim", "Zayan Ahmed", "S&Z")).toBe("S&Z");
    expect(deriveInitials("Sumaiya Karim", "Zayan Ahmed", "A · I")).toBe("S · Z");
  });

  it("falls back to & and returns empty for a blank name", () => {
    expect(deriveInitials("Sumaiya Karim", "Zayan Ahmed", "")).toBe("S&Z");
    expect(deriveInitials("Sumaiya Karim", "Zayan Ahmed", "SZ")).toBe("S&Z");
    expect(deriveInitials("Sumaiya Karim", "Zayan Ahmed", "Sumaiya & Zayan")).toBe("S&Z");
    expect(deriveInitials("", "Zayan Ahmed", "S&Z")).toBe("");
    expect(deriveInitials("Sumaiya Karim", "   ", "S&Z")).toBe("");
  });

  it("takes the first letter after leading punctuation", () => {
    expect(deriveInitials("Md. Rafi", "Zayan Ahmed", "S&Z")).toBe("M&Z");
    expect(deriveInitials("'Ashik", "Zayan", "S&Z")).toBe("A&Z");
  });

  it("skips a non-Latin name instead of putting Bengali in the seal", () => {
    // A Bengali pair returns "" so the caller keeps the template's initials.
    expect(deriveInitials("সুমাইয়া", "জায়ান", "S&Z")).toBe("");
    expect(deriveInitials("Émile Durand", "Ana Silva", "A · I")).toBe("É · A");
  });
});

describe("deriveHashtag", () => {
  it("joins the PascalCase first words with And", () => {
    expect(deriveHashtag("Sumaiya Karim", "Zayan Ahmed")).toBe("#SumaiyaAndZayan");
  });

  it("drops accents and punctuation, normalises the casing", () => {
    // Capitalise the first letter and lowercase the rest: Zoë-Anne → Zoeanne.
    expect(deriveHashtag("Zoë-Anne Karim", "Zayan Ahmed")).toBe("#ZoeanneAndZayan");
    expect(deriveHashtag("Md. Rafi", "Z. Ahmed")).toBe("#MdAndZ");
    expect(deriveHashtag("SUMAIYA", "zayan")).toBe("#SumaiyaAndZayan");
  });

  it("returns empty when a name is empty", () => {
    expect(deriveHashtag("", "Zayan Ahmed")).toBe("");
    expect(deriveHashtag("Sumaiya Karim", "  ")).toBe("");
  });
});

describe("deriveCity", () => {
  it("keeps the last segment without the postcode", () => {
    expect(deriveCity("House 12, Road 55, Gulshan 2, Dhaka 1212")).toBe("Dhaka");
    expect(deriveCity("House 12, Road 55, Dhaka-1212")).toBe("Dhaka");
  });

  it("drops a trailing country", () => {
    expect(deriveCity("House 12, Road 55, Dhaka 1212, Bangladesh")).toBe("Dhaka");
    expect(deriveCity("12 Baker Street, London NW1, United Kingdom")).toBe("London");
  });

  it("works for Bangla addresses", () => {
    expect(deriveCity("বাড়ি ১২, রোড ৫৫, গুলশান ২, ঢাকা ১২১২")).toBe("ঢাকা");
    expect(deriveCity("বাড়ি ১২, রোড ৫৫, ঢাকা ১২১২, বাংলাদেশ")).toBe("ঢাকা");
  });

  it("returns empty when there is no city to take", () => {
    expect(deriveCity("Dhaka")).toBe("");
    expect(deriveCity("")).toBe("");
    expect(deriveCity(", ,")).toBe("");
  });
});
