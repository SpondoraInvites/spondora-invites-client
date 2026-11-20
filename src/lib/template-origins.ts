/** Where to load a template's page from when its local state is ahead of what is
 *  deployed. Empty by default; delete an entry once that template redeploys.
 *  The URL must end with `/` so the `#cfg=` hash attaches to the same page. */
export const LOCAL_TEMPLATE_ORIGINS: Record<string, string> = {
  // "template6-luxury": "http://localhost:8080/",
};

export function templateOrigin(slug: string, deployed: string) {
  return LOCAL_TEMPLATE_ORIGINS[slug] ?? deployed;
}
