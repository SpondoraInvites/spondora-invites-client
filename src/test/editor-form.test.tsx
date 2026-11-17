import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FieldRow } from "@/components/editor/FieldRow";
import { FormSections } from "@/components/editor/FormSections";
import { TEMPLATE_SNAPSHOTS } from "@/data/templates/index";
import type { Field } from "@/lib/canonical-fields";
import { seedTranslations, seedValues } from "@/lib/editor-form";
import { scalarFields, type TemplateSnapshot } from "@/lib/fields";

const base = TEMPLATE_SNAPSHOTS["template5-premium"]!;
const noop = () => {};
const toggleField = base.fields.find((field) => field.type === "toggle");

/** The Bangla inputs the form mounted, by their `-bn` id. */
function banglaInputs(): Element[] {
  return Array.from(document.querySelectorAll('input[id$="-bn"], textarea[id$="-bn"]'));
}

function renderForm(
  snapshot: TemplateSnapshot,
  fields: Field[],
  options: { bilingual?: boolean; errors?: Record<string, string | undefined> } = {},
) {
  return render(
    <FormSections
      fields={fields}
      values={seedValues(snapshot, fields)}
      translations={seedTranslations(snapshot, fields)}
      errors={options.errors ?? {}}
      bilingual={options.bilingual ?? true}
      onBilingualChange={noop}
      toggleField={snapshot.fields.find((field) => field.type === "toggle")}
      onEdit={noop}
      onBlur={noop}
    />,
  );
}

/** Labels in DOM order, so a missing or reordered question fails the test. */
function labels(): string[] {
  return Array.from(document.querySelectorAll("label")).map((label) => label.textContent ?? "");
}

describe("the editor form", () => {
  it("shows template5-premium's fields, grouped, and nothing else", () => {
    renderForm(base, scalarFields(base));

    expect(labels()).toEqual([
      "Publish the Bangla version",
      "Partner 1 name",
      "১ম সাথীর নাম",
      "Partner 2 name",
      "২য় সাথীর নাম",
      "Monogram letters",
      "Bride's family line",
      "কনের পারিবারিক পরিচয়",
      "Groom's family line",
      "বরের পারিবারিক পরিচয়",
      "Venue name",
      "স্থানের নাম",
      "Address",
      "ঠিকানা",
      "Google Maps search",
      "Wedding date & time",
      "WhatsApp number",
      "Reply by",
    ]);
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(["Couple", "Family", "Where", "When", "RSVP"]);
  });

  it("renders the reply-by deadline as a date input", () => {
    renderForm(base, scalarFields(base));

    expect(screen.getByLabelText("Reply by")).toHaveAttribute("type", "date");
  });

  it("renders no deadline input when the template has no rsvp.deadline", () => {
    // The sync script only emits the field for a template whose config has the path.
    const withoutDeadline = {
      ...base,
      fields: base.fields.filter((field) => field.id !== "rsvpDeadline"),
    };
    renderForm(withoutDeadline, scalarFields(withoutDeadline));

    expect(labels()).not.toContain("Reply by");
  });

  it("renders no family line when the template has no welcome.parents1 path", () => {
    // The sync script derives `fields` from paths, so a missing path means a missing entry.
    const withoutParents = {
      ...base,
      fields: base.fields.filter((field) => field.id !== "familyLine1"),
    };
    renderForm(base, scalarFields(withoutParents));

    expect(labels()).not.toContain("Bride's family line");
    expect(labels()).toContain("Groom's family line");
  });
});

