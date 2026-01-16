/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type ActionResult = { success?: string; error?: string };

declare global {
  interface Window {
    google?: any;
  }
}

const loadGoogleMaps = (browserKey: string) => {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.maps?.places) return resolve();

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps="1"]'
    );

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps"))
      );
      return;
    }

    const script = document.createElement("script");
    script.dataset.googleMaps = "1";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      browserKey
    )}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });
};

export default function AirportForm({
  action,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ✅ We keep these controlled so we can auto-fill placeId when selecting a suggestion
  const [address, setAddress] = useState("");
  const [placeId, setPlaceId] = useState("");

  // ✅ Uncontrolled ref for Google Autocomplete binding (best reliability)
  const addressRef = useRef<HTMLInputElement | null>(null);
  const acRef = useRef<any>(null);
  const acElRef = useRef<HTMLInputElement | null>(null);

  // ✅ Init Places Autocomplete for Address
  useEffect(() => {
    const browserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
    if (!browserKey) return;

    let cancelled = false;

    (async () => {
      try {
        await loadGoogleMaps(browserKey);
        if (cancelled) return;

        const google = window.google;
        const el = addressRef.current;
        if (!google?.maps?.places || !el) return;

        // already attached to this exact input
        if (acRef.current && acElRef.current === el) return;

        // if re-attaching, clear listeners
        if (acRef.current) {
          try {
            google.maps.event.clearInstanceListeners(acRef.current);
          } catch {}
          acRef.current = null;
        }

        acElRef.current = el;

        const ac = new google.maps.places.Autocomplete(el, {
          fields: ["place_id", "formatted_address", "geometry", "name"],
          componentRestrictions: { country: "us" },
        });

        acRef.current = ac;

        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const formatted = place?.formatted_address ?? "";
          const pid = place?.place_id ?? "";

          if (!formatted) return;

          // ✅ write to the input (uncontrolled)
          el.value = formatted;

          // ✅ sync state (so hidden/controlled values match)
          setAddress(formatted);
          setPlaceId(pid);
        });
      } catch (e: any) {
        // Don't hard-fail the form if maps fails; just no autocomplete
        console.warn("Places autocomplete failed:", e?.message ?? e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <form
      className='box'
      onSubmit={(e) => {
        e.preventDefault();

        const form = e.currentTarget;
        const formData = new FormData(form);

        // ✅ Ensure latest address + placeId are submitted even if user typed manually
        formData.set("address", addressRef.current?.value ?? address ?? "");
        formData.set("placeId", placeId ?? "");

        startTransition(() => {
          void (async () => {
            const res = await action(formData);

            if (res?.error) {
              toast.error(res.error);
              return;
            }

            toast.success("Airport added");
            router.push("/admin/airports");
            router.refresh();
          })();
        });
      }}
      style={{ display: "grid", gap: 14 }}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <label className='cardTitle h5'>Name</label>
        <input
          name='name'
          className='inputBorder'
          disabled={isPending}
          placeholder='Phoenix Sky Harbor'
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label className='cardTitle h5'>IATA code</label>
        <input
          name='iata'
          className='inputBorder'
          disabled={isPending}
          placeholder='PHX'
          onChange={(e) => {
            // optional: normalize as they type
            e.currentTarget.value = e.currentTarget.value.toUpperCase();
          }}
        />
        <div className='miniNote'>
          Use the 3-letter IATA code (PHX, LAX, etc.).
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label className='cardTitle h5'>Address</label>
        {/* ✅ UNCONTROLLED input for Places dropdown reliability */}
        <input
          ref={addressRef}
          name='address'
          className='inputBorder'
          disabled={isPending}
          placeholder='Start typing an address…'
          autoComplete='off'
          onInput={(e) => {
            // Keep state in sync when user types manually
            const v = String(e.currentTarget.value ?? "");
            setAddress(v);
            // clear stale placeId once they start typing again
            setPlaceId("");
          }}
        />
        <div className='miniNote'>
          Start typing and pick a suggestion to auto-fill. (If suggestions
          appear but seem “behind” the UI, add{" "}
          <code>.pac-container &#123; z-index: 999999 !important; &#125;</code>{" "}
          to global CSS.)
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label className='cardTitle h5'>Google Place ID (optional)</label>
        <input
          name='placeId'
          className='inputBorder'
          disabled={isPending}
          placeholder='Auto-filled when you pick an address'
          value={placeId}
          onChange={(e) => setPlaceId(e.target.value)}
        />
        <div className='miniNote'>
          Place ID is a stable identifier from Google for this location. It
          helps you re-hydrate the exact place later (even if the formatted
          address changes). Selecting an autocomplete suggestion will fill it
          automatically.
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label className='cardTitle h5'>Sort order</label>
        <input
          name='sortOrder'
          type='number'
          step='1'
          inputMode='numeric'
          defaultValue='0'
          className='inputBorder'
          disabled={isPending}
        />
      </div>

      <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type='checkbox'
          name='active'
          defaultChecked
          disabled={isPending}
        />
        <span className='emptyTitle'>Active</span>
      </label>

      <button className='primaryBtn' disabled={isPending} type='submit'>
        {isPending ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
