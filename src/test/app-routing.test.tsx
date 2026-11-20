import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { TEMPLATE_SLUGS } from "@/data/templates";
import { Route as DesignRoute } from "@/routes/create.$templateSlug";

function testRouter() {
  return createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory(),
  });
}

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = testRouter();

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("sends /create to the only design the editor can open", async () => {
    const router = testRouter();

    await router.navigate({ to: "/create" });

    expect(router.state.location.pathname).toBe(`/create/${TEMPLATE_SLUGS[0]}`);
  });

  it("marks an unknown design as not found instead of rendering an empty editor", () => {
    const loader = DesignRoute.options.loader as unknown as (args: {
      params: { templateSlug: string };
    }) => unknown;

    expect(() => loader({ params: { templateSlug: "nope" } })).toThrow();
    expect(loader({ params: { templateSlug: TEMPLATE_SLUGS[0]! } })).toBeDefined();
  });
});
