import { fireEvent, render, screen } from "@testing-library/react";
import { useMemo, useState } from "react";
import { describe, expect, it } from "vitest";

import { FormSections } from "@/components/editor/FormSections";
import { TEMPLATE_SNAPSHOTS } from "@/data/templates/index";
import type { Field } from "@/lib/canonical-fields";
import {
  addEvent,
  editEventItem,
  moveEvent,
  removeEvent,
  seedTranslations,
  seedValues,
  setEventInherits,
  type FormState,
} from "@/lib/editor-form";
import {
  resolveConfig,
  resolveTranslations,
  scalarFields,
  seedTouched,
  type EventItem,
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

function eventsOf(state: FormState): EventItem[] {
  return state.values["events"] as EventItem[];
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

  return (
    <>
      <FormSections
        fields={fields}
        values={form.values}
        translations={form.translations}
        errors={{}}
        bilingual
        onBilingualChange={noop}
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

function stored(): { events: EventItem[]; touched: string[] } {
  return JSON.parse(screen.getByTestId("state").textContent ?? "{}");
}

/** Card headers in DOM order, so a missing or reordered card fails the test. */
function headers(): string[] {
  return Array.from(document.querySelectorAll("button[aria-expanded]"))
    .map((button) => button.textContent ?? "")
    .filter((text) => /^Event \d/.test(text));
}

/** One item input by the id EventCards gives it: `events.<index>.<itemId>`. */
function itemInput(index: number, id: string, bn = false) {
  return document.getElementById(`events-${index}-${id}${bn ? "-bn" : ""}`)!;
}

function addButton(): HTMLElement {
  return screen.getByRole("button", { name: "Add event" });
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

  it("disables Add at the maximum and Remove at the minimum", () => {
    render(<Harness snapshot={base} />);

    expect(screen.getByRole("button", { name: "Remove" })).toBeDisabled();

    for (let count = 1; count < group.max!; count += 1) fireEvent.click(addButton());

    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(group.max!);
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

    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]!);
    expect(screen.getByText("Remove Event 1 — Wedding of Ayesha & Imran?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(headers()).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" }).at(-1)!);

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
    const checked = setEventInherits(seeded, group, 0, venue, true);

    expect(checked.touched.has("events.0.venueName")).toBe(true);
    expect(eventsOf(checked)[0]!["venueName"]).toBe("Lakeshore Grand Ballroom");
    expect(eventsOf(checked)[0]!.bn!["venueName"]).toBe("লেকশোর গ্র্যান্ড বলরুম");

    const unchecked = setEventInherits(checked, group, 0, venue, false);
    expect(unchecked.touched.has("events.0.venueName")).toBe(false);
    expect(eventsOf(unchecked)[0]!["venueName"]).toBe("");
    expect(eventsOf(unchecked)[0]!.bn!["venueName"]).toBe("");
  });

  it("keeps a Bangla item edit inside the item, out of the scalar translations", () => {
    const seeded = seedState();
    const name = itemField("name");
    const edited = editEventItem(seeded, group, 0, name, "মেহেদী সন্ধ্যা", true);

    expect(eventsOf(edited)[0]!.bn!["name"]).toBe("মেহেদী সন্ধ্যা");
    expect(edited.translations).toEqual(seeded.translations);
    expect(resolvedBnEvents(edited)[0]!["name"]).toBe("মেহেদী সন্ধ্যা");
  });

  it("moves an untouched event with the primary date, but not a checked one", () => {
    const added = addEvent(seedState(), group);
    const values = { ...added.values, eventDateTime: "2027-01-01T10:00" };

    expect(resolvedEvents(added, values)[1]).toMatchObject({
      calDate: "2027-01-01",
      calStart: "10:00",
    });

    const own = editEventItem(
      setEventInherits({ ...added, values }, group, 1, dateTime, true),
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
    const added = setEventInherits(addEvent(seedState(), group), group, 1, venue, true);

    const moved = moveEvent(added, group, 1, -1);
    expect(moved.touched.has("events.0.venueName")).toBe(true);
    expect(moved.touched.has("events.1.venueName")).toBe(false);

    const removed = removeEvent(moved, group, 0);
    expect(removed.touched.has("events.0.venueName")).toBe(false);
    expect(eventsOf(removed)).toHaveLength(1);
    expect(eventsOf(removed)[0]!["name"]).toBe("Wedding of Ayesha & Imran");
  });

  it("blocks removing the only event", () => {
    const removed = removeEvent(seedState(), group, 0);

    expect(eventsOf(removed)).toHaveLength(1);
    expect(resolvedEvents(removed)).toHaveLength(1);
  });
});
