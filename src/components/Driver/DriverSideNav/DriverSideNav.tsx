"use client";

// The driver dashboard's side nav on desktop: its pages in three groups
// (driverNav.tsx), shown by the shared PortalSideNav.

import PortalSideNav from "@/components/shared/PortalNav/PortalSideNav";
import { driverNavGroups, type DriverNavCounts } from "./driverNav";

export type DriverSideNavProps = DriverNavCounts;

export default function DriverSideNav(counts: DriverSideNavProps) {
  return (
    <PortalSideNav
      groups={driverNavGroups(counts)}
      rootHref='/driver-dashboard'
      label='Driver dashboard'
    />
  );
}
