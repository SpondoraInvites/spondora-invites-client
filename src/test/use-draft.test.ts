import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TEMPLATE_SNAPSHOTS } from "@/data/templates";
import { draftKey, useDraft } from "@/hooks/use-draft";
import { seedTranslations, seedValues, type FormState } from "@/lib/editor-form";
import { scalarFields } from "@/lib/fields";

const snapshot = TEMPLATE_SNAPSHOTS["template5-premium"]!;
const template = snapshot.manifest.slug;
const key = draftKey(template);
const fields = scalarFields(snapshot);
const toggle = snapshot.fields.find((field) => field.type === "toggle")!;

/** A fresh seed per render: the hook may keep and replace the object it is given. */
function seed(): FormState {
  return {
    values: seedValues(snapshot, [...fields, toggle]),
    translations: seedTranslations(snapshot, fields),
    touched: new Set<string>(),
  };
}

function renderDraft() {
  // One seed for the hook's lifetime: a new object per render would keep re-reading.
  const initial = seed();
  return renderHook(() => useDraft(snapshot, initial));
}

/** A stored draft with only the keys a test cares about. */
function put(payload: Record<string, unknown>) {
  localStorage.setItem(
    key,
    JSON.stringify({
      schemaVersion: 1,
      template,
      values: {},
      translations: {},
      touched: [],
      slug: null,
      savedAt: "2026-11-14T10:22:00.000Z",
      ...payload,
    }),
  );
}

/** Run the debounced write. */
function flush() {
  act(() => {
    vi.advanceTimersByTime(500);
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDraft", () => {
  it("restores the values after a re-mount", () => {
    const first = renderDraft();
    act(() => {
      first.result.current.setForm((prev) => ({
        ...prev,
        values: { ...prev.values, partner1Name: "Sumaiya" },
      }));
    });
    flush();
    expect(first.result.current.status).toBe("saved");
    first.unmount();

    const second = renderDraft();
    expect(second.result.current.form.values["partner1Name"]).toBe("Sumaiya");
  });

  it("discards a draft from another schema version", () => {
    put({ schemaVersion: 2, values: { partner1Name: "Sumaiya" } });
    const { result } = renderDraft();

    expect(result.current.form.values["partner1Name"]).toBe(
      seedValues(snapshot, [...fields, toggle])["partner1Name"],
    );
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("discards a draft written for another template", () => {
    put({ template: "template1-luxury", values: { partner1Name: "Sumaiya" } });
    const { result } = renderDraft();

    expect(result.current.form.values["partner1Name"]).not.toBe("Sumaiya");
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("discards corrupt JSON and removes the key", () => {
    localStorage.setItem(key, "{not json");
    const { result } = renderDraft();

    expect(result.current.form.values["partner1Name"]).toBe(
      seedValues(snapshot, [...fields, toggle])["partner1Name"],
    );
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("does not merge a field the template no longer has", () => {
    put({ values: { partner1Name: "Sumaiya", removedField: "left over" } });
    const { result } = renderDraft();

    expect(result.current.form.values["partner1Name"]).toBe("Sumaiya");
    expect("removedField" in result.current.form.values).toBe(false);
  });

  it("round-trips touched as a Set", () => {
    put({ touched: ["hashtag", "partner1Name:bn"] });
    const { result } = renderDraft();

    expect(result.current.form.touched).toBeInstanceOf(Set);
    expect([...result.current.form.touched]).toEqual(["hashtag", "partner1Name:bn"]);
  });

  it("keeps a false boolean false instead of stringifying or dropping it", () => {
    put({ values: { localizationEnabled: false } });
    const { result } = renderDraft();

    expect(result.current.form.values["localizationEnabled"]).toBe(false);
  });

  it("loads a draft without translations or touched with empty defaults", () => {
    put({ values: { partner1Name: "Sumaiya" }, translations: undefined, touched: undefined });
    const { result } = renderDraft();

    expect(result.current.form.translations).toEqual({});
    expect(result.current.form.touched.size).toBe(0);
    expect(result.current.form.values["partner1Name"]).toBe("Sumaiya");
  });

  it("persists the slug without changing the values", () => {
    const before = seedValues(snapshot, [...fields, toggle]);
    const first = renderDraft();
    act(() => first.result.current.setSlug("sumaiya-and-zayan"));
    flush();
    first.unmount();

    const second = renderDraft();
    expect(second.result.current.savedSlug).toBe("sumaiya-and-zayan");
    expect(second.result.current.form.values).toEqual(before);
  });

  it("clears the draft and goes back to the sample values", () => {
    const before = seedValues(snapshot, [...fields, toggle]);
    const { result } = renderDraft();
    act(() => {
      result.current.setForm((prev) => ({
        ...prev,
        values: { ...prev.values, partner1Name: "Sumaiya" },
      }));
    });
    flush();

    act(() => result.current.clear());

    expect(localStorage.getItem(key)).toBeNull();
    expect(result.current.form.values).toEqual(before);
    expect(result.current.savedSlug).toBeNull();
    expect(result.current.status).toBe("idle");
  });
});
