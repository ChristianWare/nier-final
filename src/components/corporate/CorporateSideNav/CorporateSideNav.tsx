"use client";

import styles from "./CorporateSideNav.module.css";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import House from "@/components/shared/icons/House/House";
import Appointments from "@/components/shared/icons/Appointments/Appointments";
import Users from "@/components/shared/icons/Users/Users";
import Money from "@/components/shared/icons/Money/Money";
import Report from "@/components/shared/icons/Report/Report";
import Cog from "@/components/shared/icons/Cog/Cog";
import FalseButton from "@/components/shared/FalseButton/FalseButton";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import SignOutLogo from "@/components/shared/icons/SignOutLogo/SignOutLogo";

const NAV_ITEMS = [
  { title: "Dashboard", href: "/corporate", icon: <House /> },
  { title: "Bookings", href: "/corporate/bookings", icon: <Appointments /> },
  { title: "Employees", href: "/corporate/employees", icon: <Users /> },
  { title: "Billing", href: "/corporate/billing", icon: <Money /> },
  { title: "Reports", href: "/corporate/reports", icon: <Report /> },
  { title: "Settings", href: "/corporate/settings", icon: <Cog /> },
];

export type CorporateSideNavProps = {
  upcomingRidesCount?: number;
  accountStatus?: string;
};

export default function CorporateSideNav({
  upcomingRidesCount = 0,
  accountStatus,
}: CorporateSideNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <aside className={styles.container}>
      {/* Account status badge */}
      {accountStatus && accountStatus !== "ACTIVE" && (
        <div className={styles.statusBadge} data-status={accountStatus}>
          {accountStatus === "SUSPENDED"
            ? "⚠️ Account Suspended"
            : "Account Inactive"}
        </div>
      )}

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
              const isDashboard = href === "/corporate";
              const active = isDashboard
                ? pathname === "/corporate"
                : pathname === href || pathname.startsWith(href + "/");

              const showBookingsBadge =
                href === "/corporate/bookings" && upcomingRidesCount > 0;

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

                    {showBookingsBadge && (
                      <span className={styles.badge}>
                        {upcomingRidesCount > 99 ? "99+" : upcomingRidesCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </div>

          <div className={styles.btnContainer}>
            <Link href='/dashboard' className={styles.dshbrdBtn}>
              Personal Dashboard <Arrow className={styles.arrow} />
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
