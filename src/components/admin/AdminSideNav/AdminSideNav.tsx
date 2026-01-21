"use client";

import styles from "./AdminSideNav.module.css";
import Link from "next/link";
import Calendar from "@/components/shared/icons/Calendar/Calendar";
import House from "@/components/shared/icons/House/House";
import Bell from "@/components/shared/icons/Bell/Bell";
import Users from "@/components/shared/icons/Users/Users";
import Wheel from "@/components/shared/icons/Wheel/Wheel";
import Car from "@/components/shared/icons/Car/Car";
import Listing from "@/components/shared/icons/Listing/Listing";
import { useState } from "react";
import FalseButton from "@/components/shared/FalseButton/FalseButton";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Cog from "@/components/shared/icons/Cog/Cog";
import BadgeCount from "@/app/admin/BadgeCount/BadgeCount";
import SignOutLogo from "@/components/shared/icons/SignOutLogo/SignOutLogo";
import Plane from "@/components/shared/icons/Plane/Plane";
import Money from "@/components/shared/icons/Money/Money";

const NAV_ITEMS = [
  { title: "Dashboard", href: "/admin", icon: <House /> },
  { title: "Earnings", href: "/admin/earnings", icon: <Money /> },
  { title: "Bookings", href: "/admin/bookings", icon: <Calendar /> },
  { title: "Services", href: "/admin/services", icon: <Bell /> },
  {
    title: "Vehicle Categories",
    href: "/admin/vehicle-categories",
    icon: <Listing />,
  },
  { title: "Vehicles", href: "/admin/vehicles", icon: <Car /> },
  { title: "Users", href: "/admin/users", icon: <Users /> },
  { title: "Drivers", href: "/admin/drivers", icon: <Wheel /> },
  { title: "Airports", href: "/admin/airports", icon: <Plane /> },
  { title: "Calendar", href: "/admin/calendar", icon: <Calendar /> },
  { title: "Activity", href: "/admin/activity", icon: <Cog /> },
  { title: "Settings", href: "/admin/settings", icon: <Cog /> },
];

export type AdminSideNavProps = {
  bookingNeedsAttentionCount?: number;
};

export default function AdminSideNav({
  bookingNeedsAttentionCount = 0,
}: AdminSideNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <aside className={styles.container}>
      <nav className={styles.nav}>
        <ul
          className={
            isOpen ? `${styles.navLinks} ${styles.open}` : styles.navLinks
          }
        >
          <div className={styles.closeWrapper}>
            <FalseButton
              text='Close'
              btnType='blue'
              onClick={() => setIsOpen(false)}
            />
          </div>

          <div className={styles.linksWrapper}>
            {NAV_ITEMS.map(({ title, href, icon }) => {
              const isDashboard = href === "/admin";
              const active = isDashboard
                ? pathname === "/admin"
                : pathname === href || pathname.startsWith(href + "/");

              const showBookingsBadge = href === "/admin/bookings";
              const showBadge =
                showBookingsBadge && (bookingNeedsAttentionCount ?? 0) > 0;

              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`${styles.navLink} ${
                      active ? styles.navLinkActive : ""
                    }`}
                    onClick={() => setIsOpen(false)}
                    aria-current={active ? "page" : undefined}
                  >
                    {icon}
                    {title}

                    {showBadge ? (
                      <BadgeCount value={bookingNeedsAttentionCount} max={99} />
                    ) : null}
                  </Link>
                </li>
              );
            })}

            {/* <Link href='/dashboard' className={styles.dshbrdBtn}>
              User Dashboard <Arrow className={styles.arrow} />
            </Link> */}
            <Link href='/driver-dashboard' className={styles.drvrDshbrdBtn}>
              Driver Dashboard <Arrow className={styles.arrow} />
            </Link>
            <button className={styles.signOutBtn} onClick={() => signOut()}>
              Sign Out <SignOutLogo className={styles.signOutLogo} />
            </button>
          </div>
        </ul>
      </nav>
    </aside>
  );
}
