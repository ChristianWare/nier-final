/* eslint-disable react-hooks/incompatible-library */
"use client";

import styles from "./RegisterForm.module.css";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormField from "../FormField/FormField";
import Link from "next/link";
import {
  RegisterSchema,
  RegisterSchemaType,
  passwordRequirements,
} from "@/schemas/RegisterSchema";
import { signUp } from "../../../../actions/auth/register";
import { useTransition, useState } from "react";
import Alert from "@/components/shared/Alert/Alert";
import Button from "@/components/shared/Button/Button";
import PasswordRequirements from "../PasswordRequirements/PasswordRequirements";

export default function RegisterForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterSchemaType>({
    resolver: zodResolver(RegisterSchema),
    mode: "onChange", // Validate on change for real-time feedback
  });

  const password = watch("password", "");
  const confirmPassword = watch("confirmPassword", "");

  // Check if password meets all requirements
  const isPasswordValid =
    password.length >= passwordRequirements.minLength &&
    passwordRequirements.hasUppercase.test(password) &&
    passwordRequirements.hasNumber.test(password);

  // Check if confirm password matches
  const isConfirmPasswordValid =
    confirmPassword.length > 0 && password === confirmPassword;

  const onSubmit: SubmitHandler<RegisterSchemaType> = (data) => {
    setSuccess("");
    setError("");

    startTransition(() => {
      signUp(data).then((res) => {
        setError(res.error);
        setSuccess(res.success);
      });
    });
  };

  return (
    <div className={styles.container}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={styles.form}
        autoComplete='off'
      >
        {/* Honeypot inputs */}
        <input
          className={styles.honeypot}
          type='text'
          name='fake-username'
          autoComplete='username'
          tabIndex={-1}
          aria-hidden='true'
        />
        <input
          className={styles.honeypot}
          type='password'
          name='fake-password'
          autoComplete='new-password'
          tabIndex={-1}
          aria-hidden='true'
        />

        <FormField
          id='name'
          register={register}
          errors={errors}
          label='Name'
          disabled={isPending}
          autoComplete='off'
        />

        <FormField
          id='email'
          register={register}
          errors={errors}
          label='Email'
          disabled={isPending}
          type='email'
          autoComplete='off'
        />

        <FormField
          id='password'
          register={register}
          errors={errors}
          type='password'
          label='Password'
          disabled={isPending}
          eye
          autoComplete='new-password'
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
          type='password'
          label='Confirm Password'
          disabled={isPending}
          eye
          autoComplete='new-password'
          isValid={isConfirmPasswordValid}
        />

        {error && <Alert message={error} error />}
        {success && <Alert message={success} success />}

        <div className={styles.btnContainer}>
          <Button
            text={isPending ? "Submitting..." : "Sign Up"}
            type='submit'
            disabled={isPending}
            btnType='black'
            arrow
          />
        </div>
      </form>

      <footer className={styles.cardFooter}>
        <p className={styles.footerText}>
          Already have an account?{" "}
          <Link href='/login' className={styles.link}>
            Sign in
          </Link>
        </p>
      </footer>
    </div>
  );
}
