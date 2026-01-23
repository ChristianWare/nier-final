/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import styles from "./ContactSection.module.css";
// import toast from "react-hot-toast";
// import { useForm, SubmitHandler } from "react-hook-form";
// import Location from "@/components/icons/Location/Location";
// import Email from "@/components/icons/Email/Email";
// import Phone from "@/components/icons/Phone/Phone";
// import FalseButton from "../FalseButton/FalseButton";
import Button from "../Button/Button";

// interface Inputs {
//   firstName: string;
//   lastName: string;
//   senderEmail: string;
//   companyName: string;
//   currentWebsiteUrl: string;
//   message: string;
// }

export default function ContactSection() {
  const [loading, setLoading] = useState(false);

  // const {
  //   register,
  //   handleSubmit,
  //   reset,
  //   formState: { errors },
  // } = useForm<Inputs>();

  // const onSubmit: SubmitHandler<Inputs> = async (data) => {
  //   setLoading(true);
  //   const response = await fetch("/api/contact", {
  //     method: "POST",
  //     body: JSON.stringify(data),
  //   }).then((res) => res.json());

  //   if (response.messageId) {
  //     toast.success("Email sent successfully!");
  //     reset();
  //   } else {
  //     toast.error("Oops! Please try again");
  //   }

  //   setLoading(false);
  // };

  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <div className={styles.right}>
          {/* <form className={styles.form} onSubmit={handleSubmit(onSubmit)}> */}
          <form className={styles.form}>
            <div className={styles.namesContainer}>
              <div className={styles.labelInputBox}>
                <label htmlFor='firstName'>
                  First Name <span className={styles.required}>*</span>
                </label>
                <input
                  id='firstName'
                  type='text'
                  // {...register("firstName", { required: true })}
                />
                {/* {errors.firstName && (
                      <span className={styles.error}>
                        *** First Name is required
                      </span>
                    )} */}
              </div>
              <div className={styles.labelInputBox}>
                <label htmlFor='lastName'>
                  Last Name <span className={styles.required}>*</span>
                </label>
                <input
                  id='lastName'
                  type='text'
                  // {...register("lastName", { required: true })}
                />
                {/* {errors.lastName && (
                      <span className={styles.error}>
                        *** Last Name is required
                      </span>
                    )} */}
              </div>
            </div>
            <div className={styles.everythingElse}>
              <div className={styles.labelInputBox}>
                <label htmlFor='senderEmail'>
                  Email <span className={styles.required}>*</span>
                </label>
                <input
                  id='senderEmail'
                  type='email'
                  // {...register("senderEmail", {
                  //   required: true,
                  //   pattern: {
                  //     value: /\S+@\S+\.\S+/,
                  //     message: "Entered value does not match email format",
                  //   },
                  // })}
                  placeholder='So we can respond. We won&#39;t send you spam.'
                  maxLength={500}
                />
                {/* {errors.senderEmail && (
                      <span className={styles.error}>
                        *** Email is required
                      </span>
                    )} */}
              </div>
              <div className={styles.labelInputBox}>
                <label htmlFor='companyName'>Group Size</label>
                <input
                  id='companyName'
                  type='text'
                  // {...register("companyName")}
                />
              </div>
              <div className={styles.labelInputBox}>
                <label htmlFor='currentWebsiteUrl'>Length of Stay</label>
                <input
                  id='currentWebsiteUrl'
                  type='text'
                  // {...register("currentWebsiteUrl")}
                />
              </div>
              <div className={styles.labelInputBox}>
                <label htmlFor='message'>
                  Message <span className={styles.required}>*</span>
                </label>
                <textarea
                  id='message'
                  // {...register("message", { required: true })}
                  maxLength={5000}
                  placeholder='No solicitations, please.'
                />
                {/* {errors.message && (
                      <span className={styles.error}>
                        *** Message is required
                      </span>
                    )} */}
              </div>
            </div>
            <div className={styles.btnContainer}>
              {/* <button className={styles.btn} type='submit'>
                    {loading ? "Sending..." : "Submit"}
                  </button> */}
              <Button
                text={loading ? "Sending..." : "Submit"}
                btnType='black'
                arrow
              />
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
