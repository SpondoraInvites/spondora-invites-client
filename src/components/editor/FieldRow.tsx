import { useId } from "react";
import type { ChangeEvent } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Field } from "@/lib/canonical-fields";
import { MONOGRAM_MAX } from "@/lib/field-schema";

/** Which inputs the language filter is showing. The filter only hides; state always holds both. */
export type Language = "en" | "bn" | "both";

interface BnInput {
  value: string;
  error?: string | undefined;
  /** The primary event's Bangla, shown while this item inherits it (WT-17b). */
  placeholder?: string | undefined;
  onChange: (field: Field, value: string) => void;
  onBlur: (field: Field) => void;
}

interface FieldRowProps {
  field: Field;
  value: string;
  error?: string | undefined;
  onChange: (field: Field, value: string) => void;
  onBlur: (field: Field) => void;
  /** Present only for a bilingual field whose Bangla path the snapshot carries (WT-14c). */
  bn?: BnInput | undefined;
  language?: Language;
  /** An inherited event field: shown but not editable until "different" is checked. */
  disabled?: boolean;
  /** The primary event's value, shown while this one follows it. */
  placeholder?: string | undefined;
  /** Namespaces the Bangla input's id: one event card holds the same field ids again. */
  idPrefix?: string | undefined;
}

interface InputBlockProps {
  id: string;
  label: string;
  field: Field;
  value: string;
  error?: string | undefined;
  hint?: string | undefined;
  warning?: string | undefined;
  maxLength?: number | undefined;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
  onChange: (field: Field, value: string) => void;
  onBlur: (field: Field) => void;
}

const INPUT_TYPES = {
  tel: "tel",
  email: "email",
  datetime: "datetime-local",
  date: "date",
} as const;

/** Label, input, hint, warning, error — one question in one language. */
function InputBlock({
  id,
  label,
  field,
  value,
  error,
  hint,
  warning,
  maxLength,
  disabled,
  placeholder,
  onChange,
  onBlur,
}: InputBlockProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const warningId = `${id}-warning`;

  const describedBy =
    [hint && hintId, warning && warningId, error && errorId].filter(Boolean).join(" ") || undefined;

  const shared = {
    id,
    value,
    disabled,
    placeholder,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(field, event.target.value),
    onBlur: () => onBlur(field),
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {field.type === "textarea" ? (
        <Textarea rows={3} {...shared} />
      ) : (
        <Input
          type={INPUT_TYPES[field.type as keyof typeof INPUT_TYPES] ?? "text"}
          maxLength={maxLength}
          {...shared}
        />
      )}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {warning && (
        <p id={warningId} className="text-xs text-amber-600">
          {warning}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** One question from the data-driven form: the English input and, for a bilingual field,
 *  a Bangla one beside it. `hidden` rather than unmounting, so switching the filter never
 *  loses what was typed or which input had focus. */
export function FieldRow({
  field,
  value,
  error,
  onChange,
  onBlur,
  bn,
  language = "both",
  disabled,
  placeholder,
  idPrefix,
}: FieldRowProps) {
  const generatedId = useId();
  // A group repeats the same field ids, so the card hands in a namespaced prefix instead.
  const enId = idPrefix ?? generatedId;
  const isMonogram = field.derived === "initials";

  // Soft, not an error: a long monogram still saves, it just gets cramped on the seal.
  // Spaces do not take seal width, so "A · I" is not a warning.
  const warning =
    !error && isMonogram && value.replace(/\s/g, "").length > 4
      ? "Longer monograms may not fit on the wax seal."
      : undefined;

  return (
    <div className="space-y-3">
      <div hidden={language === "bn"}>
        <InputBlock
          id={enId}
          label={field.label ?? field.id}
          field={field}
          value={value}
          error={error}
          hint={field.hint}
          warning={warning}
          maxLength={isMonogram ? MONOGRAM_MAX : undefined}
          disabled={disabled}
          placeholder={placeholder}
          onChange={onChange}
          onBlur={onBlur}
        />
      </div>
      {bn && (
        <div lang="bn" hidden={language === "en"}>
          <InputBlock
            id={`${idPrefix ?? field.id}-bn`}
            label={field.labelBn ?? field.label ?? field.id}
            field={field}
            value={bn.value}
            error={bn.error}
            disabled={disabled}
            placeholder={bn.placeholder}
            onChange={bn.onChange}
            onBlur={bn.onBlur}
          />
        </div>
      )}
    </div>
  );
}
