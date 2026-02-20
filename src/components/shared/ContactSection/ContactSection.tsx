"use client";

import { useState, useRef } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import ReCAPTCHA from "react-google-recaptcha";
import toast from "react-hot-toast";
import styles from "./ContactSection.module.css";
import Button from "../Button/Button";

interface FormInputs {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  serviceNeeded: string;
  groupSize: string;
  message: string;
}

const SERVICE_OPTIONS = [
  { value: "", label: "Select a service" },
  { value: "Airport Transfers", label: "Airport Transfers" },
  { value: "Hourly Chauffeur", label: "Hourly Chauffeur" },
  { value: "Point-to-Point", label: "Point-to-Point Transfers" },
  { value: "Golf Outing", label: "Golf Outing Transportation" },
  { value: "Corporate & Events", label: "Corporate & Event Logistics" },
  { value: "Weddings", label: "Weddings" },
  { value: "Party Bus", label: "Party Bus & Special Events" },
  { value: "Recurring Rides", label: "Recurring Rides" },
  { value: "Long Distance", label: "Long Distance Drives" },
  { value: "Other", label: "Other / Not Sure" },
];

const GROUP_SIZE_OPTIONS = [
  { value: "", label: "Select group size" },
  { value: "1-2", label: "1–2 passengers" },
  { value: "3-4", label: "3–4 passengers" },
  { value: "5-7", label: "5–7 passengers" },
  { value: "8-14", label: "8–14 passengers" },
  { value: "15-20", label: "15–20 passengers" },
  { value: "21-30", label: "21–30 passengers" },
  { value: "30+", label: "30+ passengers" },
];

export default function ContactSection() {
  const [loading, setLoading] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInputs>();

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    // Get reCAPTCHA token
    const captchaToken = recaptchaRef.current?.getValue();
    if (!captchaToken) {
      toast.error("Please complete the reCAPTCHA.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          captchaToken,
        }),
      });

      const result = await response.json();

      if (result.ok) {
        toast.success("Message sent! We'll be in touch shortly.");
        reset();
        recaptchaRef.current?.reset();
      } else if (result.fields) {
        toast.error(`Missing required fields: ${result.fields.join(", ")}`);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <div className={styles.right}>
          <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
            {/* Row 1: Names */}
            <div className={styles.namesContainer}>
              <div className={styles.labelInputBox}>
                <label htmlFor='firstName'>
                  First Name <span className={styles.required}>*</span>
                </label>
                <input
                  id='firstName'
                  type='text'
                  {...register("firstName", { required: true })}
                />
                {errors.firstName && (
                  <span className={styles.error}>First name is required</span>
                )}
              </div>
              <div className={styles.labelInputBox}>
                <label htmlFor='lastName'>
                  Last Name <span className={styles.required}>*</span>
                </label>
                <input
                  id='lastName'
                  type='text'
                  {...register("lastName", { required: true })}
                />
                {errors.lastName && (
                  <span className={styles.error}>Last name is required</span>
                )}
              </div>
            </div>

            {/* Row 2: Email & Phone */}
            <div className={styles.everythingElse}>
              <div className={styles.namesContainer}>
                <div className={styles.labelInputBox}>
                  <label htmlFor='email'>
                    Email <span className={styles.required}>*</span>
                  </label>
                  <input
                    id='email'
                    type='email'
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /\S+@\S+\.\S+/,
                        message: "Please enter a valid email",
                      },
                    })}
                    placeholder='So we can respond. No spam, ever.'
                    maxLength={500}
                  />
                  {errors.email && (
                    <span className={styles.error}>
                      {errors.email.message || "Email is required"}
                    </span>
                  )}
                </div>
                <div className={styles.labelInputBox}>
                  <label htmlFor='phone'>
                    Phone <span className={styles.required}>*</span>
                  </label>
                  <input
                    id='phone'
                    type='tel'
                    {...register("phone", { required: true })}
                    placeholder='Best number to reach you'
                  />
                  {errors.phone && (
                    <span className={styles.error}>Phone is required</span>
                  )}
                </div>
              </div>

              {/* Row 3: Dropdowns */}
              <div className={styles.namesContainer}>
                <div className={styles.labelInputBox}>
                  <label htmlFor='serviceNeeded'>Service Needed</label>
                  <select
                    id='serviceNeeded'
                    {...register("serviceNeeded")}
                    className={styles.select}
                  >
                    {SERVICE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.labelInputBox}>
                  <label htmlFor='groupSize'>Group Size</label>
                  <select
                    id='groupSize'
                    {...register("groupSize")}
                    className={styles.select}
                  >
                    {GROUP_SIZE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Message */}
              <div className={styles.labelInputBox}>
                <label htmlFor='message'>
                  Message <span className={styles.required}>*</span>
                </label>
                <textarea
                  id='message'
                  {...register("message", { required: true })}
                  maxLength={5000}
                  placeholder='Tell us about your trip — dates, pickup/dropoff locations, and any special requests.'
                />
                {errors.message && (
                  <span className={styles.error}>Message is required</span>
                )}
              </div>
            </div>

            {/* reCAPTCHA */}
            <div className={styles.recaptchaContainer}>
              {/* <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
              /> */}
            </div>

            {/* Submit */}
            <div className={styles.btnContainer}>
              <Button
                text={loading ? "Sending..." : "Submit"}
                btnType='black'
                arrow
                type='submit'
                disabled={loading}
              />
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}