// src/app/book/success/page.tsx
import styles from "./BookSuccess.module.css";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import SuccessClient from "./SuccessClient";
import Check from "@/components/shared/icons/Check/Check";
import Button from "@/components/shared/Button/Button";
import Faq from "@/components/shared/Faq/Faq";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";
import WhatHappensNext from "@/components/shared/WhatHappensNext";
import { homeQuestions } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BookSuccessPage(props: {
  searchParams?: Promise<{ id?: string; t?: string }>;
}) {
  const sp = (await props.searchParams) ?? {};
  const id = sp.id ?? null;
  const t = sp.t ?? null;

  const trackHref = t ? `/book/track?t=${encodeURIComponent(t)}` : null;
  const nextTrack = trackHref ? `?next=${encodeURIComponent(trackHref)}` : "";

  // Determine if this is a guest checkout (has tracking token)
  const isGuestCheckout = Boolean(t);

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

              {id ? (
                <div className={`${styles.meta} pill pillGood`}>
                  Request ID: {id}
                </div>
              ) : null}

              {/* ✅ What Happens Next - shows the step-by-step process */}
              <WhatHappensNext />

              <div className={styles.actions}>
                {trackHref ? (
                  <Button
                    href={trackHref}
                    text='Track your request'
                    btnType='underlinedBlack'
                    arrow
                  />
                ) : null}
              </div>

              {/* ✅ Only show account creation for guest checkout */}
              {isGuestCheckout && trackHref ? (
                <div style={{ display: "grid", gap: 10, paddingTop: 10 }}>
                  <div className='miniNote'>
                    Want faster checkout next time? Create an account to manage
                    requests and updates.
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 20,
                      marginTop: 5,
                    }}
                  >
                    <Button
                      href={`/register${nextTrack}`}
                      text='Create account'
                      btnType='blackReg'
                    />
                    <Button
                      href={`/login${nextTrack}`}
                      text='Sign in'
                      btnType='redReg'
                    />
                  </div>
                </div>
              ) : null}

              <div className='miniNote' style={{ marginTop: 16 }}>
                📧 Check your email! We&apos;ve sent you a confirmation with your
                booking details.
              </div>

              <div className='miniNote'>
                If you don&apos;t see an email, check spam or contact support.
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
