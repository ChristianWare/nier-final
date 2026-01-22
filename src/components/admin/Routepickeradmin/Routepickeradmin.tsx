/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type LatLng = { lat: number; lng: number };

export type RoutePickerPlace = {
  address: string;
  placeId: string | null;
  location: LatLng | null;
};

export type RouteData = {
  pickup: RoutePickerPlace;
  dropoff: RoutePickerPlace;
  distanceMiles: number | null;
  durationMinutes: number | null;
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

type Props = {
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  pickupPlaceId?: string | null;
  dropoffPlaceId?: string | null;
  distanceMiles?: number | null;
  durationMinutes?: number | null;
  onChange: (data: RouteData) => void;
  disabled?: boolean;
};

export default function RoutePickerAdmin({
  pickupAddress,
  dropoffAddress,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  pickupPlaceId,
  dropoffPlaceId,
  distanceMiles,
  durationMinutes,
  onChange,
  disabled = false,
}: Props) {
  const browserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;

  const mapRef = useRef<HTMLDivElement | null>(null);
  const pickupInputRef = useRef<HTMLInputElement | null>(null);
  const dropoffInputRef = useRef<HTMLInputElement | null>(null);

  const mapInstance = useRef<any>(null);
  const pickupMarker = useRef<any>(null);
  const dropoffMarker = useRef<any>(null);
  const routePolyline = useRef<any>(null);

  const pickupAC = useRef<any>(null);
  const dropoffAC = useRef<any>(null);

  const [error, setError] = useState("");
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // Internal state for the current route data
  const [internalPickup, setInternalPickup] = useState<RoutePickerPlace>({
    address: pickupAddress,
    placeId: pickupPlaceId ?? null,
    location:
      pickupLat && pickupLng ? { lat: pickupLat, lng: pickupLng } : null,
  });

  const [internalDropoff, setInternalDropoff] = useState<RoutePickerPlace>({
    address: dropoffAddress,
    placeId: dropoffPlaceId ?? null,
    location:
      dropoffLat && dropoffLng ? { lat: dropoffLat, lng: dropoffLng } : null,
  });

  const [internalDistance, setInternalDistance] = useState<number | null>(
    distanceMiles ?? null,
  );
  const [internalDuration, setInternalDuration] = useState<number | null>(
    durationMinutes ?? null,
  );

  // Compute route when both locations exist
  const computeRoute = useCallback(
    async (pickup: RoutePickerPlace, dropoff: RoutePickerPlace) => {
      if (!pickup.location || !dropoff.location) {
        setInternalDistance(null);
        setInternalDuration(null);
        return;
      }

      setLoadingRoute(true);
      setError("");

      try {
        const res = await fetch("/api/maps/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: pickup.location,
            destination: dropoff.location,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.details || data?.error || "Route failed");
        }

        const miles = data.miles ?? null;
        const minutes = data.minutes ?? null;

        setInternalDistance(miles);
        setInternalDuration(minutes);

        // Draw polyline
        const google = window.google;
        if (google?.maps && mapInstance.current && data.encodedPolyline) {
          if (routePolyline.current) {
            routePolyline.current.setMap(null);
            routePolyline.current = null;
          }

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

        // Notify parent
        onChange({
          pickup,
          dropoff,
          distanceMiles: miles,
          durationMinutes: minutes,
        });
      } catch (e: any) {
        setError(e?.message ?? "Failed to compute route");
      } finally {
        setLoadingRoute(false);
      }
    },
    [onChange],
  );

  // Update markers on map
  const updateMarkers = useCallback(
    (pickup: RoutePickerPlace, dropoff: RoutePickerPlace) => {
      const google = window.google;
      if (!google?.maps || !mapInstance.current) return;

      const map = mapInstance.current;

      if (pickup.location) {
        if (!pickupMarker.current) {
          pickupMarker.current = new google.maps.Marker({ map });
        }
        pickupMarker.current.setPosition(pickup.location);
        pickupMarker.current.setLabel("A");
      } else if (pickupMarker.current) {
        pickupMarker.current.setMap(null);
        pickupMarker.current = null;
      }

      if (dropoff.location) {
        if (!dropoffMarker.current) {
          dropoffMarker.current = new google.maps.Marker({ map });
        }
        dropoffMarker.current.setPosition(dropoff.location);
        dropoffMarker.current.setLabel("B");
      } else if (dropoffMarker.current) {
        dropoffMarker.current.setMap(null);
        dropoffMarker.current = null;
      }

      // Fit bounds if both exist
      if (pickup.location && dropoff.location && !routePolyline.current) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(pickup.location);
        bounds.extend(dropoff.location);
        map.fitBounds(bounds, 70);
      } else if (pickup.location && !dropoff.location) {
        map.setCenter(pickup.location);
        map.setZoom(14);
      } else if (dropoff.location && !pickup.location) {
        map.setCenter(dropoff.location);
        map.setZoom(14);
      }
    },
    [],
  );

  // Initialize Google Maps
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

        // Initialize map
        if (!mapInstance.current && mapRef.current) {
          const center = internalPickup.location ||
            internalDropoff.location || { lat: 33.4484, lng: -112.074 }; // Phoenix default

          mapInstance.current = new google.maps.Map(mapRef.current, {
            center,
            zoom: internalPickup.location || internalDropoff.location ? 12 : 10,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
        }

        setMapsLoaded(true);

        // Set up markers for initial data
        updateMarkers(internalPickup, internalDropoff);

        // If we have both locations, compute initial route
        if (internalPickup.location && internalDropoff.location) {
          computeRoute(internalPickup, internalDropoff);
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to initialize Google Maps");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserKey]);

  // Set up autocomplete after maps loaded
  useEffect(() => {
    if (!mapsLoaded || disabled) return;

    const google = window.google;
    if (!google?.maps?.places) return;

    // Pickup autocomplete
    if (pickupInputRef.current && !pickupAC.current) {
      pickupAC.current = new google.maps.places.Autocomplete(
        pickupInputRef.current,
        {
          fields: ["place_id", "formatted_address", "geometry"],
          componentRestrictions: { country: "us" },
        },
      );

      pickupAC.current.addListener("place_changed", () => {
        const place = pickupAC.current.getPlace();
        const loc = place?.geometry?.location;

        if (!place?.formatted_address) return;

        const newPickup: RoutePickerPlace = {
          address: String(place.formatted_address),
          placeId: place.place_id ? String(place.place_id) : null,
          location: loc ? { lat: loc.lat(), lng: loc.lng() } : null,
        };

        setInternalPickup(newPickup);
        updateMarkers(newPickup, internalDropoff);

        if (newPickup.location && internalDropoff.location) {
          computeRoute(newPickup, internalDropoff);
        } else {
          onChange({
            pickup: newPickup,
            dropoff: internalDropoff,
            distanceMiles: null,
            durationMinutes: null,
          });
        }
      });
    }

    // Dropoff autocomplete
    if (dropoffInputRef.current && !dropoffAC.current) {
      dropoffAC.current = new google.maps.places.Autocomplete(
        dropoffInputRef.current,
        {
          fields: ["place_id", "formatted_address", "geometry"],
          componentRestrictions: { country: "us" },
        },
      );

      dropoffAC.current.addListener("place_changed", () => {
        const place = dropoffAC.current.getPlace();
        const loc = place?.geometry?.location;

        if (!place?.formatted_address) return;

        const newDropoff: RoutePickerPlace = {
          address: String(place.formatted_address),
          placeId: place.place_id ? String(place.place_id) : null,
          location: loc ? { lat: loc.lat(), lng: loc.lng() } : null,
        };

        setInternalDropoff(newDropoff);
        updateMarkers(internalPickup, newDropoff);

        if (internalPickup.location && newDropoff.location) {
          computeRoute(internalPickup, newDropoff);
        } else {
          onChange({
            pickup: internalPickup,
            dropoff: newDropoff,
            distanceMiles: null,
            durationMinutes: null,
          });
        }
      });
    }
  }, [
    mapsLoaded,
    disabled,
    internalPickup,
    internalDropoff,
    updateMarkers,
    computeRoute,
    onChange,
  ]);

  // Handle manual text input changes (for when user types without selecting autocomplete)
  const handlePickupBlur = () => {
    const val = pickupInputRef.current?.value?.trim() ?? "";
    if (val && val !== internalPickup.address) {
      // User typed something but didn't select from autocomplete
      // Keep the text but clear location data
      const newPickup: RoutePickerPlace = {
        address: val,
        placeId: null,
        location: null,
      };
      setInternalPickup(newPickup);
      setInternalDistance(null);
      setInternalDuration(null);

      // Clear polyline
      if (routePolyline.current) {
        routePolyline.current.setMap(null);
        routePolyline.current = null;
      }

      onChange({
        pickup: newPickup,
        dropoff: internalDropoff,
        distanceMiles: null,
        durationMinutes: null,
      });
    }
  };

  const handleDropoffBlur = () => {
    const val = dropoffInputRef.current?.value?.trim() ?? "";
    if (val && val !== internalDropoff.address) {
      const newDropoff: RoutePickerPlace = {
        address: val,
        placeId: null,
        location: null,
      };
      setInternalDropoff(newDropoff);
      setInternalDistance(null);
      setInternalDuration(null);

      if (routePolyline.current) {
        routePolyline.current.setMap(null);
        routePolyline.current = null;
      }

      onChange({
        pickup: internalPickup,
        dropoff: newDropoff,
        distanceMiles: null,
        durationMinutes: null,
      });
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Address inputs */}
      <div style={{ display: "grid", gap: 12 }}>
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontWeight: 600,
            fontSize: "0.95rem",
          }}
        >
          <span className='emptyTitle'>Pickup Address</span>
          <input
            ref={pickupInputRef}
            type='text'
            defaultValue={pickupAddress}
            placeholder='Enter pickup address'
            className='inputBorder'
            autoComplete='off'
            disabled={disabled}
            onBlur={handlePickupBlur}
            style={{ width: "100%" }}
          />
        </label>

        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontWeight: 600,
            fontSize: "0.95rem",
          }}
        >
          <span className='emptyTitle'>Dropoff Address</span>
          <input
            ref={dropoffInputRef}
            type='text'
            defaultValue={dropoffAddress}
            placeholder='Enter dropoff address'
            className='inputBorder'
            autoComplete='off'
            disabled={disabled}
            onBlur={handleDropoffBlur}
            style={{ width: "100%" }}
          />
        </label>
      </div>

      {/* Status messages */}
      {loadingRoute && (
        <div style={{ opacity: 0.7, fontSize: "0.9rem" }}>
          Calculating route…
        </div>
      )}
      {error && (
        <div style={{ color: "crimson", fontSize: "0.9rem" }}>{error}</div>
      )}

      {/* Route info */}
      <div
        style={{
          display: "flex",
          gap: 24,
          padding: "12px 0",
          borderTop: "1px solid rgba(0,0,0,0.1)",
          borderBottom: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <div>
          <div className='emptyTitleSmall'>Distance</div>
          <div className='subheading' style={{ fontWeight: 600 }}>
            {internalDistance != null ? `${internalDistance} mi` : "—"}
          </div>
        </div>
        <div>
          <div className='emptyTitleSmall'>Duration</div>
          <div className='subheading' style={{ fontWeight: 600 }}>
            {internalDuration != null ? `${internalDuration} min` : "—"}
          </div>
        </div>
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: 350,
          borderRadius: 12,
          border: "2px solid #e0e0e0",
          overflow: "hidden",
          background: "#f5f5f5",
        }}
      />

      {!internalPickup.location && internalPickup.address && (
        <div
          style={{
            fontSize: "0.85rem",
            color: "#b45309",
            background: "#fef3c7",
            padding: "8px 12px",
            borderRadius: 6,
          }}
        >
          ⚠️ Pickup address needs to be selected from the dropdown to calculate
          the route. Please re-enter and select from suggestions.
        </div>
      )}

      {!internalDropoff.location && internalDropoff.address && (
        <div
          style={{
            fontSize: "0.85rem",
            color: "#b45309",
            background: "#fef3c7",
            padding: "8px 12px",
            borderRadius: 6,
          }}
        >
          ⚠️ Dropoff address needs to be selected from the dropdown to calculate
          the route. Please re-enter and select from suggestions.
        </div>
      )}
    </div>
  );
}
