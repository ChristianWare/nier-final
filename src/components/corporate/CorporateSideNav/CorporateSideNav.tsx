"use client";

// The corporate dashboard's side nav on desktop: its pages in four groups
// (corporateNav.tsx), shown by the shared PortalSideNav, then the person's
// other dashboards and Sign out.

import PortalSideNav from "@/components/shared/PortalNav/PortalSideNav";
import {
  corporateExtraLinks,
  corporateNavGroups,
  type CorporateNavCounts,
} from "./corporateNav";

type Props = CorporateNavCounts & {
  roles?: string[];
  /** False while the account is suspended. */
  canBook?: boolean;
};

export default function CorporateSideNav({
  roles = [],
  canBook = true,
  ...counts
}: Props) {
  return (
    <PortalSideNav
      groups={corporateNavGroups(counts, canBook)}
      rootHref='/corporate'
      label='Corporate dashboard'
      extraLinks={corporateExtraLinks(roles)}
    />
  );
}
