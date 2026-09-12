import type { Metadata } from "next";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import Faq from "@/components/shared/Faq/Faq";
import Image from "next/image";
import Link from "next/link";
import { airportsData } from "@/lib/airports";
import {
  arizonaAirportsDirectory,
  DIRECTORY_GROUPS,
  NPIAS_AIRPORT_COUNT,
} from "@/lib/arizonaAirports";
import { SITE_URL } from "@/lib/site";
import styles from "./AirportsPage.module.css";

export const metadata: Metadata = {
  title: "Airports in Arizona — Commercial, Private & Regional Airports | Nier",
  description:
    "Every airport in Arizona in one place: the 8 with airline service, the private-aviation reliever airports around Phoenix, and every regional field — with codes, drive times from Phoenix, and flat-rate car service to the ones that matter.",
  alternates: {
    canonical: `${SITE_URL}/airports`,
  },
};

const commercialCount = arizonaAirportsDirectory.filter(
  (a) => a.group === "commercial",
).length;
const relieverCount = arizonaAirportsDirectory.filter(
  (a) => a.group === "reliever",
).length;
const regionalCount = arizonaAirportsDirectory.filter(
  (a) => a.group === "regional",
).length;

const faqs = [
  {
    q: "How many airports are in Arizona?",
    a: `Arizona has ${NPIAS_AIRPORT_COUNT} public-use airports in the FAA's national airport system — ${commercialCount} with scheduled airline service, ${relieverCount} private-aviation reliever airports around Phoenix and Tucson, and ${regionalCount} regional and general aviation fields — plus roughly twenty smaller public-use airstrips outside that system and several military airfields.`,
  },
  {
    q: "Which Arizona airports have commercial flights?",
    a: "Eight: Phoenix Sky Harbor (PHX), Tucson International (TUS), Mesa Gateway (AZA), Yuma (YUM), Flagstaff Pulliam (FLG), Prescott (PRC), Page (PGA), and Show Low (SOW). Scottsdale Airport (SDL/SCF) also has JSX's semi-private public-charter flights, though no traditional airline service.",
  },
  {
    q: "What airports are near Phoenix?",
    a: "Sky Harbor is the main commercial airport, in the center of the metro. Mesa Gateway serves the East Valley with Allegiant and Sun Country. For private aviation, the Phoenix area has six reliever airports: Scottsdale, Deer Valley, Falcon Field (Mesa), Chandler, Glendale, and Goodyear.",
  },
  {
    q: "What is the closest airport to Scottsdale?",
    a: "Scottsdale Airport (SDL) sits in the Scottsdale Airpark — the closest for private jets and JSX flights. For commercial airlines, Sky Harbor is 20–35 minutes from most of Scottsdale by car.",
  },
  {
    q: "Can you fly commercial into Sedona?",
    a: "No — Sedona Airport is a general aviation field for scenic flights and private aircraft. The nearest commercial airports are Flagstaff (about 45 minutes away) and Phoenix Sky Harbor (about 2 hours), and we run Phoenix-to-Sedona transfers daily.",
  },
  {
    q: "Do you provide car service to every airport on this list?",
    a: "We serve the Phoenix-area airports — Sky Harbor, Mesa Gateway, Scottsdale, Deer Valley, and the reliever FBOs — every day, and run long-distance transfers to Tucson, Flagstaff, Prescott, Sedona, Yuma, and the Grand Canyon. Remote regional fields are available by quote.",
  },
];

const itemListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Airports in Arizona",
  description:
    "Public-use airports in Arizona with codes, categories, and car service availability from Nier Transportation",
  numberOfItems: arizonaAirportsDirectory.length,
  itemListElement: arizonaAirportsDirectory.map((airport, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "Airport",
      name: airport.name,
      ...(airport.iata && { iataCode: airport.iata }),
      ...(airport.icao && { icaoCode: airport.icao }),
      address: {
        "@type": "PostalAddress",
        addressLocality: airport.city,
        addressRegion: "AZ",
      },
      ...(airport.href && { url: `${SITE_URL}${airport.href}` }),
    },
  })),
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function AirportsPage() {
  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Nav background='cream' />

      {/* Intro */}
      <section className={styles.intro}>
        <LayoutWrapper>
          <div className={styles.introContent}>
            <SectionHeading text='Airports in Arizona' dot />
            <h1 className={`${styles.heading} h1`}>
              Airports in Arizona: Every Commercial, Private & Regional Airport
            </h1>
            <p className={styles.lead}>
              Arizona has {NPIAS_AIRPORT_COUNT} public-use airports in the
              national airport system — {commercialCount} with scheduled airline
              service, {relieverCount} private-aviation reliever airports around
              Phoenix and Tucson, and {regionalCount} regional fields — plus
              about twenty smaller airstrips and the military bases. Here's all
              of them with codes and drive times from Phoenix, starting with the
              ones we drive to every day.
            </p>
          </div>
        </LayoutWrapper>
      </section>

      {/* Featured: the airports with their own car-service pages */}
      <section className={styles.airportsSection}>
        <LayoutWrapper>
          <div className={styles.sectionHead}>
            <SectionHeading text='Airport Car Service' dot />
            <h2 className={`${styles.featuredHeading} h2`}>
              The airports we serve every day
            </h2>
          </div>
          <div className={styles.airportsGrid}>
            {airportsData.map((airport) => (
              <div key={airport.slug} className={styles.airportCard}>
                <div className={styles.airportHeader}>
                  <div className={styles.cardTitleRow}>
                    <span className={styles.codeBadge}>{airport.code}</span>
                    <h3 className={`${styles.airportName} h4 cardTitle`}>
                      {airport.shortName}
                    </h3>
                  </div>
                  <div className={styles.imgContainer}>
                    <Image
                      src={airport.heroImage}
                      alt={`${airport.name} airport`}
                      fill
                      className={styles.img}
                      placeholder='blur'
                    />
                  </div>
                  <ul className={styles.metaRow}>
                    <li className={styles.metaItem}>{airport.terminals}</li>
                    <li className={styles.metaItem}>{airport.driveTime}</li>
                  </ul>
                </div>
                <p className={styles.airportCopy}>{airport.heroLine}</p>
                <Button
                  href={`/airports/${airport.slug}`}
                  text='Pickup details & rates →'
                  btnType='black'
                  arrow
                />
              </div>
            ))}
          </div>
        </LayoutWrapper>
      </section>

      {/* Private aviation band */}
      <section className={styles.aviationBand}>
        <LayoutWrapper>
          <div className={styles.aviationContent}>
            <div className={styles.aviationLeft}>
              <SectionHeading text='Private Aviation' dot />
              <h2 className={`${styles.aviationHeading} h3`}>
                Landing at an FBO? We meet the aircraft, not the terminal.
              </h2>
              <p className={styles.aviationCopy}>
                Tail-number tracking, FBO lobby or planeside pickups, and crew
                transport at all six Phoenix-area reliever airports —
                Scottsdale, Deer Valley, Falcon Field, Chandler, Glendale, and
                Goodyear.
              </p>
            </div>
            <div className={styles.aviationRight}>
              <Button
                href='/airports/private-aviation'
                text='Private jet & FBO car service'
                btnType='black'
                arrow
              />
            </div>
          </div>
        </LayoutWrapper>
      </section>

      {/* Directory */}
      {DIRECTORY_GROUPS.map((group) => {
        const rows = arizonaAirportsDirectory.filter(
          (a) => a.group === group.key,
        );
        return (
          <section key={group.key} className={styles.directorySection}>
            <LayoutWrapper>
              <h2 className={`${styles.directoryHeading} h3`}>
                {group.heading}
              </h2>
              <p className={styles.directoryBlurb}>{group.blurb}</p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Code</th>
                      <th className={styles.th}>Airport</th>
                      <th className={styles.th}>City</th>
                      <th className={styles.th}>Category</th>
                      <th className={styles.th}>2024 boardings</th>
                      <th className={styles.th}>Drive from Phoenix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => (
                      <tr key={a.faa} className={styles.tr}>
                        <td className={styles.td}>
                          <span className={styles.codeBadgeSm}>
                            {a.iata ?? a.faa}
                          </span>
                        </td>
                        <td className={styles.td}>
                          {a.href ? (
                            <Link href={a.href} className={styles.airportLink}>
                              {a.name}
                            </Link>
                          ) : (
                            <span className={styles.airportPlain}>
                              {a.name}
                            </span>
                          )}
                          {a.note && <p className={styles.note}>{a.note}</p>}
                          <p className={styles.codes}>
                            FAA {a.faa}
                            {a.iata && a.iata !== a.faa
                              ? ` · IATA ${a.iata}`
                              : ""}
                            {a.icao ? ` · ICAO ${a.icao}` : ""}
                          </p>
                        </td>
                        <td className={styles.td}>{a.city}</td>
                        <td className={styles.td}>{a.role}</td>
                        <td className={styles.td}>
                          {a.enplanements != null
                            ? a.enplanements.toLocaleString("en-US")
                            : "—"}
                        </td>
                        <td className={styles.td}>
                          {a.driveFromPhoenix ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {group.key === "commercial" && (
                <p className={styles.sourceNote}>
                  Boardings are FAA calendar-year 2024 passenger enplanements.
                  Drive times are approximate from central Phoenix.
                </p>
              )}
            </LayoutWrapper>
          </section>
        );
      })}

      <Faq
        items={faqs.map((f, i) => ({ id: i, question: f.q, answer: f.a }))}
        limit={faqs.length}
      />

      <AboutNumbers />
    </main>
  );
}
