import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { getTemplate, templates } from "@/data/templates";

it("lists template 5 as Premium with its live preview and cover", () => {
  const template = getTemplate("template5-premium");

  expect(template).toMatchObject({
    tier: "premium",
    previewUrl: "https://spondora-template5-premium.netlify.app/",
    languages: ["en", "bn"],
  });
  expect(templates.filter((item) => item.slug === template?.slug)).toHaveLength(1);
  expect(existsSync(resolve("public", template!.cover.slice(1)))).toBe(true);
});

it("lists template 6 as Luxury with its live preview and cover", () => {
  const template = getTemplate("template6-luxury");

  expect(template).toMatchObject({
    tier: "luxury",
    previewUrl: "https://template-6-luxury.spondorainvites.com/",
    languages: ["en"],
  });
  expect(templates.filter((item) => item.slug === template?.slug)).toHaveLength(1);
  expect(existsSync(resolve("public", template!.cover.slice(1)))).toBe(true);
});
