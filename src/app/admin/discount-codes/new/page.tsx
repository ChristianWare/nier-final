import Link from "next/link";
import DiscountCodeForm from "../DiscountCodeForm";
import styles from "../../drivers/AdminDriversPage.module.css";

export const dynamic = "force-dynamic";

export default function NewDiscountCodePage() {
  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div className='miniNote'>
          <Link href='/admin/discount-codes'>← All discount codes</Link>
        </div>
        <h1 className={`${styles.heading} h2`}>New discount code</h1>
      </header>
      <div className={styles.block}>
        <DiscountCodeForm />
      </div>
    </section>
  );
}
