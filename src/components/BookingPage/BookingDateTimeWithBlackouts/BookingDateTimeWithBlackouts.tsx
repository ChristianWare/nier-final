"use client";

import { useEffect, useMemo, useState } from "react";
import BookingDateTimePicker from "@/components/BookingPage/BookingDateTimePicker/BookingDateTimePicker";

function monthFromYmd(ymd: string) {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return ymd.slice(0, 7);
}

function currentMonthKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function BookingDateTimeWithBlackouts({
  date,
  time,
  onChangeDate,
  onChangeTime,
  disablePast = true,
}: {
  date: string;
  time: string;
  onChangeDate: (v: string) => void;
  onChangeTime: (v: string) => void;
  disablePast?: boolean;
}) {
  const initialMonth = useMemo(
    () => monthFromYmd(date) ?? currentMonthKey(),
    [date],
  );

  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const [blocked, setBlocked] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const res = await fetch(
        `/api/blackouts?month=${encodeURIComponent(visibleMonth)}`,
        {
          cache: "no-store",
        },
      );
      const data = await res.json();
      if (cancelled) return;
      setBlocked(Array.isArray(data?.ymds) ? data.ymds : []);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [visibleMonth]);

  return (
    <BookingDateTimePicker
      date={date}
      time={time}
      onChangeDate={onChangeDate}
      onChangeTime={onChangeTime}
      disablePast={disablePast}
      blockedDates={blocked}
      onVisibleMonthChange={setVisibleMonth}
    />
  );
}
