"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/shared/Button/Button";

interface ClearFiltersButtonProps {
  hasActiveFilters: boolean;
}

export default function ClearFiltersButton({
  hasActiveFilters,
}: ClearFiltersButtonProps) {
  const router = useRouter();

  if (!hasActiveFilters) return null;

  function handleClear() {
    // Reset to default view (current month, all statuses, no filters)
    router.push("/admin/bookings");
  }

  return (
    <div
      style={{
        marginTop: "1rem",
        display: "flex",
        justifyContent: "flex-start",
      }}
    >
      <Button
        text='Clear All Filters'
        btnType='grayReg'
        onClick={handleClear}
      />
    </div>
  );
}
