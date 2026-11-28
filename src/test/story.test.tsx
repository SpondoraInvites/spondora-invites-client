import { fireEvent, render, screen } from "@testing-library/react";
import { useMemo, useState } from "react";
import { describe, expect, it } from "vitest";

import { FormSections } from "@/components/editor/FormSections";
import { TEMPLATE_SNAPSHOTS } from "@/data/templates/index";
import {
  addGroupItem,
  removeGroupItem,
  seedTranslations,
  seedValues,
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
const story = base.fields.find((field) => field.id === "story")!;
const noop = () => {};

/** The template's own sample chapters, as the couple's first draft. */
const coupleChapters: GroupItem[] = [
  {
    year: "2019",
    title: "The Tea Stall",
    description: "One rainy afternoon, one shared umbrella.",
    bn: { year: "২০১৯", title: "চায়ের দোকান", description: "এক বর্ষার বিকেলে, এক ছাতা।" },
  },
  {
    year: "2022",
    title: "The Long Call",
    description: "Three hours, no reason at all.",
    bn: { year: "২০২২", title: "দীর্ঘ ফোনালাপ", description: "তিন ঘণ্টা, কোনো কারণে নয়।" },
  },
  {
    year: "2026",
    title: "The Yes",
    description: "With our families beside us.",
    bn: { year: "২০২৬", title: "সম্মতি", description: "পরিবার আমাদের পাশে।" },
  },
];

function seedState(snapshot: TemplateSnapshot = base): FormState {
  const values = seedValues(snapshot, snapshot.fields);
  const translations = seedTranslations(snapshot, snapshot.fields);
  return {
    values,
    translations,
    touched: seedTouched(snapshot, snapshot.fields, values, translations),
  };
}

/** The seeded form with the test's own chapter list in place. */
function formWith(chapters: GroupItem[]): FormState {
  const state = seedState();
  return { ...state, values: { ...state.values, story: chapters } };
}

function chaptersIn(state: FormState): GroupItem[] {
  const value = state.values["story"];
  return Array.isArray(value) ? value : [];
}

function resolvedChapters(state: FormState): Record<string, unknown>[] {
  const config = resolveConfig(base, base.fields, state.values, state.touched);
  return (config["story"] as { chapters?: Record<string, unknown>[] }).chapters ?? [];
}

function resolvedBnChapters(state: FormState): Record<string, unknown>[] {
  const tree = resolveTranslations(
    base,
    base.fields,
    state.translations,
    state.values,
    state.touched,
  );
  const bn = tree["bn"] as { story?: { chapters?: Record<string, unknown>[] } };
  return bn.story?.chapters ?? [];
}

const titles = (chapters: Record<string, unknown>[]) => chapters.map((chapter) => chapter["title"]);

/** FormSections plus the state it writes, so a test can read what the cards stored. */
function Harness({ snapshot = base }: { snapshot?: TemplateSnapshot }) {
  const fields = useMemo(
    () => [...scalarFields(snapshot), ...snapshot.fields.filter((field) => field.type === "group")],
    [snapshot],
  );
  const [form, setForm] = useState<FormState>(() => seedState(snapshot));

  return (
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
  );
}

/** Card headers in DOM order, so a missing, mislabelled or reordered card fails the test. */
function headers(): string[] {
  return Array.from(document.querySelectorAll("button[aria-expanded]"))
    .map((button) => button.textContent ?? "")
    .filter((text) => /^Chapter \d/.test(text));
}

function chapterInput(index: number, id: string) {
  return document.getElementById(`story-${index}-${id}`) as HTMLInputElement;
}

function addButton(): HTMLElement {
  return screen.getByRole("button", { name: "Add chapter" });
}

describe("resolving the story group", () => {
  it("keeps the couple's chapter count and order in both languages", () => {
    const state = formWith(coupleChapters.slice(0, 2));

    // The template ships three sample chapters; the couple's two win.
    expect(resolvedChapters(state)).toHaveLength(2);
    expect(titles(resolvedChapters(state))).toEqual(["The Tea Stall", "The Long Call"]);
    expect(resolvedChapters(state).map((chapter) => chapter["label"])).toEqual(["2019", "2022"]);

    expect(resolvedBnChapters(state)).toHaveLength(2);
    expect(titles(resolvedBnChapters(state))).toEqual(["চায়ের দোকান", "দীর্ঘ ফোনালাপ"]);
    expect(resolvedBnChapters(state).map((chapter) => chapter["label"])).toEqual(["২০১৯", "২০২২"]);
  });

  it("keeps the two trees aligned when the middle chapter is removed", () => {
    const state = removeGroupItem(formWith(coupleChapters), story, 1);

    expect(chaptersIn(state)).toHaveLength(2);
    expect(titles(resolvedChapters(state))).toEqual(["The Tea Stall", "The Yes"]);
    expect(titles(resolvedBnChapters(state))).toEqual(["চায়ের দোকান", "সম্মতি"]);
    expect(resolvedBnChapters(state).map((chapter) => chapter["label"])).toEqual(["২০১৯", "২০২৬"]);
  });

  it("adds an empty chapter rather than a copy of the one before it", () => {
    const state = addGroupItem(formWith(coupleChapters), story);

    expect(chaptersIn(state)).toHaveLength(4);
    expect(chaptersIn(state)[3]).toEqual({ bn: {} });

    expect(resolvedChapters(state)[3]).toMatchObject({ label: "", title: "", text: "" });
    expect(resolvedBnChapters(state)[3]).toMatchObject({ label: "", title: "", text: "" });
  });

  it("holds the list to min 1 and max 6", () => {
    // Nothing provided: the template's own first chapter comes back, as WT-17a's rule says.
    expect(titles(resolvedChapters(formWith([])))).toEqual(["The First Hello"]);
    expect(resolvedBnChapters(formWith([]))).toHaveLength(1);

    const seven = Array.from({ length: 7 }, (_, index) => ({
      title: `Chapter ${index + 1}`,
      description: "Text.",
    }));
    expect(resolvedChapters(formWith(seven))).toHaveLength(6);
    expect(resolvedBnChapters(formWith(seven))).toHaveLength(6);
  });

  it("publishes the couple's chapters and none of the sample story", () => {
    const state = formWith(coupleChapters.slice(0, 1));
    // What the publisher sends: the resolved config and the complete Bangla tree.
    const payload = JSON.stringify({
      config: resolveConfig(base, base.fields, state.values, state.touched),
      translations: resolveTranslations(
        base,
        base.fields,
        state.translations,
        state.values,
        state.touched,
      ),
    });

    expect(payload).toContain("The Tea Stall");
    expect(payload).toContain("চায়ের দোকান");
    for (const sample of ["The First Hello", "A chance meeting", "প্রথম সাক্ষাৎ", "এক পারিবারিক"]) {
      expect(payload).not.toContain(sample);
    }
  });
});

describe("story cards", () => {
  it("shows a section and one card per chapter, titled by the chapter's own title", () => {
    render(<Harness />);

    expect(screen.getByRole("heading", { name: "Our story" })).toBeInTheDocument();
    expect(headers()).toEqual([
      "Chapter 1 — The First Hello",
      "Chapter 2 — The Decision",
      "Chapter 3 — The Beginning",
    ]);
  });

  it("renders no story section for a design without story.chapters", () => {
    const withoutStory: TemplateSnapshot = {
      ...base,
      fields: base.fields.filter((field) => field.id !== "story"),
    };
    render(<Harness snapshot={withoutStory} />);

    expect(screen.queryByRole("heading", { name: "Our story" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add chapter" })).not.toBeInTheDocument();
  });

  it("opens a blank card when a chapter is added and stops at six", () => {
    render(<Harness />);

    fireEvent.click(addButton());

    expect(headers().at(-1)).toBe("Chapter 4");
    expect(chapterInput(3, "year")).toHaveValue("");
    expect(chapterInput(3, "title")).toHaveValue("");
    expect(chapterInput(3, "description")).toHaveValue("");

    for (let count = 0; count < 2; count += 1) fireEvent.click(addButton());
    expect(addButton()).toBeDisabled();
  });
});
