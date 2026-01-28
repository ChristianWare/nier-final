"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/shared/Button/Button";

type Props = {
  hasActiveFilters: boolean;
};

export default function DriverClearFiltersButton({ hasActiveFilters }: Props) {
  const router = useRouter();

  if (!hasActiveFilters) return null;

  function handleClear() {
    router.replace("/driver-dashboard/trips", { scroll: false });
  }

  return (
    <Button
      text='Clear All Filters'
      btnType='grayReg'
      type='button'
      onClick={handleClear}
    />
  );
}
