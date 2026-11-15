/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

// The public site's nav.
//
// Over a hero it's see-through with light text; once scrolled (or on pages
// that pass a background) it's a solid bar with dark text. On the right:
// Log in when signed out, or Dashboard (the home for the signed-in role)
// and Log out when signed in, then Book now. A thin bar along the bottom
// shows while a page loads.
//
// At 1368px and below the links fold into a full-screen menu: the pages as
// big rows, Dashboard and Log out, and Book now at the bottom. On admin
// pages it adds "Admin options" at the top, which slides a second panel
// in from the right with the admin's sections, each opening its links
// below it, one at a time, starting on the section of the page you're on.

import NavProgress from "@/components/shared/NavProgress/NavProgress";
import Link from "next/link";
import styles from "./Nav.module.css";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Logo from "../Logo/Logo";
import { signOut, useSession } from "next-auth/react";
import Arrow from "../icons/Arrow/Arrow";
import Users from "../icons/Users/Users";
import Driver from "../icons/Driver/Driver";
import Business from "../icons/Business/Business";
import SignOutLogo from "../icons/SignOutLogo/SignOutLogo";
import {
  ADMIN_NAV_GROUPS,
  isAdminNavActive,
  type AdminNavGroup,
} from "@/components/admin/AdminSideNav/adminNav";
import { servicesData as services } from "@/lib/services";
import { partners as partnerList } from "@/lib/partners";

export interface NavProps {
  navItemColor?: string;
  color?: string;
  hamburgerColor?: string;
  background?: "white" | "cream" | "accent";
}

type AppRole = "USER" | "ADMIN" | "DRIVER" | "CORPORATE";

function getRoles(session: any): AppRole[] {
  const roles = (session?.user as any)?.roles;
  if (Array.isArray(roles) && roles.length > 0) return roles as AppRole[];
  return session?.user ? (["USER"] as AppRole[]) : [];
}

/** Where "Dashboard" goes for the signed-in role. */
function dashboardFor(roles: AppRole[]): string {
  if (roles.includes("ADMIN")) return "/admin";
  if (roles.includes("DRIVER")) return "/driver-dashboard";
  if (roles.includes("CORPORATE")) return "/corporate";
  return "/dashboard";
}

/**
 * The admin sections in the phone menu's "Admin options": the side nav's
 * groups, then Account (Log out is added where it's drawn).
 */
const ADMIN_MENU_GROUPS: AdminNavGroup[] = [
  ...ADMIN_NAV_GROUPS,
  {
    label: "Account",
    items: [
      { title: "User dashboard", href: "/dashboard", icon: <Users /> },
      {
        title: "Driver dashboard",
        href: "/driver-dashboard",
        icon: <Driver />,
      },
      {
        title: "Corporate dashboard",
        href: "/corporate",
        icon: <Business />,
      },
    ],
  },
];

