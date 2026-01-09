"use client";

import styles from "./DashboardSideNav.module.css";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import House from "@/components/shared/icons/House/House";
import Car from "@/components/shared/icons/Car/Car";
import Calendar from "@/components/shared/icons/Calendar/Calendar";
import Listing from "@/components/shared/icons/Listing/Listing";
import Bell from "@/components/shared/icons/Bell/Bell";
import Users from "@/components/shared/icons/Users/Users";
import Cog from "@/components/shared/icons/Cog/Cog";
import Wheel from "@/components/shared/icons/Wheel/Wheel";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import FalseButton from "@/components/shared/FalseButton/FalseButton";

const NAV_ITEMS = [
  { title: "Dashboard", href: "/dashboard", icon: <House /> },
  { title: "Book a Ride", href: "/dashboard/book", icon: <Car /> },
  { title: "My Trips", href: "/dashboard/trips", icon: <Calendar /> },
  {
    title: "Payments & Receipts",
    href: "/dashboard/payments",
    icon: <Listing />,
  },
  { title: "Saved Details", href: "/dashboard/saved", icon: <Users /> },
  { title: "Notifications", href: "/dashboard/notifications", icon: <Bell /> },
  { title: "Profile & Security", href: "/dashboard/profile", icon: <Cog /> },
  { title: "Support", href: "/dashboard/support", icon: <Wheel /> },
];

export default function DashboardSideNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <aside className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.hamburgerContainer}>
          <FalseButton
            text={isOpen ? "Close" : "Menu"}
            btnType='blue'
            onClick={() => setIsOpen((v) => !v)}
          />
        </div>

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
              const isDashboard = href === "/dashboard";
              const active = isDashboard
                ? pathname === "/dashboard"
                : pathname === href || pathname.startsWith(href + "/");

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
                  </Link>
                </li>
              );
            })}

            <Link
              href='/'
              className={styles.homeBtn}
              onClick={() => setIsOpen(false)}
            >
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
