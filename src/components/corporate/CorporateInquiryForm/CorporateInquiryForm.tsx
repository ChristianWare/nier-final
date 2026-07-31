"use client";

import { useRef, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import toast from "react-hot-toast";
import styles from "./CorporateInquiryForm.module.css";
import Button from "@/components/shared/Button/Button";
import { submitCorporateInquiry } from "../../../../actions/corporate/submitCorporateInquiry";

interface FormInputs {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  estimatedMonthlyRides: string;
  message: string;
  _hp: string;
}

export default function CorporateInquiryForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formLoadTime = useRef(Date.now());

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInputs>();

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    // ── Honeypot check — bots fill hidden fields, humans don't ──
    if (data._hp) return;

    // ── Time check — real users take more than 3 seconds ──
    const elapsed = Date.now() - formLoadTime.current;
    if (elapsed < 3000) return;

    setLoading(true);
    try {
      const result = await submitCorporateInquiry(data);

      if (result.success) {
        toast.success("Inquiry submitted! We'll be in touch shortly.", {
          duration: 5000,
        });
        reset();
        setSubmitted(true);
      } else {
        toast.error(result.error || "Something went wrong. Please try again.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successIcon}>✓</div>
        <h3 className={styles.successHeading}>Inquiry Received</h3>
        <p className={styles.successCopy}>
          Thank you for your interest in a Nier Transportation corporate
          account. A member of our team will reach out within 1 business day to
          discuss your needs.
        </p>
        <button className={styles.resetBtn} onClick={() => setSubmitted(false)}>
          Submit another inquiry
        </button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <h3 className={styles.formTitle}>Corporate Account Inquiry</h3>

      {/* Honeypot — hidden from humans, bots fill it */}
      <input
        type='text'
        autoComplete='off'
        tabIndex={-1}
        aria-hidden='true'
        style={{ display: "none" }}
        {...register("_hp")}
      />

      {/* Company Name */}
      <div className={styles.labelInputBox}>
        <label htmlFor='companyName'>
          Company Name <span className={styles.required}>*</span>
        </label>
        <input
          id='companyName'
          type='text'
          placeholder='Acme Inc.'
          {...register("companyName", {
            required: "Company name is required",
            minLength: {
              value: 2,
              message: "Company name must be at least 2 characters",
            },
            maxLength: {
              value: 100,
              message: "Company name must be fewer than 100 characters",
            },
            pattern: {
              value: /^[a-zA-ZÀ-ÿ0-9\s'\-\.\&\,]+$/,
              message: "Company name contains invalid characters",
            },
            // validate: (val) => {
            //   const blocked = [
            //     "mailinator.com",
            //     "guerrillamail.com",
            //     "tempmail.com",
            //     "throwam.com",
            //     "yopmail.com",
            //     "sharklasers.com",
            //     "guerrillamailblock.com",
            //     "grr.la",
            //     "spam4.me",
            //     "trashmail.com",
            //   ];
            //   const domain = val.split("@")[1]?.toLowerCase() ?? "";

            //   // Block known disposable domains
            //   if (blocked.includes(domain)) {
            //     return "Please use a valid business email address";
            //   }

            //   // Block if TLD is not a real word (must be 2-6 letters only)
            //   const tld = domain.split(".").pop() ?? "";
            //   if (!/^[a-z]{2,6}$/.test(tld)) {
            //     return "Please enter a valid email address";
            //   }

            //   // Block if any part of the domain is pure consonants (gibberish like gdsgh, sfg)
            //   const parts = domain.split(".");
            //   const hasGibberishPart = parts.some((part) => {
            //     if (part.length < 4) return false; // short parts like "co" are fine
            //     const vowelRatio =
            //       (part.match(/[aeiou]/gi)?.length ?? 0) / part.length;
            //     return vowelRatio === 0; // zero vowels = gibberish
            //   });

            //   if (hasGibberishPart) {
            //     return "Please enter a valid business email address";
            //   }

            //   return true;
            // },
          })}
        />
        {errors.companyName && (
          <span className={styles.error}>{errors.companyName.message}</span>
        )}
      </div>

      {/* Contact Name */}
      <div className={styles.labelInputBox}>
        <label htmlFor='contactName'>
          Contact Name <span className={styles.required}>*</span>
        </label>
        <input
          id='contactName'
          type='text'
          placeholder='John Smith'
          {...register("contactName", {
            required: "Contact name is required",
            minLength: {
              value: 2,
              message: "Name must be at least 2 characters",
            },
            maxLength: {
              value: 50,
              message: "Name must be fewer than 50 characters",
            },
            pattern: {
              value: /^[a-zA-ZÀ-ÿ\s'\-\.]+$/,
              message:
                "Name can only contain letters, spaces, hyphens, and apostrophes",
            },
            validate: (val) => {
              if (!/[aeiouAEIOUàáâãäåèéêëìíîïòóôõöùúûü]/i.test(val))
                return "Please enter a valid name";
              if (/[^aeiouAEIOUàáâãäåèéêëìíîïòóôõöùúûü\s'\-\.]{6,}/i.test(val))
                return "Please enter a valid name";
              return true;
            },
          })}
        />
        {errors.contactName && (
          <span className={styles.error}>{errors.contactName.message}</span>
        )}
      </div>

      {/* Email & Phone row */}
      <div className={styles.row}>
        <div className={styles.labelInputBox}>
          <label htmlFor='inquiryEmail'>
            Email <span className={styles.required}>*</span>
          </label>
          <input
            id='inquiryEmail'
            type='email'
            placeholder='john@acme.com'
            {...register("email", {
              required: true,
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: "Please enter a valid email",
              },
              validate: (val) => {
                // Block known disposable/spam email domains
                const blocked = [
                  "mailinator.com",
                  "guerrillamail.com",
                  "tempmail.com",
                  "throwam.com",
                  "yopmail.com",
                  "sharklasers.com",
                  "guerrillamailblock.com",
                  "grr.la",
                  "spam4.me",
                  "trashmail.com",
                ];
                const domain = val.split("@")[1]?.toLowerCase();
                if (domain && blocked.includes(domain)) {
                  return "Please use a valid business email address";
                }
                return true;
              },
            })}
          />
          {errors.email && (
            <span className={styles.error}>
              {errors.email.message || "Email is required"}
            </span>
          )}
        </div>
        <div className={styles.labelInputBox}>
          <label htmlFor='inquiryPhone'>Phone</label>
          <input
            id='inquiryPhone'
            type='tel'
            placeholder='(480)555-0123'
            {...register("phone", {
              onChange: (e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                let formatted = digits;
                if (digits.length >= 7) {
                  formatted = `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`;
                } else if (digits.length >= 4) {
                  formatted = `(${digits.slice(0, 3)})${digits.slice(3)}`;
                } else if (digits.length >= 1) {
                  formatted = `(${digits}`;
                }
                e.target.value = formatted;
              },
              validate: (val) => {
                if (!val) return true;
                const digits = val.replace(/\D/g, "");
                return (
                  digits.length === 10 ||
                  "Please enter a valid 10-digit phone number"
                );
              },
            })}
          />
          {errors.phone && (
            <span className={styles.error}>{errors.phone.message}</span>
          )}
        </div>
      </div>

      {/* Estimated Monthly Rides */}
      <div className={styles.labelInputBox}>
        <label htmlFor='estimatedMonthlyRides'>
          Estimated Monthly Rides <span className={styles.required}>*</span>
        </label>
        <select
          id='estimatedMonthlyRides'
          {...register("estimatedMonthlyRides", { required: true })}
          defaultValue=''
          className='selectBorder emptySmall'
        >
          <option value='' disabled>
            Select an estimate
          </option>
          <option value='1-10'>1 – 10 rides/month</option>
          <option value='11-25'>11 – 25 rides/month</option>
          <option value='26-50'>26 – 50 rides/month</option>
          <option value='50+'>50+ rides/month</option>
        </select>
        {errors.estimatedMonthlyRides && (
          <span className={styles.error}>Please select an estimate</span>
        )}
      </div>

      {/* Message */}
      <div className={styles.labelInputBox}>
        <label htmlFor='inquiryMessage'>
          Tell Us About Your Needs <span className={styles.required}>*</span>
        </label>
        <textarea
          id='inquiryMessage'
          rows={5}
          placeholder='E.g., We need daily airport pickups for executives, event transportation for clients, etc.'
          maxLength={5000}
          {...register("message", {
            required: "Please describe your needs",
            minLength: {
              value: 20,
              message: "Please provide at least a sentence or two",
            },
            validate: (val) => {
              // Must contain at least two words with vowels (catches random char strings)
              const wordMatches = val
                .split(/\s+/)
                .filter((w) => /[aeiouAEIOUàáâãäåèéêëìíîïòóôõöùúûü]/i.test(w));
              if (wordMatches.length < 3) {
                return "Please describe your needs in full sentences";
              }
              // Block messages that are mostly non-alpha (spam URLs, gibberish)
              const alphaRatio =
                (val.match(/[a-zA-Z]/g)?.length ?? 0) / val.length;
              if (alphaRatio < 0.5) {
                return "Please describe your needs using plain text";
              }
              return true;
            },
          })}
        />
        {errors.message && (
          <span className={styles.error}>{errors.message.message}</span>
        )}
      </div>

      {/* Submit */}
      <div className={styles.btnContainer}>
        <Button
          text={loading ? "Submitting..." : "Submit Inquiry"}
          btnType='black'
          arrow
          type='submit'
          disabled={loading}
        />
      </div>
    </form>
  );
}
