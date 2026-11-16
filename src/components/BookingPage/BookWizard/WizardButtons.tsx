// Buttons for the booking tool, in the site's style: Next is the black
// button with the red arrow box (like Button), Back is a quiet text
// button, and "Add a ride" is an outlined button with a plus.

import type { MouseEventHandler } from "react";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import styles from "./WizardButtons.module.css";

type Props = {
  text: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

export function NextButton({ text, onClick, disabled }: Props) {
  return (
    <button
      type='button'
      className={styles.next}
      onClick={onClick}
      disabled={disabled}
    >
      {text}
      <span className={styles.box} aria-hidden='true'>
        <Arrow className={styles.arrowNext} />
      </span>
    </button>
  );
}

export function BackButton({ text, onClick, disabled }: Props) {
  return (
    <button
      type='button'
      className={styles.back}
      onClick={onClick}
      disabled={disabled}
    >
      <Arrow className={styles.arrowBack} aria-hidden='true' />
      {text}
    </button>
  );
}

export function AddButton({ text, onClick, disabled }: Props) {
  return (
    <button
      type='button'
      className={styles.add}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={styles.plus} aria-hidden='true'>
        +
      </span>
      {text}
    </button>
  );
}
