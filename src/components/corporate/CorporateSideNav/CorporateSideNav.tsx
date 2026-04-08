"use client";

import styles from "./CorporateSideNav.module.css";
import Link from "next/link";
import { useState, useEffect } from "react";
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
import Modal from "@/components/shared/Modal/Modal";
import LoadingPulse from "@/components/shared/LoadingPulse/LoadingPulse";

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
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") return window.innerWidth <= 1068;
    return false;
  });
  const pathname = usePathname();

  const navigating = navigatingTo !== null && pathname !== navigatingTo;

  useEffect(() => {
    const t = setTimeout(() => {
      setNavigatingTo(null);
      setCollapsed(true);
    }, 0);
    return () => clearTimeout(t);
  }, [pathname]);

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
        {/* Account status badge */}
        {accountStatus && accountStatus !== "ACTIVE" && (
          <div className={styles.statusBadge} data-status={accountStatus}>
            {accountStatus === "SUSPENDED"
              ? "⚠️ Account Suspended"
              : "Account Inactive"}
          </div>
        )}

        {/* Collapse toggle button — only visible at ≤1068px */}
        <div className={styles.collapseBar}>
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed(!collapsed)}
            disabled={navigating}
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

        <nav
          className={`${styles.nav} ${navigating ? styles.navNavigating : ""}`}
        >
          {navigating && (
            <div className={styles.navLoadingOverlay}>
              <LoadingPulse />
            </div>
          )}

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

            <div
              className={`${styles.linksWrapper} ${navigating ? styles.linksHidden : ""}`}
            >
              {NAV_ITEMS.map(({ title, href, icon }) => {
                const isDashboard = href === "/corporate";
                const active = isDashboard
                  ? pathname === "/corporate"
                  : pathname === href || pathname.startsWith(href + "/");

                const showBookingsBadge =
                  href === "/corporate/bookings" && upcomingRidesCount > 0;

                return (
                  <li key={href} className={styles.navItem}>
                    <Link
                      href={href}
                      className={`${styles.navLink} ${
                        active ? styles.navLinkActive : ""
                      }`}
                      onClick={() => {
                        setIsOpen(false);
                        setNavigatingTo(href);
                      }}
                      aria-current={active ? "page" : undefined}
                    >
                      <span className={styles.navIcon}>{icon}</span>
                      <span className={styles.title}>{title}</span>
                      <span className={styles.tooltip}>{title}</span>
                      {showBookingsBadge && (
                        <span className={styles.badge}>
                          {upcomingRidesCount > 99 ? "99+" : upcomingRidesCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}

              {/* Full action buttons — hidden at ≤1068px via CSS */}
              <div className={styles.actionBtns}>
                <Link href='/dashboard' className={styles.dshbrdBtn}>
                  Personal Dashboard <Arrow className={styles.arrow} />
                </Link>
                <button className={styles.signOutBtn} onClick={() => signOut()}>
                  Sign Out <SignOutLogo className={styles.signOutLogo} />
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
          <p className={`cardTitle h5 ${styles.modalTitle}`}>Navigate</p>

          <div className={styles.modalNav}>
            <Link
              href='/dashboard'
              className={styles.modalNavLink}
              onClick={() => setMenuModalOpen(false)}
            >
              Personal Dashboard <Arrow className={styles.modalArrow} />
            </Link>
          </div>

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
