import styles from "./BookSuccess.module.css";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Link from "next/link";
import SuccessClient from "./SuccessClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function BookSuccessPage({
  searchParams,
}: {
  searchParams?: { id?: string };
}) {
  const id = searchParams?.id ?? null;

  return (
    <main>
      <Nav background='white' />
      <SuccessClient />
      <LayoutWrapper>
        <section className={styles.container}>
          <div className={styles.card}>
            <div className={styles.icon}>✓</div>
            <h1 className={styles.title}>Success!</h1>
            <p className={styles.subheading}>
              Your request has been submitted. Dispatch will review it and email
              you a payment link once approved, typically within 24 hours.
            </p>

            {id ? <div className={styles.meta}>Request ID: {id}</div> : null}

            <div className={styles.actions}>
              <Link href='/' className={styles.primary}>
                Back to home
              </Link>
              <Link href='/book' className={styles.secondary}>
                Book another ride
              </Link>
            </div>

            <div className={styles.note}>
              If you don’t see an email, check spam or contact support.
            </div>
          </div>
        </section>
      </LayoutWrapper>
    </main>
  );
}
