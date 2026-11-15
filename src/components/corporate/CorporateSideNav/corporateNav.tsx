// The corporate dashboard's pages, grouped. The desktop side nav and, at
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
import Users from "@/components/shared/icons/Users/Users";
import Money from "@/components/shared/icons/Money/Money";
import Report from "@/components/shared/icons/Report/Report";
import Cog from "@/components/shared/icons/Cog/Cog";

export type CorporateNavKey =
  | "overview"
  | "book"
  | "bookings"
  | "employees"
  | "billing"
  | "reports"
  | "settings";

type CorporateNavItem = PortalNavItem & { key: CorporateNavKey };

export const CORPORATE_NAV_GROUPS: {
  label: string;
  items: CorporateNavItem[];
}[] = [
  {
    label: "Rides",
    items: [
      {
        title: "Overview",
        short: "Home",
        href: "/corporate",
        key: "overview",
        icon: <House />,
      },
      {
        title: "Book a ride",
        short: "Book",
        href: "/corporate/bookings/new",
        key: "book",
        icon: <Car />,
      },
      {
        title: "Bookings",
        short: "Bookings",
        href: "/corporate/bookings",
        key: "bookings",
        icon: <Appointments />,
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        title: "Employees",
        short: "Employees",
        href: "/corporate/employees",
        key: "employees",
        icon: <Users />,
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        title: "Billing",
        short: "Billing",
        href: "/corporate/billing",
        key: "billing",
        icon: <Money />,
      },
      {
        title: "Reports",
        short: "Reports",
        href: "/corporate/reports",
        key: "reports",
        icon: <Report />,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        title: "Settings",
        short: "Settings",
        href: "/corporate/settings",
        key: "settings",
        icon: <Cog />,
      },
    ],
  },
];

/** The bottom bar's tabs; the rest go in its More sheet. */
export const CORPORATE_TAB_KEYS: CorporateNavKey[] = [
  "overview",
  "book",
  "bookings",
  "billing",
];

export type CorporateNavCounts = {
  /** Rides booked from now on. */
  upcomingRidesCount?: number;
  /** Invoices sent and not yet paid. */
  invoicesDueCount?: number;
};

/**
 * The groups, with each page's count badge filled in. "Book a ride" is
 * left out while the account is suspended, since it can't book.
 */
export function corporateNavGroups(
  counts: CorporateNavCounts,
  canBook = true,
): PortalNavGroup[] {
  return CORPORATE_NAV_GROUPS.map((g) => ({
    label: g.label,
    items: g.items
      .filter((i) => canBook || i.key !== "book")
      .map((i) => ({
        ...i,
        badge:
          i.key === "bookings"
            ? (counts.upcomingRidesCount ?? 0)
            : i.key === "billing"
              ? (counts.invoicesDueCount ?? 0)
              : 0,
      })),
  }));
}

/** Links to the person's other dashboards. */
export function corporateExtraLinks(roles: string[]): PortalExtraLink[] {
  const links: PortalExtraLink[] = [
    { title: "Personal dashboard", href: "/dashboard" },
  ];
  if (roles.includes("ADMIN"))
    links.push({ title: "Admin dashboard", href: "/admin" });
  if (roles.includes("DRIVER"))
    links.push({ title: "Driver dashboard", href: "/driver-dashboard" });
  return links;
}
