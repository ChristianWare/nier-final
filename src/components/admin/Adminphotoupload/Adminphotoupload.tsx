/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AdminPhotoModal from "../Adminphotomodal/Adminphotomodal";
import styles from "./AdminPhotoUpload.module.css";

interface Props {
  userId: string;
  currentImage: string | null;
  userName: string | null;
  defaultImage: any; // StaticImageData from next/image
}

export default function AdminPhotoUpload({
  userId,
  currentImage,
  userName,
  defaultImage,
}: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayImage, setDisplayImage] = useState(currentImage);
  const router = useRouter();

  const handleSuccess = (newImageUrl: string) => {
    setDisplayImage(newImageUrl);
    // Refresh the page data
    router.refresh();
  };

  return (
    <>
      <div className={styles.profileImageWrap}>
        {displayImage ? (
          <Image
            src={displayImage}
            alt={userName || "User"}
            width={80}
            height={80}
            className={styles.profileImage}
          />
        ) : (
          <Image
            src={defaultImage}
            alt={userName || "User"}
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
          aria-label='Change user photo'
          title='Change photo'
        >
          📷
        </button>
      </div>

      <AdminPhotoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
        currentImage={displayImage}
        userName={userName}
        onSuccess={handleSuccess}
      />
    </>
  );
}
