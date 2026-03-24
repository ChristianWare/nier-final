"use client";

import styles from "./DriverSideNav.module.css";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import FalseButton from "@/components/shared/FalseButton/FalseButton";
import House from "@/components/shared/icons/House/House";
import Calendar from "@/components/shared/icons/Calendar/Calendar";
import Bell from "@/components/shared/icons/Bell/Bell";
import Users from "@/components/shared/icons/Users/Users";
import Cog from "@/components/shared/icons/Cog/Cog";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import BadgeCount from "@/app/admin/BadgeCount/BadgeCount";
import Appointments from "@/components/shared/icons/Appointments/Appointments";
import Modal from "@/components/shared/Modal/Modal";
import Money from "@/components/shared/icons/Money/Money";

const NAV_ITEMS = [
  {
    title: "Overview",
    href: "/driver-dashboard",
    key: "overview",
    icon: <House />,
  },
  {
    title: "Profile",
    href: "/driver-dashboard/profile",
    key: "profile",
    icon: <Users />,
  },
  {
    title: "Earnings",
    href: "/driver-dashboard/earnings",
    key: "earnings",
    icon: <Money />,
  },
  {
    title: "Trips",
    href: "/driver-dashboard/trips",
    key: "trips",
    icon: <Appointments />,
  },
  {
    title: "Notifications",
    href: "/driver-dashboard/notifications",
    key: "notifications",
    icon: <Bell />,
  },
  {
    title: "Schedule",
    href: "/driver-dashboard/schedule",
    key: "schedule",
    icon: <Calendar />,
  },
  {
    title: "Support",
    href: "/driver-dashboard/support",
    key: "support",
    icon: <Cog />,
  },
];

export type DriverSideNavProps = {
  unreadNotificationsCount?: number;
  tripsNeedAttentionCount?: number;
  documentsAlertCount?: number;
};

export default function DriverSideNav({
  unreadNotificationsCount = 0,
  tripsNeedAttentionCount = 0,
  documentsAlertCount = 0,
}: DriverSideNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") return window.innerWidth <= 568;
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
        {/* Collapse toggle button — only visible at ≤568px */}
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
                  href === "/driver-dashboard/profile" &&
                  documentsAlertCount > 0;

                const badgeValue = showNotificationsBadge
                  ? unreadNotificationsCount
                  : showTripsBadge
                    ? tripsNeedAttentionCount
                    : showDocsBadge
                      ? documentsAlertCount
                      : 0;

                const showBadge = badgeValue > 0;

                return (
                  <li key={href} className={styles.navItem}>
                    <Link
                      href={href}
                      className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                      onClick={() => setIsOpen(false)}
                      aria-current={active ? "page" : undefined}
                    >
                      <span className={styles.navIcon}>{icon}</span>
                      <span className={styles.title}>{title}</span>
                      {showBadge ? (
                        <BadgeCount value={badgeValue} max={99} />
                      ) : null}
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
          <p className={`cardTitle h5 ${styles.modalTitle}`}>Navigate</p>

          <div className={styles.modalNav}>
            <Link
              href='/dashboard'
              className={styles.modalNavLink}
              onClick={() => setMenuModalOpen(false)}
            >
              User Dashboard <Arrow className={styles.modalArrow} />
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
