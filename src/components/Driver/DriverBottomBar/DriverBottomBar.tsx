"use client";

// The driver dashboard's navigation on tablets and phones (1068px and
// below): Home, Trips, Schedule and Earnings, and More with Profile,
// Notifications, Support, the customer dashboard and Log out. Shown by the
// shared PortalBottomBar. A trip's page has its own action bar along the
// bottom, so this one stays away there.

import PortalBottomBar from "@/components/shared/PortalNav/PortalBottomBar";
import {
  DRIVER_TAB_KEYS,
  driverNavGroups,
  type DriverNavCounts,
} from "@/components/Driver/DriverSideNav/driverNav";

const TRIP_PAGE = /^\/driver-dashboard\/trips\/[^/]+/;

export default function DriverBottomBar(counts: DriverNavCounts) {
  return (
    <PortalBottomBar
      items={driverNavGroups(counts).flatMap((g) => g.items)}
      tabKeys={DRIVER_TAB_KEYS}
      rootHref='/driver-dashboard'
      label='Driver dashboard'
      extraLinks={[{ title: "User dashboard", href: "/dashboard" }]}
      hideOn={TRIP_PAGE}
    />
  );
}
