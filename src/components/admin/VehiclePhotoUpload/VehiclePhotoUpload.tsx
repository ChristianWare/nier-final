/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import VehiclePhotoModal from "../VehiclePhotoModal/VehiclePhotoModal";
import styles from "./VehiclePhotoUpload.module.css";

interface Props {
  vehicleUnitId: string;
  currentImage: string | null;
  vehicleName: string | null;
  defaultImage: any; // StaticImageData from next/image
}

export default function VehiclePhotoUpload({
  vehicleUnitId,
  currentImage,
  vehicleName,
  defaultImage,
}: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayImage, setDisplayImage] = useState(currentImage);
  const router = useRouter();

  const handleSuccess = (newImageUrl: string) => {
    setDisplayImage(newImageUrl);
    router.refresh();
  };

  return (
    <>
      <div className={styles.vehicleImageWrap}>
        {displayImage ? (
          <Image
            src={displayImage}
            alt={vehicleName || "Vehicle"}
            width={100}
            height={100}
            className={styles.vehicleImage}
          />
        ) : (
          <Image
            src={defaultImage}
            alt={vehicleName || "Vehicle"}
            width={100}
            height={100}
            className={styles.vehicleImage}
            placeholder='blur'
          />
        )}
        <button
          type='button'
          className={styles.editBtn}
          onClick={() => setIsModalOpen(true)}
          aria-label='Change vehicle photo'
          title='Change photo'
        >
          📷
        </button>
      </div>

      <VehiclePhotoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        vehicleUnitId={vehicleUnitId}
        currentImage={displayImage}
        vehicleName={vehicleName}
        onSuccess={handleSuccess}
      />
    </>
  );
}
