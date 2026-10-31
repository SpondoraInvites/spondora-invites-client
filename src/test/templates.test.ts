import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { getTemplate, templates } from "@/data/templates";

it("uses the custom domain for template 1 Luxury", () => {
  expect(getTemplate("template1-luxury")?.previewUrl).toBe(
    "https://template1-luxury.spondorainvites.com/",
  );
});

it("lists template 5 as Premium with its live preview and cover", () => {
  const template = getTemplate("template5-premium");

  expect(template).toMatchObject({
    tier: "premium",
    previewUrl: "https://template5-premium.pages.dev/",
    languages: ["en", "bn"],
  });
  expect(templates.filter((item) => item.slug === template?.slug)).toHaveLength(1);
  expect(existsSync(resolve("public", template!.cover.slice(1)))).toBe(true);
});

it("lists template 6 as Luxury with its live preview and cover", () => {
  const template = getTemplate("template6-luxury");

  expect(template).toMatchObject({
    tier: "luxury",
    previewUrl: "https://template6-luxury.spondorainvites.com/",
    languages: ["en"],
  });
  expect(templates.filter((item) => item.slug === template?.slug)).toHaveLength(1);
  expect(existsSync(resolve("public", template!.cover.slice(1)))).toBe(true);
});
