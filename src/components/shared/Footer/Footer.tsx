import styles from "./Footer.module.css";
import Link from "next/link";
import LayoutWrapper from "../LayoutWrapper";
import Instagram from "../icons/Instagram/Instagram";
import Yelp from "../icons/Yelp/Yelp";
import LinkedIn from "../icons/LinkedIn/LinkedIn";
import Facebook from "../icons/Facebook/Facebook";
import Twitter from "../icons/Twitter/Twitter";
import TikTok from "../icons/TikTok/TikTok";
import YouTube from "../icons/YouTube/YouTube";
import GoogleIcon from "../icons/GoogleIcon/GoogleIcon";
import FooterTop from "./FooterTop/FooterTop";
import Logo from "../Logo/Logo";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import Marquee from "../Marquee/Marquee";

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
        href: "/services/corporate-and-event-logistics",
      },
      {
        id: 1.4,
        option: "Group Transportation",
        href: "/services/group-transportation",
      },
      { id: 1.5, option: "Party Bus", href: "/services/party-bus" },
      { id: 1.6, option: "Weddings", href: "/services/weddings" },
    ],
  },
  {
    id: 2,
    title: "Quick Links",
    options: [
      { id: 2.1, option: "About", href: "/about" },
      { id: 2.2, option: "Services", href: "/services" },
      { id: 2.3, option: "Fleet", href: "/fleet" },
      { id: 2.4, option: "Blog", href: "/blog" },
      { id: 2.5, option: "Contact", href: "/contact" },
      { id: 2.6, option: "Login", href: "/login" },
      { id: 2.7, option: "Register", href: "/register" },
      { id: 2.8, option: "My Account", href: "/dashboard" },
    ],
  },
  {
    id: 4,
    title: "Service Areas",
    options: [
      {
        id: 4.1,
        option: "Scottsdale",
        href: "/locations/scottsdale",
      },
      {
        id: 4.2,
        option: "Phoenix",
        href: "/locations/phoenix",
      },
      {
        id: 4.3,
        option: "Glendale",
        href: "/locations/glendale",
      },
      {
        id: 4.4,
        option: "Paradise Valley",
        href: "/locations/paradise-valley",
      },
      {
        id: 4.5,
        option: "Tempe",
        href: "/locations/tempe",
      },
      {
        id: 4.6,
        option: "Chandler",
        href: "/locations/chandler",
      },
      {
        id: 4.7,
        option: "Mesa",
        href: "/locations/mesa",
      },
      {
        id: 4.8,
        option: "Gilbert",
        href: "/locations/gilbert",
      },
      {
        id: 4.9,
        option: "Cave Creek",
        href: "/locations/cave-creek",
      },
      {
        id: 4.91,
        option: "View all locations →",
        href: "/locations",
      },
    ],
  },
  {
    id: 5,
    title: "Popular Routes",
    options: [
      {
        id: 5.1,
        option: "Phoenix to Scottsdale",
        href: "/routes/phoenix-to-scottsdale",
      },
      {
        id: 5.2,
        option: "Tucson to Phoenix",
        href: "/routes/tucson-to-phoenix",
      },
      {
        id: 5.3,
        option: "Phoenix to Sedona",
        href: "/routes/phoenix-to-sedona",
      },
      {
        id: 5.4,
        option: "Flagstaff to Phoenix",
        href: "/routes/flagstaff-to-phoenix",
      },
      {
        id: 5.5,
        option: "Phoenix to Prescott",
        href: "/routes/phoenix-to-prescott",
      },
      {
        id: 5.6,
        option: "Scottsdale to Sky Harbor",
        href: "/routes/scottsdale-to-sky-harbor",
      },
      {
        id: 5.7,
        option: "Paradise Valley to Sky Harbor",
        href: "/routes/paradise-valley-to-sky-harbor",
      },
      {
        id: 5.8,
        option: "Chandler to Sky Harbor",
        href: "/routes/chandler-to-sky-harbor",
      },
      {
        id: 5.9,
        option: "View all routes →",
        href: "/routes",
      },
    ],
  },
  {
    id: 6,
    title: "Airports",
    options: [
      {
        id: 6.1,
        option: "PHX Sky Harbor",
        href: "/airports/phx-sky-harbor",
      },
      {
        id: 6.2,
        option: "Mesa Gateway (AZA)",
        href: "/airports/mesa-gateway",
      },
      {
        id: 6.3,
        option: "Scottsdale Airport (SDL)",
        href: "/airports/scottsdale-airport",
      },
      {
        id: 6.4,
        option: "View all airports →",
        href: "/airports",
      },
    ],
  },
];

