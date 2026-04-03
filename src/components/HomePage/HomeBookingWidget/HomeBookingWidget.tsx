/* eslint-disable react-hooks/incompatible-library */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import styles from "./HomeBookingWidget.module.css";
import Button from "@/components/shared/Button/Button";

// ─── Types ────────────────────────────────────────────────────────────────────

type AirportLeg = "NONE" | "PICKUP" | "DROPOFF";

export type WidgetAirportDTO = {
  id: string;
  name: string;
  iata: string;
};

export type WidgetServiceTypeDTO = {
  id: string;
  name: string;
  pricingStrategy: "POINT_TO_POINT" | "HOURLY" | "FLAT";
  minFareCents: number;
  baseFeeCents: number;
  perMileCents: number;
  perMinuteCents: number;
  perHourCents: number;
  minHours: number;
  active: boolean;
  airportLeg: AirportLeg;
  airports: WidgetAirportDTO[];
  fees: { id: string; label: string; amountCents: number }[];
};

export type WidgetVehicleDTO = {
  id: string;
  name: string;
  capacity: number;
  minHours: number;
  baseFareCents: number;
  perMileCents: number;
  perMinuteCents: number;
  perHourCents: number;
  active: boolean;
  callForPricing: boolean;
};

type PlaceResult = {
  address: string;
  placeId: string | null;
  lat: number | null;
  lng: number | null;
};

type WidgetFormValues = {
  serviceTypeId: string;
  pickupMonth: string;
  pickupDay: string;
  pickupYear: string;
  pickupHour: string;
  pickupMinute: string;
  passengers: number;
  luggage: number;
};

export const BOOKING_PREFILL_KEY = "booking_prefill";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNumber(v: any): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildDateString(month: string, day: string, year: string): string {
  if (!month || !day || !year) return "";
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function buildTimeString(hour: string, minute: string): string {
  if (!hour || !minute) return "";
  return `${hour.padStart(2, "0")}:${minute}`;
}

// ─── Date option lists with past-date filtering ───────────────────────────────

const ALL_MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function getDaysInMonth(month: string, year: string): number {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10) || new Date().getFullYear();
  if (!m) return 31;
  return new Date(y, m, 0).getDate();
}

function getYearOptions() {
  const current = new Date().getFullYear();
  return [current, current + 1, current + 2].map((y) => ({
    value: String(y),
    label: String(y),
  }));
}

function getAvailableMonths(year: string) {
  const today = new Date();
  const thisYear = today.getFullYear();
  const thisMonth = today.getMonth() + 1;
  const y = parseInt(year, 10);
  if (!y || y > thisYear) return ALL_MONTHS;
  if (y === thisYear)
    return ALL_MONTHS.filter((m) => parseInt(m.value, 10) >= thisMonth);
  return [];
}

function getAvailableDays(month: string, year: string) {
  const today = new Date();
  const thisYear = today.getFullYear();
  const thisMonth = today.getMonth() + 1;
  const thisDay = today.getDate();
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const total = getDaysInMonth(month, year);
  const all = Array.from({ length: total }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));
  if (y === thisYear && m === thisMonth)
    return all.filter((d) => parseInt(d.value, 10) >= thisDay);
  return all;
}

const ALL_HOURS = [
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i).padStart(2, "0"),
    label: `${i === 0 ? 12 : i} AM`,
  })),
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 12).padStart(2, "0"),
    label: `${i === 0 ? 12 : i} PM`,
  })),
];

const MINUTES = ["00", "15", "30", "45"].map((m) => ({
  value: m,
  label: `:${m}`,
}));

// ─── Google Places autocomplete hook ─────────────────────────────────────────

