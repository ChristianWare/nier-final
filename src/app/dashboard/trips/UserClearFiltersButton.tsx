"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/shared/Button/Button";

export default function UserClearFiltersButton({
  hasActiveFilters,
}: {
  hasActiveFilters: boolean;
}) {
  const router = useRouter();

  if (!hasActiveFilters) return null;

  function onClick() {
    router.replace("/dashboard/trips", { scroll: false });
  }

  return (
    <Button
      text='Clear All Filters'
      btnType='grayReg'
      type='button'
      onClick={onClick}
    />
  );
}
