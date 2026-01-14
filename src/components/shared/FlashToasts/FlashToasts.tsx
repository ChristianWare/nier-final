"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";

export default function FlashToasts() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    const ok = searchParams.get("ok");
    const err = searchParams.get("err");
    const msg = err ?? ok;

    if (!msg) return;

    const key = `${err ? "err" : "ok"}:${msg}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    if (err) toast.error(msg, { id: "flash-toast" });
    else toast.success(msg, { id: "flash-toast" });

    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("ok");
    sp.delete("err");

    const next = sp.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  return null;
}
