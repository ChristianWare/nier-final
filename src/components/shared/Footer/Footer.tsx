import styles from "./Footer.module.css";
import Link from "next/link";
import LayoutWrapper from "../LayoutWrapper";
import Instagram from "../icons/Instagram/Instagram";
import Yelp from "../icons/Yelp/Yelp";
import LinkedIn from "../icons/LinkedIn/LinkedIn";
import FooterTop from "./FooterTop/FooterTop";
import Logo from "../Logo/Logo";

interface Option {
  id: number;
  option: string;
  href?: string;
}

interface Section {
  id: number;
  title: string;
  options: Option[];
}

const data: Section[] = [
  {
    id: 1,
    title: "Services",
    options: [
      {
        id: 1.1,
        option: "Airport Transfers",
        href: "/services/airport-transfers",
      },
      {
        id: 1.2,
        option: "Hourly Charters",
        href: "/services/hourly-chauffeur",
      },
      {
        id: 1.3,
        option: "Corporate Events",
        href: "/services/corporate-events",
      },
      { id: 1.4, option: "Party Bus", href: "/services/party-bus" },
      { id: 1.5, option: "Weddings", href: "/services/party-bus-weddings" },
    ],
  },
  {
    id: 2,
    title: "Quick Links",
    options: [
      { id: 2.1, option: "About", href: "/about" },
      { id: 2.2, option: "Services", href: "/services" },
      { id: 2.3, option: "Blog", href: "/blog" },
      { id: 2.4, option: "Contact", href: "/contact" },
      { id: 2.5, option: "Login", href: "/login" },
      { id: 2.6, option: "Register", href: "/register" },
      { id: 2.7, option: "My Account", href: "/dashboard" },
    ],
  },
  {
    id: 3,
    title: "Connect",
    options: [
      {
        id: 3.1,
        option: "reservations@niertransportation.com",
        href: "mailto:reservations@niertransportation.com",
      },
      { id: 3.2, option: "480-300-6003", href: "tel:4803006003" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <FooterTop />
          <div className={styles.top}>
            <div className={styles.logoDetailsSocials}>
              <Link href='/' className={styles.logoContainer}>
                <Logo className={styles.logo} />
                <span className={styles.logoText}>Nier Transportation</span>
              </Link>
              <p className={styles.copy}>
                At Nier Transportation, we’re more than a car service; we’re
                your trusted partner in high end transportation.
              </p>
              <div className={styles.socialsContainer}>
                <Instagram className={styles.socialIcon} />
                <Yelp className={styles.socialIcon} />
                <LinkedIn className={styles.socialIcon} />
              </div>
            </div>
            <div className={styles.links}>
              {data.map((section) => (
                <div key={section.id} className={styles.linkSection}>
                  <h3 className={styles.linkSectionTitle}>{section.title}</h3>
                  <ul className={styles.linkSectionList}>
                    {section.options.map((option) => (
                      <li key={option.id} className={styles.linkSectionItem}>
                        {option.href ? (
                          <Link
                            href={option.href}
                            className={styles.linkSectionLink}
                          >
                            {option.option}
                          </Link>
                        ) : (
                          <span className={styles.linkSectionText}>
                            {option.option.split("\n").map((line, i) => (
                              <span key={i}>
                                {line}
                                {i < option.option.split("\n").length - 1 && (
                                  <br />
                                )}
                              </span>
                            ))}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.bottom}>
            <div className={styles.bottomLeft}>
              <small className={styles.small}>© 2025 Nier Transportation</small>
            </div>
            <div className={styles.bottomRight}>
              <small className={styles.small}>
                This site was designed and developed by{" "}
                <Link
                  href='https://fontsandfooters.com'
                  target='_blank'
                  className={styles.link}
                >
                  Fonts & Footers
                </Link>
              </small>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </footer>
  );
}
