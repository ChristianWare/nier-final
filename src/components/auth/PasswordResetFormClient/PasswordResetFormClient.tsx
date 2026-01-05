"use client";

import styles from "./PasswordResetFormClient.module.css";
import Alert from "@/components/shared/Alert/Alert";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import FormField from "../FormField/FormField";
import {
  PasswordResetSchema,
  PasswordResetSchemaType,
} from "@/schemas/PasswordResetSchema";
import { passwordReset } from "../../../../actions/auth/password-reset";
import Button from "@/components/shared/Button/Button";
import LayoutWrapper from "@/components/shared/LayoutWrapper";

type Props = {
  token?: string;
};

export default function PasswordResetFormClient({ token }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetSchemaType>({
    resolver: zodResolver(PasswordResetSchema),
  });

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");

  const onSubmit: SubmitHandler<PasswordResetSchemaType> = (data) => {
    setError("");

    if (!token) {
      setError(
        "Missing or invalid reset token. Please use the link from your email."
      );
      return;
    }

    startTransition(() => {
      passwordReset(data, token).then((res) => {
        if (res?.error) setError(res.error);
        if (res?.success) setSuccess(res.success);
      });
    });
  };

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <h1 className={styles.heading}>Reset password</h1>
          <p className={styles.copy}>Enter your new password:</p>
          <FormField
            id='password'
            register={register}
            errors={errors}
            placeholder='password'
            label='password'
            disabled={isPending}
            type='password'
            eye
          />

          <FormField
            id='confirmPassword'
            register={register}
            errors={errors}
            placeholder='Confirm password'
            label='Confirm password'
            disabled={isPending}
            type='password'
            eye
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
              text={isPending ? "Submitting..." : "Save new password"}
            />
            <Button btnType='blackOutline' href='/login' text='Back to login' />
          </div>
        </form>
      </LayoutWrapper>
    </section>
  );
}
