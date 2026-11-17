import { useId } from "react";
import type { ChangeEvent } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Field } from "@/lib/canonical-fields";
import { MONOGRAM_MAX } from "@/lib/field-schema";

interface FieldRowProps {
  field: Field;
  value: string;
  error?: string;
  onChange: (field: Field, value: string) => void;
  onBlur: (field: Field) => void;
}

const INPUT_TYPES = {
  tel: "tel",
  email: "email",
  datetime: "datetime-local",
  date: "date",
} as const;

/** Label, input, hint, error — one question from the data-driven form. */
export function FieldRow({ field, value, error, onChange, onBlur }: FieldRowProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const warningId = `${id}-warning`;
  const isMonogram = field.derived === "initials";

  // Soft, not an error: a long monogram still saves, it just gets cramped on the seal.
  // Spaces do not take seal width, so "A · I" is not a warning.
  const warning =
    !error && isMonogram && value.replace(/\s/g, "").length > 4
      ? "Longer monograms may not fit on the wax seal."
      : undefined;

  const describedBy =
    [field.hint && hintId, warning && warningId, error && errorId].filter(Boolean).join(" ") ||
    undefined;

  const shared = {
    id,
    value,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(field, event.target.value),
    onBlur: () => onBlur(field),
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{field.label ?? field.id}</Label>
      {field.type === "textarea" ? (
        <Textarea rows={3} {...shared} />
      ) : (
        <Input
          type={INPUT_TYPES[field.type as keyof typeof INPUT_TYPES] ?? "text"}
          maxLength={isMonogram ? MONOGRAM_MAX : undefined}
          {...shared}
        />
      )}
      {field.hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {field.hint}
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
