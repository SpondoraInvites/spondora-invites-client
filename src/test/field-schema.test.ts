import { describe, expect, it } from "vitest";

import type { Field } from "@/lib/canonical-fields";
import {
  normaliseHashtag,
  normaliseMonogram,
  normaliseTel,
  validateField,
} from "@/lib/field-schema";

const field = (overrides: Partial<Field> = {}): Field => ({
  id: "test",
  path: ["test"],
  type: "text",
  ...overrides,
});

describe("validateField", () => {
  it("rejects an empty required text, but not the same value when optional", () => {
    const required = field({ required: true });
    expect(validateField(required, "")).toBe("This is required.");
    expect(validateField(required, "   ")).toBe("This is required.");
    expect(validateField(required, "Ayesha Rahman")).toBeUndefined();
    expect(validateField(field(), "")).toBeUndefined();
  });

  it("allows an empty email but not a malformed one", () => {
    const email = field({ type: "email", required: false });
    expect(validateField(email, "")).toBeUndefined();
    expect(validateField(email, "x@y")).toBe("Enter a valid email address.");
    expect(validateField(email, "x@y.com")).toBeUndefined();
  });

  it("checks the WhatsApp number after normalising it", () => {
    expect(normaliseTel("+880 1353-218337")).toBe("8801353218337");

    const tel = field({ type: "tel", required: true });
    expect(validateField(tel, "+880 1353-218337")).toBeUndefined();
    expect(validateField(tel, "1234567")).toBe("Enter 8–15 digits, including the country code.");
    expect(validateField(tel, "1234567890123456")).toBe(
      "Enter 8–15 digits, including the country code.",
    );
  });
});

describe("the monogram", () => {
  const initials = field({ derived: "initials" });

  it("accepts the separators a seal can draw", () => {
    for (const value of ["S&Z", "A · I", "M&R"]) {
      expect(validateField(initials, value), value).toBeUndefined();
    }
  });

  it("rejects Bengali rather than shrinking it onto a Latin seal", () => {
    expect(validateField(initials, "স&জ")).toBe(
      "Use Latin letters, & · . ' - and spaces, 1–8 characters.",
    );
  });

  it("trims the ends and keeps the inner spacing", () => {
    expect(normaliseMonogram("  S  &  Z ")).toBe("S  &  Z");
    expect(validateField(initials, "  S  &  Z ")).toBeUndefined();
  });

  it("rejects more than 8 characters", () => {
    expect(validateField(initials, "Sumaiya&Zayan")).toContain("1–8 characters");
  });
});

describe("the hashtag", () => {
  it("keeps exactly one leading # and leaves a cleared field empty", () => {
    expect(normaliseHashtag("AyeshaAndImran")).toBe("#AyeshaAndImran");
    expect(normaliseHashtag("##AyeshaAndImran")).toBe("#AyeshaAndImran");
    expect(normaliseHashtag("")).toBe("");
  });
});
