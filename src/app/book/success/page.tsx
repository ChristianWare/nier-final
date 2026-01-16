import styles from "./BookSuccess.module.css";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SuccessClient from "./SuccessClient";
import Check from "@/components/shared/icons/Check/Check";
import Button from "@/components/shared/Button/Button";
import Faq from "@/components/shared/Faq/Faq";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import { homeQuestions } from "@/lib/data";

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
      <Nav background='cream' />
      <SuccessClient />
      <section className={styles.parent}>
        <LayoutWrapper>
          <div className={styles.container}>
            <div className={styles.card}>
              <div className={styles.icon}>
                <Check className={styles.check} />
              </div>
              <h1 className={`${styles.heading} h2`}>Success!</h1>
              <p className={styles.copy}>
                Your request has been submitted. Dispatch will review it and
                email you a payment link once approved, typically within 24
                hours.
              </p>

              {id ? <div className={styles.meta}>Request ID: {id}</div> : null}

              <div className={styles.actions}>
                {/* <Link href='/' className={styles.primary}>
                Back to home
              </Link>
              <Link href='/book' className={styles.secondary}>
                Book another ride
              </Link> */}
                <Button
                  href='/book'
                  text='Book another ride'
                  btnType='red'
                  arrow
                />
                <Button
                  href='/book'
                  text='Go back home'
                  btnType='black'
                  arrow
                />
              </div>

              <div className='miniNote'>
                If you don’t see an email, check spam or contact support.
              </div>
            </div>
          </div>
        </LayoutWrapper>
      </section>
      <Faq items={homeQuestions} />
      {/* <BlogSection /> */}
      <AboutNumbers />
    </main>
  );
}
