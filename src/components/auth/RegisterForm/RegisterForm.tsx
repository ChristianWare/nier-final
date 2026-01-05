"use client";

import styles from "./RegisterForm.module.css";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormField from "../FormField/FormField";
import FalseButton from "@/components/shared/FalseButton/FalseButton";
// import GoogleButton from "../GoogleButton/GoogleButton";
import Link from "next/link";
import { RegisterSchema, RegisterSchemaType } from "@/schemas/RegisterSchema";
import { signUp } from "../../../../actions/auth/register";
import { useTransition, useState } from "react";
import Alert from "@/components/shared/Alert/Alert";

export default function RegisterForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterSchemaType>({ resolver: zodResolver(RegisterSchema) });

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
      {/* <GoogleButton title='up' /> */}
      <p className={styles.or}>or</p>

      {/* Turn off browser autofill at the form level */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={styles.form}
        autoComplete='off'
      >
        {/* Small hidden “honeypot” inputs help keep Chrome from force-filling */}
        <input
          type='text'
          name='fake-username'
          autoComplete='username'
          tabIndex={-1}
          style={{
            position: "absolute",
            opacity: 0,
            height: 0,
            width: 0,
            pointerEvents: "none",
          }}
        />
        <input
          type='password'
          name='fake-password'
          autoComplete='new-password'
          tabIndex={-1}
          style={{
            position: "absolute",
            opacity: 0,
            height: 0,
            width: 0,
            pointerEvents: "none",
          }}
        />

        <FormField
          id='name'
          register={register}
          errors={errors}
          // placeholder='name'
          label='name'
          disabled={isPending}
          autoComplete='off'
        />

        <FormField
          id='email'
          register={register}
          errors={errors}
          // placeholder='email'
          label='email'
          disabled={isPending}
          type='email'
          autoComplete='off'
        />

        <FormField
          id='password'
          register={register}
          errors={errors}
          placeholder='•••••••••'
          type='password'
          label='password'
          disabled={isPending}
          eye
          autoComplete='new-password'
        />

        <FormField
          id='confirmPassword'
          register={register}
          errors={errors}
          placeholder='Confirm Password'
          type='password'
          label='Confirm Password'
          disabled={isPending}
          eye
          autoComplete='new-password'
        />

        {error && <Alert message={error} error />}
        {success && <Alert message={success} success />}

        <div className={styles.btnContainer}>
          <FalseButton
            text={isPending ? "Submitting..." : "Register"}
            type='submit'
            btnType='black'
            disabled={isPending}
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
