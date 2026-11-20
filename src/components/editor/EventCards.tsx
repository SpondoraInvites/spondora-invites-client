/**
 * The events editor (WT-17b): one collapsible card per event, with add, remove, reorder and
 * the inheritance checkbox that lets an event follow the main one's date and venue.
 *
 * All state changes go through `editor-form.ts`, so the resolver sees the same item shape
 * the preview does.
 */
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { FieldRow, type Language } from "@/components/editor/FieldRow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import type { Field } from "@/lib/canonical-fields";
import {
  addEvent,
  editEventItem,
  moveEvent,
  removeEvent,
  setEventInherits,
  type FormState,
  type FormValue,
} from "@/lib/editor-form";
import { primaryFieldId, type EventItem } from "@/lib/fields";

interface EventCardsProps {
  /** The `group` field: its `itemFields` are the inputs of one card. */
  field: Field;
  items: EventItem[];
  /** The whole form, so an inherited field can show the primary event's value. */
  values: Record<string, FormValue>;
  translations: Record<string, string>;
  /** `events.<index>.<itemId>` marks a field that no longer follows the primary. */
  touched: ReadonlySet<string>;
  language: Language;
  onChange: (update: (state: FormState) => FormState) => void;
}

const noop = () => {};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function EventCards({
  field,
  items,
  values,
  translations,
  touched,
  language,
  onChange,
}: EventCardsProps) {
  // The first card is open; the rest start collapsed so three events are not a wall.
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set([0]));
  const itemFields = field.itemFields ?? [];
  const min = Math.max(field.min ?? 0, 1);
  const max = field.max ?? Infinity;
  const itemLabel = field.itemLabel ?? "Item";

  const setOpenAt = (index: number, value: boolean) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (value) next.add(index);
      else next.delete(index);
      return next;
    });
  };

  const add = () => {
    onChange((state) => addEvent(state, field));
    setOpenAt(items.length, true);
  };

  const remove = (index: number) => {
    onChange((state) => removeEvent(state, field, index));
    // Every card below the removed one slides up, so their open state follows.
    setOpen((prev) => {
      const next = new Set<number>();
      for (const position of prev) {
        if (position < index) next.add(position);
        else if (position > index) next.add(position - 1);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const name = text(item["name"]).trim();
        const title = `${itemLabel} ${index + 1}${name ? ` — ${name}` : ""}`;
        const expanded = open.has(index);

        return (
          <Collapsible
            key={index}
            open={expanded}
            onOpenChange={(next) => setOpenAt(index, next)}
            className="rounded-lg border border-border"
          >
            <div className="flex items-center gap-1 p-1.5">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-w-0 flex-1 justify-start gap-1.5"
                  aria-expanded={expanded}
                >
                  <ChevronDown
                    className={`transition-transform ${expanded ? "" : "-rotate-90"}`}
                    aria-hidden
                  />
                  <span className="truncate">{title}</span>
                </Button>
              </CollapsibleTrigger>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Move ${title} up`}
                disabled={index === 0}
                onClick={() => onChange((state) => moveEvent(state, field, index, -1))}
              >
                <ChevronUp aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Move ${title} down`}
                disabled={index === items.length - 1}
                onClick={() => onChange((state) => moveEvent(state, field, index, 1))}
              >
                <ChevronDown aria-hidden />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={items.length <= min}
                    title={
                      items.length <= min ? "An invitation needs at least one event" : undefined
                    }
                  >
                    Remove
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove {title}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Its details are deleted from the invitation. The events after it move up one
                      card.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove(index)}>Remove</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <CollapsibleContent className="space-y-4 border-t border-border p-3">
              {itemFields.map((itemField) => {
                const key = `${field.id}.${index}.${itemField.id}`;
                const inherited = itemField.inherits === true && !touched.has(key);
                const primaryId = primaryFieldId(itemField.id);
                const primaryEnglish = text(values[primaryId]);
                const primaryBangla = translations[primaryId] ?? "";
                const bangla = item.bn?.[itemField.id];

                return (
                  <div key={itemField.id} className="space-y-2">
                    <FieldRow
                      field={itemField}
                      value={text(item[itemField.id])}
                      onChange={(_, raw) =>
                        onChange((state) => editEventItem(state, field, index, itemField, raw))
                      }
                      onBlur={noop}
                      language={language}
                      disabled={inherited}
                      placeholder={inherited ? primaryEnglish : undefined}
                      idPrefix={`${field.id}-${index}-${itemField.id}`}
                      bn={
                        itemField.bilingual
                          ? {
                              value: bangla ?? "",
                              placeholder: inherited ? primaryBangla : undefined,
                              onChange: (_, raw) =>
                                onChange((state) =>
                                  editEventItem(state, field, index, itemField, raw, true),
                                ),
                              onBlur: noop,
                            }
                          : undefined
                      }
                    />
                    {itemField.inherits && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${field.id}-${index}-${itemField.id}-inherit`}
                          checked={!inherited}
                          onCheckedChange={(checked) =>
                            onChange((state) =>
                              setEventInherits(state, field, index, itemField, checked === true),
                            )
                          }
                        />
                        <Label
                          htmlFor={`${field.id}-${index}-${itemField.id}-inherit`}
                          className="text-xs font-normal text-muted-foreground"
                        >
                          Different from the main event
                        </Label>
                      </div>
                    )}
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      <Button variant="outline" size="sm" onClick={add} disabled={items.length >= max}>
        Add {itemLabel.toLowerCase()}
      </Button>
    </div>
  );
}
