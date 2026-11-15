"use client";

// The customer dashboard's navigation on tablets and phones (1068px and
// below): Home, Book, Trips and Payments, and More with Saved details,
// Notifications, Profile, Support, any other dashboards and Log out. Shown
// by the shared PortalBottomBar.

import PortalBottomBar from "@/components/shared/PortalNav/PortalBottomBar";
import {
  CUSTOMER_TAB_KEYS,
  customerExtraLinks,
  customerNavGroups,
  type CustomerNavCounts,
} from "@/components/Dashboard/DashboardSideNav/customerNav";

type Props = CustomerNavCounts & { roles?: string[] };

export default function DashboardBottomBar({ roles = [], ...counts }: Props) {
  return (
    <PortalBottomBar
      items={customerNavGroups(counts).flatMap((g) => g.items)}
      tabKeys={CUSTOMER_TAB_KEYS}
      rootHref='/dashboard'
      label='Your dashboard'
      extraLinks={customerExtraLinks(roles)}
    />
  );
}
