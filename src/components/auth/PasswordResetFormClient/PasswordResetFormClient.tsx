/* eslint-disable react-hooks/incompatible-library */
"use client";

import styles from "./PasswordResetFormClient.module.css";
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
import Link from "next/link";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import toast from "react-hot-toast";

type Props = {
  token?: string;
  isValidToken?: boolean;
  email?: string;
};

export default function PasswordResetFormClient({
  token,
  isValidToken = false,
  email,
}: Props) {
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
  const [isComplete, setIsComplete] = useState(false);

  const password = watch("password", "");
  const confirmPassword = watch("confirmPassword", "");

  const isPasswordValid =
    password.length >= passwordRequirements.minLength &&
    passwordRequirements.hasUppercase.test(password) &&
    passwordRequirements.hasNumber.test(password);

  const isConfirmPasswordValid =
    confirmPassword.length > 0 && password === confirmPassword;

  const onSubmit: SubmitHandler<PasswordResetSchemaType> = (data) => {
    if (!token) {
      toast.error("Missing reset token. Please use the link from your email.", {
        duration: 5000,
        style: { padding: "16px", fontSize: "14px" },
      });
      return;
    }

    startTransition(() => {
      passwordReset(data, token).then((res) => {
        if (res?.error) {
          toast.error(res.error, {
            duration: 5000,
            style: { padding: "16px", fontSize: "14px" },
          });
          return;
        }

        if (res?.success) {
          setIsComplete(true);
          toast.success(res.success, {
            duration: 5000,
            style: { padding: "16px", fontSize: "14px" },
          });
        }
      });
    });
  };

  

  // Invalid or expired token
  if (!isValidToken && !isComplete) {
    return (
      <section className={styles.container}>
        <LayoutWrapper>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <h1 className={`${styles.heading} heading`}>
              Invalid or Expired Link
            </h1>
            <p className={styles.copy}>
              This password reset link is invalid or has expired. Reset links
              are only valid for 1 hour.
            </p>
            <div className={styles.btnContainer}>
              <Button
                btnType='redReg'
                href='/forgot-password'
                text='Request new link'
              />
              <Link href='/login' className='backBtn'>
                <Arrow className={styles.arrow} />
                Back to login
              </Link>
            </div>
          </div>
        </LayoutWrapper>
      </section>
    );
  }

  // Password reset complete
  if (isComplete) {
    return (
      <section className={styles.container}>
        <LayoutWrapper>
          <div className={styles.successState}>
            <div className={styles.successIcon}>✓</div>
            <h1 className={`${styles.heading} heading`}>Password Reset!</h1>
            <p className={styles.copy}>
              Your password has been successfully updated. You can now sign in
              with your new password.
            </p>
            <div className={styles.btnContainer}>
              <Button btnType='redReg' href='/login' text='Sign in' />
            </div>
          </div>
        </LayoutWrapper>
      </section>
    );
  }

  // Valid token - show reset form
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.top}>
          <h1 className={`${styles.heading} heading`}>Reset your password</h1>
          <p className={styles.copy}>
            {email ? (
              <>
                Enter a new password for <strong>{email}</strong>
              </>
            ) : (
              "Enter your new password below."
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <FormField
            id='password'
            register={register}
            errors={errors}
            label='New Password'
            placeholder='Enter new password'
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
            placeholder='Confirm new password'
            disabled={isPending}
            type='password'
            eye
            isValid={isConfirmPasswordValid}
          />

          <div className={styles.btnContainer}>
            <Button
              type='submit'
              btnType='redReg'
              disabled={
                isPending || !isPasswordValid || !isConfirmPasswordValid
              }
              text={isPending ? "Updating..." : "Update password"}
            />
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
