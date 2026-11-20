import { useId, useState } from "react";

import type { Field } from "@/lib/canonical-fields";
import { sectionGroups, type FormState, type FormValue } from "@/lib/editor-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { EventCards } from "./EventCards";
import { FieldRow, type Language } from "./FieldRow";

interface FormSectionsProps {
  fields: Field[];
  /** Text per field id. The toggle and the group items live here too: the toggle is a
   *  boolean, an event is an `EventItem[]`, and those render as their own widgets. */
  values: Record<string, FormValue>;
  /** Bangla values, keyed by field id. A field is bilingual exactly when it has a key here. */
  translations: Record<string, string>;
  /** The messages to show, already gated on whether the input was left (WT-17d). */
  errors: Record<string, string | undefined>;
  /** The localization toggle is on: Bangla is collected (WT-14c §4). */
  bilingual: boolean;
  onBilingualChange: (on: boolean) => void;
  /** The snapshot's `toggle` field. A template without one gets no toggle. */
  toggleField?: Field | undefined;
  /** `events.<index>.<itemId>` keys: which event fields stopped following the primary. */
  touched: ReadonlySet<string>;
  onEdit: (field: Field, value: string, bn?: boolean) => void;
  onBlur: (field: Field, bn?: boolean) => void;
  /** The group cards own no state: they hand the next form to the editor (WT-17b). */
  onGroupChange: (update: (state: FormState) => FormState) => void;
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
  touched,
  onEdit,
  onBlur,
  onGroupChange,
}: FormSectionsProps) {
  const [language, setLanguage] = useState<Language>("en");
  const toggleLabelId = useId();
  const filterId = useId();

  const hasBangla = Object.keys(translations).length > 0;

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
            </ToggleGroupItem>
            <ToggleGroupItem value="both">Both</ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {sectionGroups(fields).map(([section, sectionFields]) => (
        <section key={section} className="space-y-4">
          <h2 className="eyebrow text-primary">{section}</h2>
          {sectionFields.map((field) => {
            if (field.type === "group") {
              const items = values[field.id];
              return (
                <EventCards
                  key={field.id}
                  field={field}
                  items={Array.isArray(items) ? items : []}
                  values={values}
                  translations={translations}
                  touched={touched}
                  errors={errors}
                  bilingual={bilingual}
                  language={language}
                  onChange={onGroupChange}
                />
              );
            }
            const bn = field.id in translations ? translations[field.id] : undefined;
            const value = values[field.id];
            return (
              <FieldRow
                key={field.id}
                field={field}
                value={typeof value === "string" ? value : ""}
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