describe("bilingual inputs", () => {
  const fields = scalarFields(base);

  it("gives every field the bn tree carries a Bangla input, and no other field one", () => {
    renderForm(base, fields);

    // Both names, both family lines, the venue name and its address.
    expect(banglaInputs()).toHaveLength(6);
    expect(document.getElementById("partner1Name-bn")).toHaveValue("আয়েশা রহমান");
    expect(document.getElementById("eventDateTime-bn")).toBeNull();
    expect(document.getElementById("rsvpWhatsapp-bn")).toBeNull();
    // Every required Bangla value is already filled, so no badge.
    expect(screen.queryByText(/missing/)).toBeNull();
  });

  it("labels each Bangla input with its own field, not a shared word", () => {
    renderForm(base, fields);

    const banglaLabels = banglaInputs().map(
      (input) => document.querySelector(`label[for="${input.id}"]`)?.textContent ?? "",
    );

    expect(banglaLabels).toEqual([
      "১ম সাথীর নাম",
      "২য় সাথীর নাম",
      "কনের পারিবারিক পরিচয়",
      "বরের পারিবারিক পরিচয়",
      "স্থানের নাম",
      "ঠিকানা",
    ]);
    expect(new Set(banglaLabels).size).toBe(banglaLabels.length);
  });

  it("removes the Bangla inputs and their errors when the toggle is off, and restores both", () => {
    const errors = { "partner1Name:bn": "This is required." };
    const { rerender } = renderForm(base, fields, { bilingual: true, errors });
    const html = (bilingual: boolean) => (
      <FormSections
        fields={fields}
        values={seedValues(base, fields)}
        translations={seedTranslations(base, fields)}
        errors={errors}
        bilingual={bilingual}
        onBilingualChange={noop}
        toggleField={toggleField}
        onEdit={noop}
        onBlur={noop}
      />
    );

    expect(banglaInputs()).toHaveLength(6);
    expect(screen.getByText("This is required.")).toBeInTheDocument();

    rerender(html(false));
    expect(banglaInputs()).toHaveLength(0);
    expect(screen.queryByText("This is required.")).toBeNull();
    // Nothing could have held focus or reported an error in its place.
    expect(screen.queryByLabelText("১ম সাথীর নাম")).toBeNull();

    rerender(html(true));
    expect(banglaInputs()).toHaveLength(6);
    expect(screen.getByText("This is required.")).toBeInTheDocument();
    // The values survived the round trip because the toggle never touched them.
    expect(document.getElementById("partner1Name-bn")).toHaveValue("আয়েশা রহমান");
  });

  it("renders no Bangla input and no filter when the template has no bn tree", () => {
    const englishOnly: TemplateSnapshot = { ...base, translations: {} };
    renderForm(englishOnly, fields);

    expect(banglaInputs()).toHaveLength(0);
    expect(screen.queryByRole("radio", { name: "Both" })).toBeNull();
    // The toggle still renders: it is a config field, not a translation.
    expect(screen.getByRole("switch", { name: "Publish the Bangla version" })).toBeInTheDocument();
  });

  it("copes with a snapshot whose translations are null", () => {
    const unMigrated = { ...base, translations: null } as unknown as TemplateSnapshot;
    renderForm(unMigrated, fields);

    expect(banglaInputs()).toHaveLength(0);
    expect(screen.queryByText(/১ম সাথীর নাম/)).toBeNull();
  });

  it("counts a field whose Bangla is empty although the English is filled", () => {
    // `missing` is what the publish gate will read: English alone is not enough.
    render(
      <FormSections
        fields={fields}
        values={seedValues(base, fields)}
        translations={{ ...seedTranslations(base, fields), venueName: "", venueAddress: " " }}
        errors={{}}
        bilingual
        onBilingualChange={noop}
        toggleField={toggleField}
        onEdit={noop}
        onBlur={noop}
      />,
    );

    expect(screen.getByLabelText("Venue name")).toHaveValue("Lakeshore Grand Ballroom");
    expect(screen.getByText("2 missing")).toBeInTheDocument();
  });

  it("keeps both values and the pair label when the filter switches", () => {
    renderForm(base, fields);
    const english = () => screen.getByLabelText("Partner 1 name") as HTMLInputElement;

    expect(english()).toBeVisible();
    expect(document.getElementById("partner1Name-bn")).not.toBeVisible();

    fireEvent.click(screen.getByRole("radio", { name: "Both" }));
    expect(english()).toBeVisible();
    expect(english().value).toBe("Ayesha Rahman");
    expect(document.getElementById("partner1Name-bn")).toBeVisible();
    expect(document.getElementById("partner1Name-bn")).toHaveValue("আয়েশা রহমান");

    fireEvent.click(screen.getByRole("radio", { name: /বাংলা/ }));
    expect(english()).not.toBeVisible();
    expect(english().value).toBe("Ayesha Rahman");
    expect(document.getElementById("partner1Name-bn")).toBeVisible();
    expect(document.getElementById("partner1Name-bn")).toHaveValue("আয়েশা রহমান");
  });

  it("tells a screen reader which of the pair is Bangla", () => {
    renderForm(base, fields);

    const bangla = document.getElementById("partner1Name-bn")!;
    expect(bangla.closest("[lang]")).toHaveAttribute("lang", "bn");
    expect(screen.getByLabelText("১ম সাথীর নাম")).toBe(bangla);
    expect(screen.getByLabelText("Partner 1 name")).not.toBe(bangla);
  });
});

