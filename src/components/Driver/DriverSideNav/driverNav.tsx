// The driver dashboard's pages, grouped. The desktop side nav and, at
// 1068px and below, the bottom bar (first four) and its More sheet (the
// rest) both list them from here, through the shared PortalNav.

import type {
  PortalNavGroup,
  PortalNavItem,
} from "@/components/shared/PortalNav/portalNav";
import House from "@/components/shared/icons/House/House";
import Calendar from "@/components/shared/icons/Calendar/Calendar";
import Bell from "@/components/shared/icons/Bell/Bell";
import Users from "@/components/shared/icons/Users/Users";
import Cog from "@/components/shared/icons/Cog/Cog";
import Appointments from "@/components/shared/icons/Appointments/Appointments";
import Money from "@/components/shared/icons/Money/Money";

export type DriverNavKey =
  | "overview"
  | "trips"
  | "schedule"
  | "earnings"
  | "profile"
  | "notifications"
  | "support";

export type DriverNavItem = PortalNavItem & { key: DriverNavKey };

export const DRIVER_NAV_GROUPS: { label: string; items: DriverNavItem[] }[] = [
  {
    label: "Driving",
    items: [
      {
        title: "Overview",
        short: "Home",
        href: "/driver-dashboard",
        key: "overview",
        icon: <House />,
      },
      {
        title: "Trips",
        short: "Trips",
        href: "/driver-dashboard/trips",
        key: "trips",
        icon: <Appointments />,
      },
      {
        title: "Schedule",
        short: "Schedule",
        href: "/driver-dashboard/schedule",
        key: "schedule",
        icon: <Calendar />,
      },
    ],
  },
  {
    label: "Pay",
    items: [
      {
        title: "Earnings",
        short: "Earnings",
        href: "/driver-dashboard/earnings",
        key: "earnings",
        icon: <Money />,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        title: "Profile",
        short: "Profile",
        href: "/driver-dashboard/profile",
        key: "profile",
        icon: <Users />,
      },
      {
        title: "Notifications",
        short: "Alerts",
        href: "/driver-dashboard/notifications",
        key: "notifications",
        icon: <Bell />,
      },
      {
        title: "Support",
        short: "Support",
        href: "/driver-dashboard/support",
        key: "support",
        icon: <Cog />,
      },
    ],
  },
];

export const DRIVER_NAV_ITEMS = DRIVER_NAV_GROUPS.flatMap((g) => g.items);

/** The bottom bar's tabs; the rest go in its More sheet. */
export const DRIVER_TAB_KEYS: DriverNavKey[] = [
  "overview",
  "trips",
  "schedule",
  "earnings",
];

/** The count badge for a page, if any. */
export function driverNavBadge(
  key: DriverNavKey,
  counts: {
    unreadNotificationsCount?: number;
    tripsNeedAttentionCount?: number;
    documentsAlertCount?: number;
  },
) {
  if (key === "notifications") return counts.unreadNotificationsCount ?? 0;
  if (key === "trips") return counts.tripsNeedAttentionCount ?? 0;
  if (key === "profile") return counts.documentsAlertCount ?? 0;
  return 0;
}

export type DriverNavCounts = {
  unreadNotificationsCount?: number;
  tripsNeedAttentionCount?: number;
  documentsAlertCount?: number;
};

/** The groups, with each page's count badge filled in. */
export function driverNavGroups(counts: DriverNavCounts): PortalNavGroup[] {
  return DRIVER_NAV_GROUPS.map((g) => ({
    label: g.label,
    items: g.items.map((i) => ({ ...i, badge: driverNavBadge(i.key, counts) })),
  }));
}