export default function Nav({
  color = "",
  hamburgerColor = "",
  background,
}: NavProps) {
  const { data: session, status, update } = useSession();

  const roles = getRoles(session);
  const signedIn = status === "authenticated" && Boolean(session?.user);
  const dashboardHref = dashboardFor(roles);
  const logOut = () => signOut({ callbackUrl: "/" });

  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [partnersOpen, setPartnersOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // The menu is drawn into <body> (the header's transform would otherwise
  // hold it to the header's height), so only once we're in the browser.
  const [mounted, setMounted] = useState(false);
  const servicesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const partnersTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname() ?? "/";

  // The menu remembers the page it was opened on, so it closes by itself
  // when a link takes you somewhere else. The admin sub-menu the same way.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const [adminOpenOn, setAdminOpenOn] = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname;
  const adminOpen = menuOpen && adminOpenOn === pathname;

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth <= 1368);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Lock page scroll and listen for Escape while the menu is open. Escape
  // steps back out of the admin sub-menu first.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (adminOpenOn) setAdminOpenOn(null);
      else setMenuOpenOn(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, adminOpenOn]);

  // The menu is for tablets and phones: widening the window closes it.
  useEffect(() => {
    if (!isMobile) {
      setMenuOpenOn(null);
      setAdminOpenOn(null);
    }
  }, [isMobile]);

  const openMenu = () => {
    setAdminOpenOn(null);
    setMenuOpenOn(pathname);
  };
  const closeMenu = () => {
    setMenuOpenOn(null);
    setAdminOpenOn(null);
  };

  // Admin pages, where the side nav is hidden on tablets and phones: the
  // menu adds "Admin options", which slides a second panel in from the
  // right with the admin's sections, each opening its links below it.
  const inAdmin =
    roles.includes("ADMIN") &&
    (pathname === "/admin" || pathname.startsWith("/admin/"));
  const openAdmin = () => {
    const current = ADMIN_MENU_GROUPS.find((g) =>
      g.items.some((i) => isAdminNavActive(pathname, i.href)),
    );
    setOpenGroup(current?.label ?? ADMIN_MENU_GROUPS[0].label);
    setAdminOpenOn(pathname);
  };
  // The main menu's links are out of the tab order behind the sub-menu.
  const menuTab = menuOpen && !adminOpen ? 0 : -1;
  const subTab = adminOpen ? 0 : -1;

  const handleServicesMouseEnter = () => {
    if (isMobile) return;
    if (servicesTimeoutRef.current) clearTimeout(servicesTimeoutRef.current);
    setServicesOpen(true);
  };

  const handleServicesMouseLeave = () => {
    if (isMobile) return;
    servicesTimeoutRef.current = setTimeout(() => {
      setServicesOpen(false);
    }, 150);
  };

  const handlePartnersMouseEnter = () => {
    if (isMobile) return;
    if (partnersTimeoutRef.current) clearTimeout(partnersTimeoutRef.current);
    setPartnersOpen(true);
  };

  const handlePartnersMouseLeave = () => {
    if (isMobile) return;
    partnersTimeoutRef.current = setTimeout(() => {
      setPartnersOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (servicesTimeoutRef.current) clearTimeout(servicesTimeoutRef.current);
      if (partnersTimeoutRef.current) clearTimeout(partnersTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let ticking = false;

    const setProgress = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p =
        max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
      if (navRef.current)
        navRef.current.style.setProperty("--progress", `${p}%`);
    };

    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
      setProgress();
    };

    const optimizedHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    setProgress();
    setScrolled(window.scrollY > 0);

    window.addEventListener("scroll", optimizedHandleScroll);
    window.addEventListener("resize", optimizedHandleScroll);
    return () => {
      window.removeEventListener("scroll", optimizedHandleScroll);
      window.removeEventListener("resize", optimizedHandleScroll);
    };
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Partner pages come from src/lib/partners.ts, plus the program page.
  const partners = [
    ...partnerList.map((p) => ({
      text: p.name,
      href: p.href,
      copy: p.navCopy,
    })),
    {
      text: "Partner program",
      href: "/partners",
      copy: "For hotels, venues & planners",
    },
  ];
  const partnersActive = partners.some((p) => isActive(p.href));

  const items = [
    { text: "Home", href: "/" },
    { text: "Services *", href: "/services", hasDropdown: true },
    { text: "Fleet", href: "/fleet" },
    { text: "About", href: "/about" },
    // { text: "Corporate", href: "/corporate-accounts" },
    { text: "Partners", href: "/partners", hasPartnersDropdown: true },
    // { text: "Charter", href: "/charter-bus-rental-phoenix" },
    { text: "Contact", href: "/contact" },
  ];

  // The menu's rows: the same pages, with the partners listed out.
  const menuLinks = [
    { text: "Home", href: "/" },
    { text: "Services", href: "/services" },
    { text: "Fleet", href: "/fleet" },
    { text: "About", href: "/about" },
    ...partners.map((p) => ({ text: p.text, href: p.href })),
    { text: "Contact", href: "/contact" },
    signedIn
      ? { text: "Dashboard", href: dashboardHref }
      : { text: "Log in", href: "/login" },
  ];

  const shouldBlend = !scrolled && !background;
  // Over the hero the nav is see-through with light text; otherwise it's a
  // solid bar with dark text, and Book now turns black.
  const solid = scrolled || Boolean(background);

  const bgClass =
    background === "white"
      ? styles.bgWhite
      : background === "cream"
        ? styles.bgCream
        : background === "accent"
          ? styles.bgAccent
          : "";

  const forceSolid = Boolean(background);

  const lastPathRef = useRef<string>("");

  useEffect(() => {
    if (status === "loading") return;
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname;
      update();
    }
  }, [pathname, status, update]);

  const closeIcon = (
    <svg viewBox='0 0 24 24' width='18' height='18' aria-hidden='true'>
      <path
        d='M6 6l12 12M18 6L6 18'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
      />
    </svg>
  );

  const menu = (
    <div
      id='site-menu'
      className={`${styles.menu} ${menuOpen ? styles.menuOpen : ""}`}
      role='dialog'
      aria-modal='true'
      aria-label='Menu'
      aria-hidden={!menuOpen}
      inert={!menuOpen}
    >
      <div className={styles.menuTop}>
        <Link
          href='/'
          className={styles.menuLogo}
          onClick={closeMenu}
          tabIndex={menuTab}
        >
          <Logo className={styles.menuLogoIcon} />
          <span className={styles.menuLogoText}>Nier Transportation</span>
        </Link>
        <button
          type='button'
          className={styles.close}
          aria-label='Close menu'
          onClick={closeMenu}
          tabIndex={menuTab}
        >
          {closeIcon}
        </button>
      </div>

      <ul className={styles.menuLinks}>
        {inAdmin ? (
          <li>
            <button
              type='button'
              className={`${styles.menuLink} ${styles.menuLinkAdmin}`}
              onClick={openAdmin}
              aria-expanded={adminOpen}
              aria-controls='admin-menu'
              tabIndex={menuTab}
            >
              Admin options
              <Arrow className={styles.menuLinkArrow} aria-hidden='true' />
            </button>
          </li>
        ) : null}
        {menuLinks.map((l) => {
          const active = isActive(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`${styles.menuLink} ${active ? styles.menuLinkActive : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={closeMenu}
                tabIndex={menuTab}
              >
                {l.text}
              </Link>
            </li>
          );
        })}
        {signedIn ? (
          <li>
            <button
              type='button'
              className={styles.menuLink}
              onClick={() => {
                closeMenu();
                logOut();
              }}
              tabIndex={menuTab}
            >
              Log out
            </button>
          </li>
        ) : null}
      </ul>

      <Link
        href='/book'
        className={styles.menuBook}
        onClick={closeMenu}
        tabIndex={menuTab}
      >
        Book now
        <span className={styles.bookBox} aria-hidden='true'>
          <Arrow className={styles.bookArrow} />
        </span>
      </Link>

      {/* The admin sub-menu, sliding in from the right. */}
      {inAdmin ? (
        <div
          id='admin-menu'
          className={`${styles.sub} ${adminOpen ? styles.subOpen : ""}`}
          role='group'
          aria-label='Admin options'
          aria-hidden={!adminOpen}
          inert={!adminOpen}
        >
          <div className={styles.subTop}>
            <button
              type='button'
              className={styles.back}
              onClick={() => setAdminOpenOn(null)}
              tabIndex={subTab}
            >
              <Arrow className={styles.backArrow} aria-hidden='true' />
              Back
            </button>
            <button
              type='button'
              className={styles.close}
              aria-label='Close menu'
              onClick={closeMenu}
              tabIndex={subTab}
            >
              {closeIcon}
            </button>
          </div>

          <p className={styles.subEyebrow}>Admin options</p>

          <ul className={styles.subGroups}>
            {ADMIN_MENU_GROUPS.map((group) => {
              const open = openGroup === group.label;
              const panelId = `admin-menu-${group.label.toLowerCase()}`;
              const linkTab = adminOpen && open ? 0 : -1;
              return (
                <li key={group.label} className={styles.subGroup}>
                  <button
                    type='button'
                    className={styles.subHeading}
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenGroup(open ? null : group.label)}
                    tabIndex={subTab}
                  >
                    {group.label}
                    <svg
                      className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
                      viewBox='0 0 24 24'
                      width='20'
                      height='20'
                      aria-hidden='true'
                    >
                      <path
                        d='M6 9l6 6 6-6'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </button>

                  <div
                    id={panelId}
                    className={`${styles.subPanel} ${open ? styles.subPanelOpen : ""}`}
                    inert={!open}
                  >
                    <ul className={styles.subLinks}>
                      {group.items.map((item) => {
                        const active = isAdminNavActive(pathname, item.href);
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={`${styles.subLink} ${active ? styles.subLinkActive : ""}`}
                              aria-current={active ? "page" : undefined}
                              onClick={closeMenu}
                              tabIndex={linkTab}
                            >
                              <span
                                className={styles.subIcon}
                                aria-hidden='true'
                              >
                                {item.icon}
                              </span>
                              {item.title}
                            </Link>
                          </li>
                        );
                      })}
                      {group.label === "Account" ? (
                        <li>
                          <button
                            type='button'
                            className={styles.subLink}
                            onClick={() => {
                              closeMenu();
                              logOut();
                            }}
                            tabIndex={linkTab}
                          >
                            <span className={styles.subIcon} aria-hidden='true'>
                              <SignOutLogo />
                            </span>
                            Log out
                          </button>
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>

          <Link
            href='/admin/bookings/new'
            className={styles.menuBook}
            onClick={closeMenu}
            tabIndex={subTab}
          >
            New booking
            <span className={styles.bookBox} aria-hidden='true'>
              <Arrow className={styles.bookArrow} />
            </span>
          </Link>
        </div>
      ) : null}
    </div>
  );

  return (
    <header
      className={`${styles.header} ${
        scrolled ? styles.scrolled : styles.transparent
      } ${bgClass} ${forceSolid ? styles.forceSolid : ""} ${
        solid ? styles.solid : ""
      }`}
      ref={navRef}
    >
      <nav className={styles.navbar} aria-label='Main'>
        <Link
          href='/'
          className={`${styles.logoContainer} ${
            shouldBlend ? styles.blend : ""
          }`}
        >
          <Logo className={styles.logo} />
          <span className={styles.text}>Nier Transportation</span>
        </Link>

        <div className={styles.navItems}>
          {items.map((item) => {
            const active = isActive(item.href);

            if (item.hasDropdown) {
              return (
                <div
                  key={item.href}
                  className={styles.servicesWrapper}
                  onMouseEnter={handleServicesMouseEnter}
                  onMouseLeave={handleServicesMouseLeave}
                >
                  <Link
                    href={item.href}
                    className={`${styles.navItem} ${styles[color]} ${
                      active ? styles.navItemActive : ""
                    } ${shouldBlend ? styles.blend : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.text}
                  </Link>

                  {servicesOpen && !isMobile && (
                    <div
                      className={styles.servicesDropdown}
                      onMouseEnter={handleServicesMouseEnter}
                      onMouseLeave={handleServicesMouseLeave}
                    >
                      <div className={styles.servicesDropdownInner}>
                        {services.map((svc) => (
                          <Link
                            key={svc.slug}
                            href={`/services/${svc.slug}`}
                            className={styles.serviceDropdownItem}
                            onClick={() => setServicesOpen(false)}
                          >
                            <div className={styles.serviceDropdownImg}>
                              <Image
                                src={svc.src}
                                alt={svc.title}
                                fill
                                className={styles.serviceDropdownImgEl}
                              />
                              <div
                                className={styles.serviceDropdownImgOverlay}
                              />
                            </div>
                            <div className={styles.serviceDropdownText}>
                              <span className={styles.serviceDropdownTitle}>
                                {svc.title}
                              </span>
                              <span className={styles.serviceDropdownCopy}>
                                {svc.copy.split(" ").slice(0, 8).join(" ")}…
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <div className={styles.servicesDropdownFooter}>
                        <Link
                          href='/services'
                          className={styles.servicesDropdownAll}
                          onClick={() => setServicesOpen(false)}
                        >
                          View all services →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            if (item.hasPartnersDropdown) {
              return (
                <div
                  key={item.href}
                  className={styles.servicesWrapper}
                  onMouseEnter={handlePartnersMouseEnter}
                  onMouseLeave={handlePartnersMouseLeave}
                >
                  <button
                    type='button'
                    className={`${styles.navItem} ${styles.navItemBtn} ${styles[color]} ${partnersActive ? styles.navItemActive : ""} ${shouldBlend ? styles.blend : ""}`}
                    onClick={() => setPartnersOpen((s) => !s)}
                    aria-haspopup='menu'
                    aria-expanded={partnersOpen}
                  >
                    {item.text}
                    <svg
                      className={`${styles.caret} ${partnersOpen ? styles.caretOpen : ""}`}
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      aria-hidden='true'
                    >
                      <path d='M6 9l6 6 6-6' />
                    </svg>
                  </button>

                  {partnersOpen && (
                    <div
                      className={styles.partnersDropdown}
                      onMouseEnter={handlePartnersMouseEnter}
                      onMouseLeave={handlePartnersMouseLeave}
                      role='menu'
                    >
                      {partners.map((p) => (
                        <Link
                          key={p.href}
                          href={p.href}
                          className={styles.partnerDropdownItem}
                          onClick={() => setPartnersOpen(false)}
                          role='menuitem'
                        >
                          <span className={styles.partnerDropdownTitle}>
                            {p.text}
                          </span>
                          <span className={styles.partnerDropdownCopy}>
                            {p.copy}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${styles[color]} ${
                  active ? styles.navItemActive : ""
                } ${shouldBlend ? styles.blend : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.text}
              </Link>
            );
          })}
        </div>

        {/* Desktop right side: Dashboard and Log out (or Log in), then Book
            now. Nothing until the session is known, so it doesn't flicker. */}
        <div className={styles.btnContainer}>
          {status === "loading" ? null : signedIn ? (
            <>
              <Link
                href={dashboardHref}
                className={`${styles.acctLink} ${isActive(dashboardHref) ? styles.acctLinkActive : ""}`}
                aria-current={isActive(dashboardHref) ? "page" : undefined}
              >
                Dashboard
              </Link>
              <button
                type='button'
                className={styles.acctLink}
                onClick={logOut}
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href='/login'
              className={`${styles.acctLink} ${isActive("/login") ? styles.acctLinkActive : ""}`}
            >
              Log in
            </Link>
          )}

          <Link href='/book' className={styles.bookBtn}>
            Book now
            <span className={styles.bookBox} aria-hidden='true'>
              <Arrow className={styles.bookArrow} />
            </span>
          </Link>
        </div>

        <button
          type='button'
          className={`${styles.burger} ${styles[hamburgerColor] ?? ""}`}
          aria-label='Open menu'
          aria-expanded={menuOpen}
          aria-controls='site-menu'
          onClick={openMenu}
        >
          <span />
          <span />
        </button>
      </nav>
      <NavProgress />
      {mounted ? createPortal(menu, document.body) : null}
    </header>
  );
}
