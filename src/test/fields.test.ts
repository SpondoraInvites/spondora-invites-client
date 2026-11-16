import { describe, expect, it } from "vitest";

import { resolveConfig, type TemplateSnapshot } from "@/lib/fields";

const snapshot: TemplateSnapshot = {
  manifest: {
    slug: "template5-premium",
    directory: "template5-premium",
    style: "module",
    origin: "https://template5-premium.pages.dev/",
    tier: "premium",
    languages: ["en", "bn"],
    copyRendered: true,
    name: "Navy Blossom",
  },
  defaults: {
    couple: { name1: "Ayesha Rahman", name2: "Imran Karim", initials: "A · I" },
    venue: { name: "Lakeshore Grand Ballroom" },
  },
  translations: { bn: {} },
  fields: [],
};

const fields = [
  { id: "partner1Name", path: ["couple", "name1"] },
  { id: "partner2Name", path: ["couple", "name2"] },
  { id: "venueName", path: ["venue", "name"] },
  { id: "notInDefaults", path: ["missing", "node"] },
];

describe("resolveConfig", () => {
  it("skips a write when the parent path does not exist", () => {
    const config = resolveConfig(snapshot, fields, { notInDefaults: "x" });

    expect(config).not.toHaveProperty("missing");
    expect(config).toEqual(snapshot.defaults);
  });

  it("keeps keys the form did not mention", () => {
    const config = resolveConfig(snapshot, fields, { partner1Name: "Rima" });
    const couple = config["couple"] as Record<string, unknown>;

    expect(couple["name1"]).toBe("Rima");
    expect(couple["initials"]).toBe("A · I");
    expect(couple["name2"]).toBe("Imran Karim");
  });

  it("does not mutate the snapshot defaults", () => {
    resolveConfig(snapshot, fields, { partner1Name: "Rima", venueName: "New Hall" });

    expect(snapshot.defaults).toEqual({
      couple: { name1: "Ayesha Rahman", name2: "Imran Karim", initials: "A · I" },
      venue: { name: "Lakeshore Grand Ballroom" },
    });
  });

  it("round-trips through structuredClone", () => {
    const config = resolveConfig(snapshot, fields, { partner1Name: "Rima" });

    expect(structuredClone(config)).toEqual(config);
  });
});
