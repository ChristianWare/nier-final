/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./RoutePicker.module.css";
import { RefObject, useEffect, useRef, useState } from "react";

type LatLng = { lat: number; lng: number };

export type RoutePickerPlace = {
  address: string;
  placeId: string;
  location: LatLng;
};

// Stop type
export type RoutePickerStop = {
  id: string;
  address: string;
  placeId: string;
  location: LatLng;
};

export type RoutePickerValue = {
  pickup: RoutePickerPlace | null;
  dropoff: RoutePickerPlace | null;
  stops: RoutePickerStop[];
  miles: number | null;
  minutes: number | null;
  distanceMiles?: number | null;
  durationMinutes?: number | null;
};

declare global {
  interface Window {
    google?: any;
  }
}

const loadGoogleMaps = (browserKey: string) => {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.maps?.places && window.google?.maps?.geometry) {
      return resolve();
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps="1"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps")),
      );
      return;
    }

    const script = document.createElement("script");
    script.dataset.googleMaps = "1";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      browserKey,
    )}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });
};

export default function RoutePicker({
  value,
  onChange,
  pickupInputRef,
  dropoffInputRef,
  inputsKey,
}: {
  value: RoutePickerValue | null;
  onChange: (v: RoutePickerValue) => void;
  pickupInputRef?: RefObject<HTMLInputElement | null>;
  dropoffInputRef?: RefObject<HTMLInputElement | null>;
  inputsKey?: any;
}) {
  const browserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;

  const mapRef = useRef<HTMLDivElement | null>(null);

  const internalPickupRef = useRef<HTMLInputElement | null>(null);
  const internalDropoffRef = useRef<HTMLInputElement | null>(null);

  const pickupRef = pickupInputRef ?? internalPickupRef;
  const dropoffRef = dropoffInputRef ?? internalDropoffRef;

  const mapInstance = useRef<any>(null);
  const pickupMarker = useRef<any>(null);
  const dropoffMarker = useRef<any>(null);
  const stopMarkers = useRef<any[]>([]);
  const routePolyline = useRef<any>(null);

  const pickupAC = useRef<any>(null);
  const dropoffAC = useRef<any>(null);
  const pickupACEl = useRef<HTMLInputElement | null>(null);
  const dropoffACEl = useRef<HTMLInputElement | null>(null);

  const [error, setError] = useState("");
  const [loadingRoute, setLoadingRoute] = useState(false);

  const latestValueRef = useRef<RoutePickerValue | null>(value);
  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  const pickup = value?.pickup ?? null;
  const dropoff = value?.dropoff ?? null;
  const stops = value?.stops ?? [];

  // Primitive keys for stable deps
  const pickupKey = pickup
    ? `${pickup.placeId}|${pickup.location.lat}|${pickup.location.lng}`
    : "";
  const dropoffKey = dropoff
    ? `${dropoff.placeId}|${dropoff.location.lat}|${dropoff.location.lng}`
    : "";
  const stopsKey = stops
    .map((s) => `${s.placeId}|${s.location.lat}|${s.location.lng}`)
    .join(";");

  // Init maps + autocomplete
  useEffect(() => {
    if (!browserKey) {
      setError("Missing NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await loadGoogleMaps(browserKey);
        if (cancelled) return;

        const google = window.google;

        if (!mapInstance.current && mapRef.current) {
          mapInstance.current = new google.maps.Map(mapRef.current, {
            center: { lat: 33.4484, lng: -112.074 }, // Phoenix
            zoom: 10,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
        }

        // Attach pickup autocomplete
        const pickupEl = pickupRef.current;
        if (
          pickupEl &&
          (!pickupAC.current || pickupACEl.current !== pickupEl)
        ) {
          pickupACEl.current = pickupEl;
          pickupAC.current = new google.maps.places.Autocomplete(pickupEl, {
            fields: ["place_id", "formatted_address", "geometry"],
            componentRestrictions: { country: "us" },
          });

          pickupAC.current.addListener("place_changed", () => {
            const place = pickupAC.current.getPlace();
            const loc = place?.geometry?.location;
            if (!place?.place_id || !place?.formatted_address || !loc) return;

            const latest = latestValueRef.current;

            onChange({
              pickup: {
                placeId: String(place.place_id),
                address: String(place.formatted_address),
                location: { lat: loc.lat(), lng: loc.lng() },
              },
              dropoff: latest?.dropoff ?? null,
              stops: latest?.stops ?? [],
              miles: null,
              minutes: null,
              distanceMiles: null,
              durationMinutes: null,
            });
          });
        }

        // Attach dropoff autocomplete
        const dropoffEl = dropoffRef.current;
        if (
          dropoffEl &&
          (!dropoffAC.current || dropoffACEl.current !== dropoffEl)
        ) {
          dropoffACEl.current = dropoffEl;
          dropoffAC.current = new google.maps.places.Autocomplete(dropoffEl, {
            fields: ["place_id", "formatted_address", "geometry"],
            componentRestrictions: { country: "us" },
          });

          dropoffAC.current.addListener("place_changed", () => {
            const place = dropoffAC.current.getPlace();
            const loc = place?.geometry?.location;
            if (!place?.place_id || !place?.formatted_address || !loc) return;

            const latest = latestValueRef.current;

            onChange({
              pickup: latest?.pickup ?? null,
              dropoff: {
                placeId: String(place.place_id),
                address: String(place.formatted_address),
                location: { lat: loc.lat(), lng: loc.lng() },
              },
              stops: latest?.stops ?? [],
              miles: null,
              minutes: null,
              distanceMiles: null,
              durationMinutes: null,
            });
          });
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to initialize Google Maps");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [browserKey, onChange, pickupRef, dropoffRef, inputsKey]);

  // Markers + bounds
  useEffect(() => {
    const google = window.google;
    if (!google?.maps || !mapInstance.current) return;

    const map = mapInstance.current;

    // Pickup marker (green)
    if (pickup) {
      if (!pickupMarker.current)
        pickupMarker.current = new google.maps.Marker({ map });
      pickupMarker.current.setPosition(pickup.location);
      pickupMarker.current.setLabel("A");
      pickupMarker.current.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#22c55e",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
      });
    } else if (pickupMarker.current) {
      pickupMarker.current.setMap(null);
      pickupMarker.current = null;
    }

    // Dropoff marker (red)
    if (dropoff) {
      if (!dropoffMarker.current)
        dropoffMarker.current = new google.maps.Marker({ map });
      dropoffMarker.current.setPosition(dropoff.location);
      dropoffMarker.current.setLabel("B");
      dropoffMarker.current.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#ef4444",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
      });
    } else if (dropoffMarker.current) {
      dropoffMarker.current.setMap(null);
      dropoffMarker.current = null;
    }

    // Stop markers (blue)
    stopMarkers.current.forEach((m) => m.setMap(null));
    stopMarkers.current = [];

    stops.forEach((stop, index) => {
      // Only show marker if stop has valid coordinates
      if (stop.location.lat !== 0 && stop.location.lng !== 0) {
        const marker = new google.maps.Marker({
          map,
          position: stop.location,
          label: String(index + 1),
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#3b82f6",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
          title: `Stop ${index + 1}: ${stop.address}`,
        });
        stopMarkers.current.push(marker);
      }
    });

    // Fit bounds if we have points
    const allPoints = [
      pickup?.location,
      ...stops
        .filter((s) => s.location.lat !== 0 && s.location.lng !== 0)
        .map((s) => s.location),
      dropoff?.location,
    ].filter(Boolean);

    if (allPoints.length >= 2 && !routePolyline.current) {
      const bounds = new google.maps.LatLngBounds();
      allPoints.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 70);
    }
  }, [pickupKey, dropoffKey, stopsKey, pickup, dropoff, stops]);

  // Route compute + polyline draw
  useEffect(() => {
    const google = window.google;

    // If missing either endpoint, clear route
    if (!pickup || !dropoff) {
      if (routePolyline.current) {
        routePolyline.current.setMap(null);
        routePolyline.current = null;
      }

      onChange({
        pickup,
        dropoff,
        stops,
        miles: null,
        minutes: null,
        distanceMiles: null,
        durationMinutes: null,
      });
      return;
    }

    if (!google?.maps || !mapInstance.current) return;

    let cancelled = false;

    (async () => {
      try {
        setLoadingRoute(true);
        setError("");

        // Build waypoints array for stops (only valid ones)
        const validStops = stops.filter(
          (s) => s.location.lat !== 0 && s.location.lng !== 0,
        );
        const waypoints = validStops.map((s) => s.location);

        const res = await fetch("/api/maps/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: pickup.location,
            destination: dropoff.location,
            waypoints: waypoints.length > 0 ? waypoints : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.details || data?.error || "Route failed");
        }
        if (cancelled) return;

        const miles = data.miles ?? null;
        const minutes = data.minutes ?? null;

        onChange({
          pickup,
          dropoff,
          stops,
          miles,
          minutes,
          distanceMiles: miles,
          durationMinutes: minutes,
        });

        if (routePolyline.current) {
          routePolyline.current.setMap(null);
          routePolyline.current = null;
        }

        if (data.encodedPolyline) {
          const geom = google.maps.geometry?.encoding;
          if (geom?.decodePath) {
            const path = geom.decodePath(data.encodedPolyline);

            routePolyline.current = new google.maps.Polyline({
              path,
              geodesic: true,
              strokeColor: "#1A73E8",
              strokeOpacity: 0.9,
              strokeWeight: 4,
            });

            routePolyline.current.setMap(mapInstance.current);

            const bounds = new google.maps.LatLngBounds();
            path.forEach((p: any) => bounds.extend(p));
            mapInstance.current.fitBounds(bounds, 70);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to compute route");
      } finally {
        if (!cancelled) setLoadingRoute(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pickupKey, dropoffKey, stopsKey, pickup, dropoff]);

  const displayMiles = value?.miles ?? value?.distanceMiles ?? null;
  const displayMinutes = value?.minutes ?? value?.durationMinutes ?? null;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className={styles.infoItemContainer}>
        {loadingRoute && <div style={{ opacity: 0.7 }}>Calculating route…</div>}
        {error && <div style={{ color: "crimson", fontSize: 14 }}>{error}</div>}
      </div>

      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: 520,
          borderRadius: 14,
          border: "3px solid #bfe8cc",
          overflow: "hidden",
          background: "white",
          outline: "2px solid #4e94ec33",
        }}
      />

      <div className={styles.infoItem}>
        <div className='emptyTitleSmall'>Total Distance</div>
        <div className='subheading'>
          {displayMiles == null ? "—" : `${displayMiles} mi`}
          {stops.length > 0 && displayMiles != null && (
            <span className={styles.includesStops}>
              {" "}
              (includes {stops.length} stop{stops.length > 1 ? "s" : ""})
            </span>
          )}
        </div>
      </div>

      <div className={styles.infoItem}>
        <div className='emptyTitleSmall'>Est. Duration</div>
        <div className='subheading'>
          {displayMinutes == null ? "—" : `${displayMinutes} min`}
          {stops.length > 0 && displayMinutes != null && (
            <span className={styles.includesStops}>
              {" "}
              (+{stops.length * 5} min wait time)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
