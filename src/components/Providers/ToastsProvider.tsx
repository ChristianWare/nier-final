"use client";

import { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import FlashToasts from "@/components/shared/FlashToasts/FlashToasts";

export default function ToastsProvider() {
  return (
    <>
      <Toaster
        position='bottom-right'
        toastOptions={{
          className: "toastFont",
        }}
      />
      <Suspense fallback={null}>
        <FlashToasts />
      </Suspense>
    </>
  );
}
