import { describe, expect, it } from "vitest";

import { TEMPLATE_SNAPSHOTS } from "@/data/templates/index";
import type { Field, FieldType } from "@/lib/canonical-fields";
import {
  addEvent,
  formErrors,
  markVisited,
  missingAnswers,
  moveEvent,
  nextForm,
  removeEvent,
  sectionGroups,
  seedTranslations,
  seedValues,
  setEventInherits,
  type FormState,
} from "@/lib/editor-form";
import { scalarFields, seedTouched, type EventItem, type TemplateSnapshot } from "@/lib/fields";

const base = TEMPLATE_SNAPSHOTS["template5-premium"]!;
const editorFields: Field[] = [
  ...scalarFields(base),
  ...base.fields.filter((field) => field.type === "group"),
];
const group = editorFields.find((field) => field.type === "group")!;
const itemField = (id: string) => group.itemFields!.find((field) => field.id === id)!;

/** The editor's starting form, seeded from the template like the route does. */
function seeded(): FormState {
  const values = seedValues(base, editorFields);
  const translations = seedTranslations(base, editorFields);
  return {
    values,
    translations,
    touched: seedTouched(base, editorFields, values, translations),
  };
}

function withValue(form: FormState, id: string, value: string): FormState {
  return { ...form, values: { ...form.values, [id]: value } };
}

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
  const start = (): FormState => ({
    values: seedValues(snapshot, fields),
    translations: seedTranslations(snapshot, fields),
    touched: new Set(),
  });

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

  it("keeps a Bangla edit out of the English values and the derived fields", () => {
    const form = nextForm(snapshot, fields, start(), byId("partner1Name"), "সুমাইয়া", true);

    expect(form.translations["partner1Name"]).toBe("সুমাইয়া");
    expect(form.values["partner1Name"]).toBe("Ayesha Rahman");
    // The initials and hashtag come from the English names, not the Bangla ones.
    expect(form.values["hashtag"]).toBe("#AyeshaAndImran");
    expect(form.touched.has("partner1Name:bn")).toBe(true);
    expect(form.touched.has("hashtag")).toBe(false);
  });
});

describe("formErrors", () => {
  it("finds nothing missing in the template's own answers", () => {
    expect(formErrors(editorFields, seeded(), false)).toEqual({});
    expect(formErrors(editorFields, seeded(), true)).toEqual({});
    expect(missingAnswers(editorFields, seeded(), true)).toEqual({ count: 0 });
  });

  it("reports each kind of answer with the inline message", () => {
    const probe = (id: string, type: FieldType, extra: Partial<Field> = {}): Field => ({
      id,
      path: [id],
      type,
      label: id,
      ...extra,
    });
    const cases: [Field, string, string][] = [
      [probe("text", "text", { required: true }), "", "This is required."],
      [probe("address", "textarea", { required: true }), "", "This is required."],
      [probe("when", "datetime", { required: true }), "", "This is required."],
      [probe("deadline", "date", { required: true }), "", "This is required."],
      [
        probe("phone", "tel", { required: true }),
        "letters",
        "Enter 8–15 digits, including the country code.",
      ],
      [probe("email", "email"), "x@y", "Enter a valid email address."],
      [
        probe("initials", "text", { derived: "initials" }),
        "সুমাইয়া",
        "Use Latin letters, & · . ' - and spaces, 1–8 characters.",
      ],
    ];

    for (const [field, raw, message] of cases) {
      const form: Pick<FormState, "values" | "translations" | "touched"> = {
        values: { [field.id]: raw },
        translations: {},
        touched: new Set(),
      };
      expect(formErrors([field], form, false), field.id).toEqual({ [field.id]: message });
    }
  });

  it("leaves an optional field that is empty and a toggle alone", () => {
    const note: Field = { id: "note", path: ["couple", "note"], type: "text", label: "Note" };
    const toggle: Field = {
      id: "on",
      path: ["localization", "enabled"],
      type: "toggle",
      label: "On",
    };
    const form: Pick<FormState, "values" | "translations" | "touched"> = {
      values: { note: "", on: false },
      translations: {},
      touched: new Set(),
    };

    expect(formErrors([note, toggle], form, false)).toEqual({});
  });

  it("counts Bangla only while the toggle is on", () => {
    const form = seeded();
    const bangla = { ...form.translations, partner1Name: "", venueName: " " };

    expect(formErrors(editorFields, { ...form, translations: bangla }, false)).toEqual({});
    expect(formErrors(editorFields, { ...form, translations: bangla }, true)).toEqual({
      "partner1Name:bn": "This is required.",
      "venueName:bn": "This is required.",
    });
  });

  it("counts English gaps, and puts the first one in form order, not key order", () => {
    // The values object holds monogramInitials last; the form renders it in the Couple section.
    const form = withValue(withValue(seeded(), "familyLine1", ""), "monogramInitials", "সুমাইয়া");
    const answers = missingAnswers(editorFields, form, false);

    expect(answers.count).toBe(2);
    expect(answers.first).toEqual({ key: "monogramInitials", label: "Monogram letters" });
  });

  it("puts the sections in the order the form renders them", () => {
    expect(sectionGroups(editorFields).map(([section]) => section)).toEqual([
      "Couple",
      "Family",
      "Where",
      "When",
      "RSVP",
      "Events",
    ]);
  });
});

