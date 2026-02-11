/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";

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
      'script[data-google-places="1"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Places")),
      );
      return;
    }

    const script = document.createElement("script");
    script.dataset.googlePlaces = "1";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      browserKey,
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

  /* ── Controlled state ── */
  const [name, setName] = useState(initial?.name ?? "");
  const [iata, setIata] = useState(initial?.iata ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [placeId, setPlaceId] = useState(toStr(initial?.placeId ?? ""));
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [active, setActive] = useState(initial?.active ?? true);
  const [lat, setLat] = useState(toStr(initial?.lat ?? ""));
  const [lng, setLng] = useState(toStr(initial?.lng ?? ""));

  const addressRef = useRef<HTMLInputElement | null>(null);

  /* ── Dirty form tracking ── */
  const changedFields = useMemo(() => {
    const fields: string[] = [];
    if (name !== (initial?.name ?? "")) fields.push("Name");
    if (iata !== (initial?.iata ?? "")) fields.push("IATA Code");
    if (address !== (initial?.address ?? "")) fields.push("Address");
    if (sortOrder !== String(initial?.sortOrder ?? 0))
      fields.push("Sort Order");
    if (active !== (initial?.active ?? true)) fields.push("Active Status");
    return fields;
  }, [name, iata, address, sortOrder, active, initial]);

  useDirtyForm(
    "airport-settings",
    changedFields.length > 0,
    "airport-form",
    changedFields,
  );

  /* ── Google Places autocomplete ── */
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
            setAddress(place.formatted_address);
          }
          if (place?.place_id) {
            setPlaceId(place.place_id);
          }
          if (loc) {
            setLat(String(loc.lat()));
            setLng(String(loc.lng()));
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
      id='airport-form'
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const addressVal = String(formData.get("address") ?? "").trim();
        const latVal = String(formData.get("lat") ?? "").trim();
        const lngVal = String(formData.get("lng") ?? "").trim();

        if (addressVal && (!latVal || !lngVal)) {
          toast.error(
            "Please select an address suggestion so we can capture coordinates.",
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
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label className='cardTitle h5'>IATA code</label>
        <input
          name='iata'
          className='inputBorder'
          disabled={isPending}
          placeholder='PHX'
          value={iata}
          onChange={(e) => setIata(e.target.value)}
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
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          autoComplete='off'
        />
        <div className='miniNote'>
          Start typing and select the suggested address (required).
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label className='cardTitle h5'>Google Place ID</label>
        <input
          name='placeId'
          className='inputBorder'
          disabled
          placeholder='Auto-fills when you select an address'
          value={placeId}
          readOnly
        />
      </div>

      {/* Hidden coords */}
      <input name='lat' type='hidden' value={lat} />
      <input name='lng' type='hidden' value={lng} />

      <div style={{ display: "grid", gap: 6 }}>
        <label className='cardTitle h5'>Sort order</label>
        <input
          name='sortOrder'
          type='number'
          step='1'
          inputMode='numeric'
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className='inputBorder'
          disabled={isPending}
        />
      </div>

      <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type='checkbox'
          name='active'
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          disabled={isPending}
        />
        <span className='emptyTitle'>Active</span>
      </label>

      <button
        className='primaryBtn'
        disabled={isPending}
        type='submit'
        style={{ justifySelf: "start" }}
      >
        {isPending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
