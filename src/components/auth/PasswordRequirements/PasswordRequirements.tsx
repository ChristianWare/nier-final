// components/auth/PasswordRequirements/PasswordRequirements.tsx
"use client";

import styles from "./PasswordRequirements.module.css";
import { passwordRequirements } from "@/schemas/RegisterSchema";

interface PasswordRequirementsProps {
  password: string;
}

interface Requirement {
  label: string;
  met: boolean;
}

export default function PasswordRequirements({
  password,
}: PasswordRequirementsProps) {
  const requirements: Requirement[] = [
    {
      label: `At least ${passwordRequirements.minLength} characters`,
      met: password.length >= passwordRequirements.minLength,
    },
    {
      label: "One uppercase letter",
      met: passwordRequirements.hasUppercase.test(password),
    },
    {
      label: "One number",
      met: passwordRequirements.hasNumber.test(password),
    },
  ];

  const allMet = requirements.every((req) => req.met);

  if (allMet && password.length > 0) {
    return (
      <div className={styles.container}>
        <div className={styles.successMessage}>
          <CheckIcon className={styles.successIcon} />
          <span className={styles.good}>Password meets all requirements</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <p className={styles.title}>Password must contain:</p>
      <ul className={styles.list}>
        {requirements.map((req, index) => (
          <li
            key={index}
            className={`${styles.item} ${req.met ? styles.met : styles.unmet}`}
          >
            {req.met ? (
              <CheckIcon className={styles.checkIcon} />
            ) : (
              <CircleIcon className={styles.circleIcon} />
            )}
            <span>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width='16'
      height='16'
      viewBox='0 0 16 16'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M13.3 4.3L6 11.6L2.7 8.3'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

function CircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width='16'
      height='16'
      viewBox='0 0 16 16'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <circle cx='8' cy='8' r='3' stroke='currentColor' strokeWidth='2' />
    </svg>
  );
}
