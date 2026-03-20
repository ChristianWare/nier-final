// src/components/admin/PriceBreakdownCard/PriceBreakdownCard.tsx

import styles from "./PriceBreakdownCard.module.css";
import { ServicePricingStrategy } from "@prisma/client";

type Props = {
  pricingStrategy: ServicePricingStrategy;
  // Service-level rates (cents)
  servicePerMileCents: number;
  servicePerMinuteCents: number;
  servicePerHourCents: number;
  serviceBaseFeeCents: number;
  serviceMinFareCents: number;
  serviceMinHours: number;
  // Vehicle-level rates (cents)
  vehicleBaseFareCents: number;
  vehiclePerMileCents: number;
  vehiclePerMinuteCents: number;
  vehiclePerHourCents: number;
  vehicleMinHours: number;
  // Trip details
  distanceMiles: number | null;
  durationMinutes: number | null;
  hoursRequested: number | null;
  // Stops
  stopCount: number;
  stopSurchargeCents: number;
  // Final total stored on booking
  totalCents: number;
  currency: string;
  vehicleCategoryName: string | null;
  feesCents: number;
};

function fmt(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function safeNum(v: number | null | undefined): number {
  return typeof v === "number" && isFinite(v) ? v : 0;
}

type BreakdownRow = {
  label: string;
  detail?: string;
  cents: number;
  highlight?: "floor" | "surcharge" | "total" | "zero";
};

function buildBreakdown(props: Props): BreakdownRow[] {
  const {
    pricingStrategy,
    servicePerMileCents,
    servicePerMinuteCents,
    servicePerHourCents,
    serviceBaseFeeCents,
    serviceMinFareCents,
    serviceMinHours,
    vehicleBaseFareCents,
    vehiclePerMileCents,
    vehiclePerMinuteCents,
    vehiclePerHourCents,
    vehicleMinHours,
    distanceMiles,
    durationMinutes,
    hoursRequested,
    stopCount,
    stopSurchargeCents,
    currency,
  } = props;

  const rows: BreakdownRow[] = [];

  const perMileCents = servicePerMileCents + vehiclePerMileCents;
  const perMinuteCents = servicePerMinuteCents + vehiclePerMinuteCents;
  const perHourCents = servicePerHourCents + vehiclePerHourCents;

  if (pricingStrategy === ServicePricingStrategy.HOURLY) {
    const requested = safeNum(hoursRequested);
    const effectiveMinHours = Math.max(
      safeNum(serviceMinHours),
      safeNum(vehicleMinHours),
    );
    const billed = Math.max(Math.ceil(requested), Math.ceil(effectiveMinHours));

    rows.push({
      label: "Hours requested",
      detail: `${requested.toFixed(2)} hrs`,
      cents: 0,
      highlight: "zero",
    });

    if (effectiveMinHours > 0) {
      rows.push({
        label: "Minimum hours",
        detail: `${effectiveMinHours} hr minimum${Math.ceil(requested) < effectiveMinHours ? " — applied" : " — not needed"}`,
        cents: 0,
        highlight: "zero",
      });
    }

    rows.push({
      label: "Billed hours",
      detail:
        billed > Math.ceil(requested)
          ? `${billed} hrs (minimum applied)`
          : billed !== requested
            ? `${billed} hrs (rounded up from ${requested.toFixed(2)})`
            : `${billed} hrs`,
      cents: 0,
      highlight: "zero",
    });

    const timeCharge = Math.round(billed * perHourCents);
    rows.push({
      label: "Hourly charge",
      detail: `${billed} hrs × ${fmt(perHourCents, currency)}/hr`,
      cents: timeCharge,
    });

    if (timeCharge < vehicleBaseFareCents) {
      rows.push({
        label: "Vehicle base fare floor applied",
        detail: `Calculated ${fmt(timeCharge, currency)} was below ${fmt(vehicleBaseFareCents, currency)} minimum`,
        cents: vehicleBaseFareCents - timeCharge,
        highlight: "floor",
      });
    }

    const rideCharge = Math.max(timeCharge, vehicleBaseFareCents);

    if (serviceBaseFeeCents > 0) {
      rows.push({
        label: "Service base fee",
        detail: "Fixed charge for this service type",
        cents: serviceBaseFeeCents,
      });
    }

    if (stopCount > 0 && stopSurchargeCents > 0) {
      rows.push({
        label: "Extra stop surcharge",
        detail: `${stopCount} stop${stopCount > 1 ? "s" : ""} × $15.00`,
        cents: stopSurchargeCents,
        highlight: "surcharge",
      });
    }

    const subtotal = rideCharge + serviceBaseFeeCents + stopSurchargeCents;

    if (subtotal < serviceMinFareCents) {
      rows.push({
        label: "Service minimum fare applied",
        detail: `Calculated ${fmt(subtotal, currency)} was below ${fmt(serviceMinFareCents, currency)} minimum`,
        cents: serviceMinFareCents - subtotal,
        highlight: "floor",
      });
    }
  } else if (pricingStrategy === ServicePricingStrategy.POINT_TO_POINT) {
    const miles = safeNum(distanceMiles);
    const minutes = safeNum(durationMinutes);
    const waitMinutes = stopCount * 5;
    const totalMinutes = minutes + waitMinutes;

    if (serviceBaseFeeCents > 0) {
      rows.push({
        label: "Service base fee",
        detail: "Fixed charge for this service type",
        cents: serviceBaseFeeCents,
      });
    }

    const mileageCharge = Math.round(miles * perMileCents);
    rows.push({
      label: "Distance charge",
      detail: `${miles.toFixed(1)} mi × ${fmt(perMileCents, currency)}/mi`,
      cents: mileageCharge,
    });

    if (perMinuteCents > 0) {
      const timeCharge = Math.round(totalMinutes * perMinuteCents);
      rows.push({
        label: "Time charge",
        detail: `${totalMinutes} min × ${fmt(perMinuteCents, currency)}/min${waitMinutes > 0 ? ` (includes ${waitMinutes} min stop wait)` : ""}`,
        cents: timeCharge,
      });
    }

    const tripCharge =
      mileageCharge + Math.round(totalMinutes * perMinuteCents);
    if (tripCharge < vehicleBaseFareCents) {
      rows.push({
        label: "Vehicle base fare floor applied",
        detail: `Calculated ${fmt(tripCharge, currency)} was below ${fmt(vehicleBaseFareCents, currency)} minimum`,
        cents: vehicleBaseFareCents - tripCharge,
        highlight: "floor",
      });
    }

    if (stopCount > 0 && stopSurchargeCents > 0) {
      rows.push({
        label: "Extra stop surcharge",
        detail: `${stopCount} stop${stopCount > 1 ? "s" : ""} × $15.00`,
        cents: stopSurchargeCents,
        highlight: "surcharge",
      });
    }
  } else {
    // FLAT
    rows.push({
      label: "Flat rate",
      detail: "Fixed price for this vehicle category",
      cents: vehicleBaseFareCents,
    });

    if (stopCount > 0 && stopSurchargeCents > 0) {
      rows.push({
        label: "Extra stop surcharge",
        detail: `${stopCount} stop${stopCount > 1 ? "s" : ""} × $15.00`,
        cents: stopSurchargeCents,
        highlight: "surcharge",
      });
    }
  }

  return rows;
}

export default function PriceBreakdownCard(props: Props) {
  const { pricingStrategy, totalCents, currency } = props;
  const rows = buildBreakdown(props);

  const strategyLabel =
    pricingStrategy === ServicePricingStrategy.HOURLY
      ? "Hourly"
      : pricingStrategy === ServicePricingStrategy.POINT_TO_POINT
        ? "Point to Point"
        : "Flat Rate";

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Price Breakdown</span>
        <span className={styles.strategy}>{strategyLabel}</span>
      </div>
      {props.vehicleCategoryName && (
        <div className={styles.vehicleRow}>
          <span className={styles.vehicleLabel}>Vehicle Category</span>
          <span className={styles.vehicleName}>
            {props.vehicleCategoryName}
          </span>
        </div>
      )}

      <div className={styles.rows}>
        {rows.map((row, i) => {
          const isZero = row.highlight === "zero";
          return (
            <div
              key={i}
              className={`${styles.row} ${row.highlight ? styles[`row_${row.highlight}`] : ""}`}
            >
              <div className={styles.rowLeft}>
                <span className={styles.rowLabel}>{row.label}</span>
                {row.detail && (
                  <span className={styles.rowDetail}>{row.detail}</span>
                )}
              </div>
              {!isZero && (
                <span className={styles.rowAmount}>
                  {row.cents > 0
                    ? `+${fmt(row.cents, currency)}`
                    : fmt(row.cents, currency)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {props.feesCents > 0 && (
        <div className={styles.vehicleRow}>
          <span className={styles.vehicleLabel}>Service Fees</span>
          <span className={styles.vehicleName}>
            {fmt(props.feesCents, currency)}
          </span>
        </div>
      )}

      <div className={styles.total}>
        <span className={styles.totalLabel}>Total Charged</span>
        <span className={styles.totalAmount}>{fmt(totalCents, currency)}</span>
      </div>
    </div>
  );
}
