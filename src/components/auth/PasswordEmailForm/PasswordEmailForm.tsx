"use client";

import styles from "./PasswordEmailForm.module.css";
import {
  PasswordEmailSchema,
  PasswordEmailSchemaType,
} from "@/schemas/PasswordEmailSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import FormField from "../FormField/FormField";
import { passwordEmail } from "../../../../actions/auth/password-email";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Button from "@/components/shared/Button/Button";
import Link from "next/link";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import toast from "react-hot-toast";
import Email from "@/components/shared/icons/Email/Email";

export default function PasswordEmailForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordEmailSchemaType>({
    resolver: zodResolver(PasswordEmailSchema),
  });

  const [isPending, startTransition] = useTransition();
  const [emailSent, setEmailSent] = useState(false);

  const onSubmit: SubmitHandler<PasswordEmailSchemaType> = (data) => {
    startTransition(() => {
      passwordEmail(data).then((res) => {
        if (res?.error) {
          toast.error(res.error, {
            duration: 5000,
            style: {
              padding: "16px",
              fontSize: "14px",
            },
          });
          return;
        }

        if (res?.success) {
          setEmailSent(true);
          toast.success(res.success, {
            duration: 5000,
            style: {
              padding: "16px",
              fontSize: "14px",
            },
          });
        }
      });
    });
  };

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.top}>
          <h1 className={`${styles.heading} heading`}>Forgot your password?</h1>
          {emailSent ? (
            <p className={styles.copyii}>
              Check your email for a link to reset your password. If it
              doesn&apos;t appear within a few minutes, check your spam folder.
            </p>
          ) : (
            <p className={styles.copy}>
              Enter your email address and we&apos;ll send you a link to reset
              your password.
            </p>
          )}
        </div>
        {!emailSent ? (
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <FormField
              id='email'
              register={register}
              errors={errors}
              placeholder='Enter your email address'
              label='email'
              disabled={isPending}
            />

            <div className={styles.btnContainer}>
              <Button
                type='submit'
                btnType='redReg'
                disabled={isPending}
                text={isPending ? "Sending..." : "Send reset email"}
              />
              <Link href='/login' className='backBtn'>
                <Arrow className={styles.arrow} />
                Back to login
              </Link>
            </div>
          </form>
        ) : (
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <Email className={styles.emailIcon} />
            </div>
            <p className={styles.successText}>
              We&apos;ve sent a password reset link to your email address.
            </p>
            <div className={styles.btnContainer}>
              <Button btnType='redReg' href='/login' text='Back to login' />
              <button
                type='button'
                className='backBtn'
                onClick={() => setEmailSent(false)}
              >
                Didn&apos;t receive it? Try again
              </button>
            </div>
          </div>
        )}
      </LayoutWrapper>
    </section>
  );
}
