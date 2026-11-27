import { describe, expect, it } from "vitest";

import { TEMPLATE_SNAPSHOTS } from "@/data/templates/index";
import { seedTranslations, seedValues } from "@/lib/editor-form";
import {
  resolveConfig,
  resolveTranslations,
  seedTouched,
  type GroupItem,
  type TemplateSnapshot,
} from "@/lib/fields";

const base = TEMPLATE_SNAPSHOTS["template5-premium"]!;

/** The template's seeded values, with the test's own event list in place. */
function valuesWith(events: GroupItem[]): Record<string, unknown> {
  return { ...seedValues(base, base.fields), events };
}

function resolved(values: Record<string, unknown>, touched = new Set<string>()) {
  return resolveConfig(base, base.fields, values, touched)["events"] as Record<string, unknown>[];
}

function resolvedBn(values: Record<string, unknown>, touched = new Set<string>()) {
  const snapshot: TemplateSnapshot = base;
  const translations = seedTranslations(snapshot, snapshot.fields);
  const tree = resolveTranslations(snapshot, snapshot.fields, translations, values, touched);
  return (tree["bn"] as Record<string, unknown>)["events"] as Record<string, unknown>[];
}

const mehendi: GroupItem = {
  tag: "Mehendi",
  name: "Mehendi Night",
  dateTime: "2026-12-10T19:00",
  venueName: "Karim Residence",
  venueAddress: "House 12, Road 55",
  bn: {
    tag: "মেহেদী",
    name: "মেহেদী সন্ধ্যা",
    venueName: "করিম বাসভবন",
    venueAddress: "বাড়ি ১২, রোড ৫৫",
  },
};

const wedding: GroupItem = {
  tag: "Wedding",
  name: "Wedding of Ayesha & Imran",
  dateTime: "2026-12-13T17:00",
  venueName: "Other Hall",
  venueAddress: "Other Address",
  bn: {
    tag: "বিয়ে",
    name: "আয়েশা ও ইমরানের বিয়ে",
    venueName: "অন্য হল",
    venueAddress: "অন্য ঠিকানা",
  },
};

describe("seeding the events group", () => {
  it("puts English at the item root and Bangla in bn", () => {
    const values = seedValues(base, base.fields);
    const events = values["events"] as GroupItem[];

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ tag: "Wedding", dateTime: "2026-12-11T16:00" });
    expect(events[0]!.bn).toMatchObject({
      tag: "বিয়ে",
      venueName: "লেকশোর গ্র্যান্ড বলরুম",
    });
  });

  it("leaves the group out of the scalar translations map", () => {
    expect(seedTranslations(base, base.fields)).not.toHaveProperty("events");
  });

  it("records a touch when the template already shows an inherited field differently", () => {
    const multi = structuredClone(base);
    const events = multi.defaults["events"] as Record<string, unknown>[];
    events.push({
      ...events[0],
      calDate: "2026-12-12",
      calStart: "19:00",
      venue: "Other Hall",
      address: "Other Address",
      mapQuery: "Other Maps",
    });

    const values = seedValues(multi, multi.fields);
    const translations = seedTranslations(multi, multi.fields);
    const touched = seedTouched(multi, multi.fields, values, translations);

    expect(touched.has("events.1.dateTime")).toBe(true);
    expect(touched.has("events.1.venueName")).toBe(true);
    expect(touched.has("events.1.venueAddress")).toBe(true);
    expect(touched.has("events.1.mapQuery")).toBe(true);
    expect(touched.has("events.0.dateTime")).toBe(false);

    const resolvedEvents = resolveConfig(multi, multi.fields, values, touched)["events"] as Record<
      string,
      unknown
    >[];
    expect(resolvedEvents[1]).toMatchObject({ calDate: "2026-12-12", venue: "Other Hall" });
  });
});

describe("resolving the events group", () => {
  it("keeps icon and calTz on both items", () => {
    const events = resolved(valuesWith([mehendi, wedding]));

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ icon: "rings", calTz: "Asia/Dhaka" });
    expect(events[1]).toMatchObject({ icon: "rings", calTz: "Asia/Dhaka" });
  });

  it("moves an untouched second event with the primary date", () => {
    const events = resolved(valuesWith([mehendi, wedding]));

    // Primary weddingDateTime is 2026-12-11T16:00.
    expect(events[1]).toMatchObject({ calDate: "2026-12-11", calStart: "16:00" });
  });

  it("keeps a touched second event on its own date", () => {
    const events = resolved(valuesWith([mehendi, wedding]), new Set(["events.1.dateTime"]));

    expect(events[1]).toMatchObject({ calDate: "2026-12-13", calStart: "17:00" });
  });

  it("takes an untouched Bangla venue from the Bangla primary", () => {
    const events = resolvedBn(valuesWith([mehendi, wedding]));

    // The primary Bangla venue, not the item's "অন্য হল".
    expect(events[1]!["venue"]).toBe("লেকশোর গ্র্যান্ড বলরুম");
  });

  it("uses the item's own Bangla venue once that field is touched", () => {
    const events = resolvedBn(valuesWith([mehendi, wedding]), new Set(["events.1.venueName"]));

    expect(events[1]!["venue"]).toBe("অন্য হল");
  });

  it("drops a removed item from the config and the translations tree", () => {
    expect(resolved(valuesWith([mehendi, wedding]))).toHaveLength(2);
    expect(resolvedBn(valuesWith([mehendi, wedding]))).toHaveLength(2);

    expect(resolved(valuesWith([mehendi]))).toHaveLength(1);
    expect(resolvedBn(valuesWith([mehendi]))).toHaveLength(1);
  });

  it("moves the derived dates with the items when they are reordered", () => {
    const touched = new Set(["events.0.dateTime", "events.1.dateTime"]);

    expect(
      resolved(valuesWith([mehendi, wedding]), touched).map((event) => event["calDate"]),
    ).toEqual(["2026-12-10", "2026-12-13"]);
    expect(
      resolved(valuesWith([wedding, mehendi]), touched).map((event) => event["calDate"]),
    ).toEqual(["2026-12-13", "2026-12-10"]);
  });

  it("holds the list to min 1 and max 4", () => {
    const empty = resolved(valuesWith([]));
    expect(empty).toHaveLength(1);
    expect(empty[0]!["name"]).toBe("Wedding of Ayesha & Imran");

    const five = Array.from({ length: 5 }, (_, index) => ({
      ...mehendi,
      name: `Event ${index + 1}`,
    }));
    expect(resolved(valuesWith(five))).toHaveLength(4);
  });
});
