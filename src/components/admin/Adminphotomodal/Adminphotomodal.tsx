"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import ReactCrop, {
  type Crop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import toast from "react-hot-toast";
import Modal from "@/components/shared/Modal/Modal";
import Button from "@/components/shared/Button/Button";
import styles from "./AdminPhotoModal.module.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentImage: string | null;
  userName: string | null;
  onSuccess?: (newImageUrl: string) => void;
}

// Helper to center a square crop on the image
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

export default function AdminPhotoModal({
  isOpen,
  onClose,
  userId,
  currentImage,
  userName,
  onSuccess,
}: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setImageSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setIsUploading(false);
    setDragActive(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const validateFile = (file: File): string | null => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return "Please upload a JPG, PNG, or WebP image.";
    }

    const maxSize = 10 * 1024 * 1024; // 10MB for pre-crop
    if (file.size > maxSize) {
      return "Image must be smaller than 10MB.";
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // When image loads, set initial centered crop
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerAspectCrop(width, height, 1);
    setCrop(initialCrop);
    setCompletedCrop(initialCrop);
  };

  // Generate cropped image blob
  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    const image = imgRef.current;
    if (!image || !completedCrop) return null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCrop = {
      x: (completedCrop.x / 100) * image.width * scaleX,
      y: (completedCrop.y / 100) * image.height * scaleY,
      width: (completedCrop.width / 100) * image.width * scaleX,
      height: (completedCrop.height / 100) * image.height * scaleY,
    };

    const outputSize = 400;
    canvas.width = outputSize;
    canvas.height = outputSize;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outputSize,
      outputSize,
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/jpeg",
        0.9,
      );
    });
  }, [completedCrop]);

  const handleUpload = async () => {
    if (!selectedFile || !completedCrop) return;

    setIsUploading(true);

    try {
      // Get cropped image blob
      const croppedBlob = await getCroppedImg();
      if (!croppedBlob) {
        throw new Error("Failed to crop image");
      }

      // Create file from blob
      const croppedFile = new File([croppedBlob], "profile-photo.jpg", {
        type: "image/jpeg",
      });

      // Upload to Cloudinary via admin API route
      const formData = new FormData();
      formData.append("file", croppedFile);
      formData.append("userId", userId);

      const uploadRes = await fetch("/api/admin/upload/user-photo", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "Upload failed");
      }

      toast.success("Photo updated successfully!");
      onSuccess?.(uploadData.url);
      handleClose();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload photo",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageSrc(null);
    setSelectedFile(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className='h3'>Update User Photo</h2>
          <p className='miniNote'>
            {imageSrc
              ? "Drag the corners to adjust the crop area"
              : `Upload a photo for ${userName || "this user"}`}
          </p>
        </div>

        {/* Current Photo */}
        {!imageSrc && currentImage && (
          <div className={styles.currentPhoto}>
            <p className='emptyTitleSmall'>Current Photo</p>
            <div className={styles.currentImageWrap}>
              <Image
                src={currentImage}
                alt='Current profile'
                width={120}
                height={120}
                className={styles.currentImage}
              />
            </div>
          </div>
        )}

        {/* Upload Area */}
        {!imageSrc ? (
          <div
            className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type='file'
              accept='image/jpeg,image/png,image/webp'
              onChange={handleInputChange}
              className={styles.hiddenInput}
            />
            <div className={styles.dropzoneContent}>
              <div className={styles.dropzoneIcon}>📷</div>
              <p className={styles.dropzoneText}>
                <span className={styles.dropzoneLink}>Click to upload</span> or
                drag and drop
              </p>
              <p className='miniNote'>JPG, PNG or WebP (max 10MB)</p>
            </div>
          </div>
        ) : (
          /* Crop Area */
          <div className={styles.cropSection}>
            <div className={styles.cropContainer}>
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(_, percentCrop) => setCompletedCrop(percentCrop)}
                aspect={1}
                circularCrop
                className={styles.reactCrop}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt='Crop preview'
                  onLoad={onImageLoad}
                  className={styles.cropImage}
                />
              </ReactCrop>
            </div>

            <div className={styles.cropActions}>
              <button
                type='button'
                className={styles.changeImageBtn}
                onClick={handleRemoveImage}
              >
                Choose Different Image
              </button>
            </div>

            <p className='miniNote' style={{ textAlign: "center" }}>
              Drag to reposition • Drag corners to resize
            </p>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <Button
            text='Cancel'
            btnType='grayReg'
            onClick={handleClose}
            disabled={isUploading}
          />
          <Button
            text={isUploading ? "Uploading..." : "Save Photo"}
            btnType='blackReg'
            onClick={handleUpload}
            disabled={!imageSrc || !completedCrop || isUploading}
          />
        </div>
      </div>
    </Modal>
  );
}
