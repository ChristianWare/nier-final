"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/shared/Button/Button";

export default function CorporateClearFiltersButton({
  hasActiveFilters,
}: {
  hasActiveFilters: boolean;
}) {
  const router = useRouter();

  if (!hasActiveFilters) return null;

  return (
    <Button
      text='Clear All Filters'
      btnType='grayReg'
      type='button'
      onClick={() => router.replace("/corporate/bookings", { scroll: false })}
    />
  );
}
