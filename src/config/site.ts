// Nier's name, address and contact details, for the dashboards' shared
// code (calendar invites, support links, the greet sign). Company settings
// (Admin → Company) take priority wherever they're set.

import { SITE_URL } from "@/lib/site";

export const SITE = {
  name: "Nier Transportation",
  url: SITE_URL,
  phone: { display: "(480) 300-6003", tel: "+14803006003" },
  email: { support: "support@niertransportation.com" },
} as const;
