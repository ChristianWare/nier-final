/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./AirportForm.module.css";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import Button from "@/components/shared/Button/Button";

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
  mode = "create",
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  initial?: InitialAirport;
  submitLabel?: string;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /* ── Lock / Unlock state (only applies in edit mode) ── */
  const [isEditing, setIsEditing] = useState(mode === "create");
  const [justSaved, setJustSaved] = useState(false);

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

  /* ── Helpers ── */
  const isLocked = !isEditing;
  const fieldsDisabled = isLocked || isPending;

  const wrapperClass =
    mode === "create"
      ? styles.form
      : justSaved
        ? `${styles.form} ${styles.sectionSaved}`
        : isEditing
          ? `${styles.form} ${styles.sectionEditing}`
          : `${styles.form} ${styles.sectionLocked}`;

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
    isEditing && changedFields.length > 0,
    "airport-form",
    changedFields,
  );

  /* ── Cancel — reset all fields ── */
  const handleCancel = useCallback(() => {
    setName(initial?.name ?? "");
    setIata(initial?.iata ?? "");
    setAddress(initial?.address ?? "");
    setPlaceId(toStr(initial?.placeId ?? ""));
    setSortOrder(String(initial?.sortOrder ?? 0));
    setActive(initial?.active ?? true);
    setLat(toStr(initial?.lat ?? ""));
    setLng(toStr(initial?.lng ?? ""));
    setIsEditing(false);
  }, [initial]);

  /* ── Save ── */
  function handleSave() {
    const addressVal = address.trim();
    const latVal = lat.trim();
    const lngVal = lng.trim();

    if (addressVal && (!latVal || !lngVal)) {
      toast.error(
        "Please select an address suggestion so we can capture coordinates.",
      );
      return;
    }

    const fd = new FormData();
    fd.set("name", name);
    fd.set("iata", iata);
    fd.set("address", address);
    fd.set("placeId", placeId);
    fd.set("sortOrder", sortOrder);
    fd.set("lat", lat);
    fd.set("lng", lng);
    if (active) fd.set("active", "on");

    startTransition(() => {
      void (async () => {
        const res = await action(fd);

        if (res?.error) {
          toast.error(res.error);
          return;
        }

        toast.success(res?.success || "Saved");

        if (mode === "create") {
          router.push("/admin/airports");
          router.refresh();
        } else {
          setJustSaved(true);
          setTimeout(() => {
            setJustSaved(false);
            setIsEditing(false);
          }, 2000);
          router.refresh();
        }
      })();
    });
  }

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
        // silent: still allow manual entry
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Section action buttons (edit mode only) ── */
  const renderActions = () => {
    if (mode === "create") {
      return (
        <div className={styles.sectionActionsRow}>
          <Button
            disabled={isPending}
            type='button'
            text={isPending ? "Saving..." : submitLabel}
            btnType='blackReg'
            onClick={handleSave}
          />
        </div>
      );
    }

    if (justSaved) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button text='Saved ✓' btnType='greenReg' type='button' disabled />
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button
            disabled={isPending}
            type='button'
            text={isPending ? "Saving..." : "Save Changes"}
            btnType='blackReg'
            onClick={handleSave}
          />
          {!isPending && (
            <Button
              text='Cancel'
              btnType='redReg'
              type='button'
              onClick={handleCancel}
            />
          )}
        </div>
      );
    }

    return (
      <div className={styles.sectionActionsRow}>
        <Button
          text='Edit Airport'
          btnType='blackReg'
          type='button'
          onClick={() => setIsEditing(true)}
        />
      </div>
    );
  };

  return (
    <div id='airport-form' className={wrapperClass}>
      <div style={{ display: "grid", gap: 6 }}>
        <label className='cardTitle h5'>Name</label>
        <input
          className='input'
          disabled={fieldsDisabled}
          placeholder='Phoenix Sky Harbor'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label className='cardTitle h5'>IATA code</label>
        <input
          className='input'
          disabled={fieldsDisabled}
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
          className='input'
          disabled={fieldsDisabled}
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
          className='input'
          disabled
          placeholder='Auto-fills when you select an address'
          value={placeId}
          readOnly
        />
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label className='cardTitle h5'>Sort order</label>
        <input
          type='number'
          step='1'
          inputMode='numeric'
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className='input'
          disabled={fieldsDisabled}
        />
      </div>

      <label className={styles.labelinputcheckbox}>
        <input
          type='checkbox'
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          disabled={fieldsDisabled}
          className={styles.labelinputcheckbox}
        />
        <span className='emptyTitle'>Active</span>
      </label>

      {renderActions()}
    </div>
  );
}
