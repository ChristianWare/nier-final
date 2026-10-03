// The reports page's KPI card, shared with the drivers page.
import CountUp from "@/components/shared/CountUp/CountUp";
import styles from "./AdminReportsPage.module.css";

function parseValue(str: string): {
  value: number;
  prefix: string;
  suffix: string;
} {
  const cleaned = str.replace(/,/g, "").trim();
  const match = cleaned.match(/^([^\d.-]*)([+-]?\d+(?:\.\d+)?)([^\d]*)$/);

  if (match) {
    const prefix = match[1] || "";
    const value = parseFloat(match[2]) || 0;
    const suffix = match[3] || "";
    return { value, prefix, suffix };
  }

  const numValue = parseFloat(cleaned);
  if (!isNaN(numValue)) {
    return { value: numValue, prefix: "", suffix: "" };
  }

  return { value: 0, prefix: "", suffix: str };
}

export default function KpiCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const { value: numericValue, prefix, suffix } = parseValue(value);
  // No number to count up to (e.g. "—" when there's nothing to measure yet).
  const hasNumber = /\d/.test(value);

  return (
    <div className={`${styles.kpiCard} ${styles[`tone_${tone}`]}`}>
      <div className='emptyTitle underline'>{label}</div>
      {!hasNumber ? (
        <div className={styles.kpiValue}>{value}</div>
      ) : (
        <div className={styles.kpiValue}>
          {prefix && <span>{prefix}</span>}
          <CountUp
            from={0}
            to={numericValue}
            duration={1.5}
            separator=','
            delay={0.1}
          />
          {suffix && <span>{suffix}</span>}
        </div>
      )}
      <div className={styles.kpiSub}>{sub}</div>
    </div>
  );
}
