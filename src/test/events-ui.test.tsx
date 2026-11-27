import { fireEvent, render, screen, within } from "@testing-library/react";
import { useMemo, useState } from "react";
import { describe, expect, it } from "vitest";

import { FormSections } from "@/components/editor/FormSections";
import { TEMPLATE_SNAPSHOTS } from "@/data/templates/index";
import type { Field } from "@/lib/canonical-fields";
import {
  addGroupItem,
  editGroupItem,
  formErrors,
  moveGroupItem,
  removeGroupItem,
  seedTranslations,
  seedValues,
  setItemInherits,
  type FormState,
} from "@/lib/editor-form";
import {
  resolveConfig,
  resolveTranslations,
  scalarFields,
  seedTouched,
  type GroupItem,
  type TemplateSnapshot,
} from "@/lib/fields";

const base = TEMPLATE_SNAPSHOTS["template5-premium"]!;
const group = base.fields.find((field) => field.type === "group")!;
const itemField = (id: string): Field => group.itemFields!.find((field) => field.id === id)!;
const venue = itemField("venueName");
const dateTime = itemField("dateTime");
const noop = () => {};

/** The editor's starting form: one event, seeded from the template. */
function seedState(): FormState {
  const values = seedValues(base, base.fields);
  const translations = seedTranslations(base, base.fields);
  return { values, translations, touched: seedTouched(base, base.fields, values, translations) };
}

function eventsOf(state: FormState): GroupItem[] {
  return state.values["events"] as GroupItem[];
}

function resolvedEvents(
  state: FormState,
  values: Record<string, unknown> = state.values as Record<string, unknown>,
): Record<string, unknown>[] {
  return resolveConfig(base, base.fields, values, state.touched)["events"] as Record<
    string,
    unknown
  >[];
}

function resolvedBnEvents(state: FormState): Record<string, unknown>[] {
  const tree = resolveTranslations(
    base,
    base.fields,
    state.translations,
    state.values as Record<string, unknown>,
    state.touched,
  );
  return (tree["bn"] as Record<string, unknown>)["events"] as Record<string, unknown>[];
}

/** FormSections plus the state it writes, so a test can read what the cards stored. */
function Harness({ snapshot }: { snapshot: TemplateSnapshot }) {
  const fields = useMemo(
    () => [...scalarFields(snapshot), ...snapshot.fields.filter((field) => field.type === "group")],
    [snapshot],
  );
  const [form, setForm] = useState<FormState>(() => {
    const values = seedValues(snapshot, fields);
    const translations = seedTranslations(snapshot, fields);
    return { values, translations, touched: seedTouched(snapshot, fields, values, translations) };
  });
  const [bilingual, setBilingual] = useState(true);
  // The route's gate: a message shows once its own input has been left (WT-17d).
  const allErrors = formErrors(fields, form, bilingual);
  const errors = Object.fromEntries(
    Object.entries(allErrors).filter(([key]) => form.visited?.has(key)),
  );

  return (
    <>
      <FormSections
        fields={fields}
        values={form.values}
        translations={form.translations}
        errors={errors}
        bilingual={bilingual}
        onBilingualChange={setBilingual}
        toggleField={snapshot.fields.find((field) => field.type === "toggle")}
        touched={form.touched}
        onEdit={noop}
        onBlur={noop}
        onGroupChange={setForm}
      />
      <output data-testid="state">
        {JSON.stringify({ events: form.values["events"], touched: [...form.touched] })}
      </output>
    </>
  );
}

function stored(): { events: GroupItem[]; touched: string[] } {
  return JSON.parse(screen.getByTestId("state").textContent ?? "{}");
}

/** Card headers in DOM order, so a missing or reordered card fails the test. */
function headers(): string[] {
  return Array.from(document.querySelectorAll("button[aria-expanded]"))
    .map((button) => button.textContent ?? "")
    .filter((text) => /^Event \d/.test(text));
}

/** One item input by the id GroupCards gives it: `events.<index>.<itemId>`. */
function itemInput(index: number, id: string, bn = false) {
  return document.getElementById(`events-${index}-${id}${bn ? "-bn" : ""}`)!;
}

