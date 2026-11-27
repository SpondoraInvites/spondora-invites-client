import { describe, expect, it } from "vitest";

import { TEMPLATE_SNAPSHOTS } from "@/data/templates";

describe("template5-premium snapshot", () => {
  const snapshot = TEMPLATE_SNAPSHOTS["template5-premium"]!;
  const defaults = snapshot.defaults;

  it("keeps the values the form and the preview rely on", () => {
    expect((defaults["couple"] as { name1?: string }).name1).toBe("Ayesha Rahman");
    expect((defaults["events"] as { calTz?: string }[])[0]?.calTz).toBe("Asia/Dhaka");
    expect((defaults["music"] as { enabled?: boolean }).enabled).toBe(true);
  });

  it("kept the locale and the Bangla translations", () => {
    expect((defaults["localization"] as { default?: string }).default).toBe("en");
    expect(Object.keys(snapshot.translations["bn"] ?? {}).length).toBeGreaterThan(0);
  });

  it("has the derived field count expected for this template", () => {
    expect(snapshot.fields).toHaveLength(15);
  });
});
