import styles from "./UserSavedPaymentCard.module.css";
import { getStripe } from "@/lib/stripe";

interface Props {
  stripeCustomerId: string | null;
}

const CARD_BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
  unknown: "Card",
};

const CARD_BRAND_COLORS: Record<string, string> = {
  visa: "#1a1f71",
  mastercard: "#eb001b",
  amex: "#007bc1",
  discover: "#ff6600",
  unknown: "#6b7280",
};

function CardIcon({ brand }: { brand: string }) {
  const color = CARD_BRAND_COLORS[brand] ?? CARD_BRAND_COLORS.unknown;
  return (
    <svg
      width='36'
      height='24'
      viewBox='0 0 36 24'
      fill='none'
      style={{ borderRadius: 4, border: "1px solid #e5e7eb" }}
    >
      <rect width='36' height='24' rx='4' fill='#f9fafb' />
      <rect
        x='4'
        y='8'
        width='28'
        height='4'
        rx='1'
        fill={color}
        opacity='0.15'
      />
      <rect x='4' y='8' width='10' height='4' rx='1' fill={color} />
      <circle cx='22' cy='14' r='4' fill={color} opacity='0.6' />
      <circle cx='26' cy='14' r='4' fill={color} opacity='0.4' />
    </svg>
  );
}

export default async function UserSavedPaymentCard({
  stripeCustomerId,
}: Props) {
  // ── No Stripe customer yet ──
  if (!stripeCustomerId) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>💳</span>
        <div className={styles.emptyText}>
          <span className={styles.emptyTitle}>No card on file</span>
          <span className={styles.emptyNote}>
            User has not saved a payment method
          </span>
        </div>
      </div>
    );
  }

  // ── Fetch from Stripe ──
  let paymentMethods: Awaited<ReturnType<typeof fetchMethods>> = [];
  let fetchError = false;

  try {
    paymentMethods = await fetchMethods(stripeCustomerId);
  } catch {
    fetchError = true;
  }

  if (fetchError) {
    return (
      <div className={styles.errorState}>
        <span>⚠️ Could not load payment methods from Stripe.</span>
      </div>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>💳</span>
        <div className={styles.emptyText}>
          <span className={styles.emptyTitle}>No card on file</span>
          <span className={styles.emptyNote}>
            Stripe customer exists but no payment methods saved
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.cardList}>
      {paymentMethods.map((pm) => {
        const brand = pm.card?.brand ?? "unknown";
        const last4 = pm.card?.last4 ?? "••••";
        const expMonth = String(pm.card?.exp_month ?? "").padStart(2, "0");
        const expYear = String(pm.card?.exp_year ?? "").slice(-2);
        const brandLabel = CARD_BRAND_LABELS[brand] ?? "Card";

        const now = new Date();
        const expDate = new Date(
          pm.card?.exp_year ?? 0,
          (pm.card?.exp_month ?? 1) - 1,
          1,
        );
        const isExpired =
          expDate < new Date(now.getFullYear(), now.getMonth(), 1);

        return (
          <div key={pm.id} className={styles.cardRow}>
            <CardIcon brand={brand} />
            <div className={styles.cardInfo}>
              <span className={styles.cardLabel}>
                {brandLabel} ending in {last4}
              </span>
              <span
                className={`${styles.cardExpiry} ${isExpired ? styles.cardExpired : ""}`}
              >
                {isExpired ? "Expired" : "Expires"} {expMonth}/{expYear}
              </span>
            </div>
            <div className={styles.cardBadges}>
              {isExpired ? (
                <span className='badge badge_bad'>Expired</span>
              ) : (
                <span className='badge badge_good'>Active</span>
              )}
            </div>
          </div>
        );
      })}
      <p className={styles.stripeNote}>
        Managed via Stripe customer{" "}
        <code className={styles.customerId}>{stripeCustomerId}</code>
      </p>
    </div>
  );
}

async function fetchMethods(customerId: string) {
  const stripe = await getStripe();
  const result = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
    limit: 10,
  });
  return result.data;
}
