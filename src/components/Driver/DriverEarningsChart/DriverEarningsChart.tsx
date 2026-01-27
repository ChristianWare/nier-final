"use client";

import styles from "./DriverEarningsChart.module.css";
import Link from "next/link";
import { useMemo } from "react";

export type DailyEarning = {
  date: string; // YYYY-MM-DD
  amountCents: number;
  tripCount: number;
};

type Props = {
  dailyEarnings: DailyEarning[];
  monthLabel: string; // e.g., "January 2026"
  totalEarningsCents: number;
  totalTrips: number;
  currency?: string;
};

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatMoneyFull(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function getDayOfMonth(dateStr: string): number {
  return new Date(dateStr).getDate();
}

export default function DriverEarningsChart({
  dailyEarnings,
  monthLabel,
  totalEarningsCents,
  totalTrips,
  currency = "USD",
}: Props) {
  const chartData = useMemo(() => {
    if (dailyEarnings.length === 0) return { bars: [], maxAmount: 0 };

    const maxAmount = Math.max(...dailyEarnings.map((d) => d.amountCents));

    const bars = dailyEarnings.map((d) => ({
      date: d.date,
      day: getDayOfMonth(d.date),
      amount: d.amountCents,
      trips: d.tripCount,
      heightPercent: maxAmount > 0 ? (d.amountCents / maxAmount) * 100 : 0,
    }));

    return { bars, maxAmount };
  }, [dailyEarnings]);

  const avgPerTrip = totalTrips > 0 ? totalEarningsCents / totalTrips : 0;

  return (
    <section className={styles.container} aria-label='Earnings chart'>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className='cardTitle h4'>
            <span className={styles.cc}>💰</span>
            Earnings - {monthLabel}
          </h2>

          <div className={styles.kpis}>
            <span className={`${styles.kpi} ${styles.kpiGood}`}>
              Total: {formatMoneyFull(totalEarningsCents, currency)}
            </span>
            <span className={styles.kpi}>
              {totalTrips} trip{totalTrips !== 1 ? "s" : ""}
            </span>
            {avgPerTrip > 0 && (
              <span className={`${styles.kpi} ${styles.kpiAccent}`}>
                Avg/trip: {formatMoneyFull(avgPerTrip, currency)}
              </span>
            )}
          </div>
        </div>

        <div className={styles.controls}>
          <Link
            href='/driver-dashboard/earnings'
            className={styles.viewAllLink}
          >
            View detailed earnings →
          </Link>
        </div>
      </header>

      {chartData.bars.length === 0 ? (
        <div className={styles.emptyState}>
          <p className='emptySmall'>No earnings recorded this month.</p>
        </div>
      ) : (
        <div className={styles.chartWrapper}>
          <div className={styles.chart}>
            {chartData.bars.map((bar) => (
              <div key={bar.date} className={styles.barWrapper}>
                <div
                  className={styles.bar}
                  style={{ height: `${Math.max(bar.heightPercent, 4)}%` }}
                  title={`${formatMoneyFull(bar.amount, currency)} (${bar.trips} trips)`}
                >
                  {bar.heightPercent > 20 && (
                    <span className={styles.barLabel}>
                      {formatMoney(bar.amount, currency)}
                    </span>
                  )}
                </div>
                <span className={styles.dayLabel}>{bar.day}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
