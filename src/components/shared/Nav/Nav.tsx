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

type AppRole = "USER" | "ADMIN" | "DRIVER";

function getRoles(session: any): AppRole[] {
  const roles = (session?.user as any)?.roles;
  if (Array.isArray(roles) && roles.length > 0) return roles as AppRole[];
  return session?.user ? (["USER"] as AppRole[]) : [];
}

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

  const accountHref = !isAuthed
    ? "/login"
    : roles.includes("ADMIN")
      ? "/admin"
      : roles.includes("DRIVER")
        ? "/driver-dashboard"
        : "/dashboard";

  const accountText = !isAuthed ? "Login" : `Hello, ${firstName} (Account)`;

  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const servicesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  // Track whether we're at the mobile breakpoint
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

  // Desktop only — dropdown hover handlers
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
    { text: "Contact", href: "/contact" },
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

  const accountActive = ["/dashboard", "/admin", "/driver-dashboard"].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );

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
          {items.map((item) => {
            const active = isActive(item.href);

            // Services item — dropdown on desktop, plain link on mobile
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

                  {/* Desktop dropdown — hidden on mobile via CSS */}
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
                } ${shouldBlend ? styles.blend : ""}`}
                onClick={closeMenu}
                aria-current={active ? "page" : undefined}
              >
                {item.text}
              </Link>
            );
          })}

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

          <div className={styles.btnContainerii}>
            <Link
              href={accountHref}
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
        </div>

        {isOpen &&
          createPortal(
            <div className={styles.overlay} onClick={closeMenu} />,
            document.body,
          )}

        <div className={styles.btnContainer}>
          <Link
            href={accountHref}
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
          aria-expanded={isOpen}
          role='button'
        >
          <span
            className={`${styles.whiteBar} ${styles[hamburgerColor]} ${
              shouldBlend ? styles.blend : ""
            }`}
          ></span>
          <span
            className={`${styles.whiteBar} ${styles[hamburgerColor]} ${
              shouldBlend ? styles.blend : ""
            }`}
          ></span>
          <span
            className={`${styles.whiteBar} ${styles[hamburgerColor]} ${
              shouldBlend ? styles.blend : ""
            }`}
          ></span>
        </span>
      </nav>
    </header>
  );
}
