import Donut from "@/components/shared/icons/Donut/Donut";
import styles from "./CorporateBenefits.module.css";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Sparkle from "@/components/shared/icons/Sparkle/Sparkle";
import Cups from "@/components/shared/icons/Cups/Cups";
import SquareCircle from "@/components/shared/icons/SquareCircle/SquareCircle";

export default function CorporateBenefits() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.header}>
            <SectionHeading text='Benefits' color='red' />
            <h2 className={`${styles.heading} h3`}>
              What Nier can do for your business
            </h2>
          </div>
          <div className={styles.grid}>
            {benefits.map((benefit) => (
              <div key={benefit.id} className={styles.card}>
                {/* <span className={styles.number}>
                  {String(benefit.id).padStart(2, "0")}
                </span> */}
                <div className={styles.iconContainer}>{benefit.icon}</div>

                <h3 className={`${styles.cardTitle} h4`}>{benefit.title}</h3>
                <p className={styles.cardCopy}>{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}

const benefits = [
  {
    id: 1,
    title: "Centralized Billing",
    description:
      "All rides billed to a single account. Choose monthly, weekly, or per-ride invoicing. Pay electronically or by check — whatever works for your accounting department.",
    icon: <Donut className={styles.icon} />,
  },
  {
    id: 2,
    title: "Book for Your Team",
    description:
      "Your designated admin books rides on behalf of employees, clients, or guests. Maintain a passenger roster so booking takes seconds, not minutes.",
    icon: <Sparkle className={styles.icon} />,
  },
  {
    id: 3,
    title: "Negotiated Rates",
    description:
      "Volume-based discounts tailored to your usage. The more you ride, the more you save. No surge pricing, no surprises — just straightforward, agreed-upon rates.",
    icon: <Cups className={styles.icon} />,
  },
  {
    id: 4,
    title: "Dedicated Support",
    description:
      "Your account gets priority access to our dispatch team. One call, one point of contact for changes, cancellations, or last-minute requests.",
    icon: <SquareCircle className={styles.icon} />,
  },
  {
    id: 5,
    title: "Detailed Reporting",
    description:
      "Track spending by passenger, department, or cost center. Export reports for expense reconciliation and budget planning.",
    icon: <Donut className={styles.icon} />,
  },
  {
    id: 6,
    title: "Flexible Payment Terms",
    description:
      "NET 15, NET 30, or NET 45 — we work with your accounts payable cycle. Invoices include full trip details for easy auditing.",
    icon: <Sparkle className={styles.icon} />,
  },
];