function addButton(): HTMLElement {
  return screen.getByRole("button", { name: "Add event" });
}

/** The Events section only: the story cards carry their own Remove buttons. */
function eventsSection(): HTMLElement {
  return screen.getByRole("heading", { name: "Events" }).closest("section")!;
}

function removeButtons(): HTMLElement[] {
  return within(eventsSection()).getAllByRole("button", { name: "Remove" });
}

describe("event cards", () => {
  it("renders a card per event and opens the one just added", () => {
    render(<Harness snapshot={base} />);

    expect(headers()).toEqual(["Event 1 — Wedding of Ayesha & Imran"]);
    expect(itemInput(0, "venueName")).toBeVisible();
    expect(itemInput(1, "venueName")).toBeNull();

    fireEvent.click(addButton());

    // The new card is open; the first one stays open, so both are editable at once.
    expect(headers()).toEqual(["Event 1 — Wedding of Ayesha & Imran", "Event 2"]);
    expect(itemInput(1, "venueName")).toBeVisible();
  });

  it("labels each Bangla item input in Bangla and leaves the English ones alone", () => {
    render(<Harness snapshot={base} />);
    fireEvent.click(addButton());
    fireEvent.click(screen.getByRole("radio", { name: "Both" }));

    const fields = [
      ["tag", "ট্যাগ", "Tag"],
      ["name", "অনুষ্ঠানের নাম", "Event name"],
      ["venueName", "স্থানের নাম", "Venue"],
      ["venueAddress", "ঠিকানা", "Address"],
    ] as const;

    for (const [id, banglaName, englishName] of fields) {
      const bangla = itemInput(0, id, true);
      expect(bangla).toBeVisible();
      expect(bangla.closest("[lang]")).toHaveAttribute("lang", "bn");
      expect(screen.getByLabelText(banglaName, { selector: `#events-0-${id}-bn` })).toBe(bangla);
      expect(screen.getByLabelText(englishName, { selector: `#events-0-${id}` })).toBe(
        itemInput(0, id),
      );
    }

    // Two cards carry the same questions, so a repeated name inside one card is a real clash.
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        'input[id^="events-0-"]:not([type="checkbox"]), textarea[id^="events-0-"]',
      ),
    );
    const labelled = inputs.map((input) => input.labels?.[0]?.textContent?.trim() ?? "");
    expect(inputs).toHaveLength(10);
    expect(new Set(labelled).size).toBe(inputs.length);
  });

  it("disables Add at the maximum and Remove at the minimum", () => {
    render(<Harness snapshot={base} />);

    expect(removeButtons()).toHaveLength(1);
    expect(removeButtons()[0]!).toBeDisabled();

    for (let count = 1; count < group.max!; count += 1) fireEvent.click(addButton());

    expect(removeButtons()).toHaveLength(group.max!);
    expect(addButton()).toBeDisabled();
  });

  it("leaves an inherited venue disabled until Different from the main event is checked", () => {
    render(<Harness snapshot={base} />);
    fireEvent.click(addButton());
    fireEvent.click(addButton());

    const inherit = document.getElementById("events-2-venueName-inherit")!;
    expect(inherit).not.toBeChecked();
    expect(itemInput(2, "venueName")).toBeDisabled();
    expect(itemInput(2, "venueName")).toHaveAttribute("placeholder", "Lakeshore Grand Ballroom");
    expect(itemInput(2, "venueName", true)).toHaveAttribute(
      "placeholder",
      "লেকশোর গ্র্যান্ড বলরুম",
    );

    fireEvent.click(inherit);

    expect(itemInput(2, "venueName")).not.toBeDisabled();
    expect(itemInput(2, "venueName")).toHaveValue("Lakeshore Grand Ballroom");
    expect(itemInput(2, "venueName", true)).toHaveValue("লেকশোর গ্র্যান্ড বলরুম");
    expect(stored().touched).toContain("events.2.venueName");
  });

  it("unchecking clears both languages and snaps the event back to the primary", () => {
    render(<Harness snapshot={base} />);
    const inherit = () => document.getElementById("events-0-venueName-inherit")!;

    fireEvent.click(inherit());
    fireEvent.change(itemInput(0, "venueName", true), { target: { value: "ইমরানের হল" } });
    expect(stored().events[0]!.bn!["venueName"]).toBe("ইমরানের হল");

    fireEvent.click(inherit());

    expect(stored().events[0]!["venueName"]).toBe("");
    expect(stored().events[0]!.bn!["venueName"]).toBe("");
    const state = seedState();
    expect(stored().touched).not.toContain("events.0.venueName");
    expect(resolvedBnEvents(state)[0]!["venue"]).toBe("লেকশোর গ্র্যান্ড বলরুম");
  });

  it("asks before removing an event, and keeps the list in step with the cards", () => {
    render(<Harness snapshot={base} />);
    fireEvent.click(addButton());
    fireEvent.change(itemInput(1, "name"), { target: { value: "Mehendi Night" } });

    fireEvent.click(removeButtons()[0]!);
    expect(screen.getByText("Remove Event 1 — Wedding of Ayesha & Imran?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(headers()).toHaveLength(2);

    fireEvent.click(removeButtons()[0]!);
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(headers()).toEqual(["Event 1 — Mehendi Night"]);
    expect(stored().events).toHaveLength(1);
  });

  it("reorders the cards and their values together, Bangla included", () => {
    render(<Harness snapshot={base} />);
    fireEvent.click(addButton());

    fireEvent.change(itemInput(1, "name"), { target: { value: "Mehendi Night" } });
    fireEvent.change(itemInput(1, "name", true), { target: { value: "মেহেদী সন্ধ্যা" } });
    expect(headers()[1]).toBe("Event 2 — Mehendi Night");

    fireEvent.click(screen.getByRole("button", { name: /Move Event 2 — Mehendi Night up/ }));

    expect(headers()[0]).toBe("Event 1 — Mehendi Night");
    expect(stored().events[0]!["name"]).toBe("Mehendi Night");
    expect(stored().events[0]!.bn!["name"]).toBe("মেহেদী সন্ধ্যা");
  });
});

