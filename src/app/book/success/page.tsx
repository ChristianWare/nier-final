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
  searchParams?: { id?: string; t?: string };
}) {
  const id = searchParams?.id ?? null;
  const t = searchParams?.t ?? null;

  const trackHref = t ? `/book/track?t=${encodeURIComponent(t)}` : null;
  const nextTrack = trackHref ? `?next=${encodeURIComponent(trackHref)}` : "";

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
                {trackHref ? (
                  <Button
                    href={trackHref}
                    text='Track your request'
                    btnType='black'
                    arrow
                  />
                ) : null}

                <Button
                  href='/book'
                  text='Book another ride'
                  btnType='red'
                  arrow
                />
                <Button href='/' text='Go back home' btnType='black' arrow />
              </div>

              {trackHref ? (
                <div style={{ display: "grid", gap: 10, paddingTop: 10 }}>
                  <div className='miniNote'>
                    Want faster checkout next time? Create an account to manage
                    requests and updates.
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Button
                      href={`/register${nextTrack}`}
                      text='Create account'
                      btnType='black'
                      arrow
                    />
                    <Button
                      href={`/login${nextTrack}`}
                      text='Sign in'
                      btnType='red'
                      arrow
                    />
                  </div>
                </div>
              ) : null}

              <div className='miniNote'>
                If you don’t see an email, check spam or contact support.
              </div>
            </div>
          </div>
        </LayoutWrapper>
      </section>
      <Faq items={homeQuestions} />
      <AboutNumbers />
    </main>
  );
}
