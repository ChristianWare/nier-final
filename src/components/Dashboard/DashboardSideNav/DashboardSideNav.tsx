"use client";

// The customer dashboard's side nav on desktop: its pages in three groups
// (customerNav.tsx), shown by the shared PortalSideNav, with links to the
// person's admin or driver dashboard when they have one.

import PortalSideNav from "@/components/shared/PortalNav/PortalSideNav";
import {
  customerExtraLinks,
  customerNavGroups,
  type CustomerNavCounts,
} from "./customerNav";

type Props = CustomerNavCounts & { roles?: string[] };

export default function DashboardSideNav({ roles = [], ...counts }: Props) {
  return (
    <PortalSideNav
      groups={customerNavGroups(counts)}
      rootHref='/dashboard'
      label='Your dashboard'
      extraLinks={customerExtraLinks(roles)}
    />
  );
}
