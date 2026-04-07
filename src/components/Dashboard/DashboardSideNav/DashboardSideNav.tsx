"use client";

import styles from "./DashboardSideNav.module.css";
import Link from "next/link";
import { useState, useEffect } from "react";
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
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") return window.innerWidth <= 1068;
    return false;
  });
  const pathname = usePathname();

  useEffect(() => {
    if (menuModalOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => document.body.classList.remove("modal-open");
  }, [menuModalOpen]);

  return (
    <>
      <aside
        className={`${styles.container} ${collapsed ? styles.containerCollapsed : ""}`}
      >
        {/* Collapse toggle button — only visible at ≤1068px */}
        <div className={styles.collapseBar}>
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(!collapsed)}
            aria-label='Toggle sidebar'
          >
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className={`${styles.collapseIcon} ${collapsed ? styles.collapseIconFlipped : ""}`}
            >
              <polyline points='15 18 9 12 15 6' />
            </svg>
          </button>
        </div>

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
                const isDashboard = href === "/dashboard";
                const active = isDashboard
                  ? pathname === "/dashboard"
                  : pathname === href || pathname.startsWith(href + "/");

                return (
                  <li key={href} className={styles.navItem}>
                    <Link
                      href={href}
                      className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                      onClick={() => {
                        setIsOpen(false);
                        setCollapsed(true);
                      }}
                      aria-current={active ? "page" : undefined}
                    >
                      <span className={styles.navIcon}>{icon}</span>
                      <span className={styles.title}>{title}</span>
                      <span className={styles.tooltip}>{title}</span>
                    </Link>
                  </li>
                );
              })}

              {/* Full sign out button — hidden at ≤1068px via CSS */}
              <div className={styles.actionBtns}>
                <button className={styles.signOutBtn} onClick={() => signOut()}>
                  Sign Out <Arrow className={styles.arrow} />
                </button>
              </div>

              {/* Compact menu button — shown only at ≤1068px, hidden when collapsed */}
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