describe("FieldRow", () => {
  const text: Field = {
    id: "partner1Name",
    path: ["couple", "name1"],
    type: "text",
    label: "Partner 1 name",
  };

  it("wires the label, hint, error and aria-invalid to the input", () => {
    render(
      <FieldRow
        field={{ ...text, hint: "As printed on the card", required: true }}
        value=""
        error="This is required."
        onChange={noop}
        onBlur={noop}
      />,
    );

    const input = screen.getByLabelText("Partner 1 name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("As printed on the card This is required.");
  });

  it("warns past four monogram characters without rejecting the value", () => {
    render(
      <FieldRow
        field={{ ...text, id: "monogramInitials", derived: "initials", label: "Monogram letters" }}
        value="SUMAIYA"
        onChange={noop}
        onBlur={noop}
      />,
    );

    expect(screen.getByText("Longer monograms may not fit on the wax seal.")).toBeInTheDocument();
    expect(screen.getByLabelText("Monogram letters")).not.toHaveAttribute("aria-invalid", "true");
  });

  it('does not warn about the template\'s own "A · I"', () => {
    render(
      <FieldRow
        field={{ ...text, id: "monogramInitials", derived: "initials", label: "Monogram letters" }}
        value="A · I"
        onChange={noop}
        onBlur={noop}
      />,
    );

    expect(screen.queryByText("Longer monograms may not fit on the wax seal.")).toBeNull();
  });

  it("renders the Bangla input with its own id, lang and error", () => {
    render(
      <FieldRow
        field={{ ...text, bilingual: true, labelBn: "১ম সাথীর নাম" }}
        value="Ayesha Rahman"
        onChange={noop}
        onBlur={noop}
        language="both"
        bn={{ value: "আয়েশা রহমান", error: "This is required.", onChange: noop, onBlur: noop }}
      />,
    );

    const bangla = document.getElementById("partner1Name-bn")!;
    expect(bangla).toHaveValue("আয়েশা রহমান");
    expect(bangla).toHaveAttribute("aria-invalid", "true");
    expect(bangla.closest("[lang]")).toHaveAttribute("lang", "bn");
    expect(screen.getByLabelText("১ম সাথীর নাম")).toBe(bangla);
  });

  it("falls back to the English label when a bilingual field has no Bangla one", () => {
    render(
      <FieldRow
        field={{ ...text, bilingual: true }}
        value="Ayesha Rahman"
        onChange={noop}
        onBlur={noop}
        bn={{ value: "", onChange: noop, onBlur: noop }}
      />,
    );

    expect(document.getElementById("partner1Name-bn")).toHaveAccessibleName("Partner 1 name");
  });
});
