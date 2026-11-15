// The admin pages, grouped. The desktop side nav and, at 1068px and
// below, the site nav's full-screen menu both list them from here.

import type { ReactNode } from "react";
import Calendar from "@/components/shared/icons/Calendar/Calendar";
import House from "@/components/shared/icons/House/House";
import Bell from "@/components/shared/icons/Bell/Bell";
import Users from "@/components/shared/icons/Users/Users";
import Car from "@/components/shared/icons/Car/Car";
import Listing from "@/components/shared/icons/Listing/Listing";
import Cog from "@/components/shared/icons/Cog/Cog";
import Plane from "@/components/shared/icons/Plane/Plane";
import Money from "@/components/shared/icons/Money/Money";
import Report from "@/components/shared/icons/Report/Report";
import Company from "@/components/shared/icons/Company/Company";
import Appointments from "@/components/shared/icons/Appointments/Appointments";
import Analytics from "@/components/shared/icons/Analytics/Analytics";
import Business from "@/components/shared/icons/Business/Business";
import ImageIcon from "@/components/shared/icons/ImageIcon/ImageIcon";
import Receipt from "@/components/shared/icons/Receipt/Receipt";
import Driver from "@/components/shared/icons/Driver/Driver";

export type AdminNavItem = { title: string; href: string; icon: ReactNode };
export type AdminNavGroup = { label: string; items: AdminNavItem[] };

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Operations",
    items: [
      { title: "Dashboard", href: "/admin", icon: <House /> },
      { title: "Bookings", href: "/admin/bookings", icon: <Appointments /> },
      { title: "Calendar", href: "/admin/calendar", icon: <Calendar /> },
      { title: "Drivers", href: "/admin/drivers", icon: <Driver /> },
    ],
  },
  {
    label: "Customers",
    items: [
      { title: "Users", href: "/admin/users", icon: <Users /> },
      {
        title: "Corporate accounts",
        href: "/admin/corporate",
        icon: <Business />,
      },
    ],
  },
  {
    label: "Money",
    items: [
      { title: "Earnings", href: "/admin/earnings", icon: <Money /> },
      { title: "Invoices", href: "/admin/invoices", icon: <Receipt /> },
      { title: "Reports", href: "/admin/reports", icon: <Report /> },
      {
        title: "Discount codes",
        href: "/admin/discount-codes",
        icon: <Listing />,
      },
    ],
  },
  {
    label: "Setup",
    items: [
      { title: "Services", href: "/admin/services", icon: <Bell /> },
      { title: "Vehicles", href: "/admin/vehicles", icon: <Car /> },
      {
        title: "Vehicle categories",
        href: "/admin/vehicle-categories",
        icon: <Listing />,
      },
      { title: "Airports", href: "/admin/airports", icon: <Plane /> },
      { title: "Company", href: "/admin/company", icon: <Company /> },
      { title: "Notifications", href: "/admin/notifications", icon: <Cog /> },
      { title: "Assets", href: "/admin/assets", icon: <ImageIcon /> },
      {
        title: "Website analytics",
        href: "/admin/analytics",
        icon: <Analytics />,
      },
    ],
  },
];

/** Dashboard only matches /admin itself; the rest match their sub-pages. */
export function isAdminNavActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(href + "/");
}
