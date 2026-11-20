/**
 * The entry point into the editor. One design is editable today, so this is a redirect;
 * it becomes the picker grid (WT-7) once a second design is migrated.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

import { TEMPLATE_SLUGS } from "@/data/templates";

export const Route = createFileRoute("/create")({
  // This file is also the parent route of /create/$templateSlug, so its beforeLoad runs
  // for the editor itself too: redirect only the bare path, never the design page.
  beforeLoad: ({ location }) => {
    if (location.pathname !== "/create") return;
    throw redirect({ to: "/create/$templateSlug", params: { templateSlug: TEMPLATE_SLUGS[0]! } });
  },
});
