/* eslint-disable react-hooks/incompatible-library */
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
  passwordRequirements,
} from "@/schemas/PasswordResetSchema";
import { passwordReset } from "../../../../actions/auth/password-reset";
import Button from "@/components/shared/Button/Button";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import PasswordRequirements from "../PasswordRequirements/PasswordRequirements";

type Props = {
  token?: string;
};

export default function PasswordResetFormClient({ token }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PasswordResetSchemaType>({
    resolver: zodResolver(PasswordResetSchema),
    mode: "onChange",
  });

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");

  const password = watch("password", "");
  const confirmPassword = watch("confirmPassword", "");

  const isPasswordValid =
    password.length >= passwordRequirements.minLength &&
    passwordRequirements.hasUppercase.test(password) &&
    passwordRequirements.hasNumber.test(password);

  const isConfirmPasswordValid =
    confirmPassword.length > 0 && password === confirmPassword;

  const onSubmit: SubmitHandler<PasswordResetSchemaType> = (data) => {
    setError("");

    if (!token) {
      setError(
        "Missing or invalid reset token. Please use the link from your email.",
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
            label='New Password'
            disabled={isPending}
            type='password'
            eye
            isValid={isPasswordValid && password.length > 0}
          >
            {password.length > 0 && !errors.password && (
              <PasswordRequirements password={password} />
            )}
          </FormField>

          <FormField
            id='confirmPassword'
            register={register}
            errors={errors}
            label='Confirm Password'
            disabled={isPending}
            type='password'
            eye
            isValid={isConfirmPasswordValid}
          />

          {error && <Alert message={error} error />}
          {success && <Alert message={success} success />}

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
