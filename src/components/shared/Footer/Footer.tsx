import styles from "./Footer.module.css";
import Link from "next/link";
import LayoutWrapper from "../LayoutWrapper";
import Logo from "../Logo/Logo";
import Instagram from "../icons/Instagram/Instagram";
import Yelp from "../icons/Yelp/Yelp";
import LinkedIn from "../icons/LinkedIn/LinkedIn";
import FooterTop from "./FooterTop/FooterTop";

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
    title: "Head Office",
    options: [
      {
        id: 1.1,
        option: "NIer Transporttion \n 123 Main St. \n Phoenix, AZ 85001",
      },
    ],
  },
  {
    id: 2,
    title: "Phone",
    options: [
      {
        id: 1.1,
        option: "480-300-6003",
      },
      {
        id: 1.2,
        option: "480-300-6005",
      },
    ],
  },
  {
    id: 3,
    title: "Email",
    options: [
      {
        id: 1.1,
        option: "reservations@niertransportation.com",
      },
      {
        id: 1.2,
        option: "info@niertransportation.com",
      },
    ],
  },
  {
    id: 4,
    title: "Company",
    options: [
      {
        id: 1.1,
        option: "About us",
      },
      {
        id: 1.2,
        option: "Careers",
      },
    ],
  },
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
    title: "Resources",
    options: [
      { id: 2.1, option: "Blog", href: "/blog" },
      { id: 2.2, option: "Events", href: "/events" },
      { id: 2.3, option: "Glossary", href: "/glossary" },
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
            {/* <div className={styles.logoDetailsSocials}>
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
            </div> */}
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
