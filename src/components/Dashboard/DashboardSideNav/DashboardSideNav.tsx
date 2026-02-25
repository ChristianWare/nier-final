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
import Email from "@/components/shared/icons/Email/Email";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import FalseButton from "@/components/shared/FalseButton/FalseButton";
import Modal from "@/components/shared/Modal/Modal";

const NAV_ITEMS = [
  { title: "Dashboard", href: "/dashboard", icon: <House /> },
  { title: "Book a Ride", href: "/book", icon: <Car /> },
  { title: "My Trips", href: "/dashboard/trips", icon: <Calendar /> },
  {
    title: "Payments & Receipts",
    href: "/dashboard/payments",
    icon: <Listing />,
  },
  { title: "Saved Details", href: "/dashboard/saved", icon: <Users /> },
  { title: "Notifications", href: "/dashboard/notifications", icon: <Bell /> },
  { title: "Profile & Security", href: "/dashboard/profile", icon: <Cog /> },
  { title: "Support", href: "/dashboard/support", icon: <Email /> },
];

export default function DashboardSideNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
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
                      <span className={styles.title}>{title}</span>
                    </Link>
                  </li>
                );
              })}

              {/* Full sign out button — hidden at ≤968px via CSS */}
              <div className={styles.actionBtns}>
                <button className={styles.signOutBtn} onClick={() => signOut()}>
                  Sign Out <Arrow className={styles.arrow} />
                </button>
              </div>

              {/* Compact menu button — shown only at ≤968px via CSS */}
              <div className={styles.compactMenuBtn}>
                <button
                  type='button'
                  className={styles.moreBtn}
                  onClick={() => setMenuModalOpen(true)}
                  aria-label='Open navigation menu'
                >
                  <span className={styles.moreBtnDot} />
                  <span className={styles.moreBtnDot} />
                  <span className={styles.moreBtnDot} />
                </button>
              </div>
            </div>
          </ul>
        </nav>
      </aside>

      <Modal isOpen={menuModalOpen} onClose={() => setMenuModalOpen(false)}>
        <div className={styles.modalContent}>
          <p className={`cardTitle h5 ${styles.modalTitle}`}>Account</p>

          <div className={styles.modalActions}>
            <button
              type='button'
              className='primaryBtn'
              onClick={() => setMenuModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type='button'
              className='dangerBtn'
              onClick={() => {
                setMenuModalOpen(false);
                signOut();
              }}
            >
              Log Out
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
