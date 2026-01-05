"use client";

import styles from "./AdminSideNav.module.css";
import Link from "next/link";
import Calendar from "@/components/shared/icons/Calendar/Calendar";
import House from "@/components/shared/icons/House/House";
// import Employee from "@/components/icons/Employee/Employee";
// import Cog from "@/components/icons/Cog/Cog";
import Bell from "@/components/shared/icons/Bell/Bell";
import Users from "@/components/shared/icons/Users/Users";
import Wheel from "@/components/shared/icons/Wheel/Wheel";
// import Report from "@/components/shared/icons/Report/Report";
import Car from "@/components/shared/icons/Car/Car";
import Listing from "@/components/shared/icons/Listing/Listing";
import UserButton from "@/components/shared/UserButton/UserButton";
import Button from "@/components/shared/Button/Button";
import { useState } from "react";
import FalseButton from "@/components/shared/FalseButton/FalseButton";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { title: "Dashboard", href: "/admin", icon: <House /> },
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
  //   { title: "Groomers", href: "/admin/groomers", icon: <Employee /> },
  //   { title: "Reports", href: "/admin/reports", icon: <Report /> },
  //   { title: "Settings", href: "/admin/settings", icon: <Cog /> },
];

export default function AdminSideNav() {
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
                  </Link>
                </li>
              );
            })}
          </div>

          <div className={styles.btnContainerii}>
            {/* <UserButton /> */}
            <Button btnType='brownBorder' text='Go Home' href='/' />
            <Button
              btnType='brownBorder'
              text='User Dashboard'
              href='/dashboard'
            />
          </div>
        </ul>

        <div className={styles.btnContainer}>
          <UserButton />
          <Button btnType='black' text='Go Home' href='/' arrow />
        </div>
      </nav>
    </aside>
  );
}
