/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Image from "next/image";
import ProfilePhotoModal from "../ProfilePhotoModal/ProfilePhotoModal";
import styles from "./ProfilePhotoUpload.module.css";

interface Props {
  currentImage: string | null;
  userName: string;
  defaultImage: any; // StaticImageData from next/image
}

export default function ProfilePhotoUpload({
  currentImage,
  userName,
  defaultImage,
}: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayImage, setDisplayImage] = useState(currentImage);

  const handleSuccess = (newImageUrl: string) => {
    setDisplayImage(newImageUrl);
  };

  return (
    <>
      <div className={styles.profileImageWrap}>
        {displayImage ? (
          <Image
            src={displayImage}
            alt={userName || "Driver"}
            width={80}
            height={80}
            className={styles.profileImage}
          />
        ) : (
          <Image
            src={defaultImage}
            alt={userName || "Driver"}
            width={80}
            height={80}
            className={styles.profileImage}
            placeholder='blur'
          />
        )}
        <button
          type='button'
          className={styles.editBtn}
          onClick={() => setIsModalOpen(true)}
          aria-label='Change profile photo'
        >
          📷
        </button>
      </div>

      <ProfilePhotoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentImage={displayImage}
        onSuccess={handleSuccess}
      />
    </>
  );
}
