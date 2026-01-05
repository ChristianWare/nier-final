"use client";

import styles from "./LoginForm.module.css";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, LoginSchemaType } from "@/schemas/LoginSchema";
import FormField from "../FormField/FormField";
import FalseButton from "@/components/shared/FalseButton/FalseButton";
import GoogleButton from "../GoogleButton/GoogleButton";
import Link from "next/link";
import { useState, useTransition } from "react";
import { login } from "../../../../actions/auth/login";
import Alert from "@/components/shared/Alert/Alert";
import { useRouter, useSearchParams } from "next/navigation";
import { LOGIN_REDIRECT } from "../../../../routes";

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchemaType>({ resolver: zodResolver(LoginSchema) });

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");

  const searchParams = useSearchParams();
  const router = useRouter();

  const urlError =
    searchParams.get("error") === "OAuthAccountNotLinked"
      ? "Email in use with different provider!"
      : "";

  const onSubmit: SubmitHandler<LoginSchemaType> = (data) => {
    setError("");
    startTransition(() => {
      login(data).then((res) => {
        if (res?.error) {
          router.replace("/login");
          setError(res.error);
        }
        if (!res?.error) {
          router.push(LOGIN_REDIRECT);
        }
        if (res?.success) {
          setSuccess(res.success);
          router.push(LOGIN_REDIRECT);
        }
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
          // placeholder='password'
          type='password'
          label='password'
          disabled={isPending}
          eye
          autoComplete='new-password'
        />
        {error && <Alert message={error} error />}
        {urlError && <Alert message={urlError} error />}
        {success && <Alert message={success} success />}

        <div className={styles.btnContainer}>
          <FalseButton
            text={isPending ? "Submitting..." : "Sign In"}
            type='submit'
            btnType='black'
            disabled={isPending}
          />
        </div>
        <p className={styles.or}>or</p>
        <GoogleButton title='in' />
      </form>
      <footer className={styles.cardFooter}>
        <p className={styles.footerText}>
          Don’t have an account?{" "}
          <Link href='/register' className={styles.link}>
            Sign up
          </Link>
        </p>
        <p className={styles.footerText}>
          Forgot password?{" "}
          <Link href='/password-email-form' className={styles.link}>
            Click here
          </Link>
        </p>
      </footer>
    </div>
  );
}
