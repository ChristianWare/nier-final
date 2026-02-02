"use client";

import styles from "./PasswordEmailForm.module.css";
import Alert from "@/components/shared/Alert/Alert";
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

export default function PasswordEmailForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordEmailSchemaType>({
    resolver: zodResolver(PasswordEmailSchema),
  });

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");

  const onSubmit: SubmitHandler<PasswordEmailSchemaType> = (data) => {
    setError("");
    startTransition(() => {
      passwordEmail(data).then((res) => {
        if (res?.error) {
          setError(res.error);
        }

        if (res?.success) {
          setSuccess(res.success);
        }
      });
    });
  };

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.top}>
          <h1 className={`${styles.heading} heading`}>Forgot your password?</h1>
          <p className={styles.copy}>
            A code will be sent to your email to reset your password.
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <FormField
            id='email'
            register={register}
            errors={errors}
            placeholder='Enter your email address'
            label='email'
            disabled={isPending}
          />

          {error && (
            <>
              <br />
              <Alert message={error} error />
              <br />
            </>
          )}

          {success && (
            <>
              <br />
              <Alert message={success} success />
              <br />
            </>
          )}

          <div className={styles.btnContainer}>
            <Button
              type='submit'
              btnType='redReg'
              disabled={isPending}
              text={isPending ? "Submitting..." : "Send reset email"}
            />
            {/* <Button btnType='blackReg' href='/login' text='Back to login' /> */}
            <Link href='/login' className='backBtn'>
              <Arrow className={styles.arrow} />
              Back to login
            </Link>
          </div>
        </form>
      </LayoutWrapper>
    </section>
  );
}
