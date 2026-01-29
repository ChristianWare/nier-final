"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/shared/Button/Button";

interface UserClearFiltersButtonProps {
  hasActiveFilters: boolean;
}

export default function UserClearFiltersButton({
  hasActiveFilters,
}: UserClearFiltersButtonProps) {
  const router = useRouter();

  if (!hasActiveFilters) return null;

  function handleClear() {
    // Reset to default view (upcoming, all statuses, no filters)
    router.push("/dashboard/trips");
  }

  return (
    <div
      style={{
        marginTop: "0.5rem",
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
