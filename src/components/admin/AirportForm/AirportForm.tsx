/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type ActionResult = { success?: string; error?: string };

type InitialAirport = {
  name?: string;
  iata?: string;
  address?: string;
  placeId?: string | null;
  sortOrder?: number;
  active?: boolean;
  lat?: string | number | null;
  lng?: string | number | null;
};

declare global {
  interface Window {
    google?: any;
  }
}

function loadGooglePlaces(browserKey: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.maps?.places) return resolve();

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-places="1"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Places"))
      );
      return;
    }

    const script = document.createElement("script");
    script.dataset.googlePlaces = "1";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      browserKey
    )}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Places"));
    document.head.appendChild(script);
  });
}

function toStr(v: any) {
  if (v == null) return "";
  return String(v);
}

export default function AirportForm({
  action,
  initial,
  submitLabel = "Create",
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  initial?: InitialAirport;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const addressRef = useRef<HTMLInputElement | null>(null);
  const placeIdRef = useRef<HTMLInputElement | null>(null);
  const latRef = useRef<HTMLInputElement | null>(null);
  const lngRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const browserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
    if (!browserKey) return;

    let cancelled = false;

    (async () => {
      try {
        await loadGooglePlaces(browserKey);
        if (cancelled) return;

        const google = window.google;
        const el = addressRef.current;
        if (!google?.maps?.places || !el) return;

        const ac = new google.maps.places.Autocomplete(el, {
          fields: ["place_id", "formatted_address", "geometry"],
          componentRestrictions: { country: "us" },
        });

        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const loc = place?.geometry?.location;

          if (place?.formatted_address) {
            el.value = place.formatted_address;
          }
          if (place?.place_id && placeIdRef.current) {
            placeIdRef.current.value = place.place_id;
          }
          if (loc && latRef.current && lngRef.current) {
            latRef.current.value = String(loc.lat());
            lngRef.current.value = String(loc.lng());
          }
        });
      } catch {
        // silent: still allow manual entry, but server action will require coords
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
        const formData = new FormData(e.currentTarget);

        const address = String(formData.get("address") ?? "").trim();
        const lat = String(formData.get("lat") ?? "").trim();
        const lng = String(formData.get("lng") ?? "").trim();

        // ✅ If they typed an address but didn't pick a suggestion, stop here.
        if (address && (!lat || !lng)) {
          toast.error(
            "Please select an address suggestion so we can capture coordinates."
          );
          return;
        }

        startTransition(() => {
          void (async () => {
            const res = await action(formData);

            if (res?.error) {
              toast.error(res.error);
              return;
            }

            toast.success(res?.success || "Saved");
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
          defaultValue={initial?.name ?? ""}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label className='cardTitle h5'>IATA code</label>
        <input
          name='iata'
          className='inputBorder'
          disabled={isPending}
          placeholder='PHX'
          defaultValue={initial?.iata ?? ""}
        />
        <div className='miniNote'>
          Use the 3-letter IATA code (PHX, LAX, etc.).
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label className='cardTitle h5'>Address</label>
        <input
          ref={addressRef}
          name='address'
          className='inputBorder'
          disabled={isPending}
          placeholder='3400 E Sky Harbor Blvd, Phoenix, AZ...'
          defaultValue={initial?.address ?? ""}
          autoComplete='off'
        />
        <div className='miniNote'>
          Start typing and select the suggested address (required).
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label className='cardTitle h5'>Google Place ID</label>
        <input
          ref={placeIdRef}
          name='placeId'
          className='inputBorder'
          disabled
          placeholder='Auto-fills when you select an address'
          defaultValue={toStr(initial?.placeId ?? "")}
        />
      </div>

      {/* ✅ Saved for routing/maps */}
      <input
        ref={latRef}
        name='lat'
        type='hidden'
        defaultValue={toStr(initial?.lat ?? "")}
      />
      <input
        ref={lngRef}
        name='lng'
        type='hidden'
        defaultValue={toStr(initial?.lng ?? "")}
      />

      <div style={{ display: "grid", gap: 6 }}>
        <label className='cardTitle h5'>Sort order</label>
        <input
          name='sortOrder'
          type='number'
          step='1'
          inputMode='numeric'
          defaultValue={String(initial?.sortOrder ?? 0)}
          className='inputBorder'
          disabled={isPending}
        />
      </div>

      <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type='checkbox'
          name='active'
          defaultChecked={initial?.active ?? true}
          disabled={isPending}
        />
        <span className='emptyTitle'>Active</span>
      </label>

      <button className='primaryBtn' disabled={isPending} type='submit'>
        {isPending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
