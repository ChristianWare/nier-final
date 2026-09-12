import styles from "./DenuRateCard.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";

const airportTransfers = [
  { name: "PHX – Sky Harbor Airport", suv: 79, van: 150, online: true },
  { name: "AZA – Mesa Gateway Airport", suv: 174, van: 306, online: true },
  { name: "SCF – Scottsdale Airport", suv: 115, van: 210, online: false },
  { name: "GEU – Glendale Airport", suv: 105, van: 185, online: false },
];

const localTransfers = [
  { name: "State Farm Stadium", suv: 105, van: 185 },
  { name: "Old Town Scottsdale", suv: 79, van: 150 },
  { name: "Buffalo Chip Saloon & Steakhouse (Cave Creek)", suv: 175, van: 325 },
];

const hourly = [
  { name: "Sedan", rate: 120 },
  { name: "SUV", rate: 125 },
  { name: "Premium Sedan", rate: 165 },
  { name: "Sprinter", rate: 160 },
  { name: "14-Passenger Executive Sprinter", rate: 190 },
  { name: "22-passenger mini-bus", rate: 210 },
  { name: "28-passenger mini-bus", rate: 215 },
  { name: "40-passenger mini-bus", rate: 225 },
  { name: "56-passenger Motorcoach", rate: 250 },
];

export default function DenuRateCard() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.top}>
          <SectionHeading text='Full Rate Card' dot />
          <h2 className={styles.heading}>
            Every ride from the hotel,
            <br />
            priced before you book.
          </h2>
          <p className={styles.subCopy}>
            Sky Harbor and Mesa Gateway book online above. Everything else on
            this card is one call away — same flat-rate promise, gratuity
            included on every transfer.
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h3 className={styles.cardHeading}>Airport transfers</h3>
            <p className={styles.cardNote}>One way · gratuity included</p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Airport</th>
                  <th className={styles.thNum}>SUV</th>
                  <th className={styles.thNum}>14-pax van</th>
                </tr>
              </thead>
              <tbody>
                {airportTransfers.map((r) => (
                  <tr key={r.name}>
                    <td className={styles.td}>
                      {r.name}
                      {r.online && (
                        <span className={styles.pill}>Book online</span>
                      )}
                    </td>
                    <td className={styles.tdNum}>${r.suv}</td>
                    <td className={styles.tdNum}>${r.van}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.card}>
            <h3 className={`${styles.cardHeading} h4`}>Local destinations</h3>
            <p className={styles.cardNote}>
              One way from the hotel · gratuity included
            </p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Destination</th>
                  <th className={styles.thNum}>SUV</th>
                  <th className={styles.thNum}>14-pax van</th>
                </tr>
              </thead>
              <tbody>
                {localTransfers.map((r) => (
                  <tr key={r.name}>
                    <td className={styles.td}>{r.name}</td>
                    <td className={styles.tdNum}>${r.suv}</td>
                    <td className={styles.tdNum}>${r.van}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`${styles.card} ${styles.cardWide}`}>
            <h3 className={styles.cardHeading}>Hourly & group charters</h3>
            <p className={styles.cardNote}>
              Per hour · for meetings, weddings, and event shuttles from Denū
            </p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Vehicle</th>
                  <th className={styles.thNum}>Per hour</th>
                </tr>
              </thead>
              <tbody>
                {hourly.map((r) => (
                  <tr key={r.name}>
                    <td className={styles.td}>{r.name}</td>
                    <td className={styles.tdNum}>${r.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.ctaRow}>
          <Button
            href='/book'
            text='Book a local or hourly ride'
            btnType='black'
            arrow
          />
          <a href='tel:+14803006003' className={styles.callLink}>
            Or call (480) 300-6003
          </a>
        </div>
      </LayoutWrapper>
    </section>
  );
}
