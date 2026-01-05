"use client";

import styles from "./FormField.module.css";
import { useState } from "react";
import {
  FieldErrors,
  Path,
  UseFormRegister,
  FieldValues,
} from "react-hook-form";
import EyeOff from "@/components/shared/icons/EyeOff/EyeOff";
import EyeOn from "@/components/shared/icons/EyeOn/EyeOn";

interface FormFieldProps<T extends FieldValues> {
  id: string;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  register: UseFormRegister<T>;
  errors: FieldErrors;
  eye?: boolean;
  autoComplete?: string;
}

export default function FormField<T extends FieldValues>({
  id,
  type,
  disabled,
  placeholder,
  label,
  register,
  errors,
  eye = false,
  autoComplete,
}: FormFieldProps<T>) {
  const [show, setShow] = useState(false);
  const message = errors[id]?.message as string | undefined;

  const inputType =
    eye && type === "password" ? (show ? "text" : "password") : type || "text";

  const inputMode =
    inputType === "email"
      ? "email"
      : inputType === "tel"
        ? "tel"
        : inputType === "number"
          ? "numeric"
          : undefined;

  // Default autocomplete behavior: disable unless caller opts in
  const computedAutocomplete =
    autoComplete ?? (inputType === "password" ? "new-password" : "off");

  return (
    <div className={styles.formGroup}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrapper}>
        <input
          id={id}
          disabled={disabled}
          placeholder={placeholder}
          type={inputType}
          inputMode={inputMode}
          autoComplete={computedAutocomplete}
          autoCapitalize='none'
          autoCorrect='off'
          spellCheck={false}
          {...register(id as Path<T>)}
          className={styles.input}
          name={id}
        />
        {eye && type === "password" && (
          <button
            type='button'
            onClick={() => setShow((v) => !v)}
            className={styles.eyeButton}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? (
              <EyeOn className={styles.icon} />
            ) : (
              <EyeOff className={styles.icon} />
            )}
          </button>
        )}
      </div>
      {message && <span className={styles.error}>{message}</span>}
    </div>
  );
}
