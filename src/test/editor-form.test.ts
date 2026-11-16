import { describe, expect, it } from "vitest";

import { TEMPLATE_SNAPSHOTS } from "@/data/templates/index";
import { nextForm, seedValues, type FormState } from "@/lib/editor-form";
import { scalarFields, type TemplateSnapshot } from "@/lib/fields";

const base = TEMPLATE_SNAPSHOTS["template5-premium"]!;

/** A snapshot with one template's key changed, without touching the generated data. */
function clone(change: (snapshot: TemplateSnapshot) => void): TemplateSnapshot {
  const snapshot = JSON.parse(JSON.stringify(base)) as TemplateSnapshot;
  change(snapshot);
  return snapshot;
}

describe("scalarFields", () => {
  it("keeps the text fields and the existing date, in canonical order", () => {
    expect(scalarFields(base).map((field) => field.id)).toEqual([
      "partner1Name",
      "partner2Name",
      "familyLine1",
      "familyLine2",
      "venueName",
      "venueAddress",
      "eventDateTime",
      "venueMapQuery",
      "rsvpWhatsapp",
      "rsvpDeadline",
      "monogramInitials",
    ]);
  });

  it("hides a hashtag the template never displays and keeps one it does", () => {
    expect(scalarFields(base).some((field) => field.id === "hashtag")).toBe(false);

    const tagged = clone((snapshot) => {
      (snapshot.defaults["couple"] as { hashtag: string }).hashtag = "#AyeshaAndImran";
    });
    expect(scalarFields(tagged).some((field) => field.id === "hashtag")).toBe(true);
  });
});

describe("seedValues", () => {
  const values = seedValues(base, scalarFields(base));

  it("shows the wedding date as local wall-clock time", () => {
    expect(values["eventDateTime"]).toBe("2026-12-11T16:00");
  });

  it("pre-fills the reply-by box from the template's display date", () => {
    expect(values["rsvpDeadline"]).toBe("2026-11-20");
  });

  it("leaves the reply-by box empty when the display date cannot be read", () => {
    const odd = clone((snapshot) => {
      (snapshot.defaults["rsvp"] as { deadline: string }).deadline = "২০ নভেম্বর ২০২৬";
    });
    expect(seedValues(odd, scalarFields(odd))["rsvpDeadline"]).toBe("");
  });
});

describe("nextForm", () => {
  const snapshot = clone((draft) => {
    (draft.defaults["couple"] as { hashtag: string }).hashtag = "#AyeshaAndImran";
  });
  const fields = scalarFields(snapshot);
  const byId = (id: string) => fields.find((field) => field.id === id)!;
  const start = (): FormState => ({ values: seedValues(snapshot, fields), touched: new Set() });

  it("derives the hashtag from the names while it is untouched", () => {
    const form = nextForm(snapshot, fields, start(), byId("partner1Name"), "Sumaiya Karim");
    expect(form.values.hashtag).toBe("#SumaiyaAndImran");
    expect(form.touched.has("hashtag")).toBe(false);
  });

  it("stops deriving once the couple edits the hashtag", () => {
    let form = nextForm(snapshot, fields, start(), byId("hashtag"), "OurWedding");
    form = nextForm(snapshot, fields, form, byId("partner1Name"), "Sumaiya");

    expect(form.values.hashtag).toBe("#OurWedding");
    expect(form.values.partner1Name).toBe("Sumaiya");
    expect(form.touched.has("hashtag")).toBe(true);
  });

  it("keeps the template's initials when neither name is Latin", () => {
    let form = nextForm(snapshot, fields, start(), byId("partner1Name"), "সুমাইয়া");
    form = nextForm(snapshot, fields, form, byId("partner2Name"), "জায়ান");

    expect(form.values.monogramInitials).toBe("A · I");
  });

  it("moves the initials with the names using the template's separator", () => {
    let form = nextForm(snapshot, fields, start(), byId("partner1Name"), "Sumaiya Karim");
    form = nextForm(snapshot, fields, form, byId("partner2Name"), "Zayan Ahmed");

    expect(form.values.monogramInitials).toBe("S · Z");
  });

  it("keeps the WhatsApp number as digits", () => {
    const form = nextForm(snapshot, fields, start(), byId("rsvpWhatsapp"), "+880 1353-218337");
    expect(form.values.rsvpWhatsapp).toBe("8801353218337");
  });
});
