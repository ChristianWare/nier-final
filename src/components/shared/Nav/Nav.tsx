/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import styles from "./Nav.module.css";
import Button from "../Button/Button";
import { useEffect, useState, MouseEvent, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Img1 from "../../../../public/images/road.jpg";
import { usePathname } from "next/navigation";
import Logo from "../Logo/Logo";

export interface NavProps {
  navItemColor?: string;
  color?: string;
  hamburgerColor?: string;
  background?: "white" | "cream" | "accent";
}

export default function Nav({
  color = "",
  hamburgerColor = "",
  background,
}: NavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;
    body.style.overflow =
      window.innerWidth <= 1068 && isOpen ? "hidden" : "auto";
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
    { text: "Services", href: "/services" },
    { text: "Fleet", href: "/fleet" },
    { text: "About", href: "/about" },
    { text: "Blog", href: "/blog" },
    { text: "My Account", href: "/account" },
    { text: "Contact", href: "/contact" },
  ];

  const shouldBlend = !scrolled && !isOpen;

  const bgClass =
    background === "white"
      ? styles.bgWhite
      : background === "cream"
        ? styles.bgCream
        : background === "accent"
          ? styles.bgAccent
          : "";

  const forceSolid = Boolean(background);

const btnType =
  background === "accent" ? "lightRed" : background ? "black" : "transparent";


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
            <Image src={Img1} alt='Menu image' fill className={styles.img} />
            <div className={styles.menuImageOverlay}>
              <Logo className={styles.logoii} />
            </div>
          </div>

          <div className={styles.btnContainerii}>
            <Button
              href='/book'
              text='Book your Ride'
              btnType={btnType}
              arrow
            />
          </div>
        </div>

        {isOpen &&
          createPortal(
            <div className={styles.overlay} onClick={closeMenu} />,
            document.body
          )}

        <div className={styles.btnContainer}>
          <Button href='/book' text='Book your Ride' btnType={btnType} arrow />
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
