// src/lib/fleetPages.ts
//
// The website's fleet pages (/fleet/<slug>), as choices for the "Website
// fleet page" setting in Admin → Vehicle Categories. Linking a category to a
// page makes that page show the category's rates.

import { fleetData } from "@/lib/data";

export type FleetPageOption = { slug: string; title: string };

export const FLEET_PAGE_OPTIONS: FleetPageOption[] = fleetData.map((v) => ({
  slug: v.slug,
  title: v.title,
}));
