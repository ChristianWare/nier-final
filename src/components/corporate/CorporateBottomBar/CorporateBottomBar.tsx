"use client";

// The corporate dashboard's navigation on tablets and phones (1068px and
// below): Home, Book, Bookings and Billing, and More with Employees,
// Reports, Settings, the person's other dashboards and Log out. Shown by
// the shared PortalBottomBar.

import PortalBottomBar from "@/components/shared/PortalNav/PortalBottomBar";
import {
  CORPORATE_TAB_KEYS,
  corporateExtraLinks,
  corporateNavGroups,
  type CorporateNavCounts,
} from "@/components/corporate/CorporateSideNav/corporateNav";

type Props = CorporateNavCounts & { roles?: string[]; canBook?: boolean };

export default function CorporateBottomBar({
  roles = [],
  canBook = true,
  ...counts
}: Props) {
  return (
    <PortalBottomBar
      items={corporateNavGroups(counts, canBook).flatMap((g) => g.items)}
      tabKeys={CORPORATE_TAB_KEYS}
      rootHref='/corporate'
      label='Corporate dashboard'
      extraLinks={corporateExtraLinks(roles)}
    />
  );
}