function usePlacesAutocomplete(
  inputRef: React.RefObject<HTMLInputElement | null>,
  onPlace: (result: PlaceResult) => void,
  mapsReady: boolean,
) {
  useEffect(() => {
    const el = inputRef.current;
    if (!el || !mapsReady || !(window as any).google?.maps?.places) return;
    if ((el as any).__widgetAC) return;

    const ac = new (window as any).google.maps.places.Autocomplete(el, {
      fields: ["place_id", "formatted_address", "geometry"],
      componentRestrictions: { country: "us" },
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const loc = place?.geometry?.location;
      if (!place?.place_id || !place?.formatted_address) return;
      onPlace({
        address: String(place.formatted_address),
        placeId: String(place.place_id),
        lat: loc ? toNumber(loc.lat()) : null,
        lng: loc ? toNumber(loc.lng()) : null,
      });
    });
    (el as any).__widgetAC = ac;
    return () => {
      delete (el as any).__widgetAC;
    };
  }, [mapsReady, inputRef, onPlace]);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomeBookingWidget({
  serviceTypes,
  companyTimezoneLabel,
}: {
  serviceTypes: WidgetServiceTypeDTO[];
  vehicles: WidgetVehicleDTO[];
  companyTimezone: string;
  companyTimezoneLabel: string;
}) {
  const router = useRouter();

  const [mapsReady, setMapsReady] = useState(false);
  useEffect(() => {
    if ((window as any).google?.maps?.places) {
      setMapsReady(true);
      return;
    }
    const id = setInterval(() => {
      if ((window as any).google?.maps?.places) {
        setMapsReady(true);
        clearInterval(id);
      }
    }, 200);
    return () => clearInterval(id);
  }, []);

  const [pickupPlace, setPickupPlace] = useState<PlaceResult | null>(null);
  const [dropoffPlace, setDropoffPlace] = useState<PlaceResult | null>(null);
  const pickupInputRef = useRef<HTMLInputElement | null>(null);
  const dropoffInputRef = useRef<HTMLInputElement | null>(null);
  const handlePickupPlace = useMemo(
    () => (r: PlaceResult) => setPickupPlace(r),
    [],
  );
  const handleDropoffPlace = useMemo(
    () => (r: PlaceResult) => setDropoffPlace(r),
    [],
  );
  usePlacesAutocomplete(pickupInputRef, handlePickupPlace, mapsReady);
  usePlacesAutocomplete(dropoffInputRef, handleDropoffPlace, mapsReady);

  // Airport selection — lives inline with the service field
  const [selectedPickupAirportId, setSelectedPickupAirportId] = useState("");
  const [selectedDropoffAirportId, setSelectedDropoffAirportId] = useState("");

  // Flight info
  const [flightNumber, setFlightNumber] = useState("");
  const [flightDateYear, setFlightDateYear] = useState("");
  const [flightDateMonth, setFlightDateMonth] = useState("");
  const [flightDateDay, setFlightDateDay] = useState("");
  const [hoursRequested, setHoursRequested] = useState<number>(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const services = useMemo(
    () => (serviceTypes ?? []).filter((s) => s.active),
    [serviceTypes],
  );

  const {
    register,
    watch,
    setValue,
    getValues,
    clearErrors,
    trigger,
    formState: { errors },
  } = useForm<WidgetFormValues>({
    mode: "onTouched",
    defaultValues: {
      serviceTypeId: "",
      pickupMonth: "",
      pickupDay: "",
      pickupYear: "",
      pickupHour: "",
      pickupMinute: "",
      passengers: 0,
      luggage: 0,
    },
  });

  const serviceTypeId = watch("serviceTypeId");
  const pickupMonth = watch("pickupMonth");
  const pickupDay = watch("pickupDay");
  const pickupYear = watch("pickupYear");
  const pickupHour = watch("pickupHour");
  const pickupMinute = watch("pickupMinute");
  const passengers = watch("passengers");
  const luggage = watch("luggage");

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceTypeId) ?? null,
    [services, serviceTypeId],
  );
  const serviceAirports = selectedService?.airports ?? [];
  const usesPickupAirport = selectedService?.airportLeg === "PICKUP";
  const usesDropoffAirport = selectedService?.airportLeg === "DROPOFF";
  const isAirportService = usesPickupAirport || usesDropoffAirport;

  // Reset on service change
  useEffect(() => {
    setSelectedPickupAirportId("");
    setSelectedDropoffAirportId("");
    setPickupPlace(null);
    setDropoffPlace(null);
    setFlightNumber("");
    setFlightDateYear("");
    setFlightDateMonth("");
    setFlightDateDay("");
  }, [serviceTypeId]);

  // Pickup date options
  const availableMonths = useMemo(
    () => getAvailableMonths(pickupYear),
    [pickupYear],
  );
  const availableDays = useMemo(
    () => getAvailableDays(pickupMonth, pickupYear),
    [pickupMonth, pickupYear],
  );

  useEffect(() => {
    if (pickupMonth && !availableMonths.find((m) => m.value === pickupMonth)) {
      setValue("pickupMonth", "");
      setValue("pickupDay", "");
    }
  }, [availableMonths, pickupMonth, setValue]);

  useEffect(() => {
    if (pickupDay && !availableDays.find((d) => d.value === pickupDay)) {
      setValue("pickupDay", "");
    }
  }, [availableDays, pickupDay, setValue]);

  // Flight date options
  const flightAvailableMonths = useMemo(
    () => getAvailableMonths(flightDateYear),
    [flightDateYear],
  );
  const flightAvailableDays = useMemo(
    () => getAvailableDays(flightDateMonth, flightDateYear),
    [flightDateMonth, flightDateYear],
  );

  useEffect(() => {
    if (
      flightDateMonth &&
      !flightAvailableMonths.find((m) => m.value === flightDateMonth)
    ) {
      setFlightDateMonth("");
      setFlightDateDay("");
    }
  }, [flightAvailableMonths, flightDateMonth]);

  useEffect(() => {
    if (
      flightDateDay &&
      !flightAvailableDays.find((d) => d.value === flightDateDay)
    ) {
      setFlightDateDay("");
    }
  }, [flightAvailableDays, flightDateDay]);

  useEffect(() => {
    register("serviceTypeId", { required: "Please select a service." });
    register("pickupMonth", { required: "Please select a month." });
    register("pickupDay", { required: "Please select a day." });
    register("pickupYear", { required: "Please select a year." });
    register("pickupHour", { required: "Please select an hour." });
    register("pickupMinute", { required: "Please select minutes." });
    register("passengers", {
      valueAsNumber: true,
      required: "Please select the number of passengers.",
      min: { value: 1, message: "Passengers must be at least 1." },
    });
    register("luggage", {
      valueAsNumber: true,
      required: "Please select luggage count.",
      min: { value: 0, message: "Luggage cannot be negative." },
    });
  }, [register]);

  function labelCx(hasError: boolean) {
    return `cardTitle h6${hasError ? " redBorder" : ""}`;
  }

  async function handleSubmit() {
    const fields: (keyof WidgetFormValues)[] = [
      "serviceTypeId",
      "pickupMonth",
      "pickupDay",
      "pickupYear",
      "pickupHour",
      "pickupMinute",
      "passengers",
      "luggage",
    ];
    const ok = await trigger(fields, { shouldFocus: false });
    if (!ok) {
      for (const k of fields) {
        const err = (errors as any)?.[k];
        if (err?.message) {
          toast.error(String(err.message));
          return;
        }
      }
      toast.error("Please complete all required fields.");
      return;
    }

    // ── Airport validation ──────────────────────────────────────────────
    setSubmitAttempted(true);
    if (usesPickupAirport && !selectedPickupAirportId) {
      toast.error("Please select a pickup airport.");
      return;
    }
    if (usesDropoffAirport && !selectedDropoffAirportId) {
      toast.error("Please select a dropoff airport.");
      return;
    }
    // ───────────────────────────────────────────────────────────────────

    if (usesPickupAirport && !selectedPickupAirportId) {
      toast.error("Please select a pickup airport.");
      return;
    }
    if (usesDropoffAirport && !selectedDropoffAirportId) {
      toast.error("Please select a dropoff airport.");
      return;
    }

    if (selectedService?.pricingStrategy === "HOURLY" && hoursRequested < 2) {
      toast.error("Please select the number of hours.");
      return;
    }

    const v = getValues();
    const pickupAtDate = buildDateString(
      v.pickupMonth,
      v.pickupDay,
      v.pickupYear,
    );
    const pickupAtTime = buildTimeString(v.pickupHour, v.pickupMinute);

    const resolvedPickup: PlaceResult | null = usesPickupAirport
      ? null
      : pickupPlace;
    const resolvedDropoff: PlaceResult | null = usesDropoffAirport
      ? null
      : dropoffPlace;
    const hasValidPickup =
      resolvedPickup?.lat != null && resolvedPickup?.lng != null;
    const hasValidDropoff =
      resolvedDropoff?.lat != null && resolvedDropoff?.lng != null;

    const route =
      hasValidPickup || hasValidDropoff
        ? {
            pickup: hasValidPickup
              ? {
                  address: resolvedPickup!.address,
                  placeId: resolvedPickup!.placeId,
                  location: {
                    lat: resolvedPickup!.lat!,
                    lng: resolvedPickup!.lng!,
                  },
                }
              : null,
            dropoff: hasValidDropoff
              ? {
                  address: resolvedDropoff!.address,
                  placeId: resolvedDropoff!.placeId,
                  location: {
                    lat: resolvedDropoff!.lat!,
                    lng: resolvedDropoff!.lng!,
                  },
                }
              : null,
            stops: [],
            miles: null,
            minutes: null,
            distanceMiles: null,
            durationMinutes: null,
          }
        : null;

    const flightScheduledAtDate = buildDateString(
      flightDateMonth,
      flightDateDay,
      flightDateYear,
    );

    try {
      sessionStorage.setItem(
        BOOKING_PREFILL_KEY,
        JSON.stringify({
          serviceTypeId: v.serviceTypeId,
          pickupAtDate,
          pickupAtTime,
          passengers: v.passengers,
          luggage: v.luggage,
          route,
          pickupAirportId: usesPickupAirport
            ? selectedPickupAirportId
            : undefined,
          dropoffAirportId: usesDropoffAirport
            ? selectedDropoffAirportId
            : undefined,
          flightNumber: flightNumber.trim() || undefined,
          flightScheduledAtDate: flightScheduledAtDate || undefined,
          hoursRequested:
            selectedService?.pricingStrategy === "HOURLY"
              ? hoursRequested
              : undefined, // ← add
          startStep: 1,
        }),
      );
    } catch {
      // sessionStorage unavailable — wizard starts fresh
    }

    router.push("/book");
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.card}>
      {/* ── Header: "Book your Ride" left, auth links right ── */}
      <div className={styles.cardHeader}>
        <span className={styles.headerTitle}>Book your Ride</span>
        <div className={styles.headerLinks}>
          <Link href='/login' className='backBtn' style={{ marginBottom: 0 }}>
            Log In
          </Link>
          <Link
            href='/register'
            className='backBtn'
            style={{ marginBottom: 0 }}
          >
            Create Account
          </Link>
        </div>
      </div>

      <div className={styles.cardBody}>
        {/* ── Service ── */}
        <div className={styles.field}>
          <label
            className={labelCx(
              Boolean(errors.serviceTypeId) ||
                (submitAttempted &&
                  usesPickupAirport &&
                  !selectedPickupAirportId) ||
                (submitAttempted &&
                  usesDropoffAirport &&
                  !selectedDropoffAirportId),
            )}
          >
            Service
            {usesPickupAirport && (
              <span className={styles.airportLabel}> / Pickup Airport</span>
            )}
            {usesDropoffAirport && (
              <span className={styles.airportLabel}> / Dropoff Airport</span>
            )}
          </label>

          {isAirportService ? (
            <div className={styles.twoCol}>
              {/* Service select */}
              <select
                value={serviceTypeId}
                onChange={(e) => {
                  setValue("serviceTypeId", e.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  clearErrors("serviceTypeId");
                }}
                className='selectBorder emptySmall'
              >
                <option value=''>Select a service...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Airport select — inline, same row */}
              {usesPickupAirport && (
                <select
                  value={selectedPickupAirportId}
                  onChange={(e) => setSelectedPickupAirportId(e.target.value)}
                  className='selectBorder emptySmall'
                >
                  <option value=''>Select an airport...</option>
                  {serviceAirports.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.iata})
                    </option>
                  ))}
                </select>
              )}
              {usesDropoffAirport && (
                <select
                  value={selectedDropoffAirportId}
                  onChange={(e) => setSelectedDropoffAirportId(e.target.value)}
                  className={`selectBorder emptySmall${!selectedDropoffAirportId ? " redBorder" : ""}`}
                >
                  <option value=''>Select an airport...</option>
                  {serviceAirports.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.iata})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <select
              value={serviceTypeId}
              onChange={(e) => {
                setValue("serviceTypeId", e.target.value, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                clearErrors("serviceTypeId");
              }}
              className='selectBorder emptySmall'
            >
              <option value=''>Select a service...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ── Pickup date: Year / Month / Day ── */}
        <div className={styles.field}>
          <label
            className={labelCx(
              Boolean(errors.pickupMonth) ||
                Boolean(errors.pickupDay) ||
                Boolean(errors.pickupYear),
            )}
          >
            Pickup date
          </label>
          <div className={styles.threeCol}>
            <select
              value={pickupYear}
              onChange={(e) => {
                setValue("pickupYear", e.target.value, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                clearErrors("pickupYear");
              }}
              className='selectBorder emptySmall'
            >
              <option value=''>Year</option>
              {getYearOptions().map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
            <select
              value={pickupMonth}
              onChange={(e) => {
                setValue("pickupMonth", e.target.value, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setValue("pickupDay", "");
                clearErrors("pickupMonth");
              }}
              className='selectBorder emptySmall'
            >
              <option value=''>Month</option>
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={pickupDay}
              onChange={(e) => {
                setValue("pickupDay", e.target.value, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                clearErrors("pickupDay");
              }}
              className='selectBorder emptySmall'
            >
              <option value=''>Day</option>
              {availableDays.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Pickup time ── */}
        <div className={styles.field}>
          <label
            className={labelCx(
              Boolean(errors.pickupHour) || Boolean(errors.pickupMinute),
            )}
          >
            Pickup time{" "}
            <span className='miniNote'> - {companyTimezoneLabel}</span>
          </label>
          <div className={styles.twoCol}>
            <select
              value={pickupHour}
              onChange={(e) => {
                setValue("pickupHour", e.target.value, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                clearErrors("pickupHour");
              }}
              className='selectBorder emptySmall'
            >
              <option value=''>Hour</option>
              {ALL_HOURS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
            <select
              value={pickupMinute}
              onChange={(e) => {
                setValue("pickupMinute", e.target.value, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                clearErrors("pickupMinute");
              }}
              className='selectBorder emptySmall'
            >
              <option value=''>Min</option>
              {MINUTES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Passengers / Luggage ── */}
        <div className={styles.field}>
          <label
            className={labelCx(
              Boolean(errors.passengers) || Boolean(errors.luggage),
            )}
          >
            Passengers / Luggage
          </label>
          <div className={styles.twoCol}>
            <select
              value={passengers}
              onChange={(e) => {
                setValue("passengers", Number(e.target.value), {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                clearErrors("passengers");
              }}
              className='selectBorder emptySmall'
            >
              <option value={0}>Passengers...</option>
              {Array.from({ length: 56 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <select
              value={luggage}
              onChange={(e) => {
                setValue("luggage", Number(e.target.value), {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                clearErrors("luggage");
              }}
              className='selectBorder emptySmall'
            >
              <option value={0}>Luggage...</option>
              {Array.from({ length: 56 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Pickup address ── */}
        {!usesPickupAirport && (
          <div className={styles.field}>
            <label className='cardTitle h6'>Pickup</label>
            <input
              ref={pickupInputRef}
              placeholder='Enter pickup address'
              autoComplete='off'
              className='input emptySmall'
              onChange={() => setPickupPlace(null)}
            />
          </div>
        )}

        {/* ── Dropoff address ── */}
        {!usesDropoffAirport && (
          <div className={styles.field}>
            <label className='cardTitle h6'>Dropoff</label>
            <input
              ref={dropoffInputRef}
              placeholder='Enter dropoff address'
              autoComplete='off'
              className='input emptySmall'
              onChange={() => setDropoffPlace(null)}
            />
          </div>
        )}

        {/* ── Hours (hourly/charter services only) ── */}
        {selectedService?.pricingStrategy === "HOURLY" && (
          <div className={styles.field}>
            <label className={labelCx(submitAttempted && !hoursRequested)}>
              Hours needed (2 hour minimum)
            </label>
            <select
              value={hoursRequested}
              onChange={(e) => setHoursRequested(Number(e.target.value))}
              className='selectBorder emptySmall'
            >
              <option value={0}>Choose hours...</option>
              {Array.from({ length: 23 }, (_, i) => i + 2).map((n) => (
                <option key={n} value={n}>
                  {n} hours
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ── Flight info ── */}
        {isAirportService && (
          <div className={styles.flightSection}>
            <label className='cardTitle h6'>
              Flight Number / Date{" "}
              <span className={styles.optionalTag}>(optional)</span>
            </label>
            <div className={styles.field}>
              <input
                value={flightNumber}
                onChange={(e) =>
                  setFlightNumber(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 10),
                  )
                }
                placeholder='Flight Number — e.g. AA1234'
                autoComplete='off'
                className='input emptySmall'
              />
            </div>
            <div className={styles.field}>
              <div className={styles.threeCol}>
                <select
                  value={flightDateYear}
                  onChange={(e) => {
                    setFlightDateYear(e.target.value);
                    setFlightDateMonth("");
                    setFlightDateDay("");
                  }}
                  className='selectBorder emptySmall'
                >
                  <option value=''>Year</option>
                  {getYearOptions().map((y) => (
                    <option key={y.value} value={y.value}>
                      {y.label}
                    </option>
                  ))}
                </select>
                <select
                  value={flightDateMonth}
                  onChange={(e) => {
                    setFlightDateMonth(e.target.value);
                    setFlightDateDay("");
                  }}
                  className='selectBorder emptySmall'
                >
                  <option value=''>Month</option>
                  {flightAvailableMonths.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={flightDateDay}
                  onChange={(e) => setFlightDateDay(e.target.value)}
                  className='selectBorder emptySmall'
                >
                  <option value=''>Day</option>
                  {flightAvailableDays.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        <div className={styles.buttonWrap}>
          <Button
            type='button'
            text='Instant Quote →'
            btnType='redReg'
            onClick={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
