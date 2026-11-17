import { useId, useState } from "react";

import type { Field } from "@/lib/canonical-fields";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { FieldRow, type Language } from "./FieldRow";

interface FormSectionsProps {
  fields: Field[];
  values: Record<string, string>;
  /** Bangla values, keyed by field id. A field is bilingual exactly when it has a key here. */
  translations: Record<string, string>;
  errors: Record<string, string | undefined>;
  /** The localization toggle is on: Bangla is collected (WT-14c §4). */
  bilingual: boolean;
  onBilingualChange: (on: boolean) => void;
  /** The snapshot's `toggle` field. A template without one gets no toggle. */
  toggleField?: Field | undefined;
  onEdit: (field: Field, value: string, bn?: boolean) => void;
  onBlur: (field: Field, bn?: boolean) => void;
}

/** The localization toggle, the language filter, and the fields grouped by `section`,
 *  sections in the order their first field appears. */
export function FormSections({
  fields,
  values,
  translations,
  errors,
  bilingual,
  onBilingualChange,
  toggleField,
  onEdit,
  onBlur,
}: FormSectionsProps) {
  const [language, setLanguage] = useState<Language>("en");
  const toggleLabelId = useId();
  const filterId = useId();

  const sections = new Map<string, Field[]>();
  for (const field of fields) {
    const section = field.section ?? "Details";
    sections.set(section, [...(sections.get(section) ?? []), field]);
  }

  const hasBangla = Object.keys(translations).length > 0;
  const missing = fields.filter(
    (field) => field.id in translations && field.required && !(translations[field.id] ?? "").trim(),
  ).length;

  return (
    <div className="space-y-7">
      {toggleField && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
          <Label id={toggleLabelId}>{toggleField.label}</Label>
          <Switch
            aria-labelledby={toggleLabelId}
            checked={bilingual}
            onCheckedChange={onBilingualChange}
          />
        </div>
      )}

      {hasBangla && bilingual && (
        <div className="space-y-2">
          <span id={filterId} className="eyebrow text-primary">
            Editing
          </span>
          <ToggleGroup
            type="single"
            variant="outline"
            className="justify-start"
            aria-labelledby={filterId}
            value={language}
            onValueChange={(next) => next && setLanguage(next as Language)}
          >
            <ToggleGroupItem value="en">English</ToggleGroupItem>
            <ToggleGroupItem value="bn" lang="bn">
              বাংলা
              {missing > 0 && (
                <span className="text-xs text-muted-foreground">{missing} missing</span>
              )}
            </ToggleGroupItem>
            <ToggleGroupItem value="both">Both</ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {[...sections].map(([section, sectionFields]) => (
        <section key={section} className="space-y-4">
          <h2 className="eyebrow text-primary">{section}</h2>
          {sectionFields.map((field) => {
            const bn = field.id in translations ? translations[field.id] : undefined;
            return (
              <FieldRow
                key={field.id}
                field={field}
                value={values[field.id] ?? ""}
                error={errors[field.id]}
                onChange={onEdit}
                onBlur={onBlur}
                language={language}
                bn={
                  bn !== undefined && bilingual
                    ? {
                        value: bn,
                        error: errors[`${field.id}:bn`],
                        onChange: (edited, value) => onEdit(edited, value, true),
                        onBlur: (edited) => onBlur(edited, true),
                      }
                    : undefined
                }
              />
            );
          })}
        </section>
      ))}
    </div>
  );
}
