"use client";

import styles from "./AdminSideNav.module.css";
import Link from "next/link";
import { useState, useEffect } from "react";
import FalseButton from "@/components/shared/FalseButton/FalseButton";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import SignOutLogo from "@/components/shared/icons/SignOutLogo/SignOutLogo";
import Modal from "@/components/shared/Modal/Modal";
import LoadingPulse from "@/components/shared/LoadingPulse/LoadingPulse";
import { ADMIN_NAV_GROUPS, isAdminNavActive } from "./adminNav";


export type AdminSideNavProps = {
  bookingNeedsAttentionCount?: number;
};

export default function AdminSideNav(
  {
    // bookingNeedsAttentionCount = 0,
  }: AdminSideNavProps,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  // Starts open on the server and the first render; the effect below folds
  // it right after load (the fold only shows at 1068px and below). Reading
  // the window size here made the server and browser disagree.
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const navigating = navigatingTo !== null && pathname !== navigatingTo;

  // Once navigation completes, collapse the menu
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
              {ADMIN_NAV_GROUPS.map((group) => (
                <div key={group.label} className={styles.group}>
                  <p className={styles.groupLabel}>{group.label}</p>
                  {group.items.map(({ title, href, icon }) => {
                    const active = isAdminNavActive(pathname, href);

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
                        </Link>
                      </li>
                    );
                  })}
                </div>
              ))}

              <div className={styles.actionBtns}>
                <Link href='/dashboard' className={styles.dshbrdBtn}>
                  User Dashboard <Arrow className={styles.arrow} />
                </Link>
                <Link href='/driver-dashboard' className={styles.drvrDshbrdBtn}>
                  Driver Dashboard <Arrow className={styles.arrow} />
                </Link>
                <Link href='/corporate' className={styles.dshbrdBtn}>
                  Corporate Dashboard <Arrow className={styles.arrow} />
                </Link>
                <button className={styles.signOutBtn} onClick={() => signOut()}>
                  Sign Out <SignOutLogo className={styles.signOutLogo} />
                </button>
              </div>

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
            <Link
              href='/driver-dashboard'
              className={`${styles.modalNavLink} ${styles.modalNavLinkDark}`}
              onClick={() => setMenuModalOpen(false)}
            >
              Driver Dashboard <Arrow className={styles.modalArrow} />
            </Link>
            <Link
              href='/corporate'
              className={styles.modalNavLink}
              onClick={() => setMenuModalOpen(false)}
            >
              Corporate Dashboard <Arrow className={styles.modalArrow} />
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