// Icon component map for dynamic rendering
const SOCIAL_ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: LinkedIn,
  yelp: Yelp,
  tiktok: TikTok,
  youtube: YouTube,
  google: GoogleIcon,
};

export default async function Footer() {
  const settings = await getCompanySettings();
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { key: "instagram", url: settings.instagramUrl, label: "Instagram" },
    { key: "facebook", url: settings.facebookUrl, label: "Facebook" },
    { key: "twitter", url: settings.twitterUrl, label: "X" },
    { key: "linkedin", url: settings.linkedinUrl, label: "LinkedIn" },
    { key: "yelp", url: settings.yelpUrl, label: "Yelp" },
    { key: "google", url: settings.googleBusinessUrl, label: "Google" },
    { key: "tiktok", url: settings.tiktokUrl, label: "TikTok" },
    { key: "youtube", url: settings.youtubeUrl, label: "YouTube" },
  ].filter((s) => s.url?.trim());

  const connectOptions: Option[] = [];
  let connectId = 3.1;

  if (settings.supportEmail?.trim()) {
    connectOptions.push({
      id: connectId++,
      option: settings.supportEmail,
      href: `mailto:${settings.supportEmail}`,
    });
  }
  if (settings.dispatchPhone?.trim()) {
    connectOptions.push({
      id: connectId++,
      option: settings.dispatchPhone,
      href: `tel:${settings.dispatchPhoneRaw}`,
    });
  }

  const connectSection: Section = {
    id: 3,
    title: "Connect",
    options:
      connectOptions.length > 0
        ? connectOptions
        : [
            {
              id: 3.1,
              option: "reservations@niertransportation.com",
              href: "mailto:reservations@niertransportation.com",
            },
            { id: 3.2, option: "480-300-6003", href: "tel:4803006003" },
          ],
  };

  const allSections = [...data, connectSection];
  const companyName = settings.companyName?.trim() || "Nier Transportation";

  return (
    <footer className={styles.container}>
      <div className={styles.marqueeContainer}>
        <Marquee words={["Nier Transportation"]} speedSeconds={10} />
      </div>
      <LayoutWrapper>
        <div className={styles.content}>
          <FooterTop />
          <div className={styles.top}>
            <div className={styles.logoDetailsSocials}>
              <Link href='/' className={styles.logoContainer}>
                <Logo className={styles.logo} />
                <span className={styles.logoText}>{companyName}</span>
              </Link>
              <p className={styles.copy}>
                {settings.companyTagline?.trim() ||
                  `At ${companyName}, we're more than a car service; we're your trusted partner in high end transportation.`}
              </p>
              {socialLinks.length > 0 && (
                <div className={styles.socialsContainer}>
                  {socialLinks.map(({ key, url, label }) => {
                    const Icon = SOCIAL_ICON_MAP[key];
                    if (!Icon) return null;
                    return (
                      <a
                        key={key}
                        href={url!}
                        target='_blank'
                        rel='noopener noreferrer'
                        aria-label={label}
                      >
                        <Icon className={styles.socialIcon} />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
            <div className={styles.links}>
              {allSections.map((section) => (
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
              <small className={styles.small}>
                © {currentYear} {companyName}
              </small>
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
