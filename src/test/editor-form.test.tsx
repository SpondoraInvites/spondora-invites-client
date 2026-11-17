import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FieldRow } from "@/components/editor/FieldRow";
import { FormSections } from "@/components/editor/FormSections";
import { TEMPLATE_SNAPSHOTS } from "@/data/templates/index";
import type { Field } from "@/lib/canonical-fields";
import { seedValues } from "@/lib/editor-form";
import { scalarFields, type TemplateSnapshot } from "@/lib/fields";

const base = TEMPLATE_SNAPSHOTS["template5-premium"]!;
const noop = () => {};

function renderForm(snapshot: TemplateSnapshot, fields: Field[]) {
  return render(
    <FormSections
      fields={fields}
      values={seedValues(snapshot, fields)}
      errors={{}}
      onChange={noop}
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
      "Partner 1 name",
      "Partner 2 name",
      "Monogram letters",
      "Bride's family line",
      "Groom's family line",
      "Venue name",
      "Address",
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
});
