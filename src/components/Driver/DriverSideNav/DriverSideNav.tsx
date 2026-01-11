"use client";

import styles from "./DriverSideNav.module.css";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import FalseButton from "@/components/shared/FalseButton/FalseButton";

import House from "@/components/shared/icons/House/House";
import Calendar from "@/components/shared/icons/Calendar/Calendar";
import Bell from "@/components/shared/icons/Bell/Bell";
// import Wheel from "@/components/shared/icons/Wheel/Wheel";
import Listing from "@/components/shared/icons/Listing/Listing";
import Users from "@/components/shared/icons/Users/Users";
import Cog from "@/components/shared/icons/Cog/Cog";
import Arrow from "@/components/shared/icons/Arrow/Arrow";

// Reuse the same badge component you already have.
// If you later move it to a shared folder, just update this import.
import BadgeCount from "@/app/admin/BadgeCount/BadgeCount";

const NAV_ITEMS = [
  {
    title: "Overview",
    href: "/driver-dashboard",
    key: "overview",
    icon: <House />,
  },
  {
    title: "Trips",
    href: "/driver-dashboard/trips",
    key: "trips",
    icon: <Calendar />,
  },
  {
    title: "Notifications",
    href: "/driver-dashboard/notifications",
    key: "notifications",
    icon: <Bell />,
  },
//   {
//     title: "Availability",
//     href: "/driver-dashboard/availability",
//     key: "availability",
//     icon: <Wheel />,
//   },
  // View-only pay summary (no Stripe cash-out flow)
  {
    title: "Earnings",
    href: "/driver-dashboard/earnings",
    key: "earnings",
    icon: <Listing />,
  },
  {
    title: "Profile & Docs",
    href: "/driver-dashboard/profile",
    key: "profile",
    icon: <Users />,
  },
  {
    title: "Support",
    href: "/driver-dashboard/support",
    key: "support",
    icon: <Cog />,
  },
];

export type DriverSideNavProps = {
  unreadNotificationsCount?: number; // bell badge
  tripsNeedAttentionCount?: number; // trips badge (time changed, missing info, etc.)
  documentsAlertCount?: number; // profile/docs badge (expiring soon)
};

export default function DriverSideNav({
  unreadNotificationsCount = 0,
  tripsNeedAttentionCount = 0,
  documentsAlertCount = 0,
}: DriverSideNavProps) {
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
              const isRoot = href === "/driver-dashboard";
              const active = isRoot
                ? pathname === "/driver-dashboard"
                : pathname === href || pathname.startsWith(href + "/");

              const showNotificationsBadge =
                href === "/driver-dashboard/notifications" &&
                unreadNotificationsCount > 0;

              const showTripsBadge =
                href === "/driver-dashboard/trips" &&
                tripsNeedAttentionCount > 0;

              const showDocsBadge =
                href === "/driver-dashboard/profile" && documentsAlertCount > 0;

              const badgeValue = showNotificationsBadge
                ? unreadNotificationsCount
                : showTripsBadge
                  ? tripsNeedAttentionCount
                  : showDocsBadge
                    ? documentsAlertCount
                    : 0;

              const showBadge = badgeValue > 0;

              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                    onClick={() => setIsOpen(false)}
                    aria-current={active ? "page" : undefined}
                  >
                    {icon}
                    {title}

                    {showBadge ? (
                      <BadgeCount value={badgeValue} max={99} />
                    ) : null}
                  </Link>
                </li>
              );
            })}

            <Link href='/' className={styles.homeBtn}>
              Go Home <Arrow className={styles.arrow} />
            </Link>

            <button className={styles.signOutBtn} onClick={() => signOut()}>
              Sign Out <Arrow className={styles.arrow} />
            </button>
          </div>
        </ul>
      </nav>
    </aside>
  );
}