describe("event answers", () => {
  /** A blank card: the two required items, plus an inherited venue to leave alone. */
  function blankCard(form: FormState, index: number): FormState {
    const items = (form.values["events"] as EventItem[]).map((item, position) =>
      position === index ? { ...item, tag: "", name: "" } : item,
    );
    return { ...form, values: { ...form.values, events: items } };
  }

  it("reports a blank tag and name per card, and is quiet about the inherited venue", () => {
    const form = blankCard(blankCard(addEvent(seeded(), group), 0), 1);

    expect(formErrors(editorFields, form, false)).toEqual({
      "events.0.tag": "This is required.",
      "events.0.name": "This is required.",
      "events.1.tag": "This is required.",
      "events.1.name": "This is required.",
    });
  });

  it("adds the Bangla half of each item while the toggle is on", () => {
    const form = blankCard(addEvent(seeded(), group), 1);

    expect(formErrors(editorFields, form, true)).toEqual({
      "events.1.tag": "This is required.",
      "events.1.tag:bn": "This is required.",
      "events.1.name": "This is required.",
      "events.1.name:bn": "This is required.",
    });
  });

  it("judges an inherited item only once the couple makes it their own", () => {
    // template5's inheriting items are all optional, so a required one proves the rule.
    // The render test in events-ui covers the same rule with "Different from the main event".
    const probe: Field = {
      id: "events",
      path: ["events"],
      type: "group",
      itemLabel: "Event",
      itemFields: [
        { id: "name", path: ["name"], type: "text", label: "Event name", required: true },
        {
          id: "venue",
          path: ["venue"],
          type: "text",
          label: "Venue",
          required: true,
          inherits: true,
        },
      ],
    };
    const form = (touched: string[]): Pick<FormState, "values" | "translations" | "touched"> => ({
      values: { events: [{ name: "", venue: "" }] },
      translations: {},
      touched: new Set(touched),
    });

    expect(formErrors([probe], form([]), false)).toEqual({
      "events.0.name": "This is required.",
    });
    expect(formErrors([probe], form(["events.0.venue"]), false)).toEqual({
      "events.0.name": "This is required.",
      "events.0.venue": "This is required.",
    });
  });

  it("counts the required items of a card the couple just added", () => {
    const own = setEventInherits(addEvent(seeded(), group), group, 1, itemField("venueName"), true);

    expect(formErrors(editorFields, own, false)).toHaveProperty("events.1.name");
  });
});

describe("visited keys", () => {
  it("remaps with the cards exactly as the touch keys do", () => {
    const added = setEventInherits(
      addEvent(seeded(), group),
      group,
      1,
      itemField("venueName"),
      true,
    );
    const visited = markVisited(added, "events.1.venueName");

    const moved = moveEvent(visited, group, 1, -1);
    expect([...(moved.visited ?? [])]).toEqual(["events.0.venueName"]);
    const back = moveEvent(moved, group, 0, 1);
    expect([...(back.visited ?? [])]).toEqual(["events.1.venueName"]);

    const removed = removeEvent(visited, group, 0);
    expect([...(removed.visited ?? [])]).toEqual(["events.0.venueName"]);
    expect([...(removeEvent(visited, group, 1).visited ?? [])]).toEqual([]);
  });
});
