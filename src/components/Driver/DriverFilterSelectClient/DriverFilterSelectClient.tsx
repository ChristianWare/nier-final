"use client";

import { useRouter } from "next/navigation";
import styles from "./DriverTripsPage.module.css";

function buildHref(
  base: string,
  params: Record<string, string | undefined | null>,
) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (!v) continue;
    const s = String(v).trim();
    if (!s) continue;
    usp.set(k, s);
  }
  const qs = usp.toString();
  return qs ? `${base}?${qs}` : base;
}

type Option = {
  value: string;
  label: string;
  count?: number;
};

export default function DriverFilterSelectClient({
  label,
  paramName,
  options,
  current,
  defaultValue,
}: {
  label: string;
  paramName: string;
  options: Option[];
  current: Record<string, string | undefined>;
  defaultValue?: string;
}) {
  const router = useRouter();

  const activeValue = current[paramName] ?? defaultValue ?? options[0]?.value;

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;

    const next: Record<string, string | undefined> = {
      ...current,
      [paramName]: val === defaultValue ? undefined : val,
      page: undefined,
    };

    const href = buildHref("/driver-dashboard/trips", next);
    router.replace(href, { scroll: false });
  }

  return (
    <div className={styles.filterSelectGroup}>
      <div className={styles.filterTitle}>{label}</div>
      <select className='selectBorder' value={activeValue} onChange={onChange}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
            {opt.count !== undefined ? ` (${opt.count})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
