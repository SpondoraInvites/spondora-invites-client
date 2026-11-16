import type { Field } from "@/lib/canonical-fields";

import { FieldRow } from "./FieldRow";

interface FormSectionsProps {
  fields: Field[];
  values: Record<string, string>;
  errors: Record<string, string | undefined>;
  onChange: (field: Field, value: string) => void;
  onBlur: (field: Field) => void;
}

/** Fields grouped by `section`, sections in the order their first field appears. */
export function FormSections({ fields, values, errors, onChange, onBlur }: FormSectionsProps) {
  const sections = new Map<string, Field[]>();
  for (const field of fields) {
    const section = field.section ?? "Details";
    sections.set(section, [...(sections.get(section) ?? []), field]);
  }

  return (
    <div className="space-y-7">
      {[...sections].map(([section, sectionFields]) => (
        <section key={section} className="space-y-4">
          <h2 className="eyebrow text-primary">{section}</h2>
          {sectionFields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              value={values[field.id] ?? ""}
              error={errors[field.id]}
              onChange={onChange}
              onBlur={onBlur}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
