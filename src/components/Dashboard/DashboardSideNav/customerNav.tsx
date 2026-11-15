// The customer dashboard's pages, grouped. The desktop side nav and, at
// 1068px and below, the bottom bar (first four) and its More sheet (the
// rest) both list them from here, through the shared PortalNav.

import type {
  PortalExtraLink,
  PortalNavGroup,
  PortalNavItem,
} from "@/components/shared/PortalNav/portalNav";
import House from "@/components/shared/icons/House/House";
import Car from "@/components/shared/icons/Car/Car";
import Appointments from "@/components/shared/icons/Appointments/Appointments";
import Receipt from "@/components/shared/icons/Receipt/Receipt";
import Location from "@/components/shared/icons/Location/Location";
import Bell from "@/components/shared/icons/Bell/Bell";
import Users from "@/components/shared/icons/Users/Users";
import Support from "@/components/shared/icons/Support/Support";

export type CustomerNavKey =
  | "overview"
  | "book"
  | "trips"
  | "payments"
  | "saved"
  | "notifications"
  | "profile"
  | "support";

type CustomerNavItem = PortalNavItem & { key: CustomerNavKey };

export const CUSTOMER_NAV_GROUPS: {
  label: string;
  items: CustomerNavItem[];
}[] = [
  {
    label: "Rides",
    items: [
      {
        title: "Overview",
        short: "Home",
        href: "/dashboard",
        key: "overview",
        icon: <House />,
      },
      {
        title: "Book a ride",
        short: "Book",
        href: "/book",
        key: "book",
        icon: <Car />,
      },
      {
        title: "My trips",
        short: "Trips",
        href: "/dashboard/trips",
        key: "trips",
        icon: <Appointments />,
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        title: "Payments & receipts",
        short: "Payments",
        href: "/dashboard/payments",
        key: "payments",
        icon: <Receipt />,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        title: "Saved details",
        short: "Saved",
        href: "/dashboard/saved",
        key: "saved",
        icon: <Location />,
      },
      {
        title: "Notifications",
        short: "Alerts",
        href: "/dashboard/notifications",
        key: "notifications",
        icon: <Bell />,
      },
      {
        title: "Profile & security",
        short: "Profile",
        href: "/dashboard/profile",
        key: "profile",
        icon: <Users />,
      },
      {
        title: "Support",
        short: "Support",
        href: "/dashboard/support",
        key: "support",
        icon: <Support />,
      },
    ],
  },
];

/** The bottom bar's tabs; the rest go in its More sheet. */
export const CUSTOMER_TAB_KEYS: CustomerNavKey[] = [
  "overview",
  "book",
  "trips",
  "payments",
];

export type CustomerNavCounts = {
  /** Approved rides waiting to be paid for. */
  paymentsDueCount?: number;
};

/** The groups, with each page's count badge filled in. */
export function customerNavGroups(counts: CustomerNavCounts): PortalNavGroup[] {
  return CUSTOMER_NAV_GROUPS.map((g) => ({
    label: g.label,
    items: g.items.map((i) => ({
      ...i,
      badge: i.key === "payments" ? (counts.paymentsDueCount ?? 0) : 0,
    })),
  }));
}

/** Links to the person's other dashboards, if they have any. */
export function customerExtraLinks(roles: string[]): PortalExtraLink[] {
  const links: PortalExtraLink[] = [];
  if (roles.includes("ADMIN"))
    links.push({ title: "Admin dashboard", href: "/admin" });
  if (roles.includes("DRIVER"))
    links.push({ title: "Driver dashboard", href: "/driver-dashboard" });
  if (roles.includes("CORPORATE"))
    links.push({ title: "Corporate dashboard", href: "/corporate" });
  return links;
}