describe("the events form state", () => {
  it("records the touch when checked and clears both languages when unchecked", () => {
    const seeded = seedState();
    const checked = setItemInherits(seeded, group, 0, venue, true);

    expect(checked.touched.has("events.0.venueName")).toBe(true);
    expect(eventsOf(checked)[0]!["venueName"]).toBe("Lakeshore Grand Ballroom");
    expect(eventsOf(checked)[0]!.bn!["venueName"]).toBe("লেকশোর গ্র্যান্ড বলরুম");

    const unchecked = setItemInherits(checked, group, 0, venue, false);
    expect(unchecked.touched.has("events.0.venueName")).toBe(false);
    expect(eventsOf(unchecked)[0]!["venueName"]).toBe("");
    expect(eventsOf(unchecked)[0]!.bn!["venueName"]).toBe("");
  });

  it("keeps a Bangla item edit inside the item, out of the scalar translations", () => {
    const seeded = seedState();
    const name = itemField("name");
    const edited = editGroupItem(seeded, group, 0, name, "মেহেদী সন্ধ্যা", true);

    expect(eventsOf(edited)[0]!.bn!["name"]).toBe("মেহেদী সন্ধ্যা");
    expect(edited.translations).toEqual(seeded.translations);
    expect(resolvedBnEvents(edited)[0]!["name"]).toBe("মেহেদী সন্ধ্যা");
  });

  it("moves an untouched event with the primary date, but not a checked one", () => {
    const added = addGroupItem(seedState(), group);
    const values = { ...added.values, eventDateTime: "2027-01-01T10:00" };

    expect(resolvedEvents(added, values)[1]).toMatchObject({
      calDate: "2027-01-01",
      calStart: "10:00",
    });

    const own = editGroupItem(
      setItemInherits({ ...added, values }, group, 1, dateTime, true),
      group,
      1,
      dateTime,
      "2027-03-04T20:00",
    );
    expect(resolvedEvents(own)[1]).toMatchObject({
      calDate: "2027-03-04",
      calStart: "20:00",
    });
  });

  it("keeps each item's touch key with it when the items move or go", () => {
    const added = setItemInherits(addGroupItem(seedState(), group), group, 1, venue, true);

    const moved = moveGroupItem(added, group, 1, -1);
    expect(moved.touched.has("events.0.venueName")).toBe(true);
    expect(moved.touched.has("events.1.venueName")).toBe(false);

    const removed = removeGroupItem(moved, group, 0);
    expect(removed.touched.has("events.0.venueName")).toBe(false);
    expect(eventsOf(removed)).toHaveLength(1);
    expect(eventsOf(removed)[0]!["name"]).toBe("Wedding of Ayesha & Imran");
  });

  it("blocks removing the only event", () => {
    const removed = removeGroupItem(seedState(), group, 0);

    expect(eventsOf(removed)).toHaveLength(1);
    expect(resolvedEvents(removed)).toHaveLength(1);
  });
});

