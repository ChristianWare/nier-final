"use client";

import styles from "./EmailVerificationClient.module.css";
import { useEffect, useState } from "react";
import { verifyEmail } from "../../../../actions/auth/email-verification";
import Alert from "@/components/shared/Alert/Alert";
import Button from "@/components/shared/Button/Button";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Image from "next/image";
import Yay from "../../../../public/images/areas.jpg";
import Angry from "../../../../public/images/brewery.jpg";

type Props = { token?: string };

export default function EmailVerificationClient({ token }: Props) {
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");
  const [pending, setPending] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      setPending(true);

      if (!token) {
        if (!isMounted) return;
        setError("Missing verification token");
        setPending(false);
        return;
      }

      try {
        const res = await verifyEmail(token);
        if (!isMounted) return;
        setSuccess(res?.success);
        setError(res?.error);
      } catch {
        if (!isMounted) return;
        setError(
          "Something went wrong verifying your email. Please try again."
        );
      } finally {
        if (isMounted) setPending(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
              <div className={styles.imgContainer}>
                <Image src={Yay} alt='happy face' fill className={styles.img} />
              </div>
          </div>
          {pending && <div>Verifying email...</div>}
          {/* {success && <Alert message={success} success />} */}
          {error && (
            <>
              <div className={styles.imgContainer}>
                <Image
                  src={Angry}
                  alt='angry face'
                  fill
                  className={styles.img}
                />
              </div>
              <Alert message={error} error />
            </>
          )}
          {success && (
            <div>
              <h1 className='h2'>You’re all set</h1>
              <p className={styles.copy}>
                Thanks for verifying your email. You can now request, pay for,
                and manage bookings online.
              </p>
              <Alert message={success} success />
              <div className={styles.btnContainer}>
                <Button text='Login' btnType='black' href='/login' arrow />
              </div>
            </div>
          )}
          <div className={styles.right}></div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
