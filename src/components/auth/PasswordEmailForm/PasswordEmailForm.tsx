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
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <h1 className={styles.heading}>Forgot password?</h1>
          <p className={styles.copy}>
            A code will be sent to your email to reset your password.
          </p>
          <FormField
            id='email'
            register={register}
            errors={errors}
            placeholder='email'
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
              btnType='black'
              disabled={isPending}
              text={isPending ? "Submitting..." : "Send reset email"}
            />
            <Button btnType='blackOutline' href='/login' text='Back to login' />
          </div>
        </form>
      </LayoutWrapper>
    </section>
  );
}
