/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import styles from "./Nav.module.css";
import Button from "../Button/Button";
import { useEffect, useState, MouseEvent, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Img1 from "../../../../public/images/other/road.jpg";
import { usePathname } from "next/navigation";
import Logo from "../Logo/Logo";
import { useSession } from "next-auth/react";
import { services } from "@/lib/data";

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

const ROLE_DASHBOARD: Record<AppRole, { label: string; href: string }> = {
  ADMIN: { label: "Admin Dashboard", href: "/admin" },
  DRIVER: { label: "Driver Dashboard", href: "/driver-dashboard" },
  CORPORATE: { label: "Corporate Dashboard", href: "/corporate" },
  USER: { label: "My Dashboard", href: "/dashboard" },
};

export default function Nav({
  color = "",
  hamburgerColor = "",
  background,
}: NavProps) {
  const { data: session, status, update } = useSession();

  const roles = getRoles(session);
  const isAuthed = Boolean(session?.user);

  const fullName = (session?.user?.name ?? "").trim();
  const firstName = fullName.split(/\s+/)[0] || "there";

  // For desktop — primary account link goes to highest-role dashboard
  const primaryHref = !isAuthed
    ? "/login"
    : roles.includes("ADMIN")
      ? "/admin"
      : roles.includes("DRIVER")
        ? "/driver-dashboard"
        : roles.includes("CORPORATE")
          ? "/corporate"
          : "/dashboard";

  const accountText = !isAuthed ? "Login" : `Hello, ${firstName} (Account)`;

  // For mobile — build a button for each role the user has
  const mobileDashboardLinks: { label: string; href: string }[] = isAuthed
    ? (["USER", "ADMIN", "DRIVER", "CORPORATE"] as AppRole[])
        .filter((role) => roles.includes(role))
        .map((role) => ROLE_DASHBOARD[role])
    : [];

  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const servicesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 1368);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const body = document.body;
    body.style.overflow =
      window.innerWidth <= 1368 && isOpen ? "hidden" : "auto";
    const handleResize = () => setIsOpen(false);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      body.style.overflow = "auto";
    };
  }, [isOpen]);

  const toggleMenu = () => setIsOpen((s) => !s);
  const closeMenu = () => setIsOpen(false);

  const handleHamburgerClick = (e: MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    toggleMenu();
  };

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

  useEffect(() => {
    return () => {
      if (servicesTimeoutRef.current) clearTimeout(servicesTimeoutRef.current);
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

  const items = [
    { text: "Home", href: "/" },
    { text: "Services *", href: "/services", hasDropdown: true },
    { text: "Fleet", href: "/fleet" },
    { text: "About", href: "/about" },
    { text: "Corporate", href: "/corporate-accounts" },
    { text: "Wekopa", href: "/wekopa" },
    { text: "Charter", href: "/charter-bus-rental-phoenix" },
    { text: "Contact", href: "/contact", isLast: true },
  ];

  const shouldBlend = !scrolled && !isOpen && !background;

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

  const accountActive = [
    "/dashboard",
    "/admin",
    "/driver-dashboard",
    "/corporate",
  ].some((base) => pathname === base || pathname.startsWith(`${base}/`));

  return (
    <header
      className={`${styles.header} ${
        scrolled ? styles.scrolled : styles.transparent
      } ${isOpen ? styles.open : ""} ${bgClass} ${
        forceSolid ? styles.forceSolid : ""
      }`}
      ref={navRef}
    >
      <nav className={styles.navbar}>
        <Link
          href='/'
          className={`${styles.logoContainer} ${
            shouldBlend ? styles.blend : ""
          }`}
        >
          <Logo className={styles.logo} />
          <span className={styles.text}>Nier Transportation</span>
        </Link>

        <div
          className={
            isOpen ? `${styles.navItems} ${styles.active}` : styles.navItems
          }
        >
           <div className={styles.btnContainerii}>
            <Button href='/book' text='Book your Ride' btnType='red' arrow />
          </div>
          <div className={styles.menuImage}>
            <Image
              src={Img1}
              alt='Menu image'
              title='Menu image'
              fill
              className={styles.img}
            />
            <div className={styles.menuImageOverlay}>
              <Logo className={styles.logoii} />
            </div>
          </div>
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
                    onClick={closeMenu}
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

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${styles[color]} ${
                  active ? styles.navItemActive : ""
                } ${shouldBlend ? styles.blend : ""} ${item.isLast ? styles.navItemLast : ""}`}
                onClick={closeMenu}
                aria-current={active ? "page" : undefined}
              >
                {item.text}
              </Link>
            );
          })}

         

          {/* Mobile only — dashboard links appear right after nav items */}
          {isAuthed && mobileDashboardLinks.length > 0 && (
            <div className={styles.mobileDashboardLinks}>
              {mobileDashboardLinks.map((link) => (
                <Button
                  key={link.href}
                  href={link.href}
                  text={link.label}
                  onClick={closeMenu}
                  btnType={
                    link.href === "/admin"
                      ? "black"
                      : link.href === "/driver-dashboard"
                        ? "gray"
                        : link.href === "/dashboard"
                          ? "underlinedBlackii"
                          : "black"
                  }
                  arrow
                />
              ))}
            </div>
          )}

          {/* Mobile bottom actions */}
          {/* Mobile bottom actions */}
        </div>

        {isOpen &&
          createPortal(
            <div className={styles.overlay} onClick={closeMenu} />,
            document.body,
          )}

        {/* Desktop right side */}
        <div className={styles.btnContainer}>
          <Link
            href={primaryHref}
            className={`${styles.navItem} ${styles[color]} ${
              accountActive ? styles.navItemActive : ""
            }`}
            onClick={closeMenu}
            aria-current={accountActive ? "page" : undefined}
          >
            {accountText}
          </Link>

          <Button href='/book' text='Book your Ride' btnType='red' arrow />
        </div>

        <span
          className={
            isOpen ? `${styles.hamburger} ${styles.active}` : styles.hamburger
          }
          onClick={handleHamburgerClick}
          onKeyDown={(e) =>
            (e.key === "Enter" || e.key === " ") &&
            handleHamburgerClick(e as any)
          }
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          role='button'
          tabIndex={0}
        >
          <span
            aria-hidden='true'
            className={`${styles.whiteBar} ${styles[hamburgerColor]} ${
              shouldBlend ? styles.blend : ""
            }`}
          ></span>
          <span
            aria-hidden='true'
            className={`${styles.whiteBar} ${styles[hamburgerColor]} ${
              shouldBlend ? styles.blend : ""
            }`}
          ></span>
          <span
            aria-hidden='true'
            className={`${styles.whiteBar} ${styles[hamburgerColor]} ${
              shouldBlend ? styles.blend : ""
            }`}
          ></span>
        </span>
      </nav>
    </header>
  );
}
