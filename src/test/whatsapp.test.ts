import { describe, expect, it } from "vitest";
import { orderMessage, whatsappLink, site } from "@/data/site";

describe("WhatsApp ordering", () => {
  it("pre-fills the chosen template and tier", () => {
    expect(orderMessage("Wine Seal", "Premium")).toBe(
      "Hi Spondora, I'd like the *Wine Seal* (Premium) invitation.",
    );
  });
  it("opens a chat with the business number", () => {
    expect(whatsappLink("hi")).toBe(`https://wa.me/${site.whatsapp}?text=hi`);
  });
});