describe("event item messages", () => {
  /** template5's event items are all optional once made their own, so one is marked required. */
  const requiredVenue: TemplateSnapshot = {
    ...base,
    fields: base.fields.map((field) =>
      field.type === "group"
        ? {
            ...field,
            itemFields: field.itemFields!.map((item) =>
              item.id === "venueName" ? { ...item, required: true } : item,
            ),
          }
        : field,
    ),
  };

  const messageAt = (index: number, id: string, bn = false) =>
    document.getElementById(`events-${index}-${id}${bn ? "-bn" : ""}-error`);

  it("says what is required under a blank event name, and only after it is left", () => {
    render(<Harness snapshot={base} />);
    const name = () => itemInput(0, "name");

    fireEvent.change(name(), { target: { value: "" } });
    expect(name()).not.toHaveAttribute("aria-invalid", "true");
    expect(messageAt(0, "name")).toBeNull();

    fireEvent.blur(name());
    expect(messageAt(0, "name")).toHaveTextContent("This is required.");
    expect(name()).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(name(), { target: { value: "Wedding" } });
    expect(messageAt(0, "name")).toBeNull();
  });

  it("shows the message only on the card that was left", () => {
    render(<Harness snapshot={base} />);
    fireEvent.click(addButton());

    fireEvent.blur(itemInput(1, "name"));

    expect(messageAt(0, "name")).toBeNull();
    expect(messageAt(1, "name")).toHaveTextContent("This is required.");
    // The blank tag on the same card has not been left yet.
    expect(screen.getAllByText("This is required.")).toHaveLength(1);
  });

  it("stays quiet on an inherited venue, and clears again when the event follows the primary", () => {
    render(<Harness snapshot={requiredVenue} />);
    const venue = () => itemInput(0, "venueName");
    const inherit = () => document.getElementById("events-0-venueName-inherit")!;

    expect(venue()).toBeDisabled();
    expect(messageAt(0, "venueName")).toBeNull();

    fireEvent.click(inherit());
    // Ticking copies the primary's venue in, so it is not blank yet.
    expect(venue()).toHaveValue("Lakeshore Grand Ballroom");

    fireEvent.change(venue(), { target: { value: "" } });
    fireEvent.blur(venue());
    expect(messageAt(0, "venueName")).toHaveTextContent("This is required.");

    fireEvent.click(inherit());
    expect(venue()).toBeDisabled();
    expect(messageAt(0, "venueName")).toBeNull();
  });

  it("shows the Bangla message while the toggle is on and takes it away with the input", () => {
    render(<Harness snapshot={base} />);
    const tag = () => itemInput(0, "tag", true);

    fireEvent.change(tag(), { target: { value: "" } });
    fireEvent.blur(tag());
    expect(messageAt(0, "tag", true)).toHaveTextContent("This is required.");
    expect(itemInput(0, "tag")).not.toHaveAttribute("aria-invalid", "true");

    const toggle = () => screen.getByRole("switch", { name: "Publish the Bangla version" });
    fireEvent.click(toggle());
    expect(tag()).toBeNull();
    expect(messageAt(0, "tag", true)).toBeNull();

    fireEvent.click(toggle());
    expect(tag()).not.toBeNull();
    expect(messageAt(0, "tag", true)).toHaveTextContent("This is required.");
  });
});
