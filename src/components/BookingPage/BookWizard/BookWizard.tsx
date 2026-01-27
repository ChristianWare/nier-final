/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/incompatible-library */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./BookingWizard.module.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import RoutePicker, {
  RoutePickerPlace,
  RoutePickerValue,
} from "@/components/BookingPage/RoutePicker/RoutePicker";
import { createBookingRequest } from "../../../../actions/bookings/createBookingRequest";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Grid2 from "../Grid2/Grid2";
import Stepper from "../Stepper/Stepper";
import SummaryRow from "../SummaryRow/SummaryRow";
import BookingDateTimeWithBlackouts from "@/components/BookingPage/BookingDateTimeWithBlackouts/BookingDateTimeWithBlackouts";
import { useSession } from "next-auth/react";
import { Controller, useForm } from "react-hook-form";
import {
  calcQuoteCents,
  EXTRA_STOP_FEE_CENTS,
  STOP_WAIT_TIME_MINUTES,
} from "@/lib/pricing/calcQuote";
import { ServicePricingStrategy } from "@prisma/client";

type PricingStrategy = "POINT_TO_POINT" | "HOURLY" | "FLAT";
type AirportLeg = "NONE" | "PICKUP" | "DROPOFF";

type AirportDTO = {
  id: string;
  name: string;
  iata: string;
  address: string;
  placeId: string | null;
  lat: any | null;
  lng: any | null;
};

type ServiceTypeDTO = {
  id: string;
  name: string;
  slug: string;
  pricingStrategy: PricingStrategy;
  minFareCents: number;
  baseFeeCents: number;
  perMileCents: number;
  perMinuteCents: number;
  perHourCents: number;
  active: boolean;
  sortOrder: number;
  airportLeg: AirportLeg;
  airports: AirportDTO[];
};

type VehicleDTO = {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  luggageCapacity: number;
  imageUrl: string | null;
  minHours: number;
  baseFareCents: number;
  perMileCents: number;
  perMinuteCents: number;
  perHourCents: number;
  active: boolean;
  sortOrder: number;
};

type FormValues = {
  serviceTypeId: string;
  pickupAtDate: string;
  pickupAtTime: string;
  passengers: number;
  luggage: number;
  pickupAirportId: string;
  dropoffAirportId: string;
  hoursRequested: number;
  route: RoutePickerValue | null;
  vehicleId: string;
  specialRequests: string;
  flightAirline: string;
  flightNumber: string;
  flightScheduledAtDate: string;
  flightScheduledAtTime: string;
  flightTerminal: string;
  flightGate: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
};

function centsToUsd(cents: number) {
  return (cents / 100).toFixed(2);
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function toNumber(v: any): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normPlace(p: RoutePickerPlace | null | undefined) {
  if (!p) return null;
  return {
    address: String(p.address ?? ""),
    placeId: p.placeId ? String(p.placeId) : null,
    lat: toNumber(p.location?.lat ?? null),
    lng: toNumber(p.location?.lng ?? null),
  };
}

function routeEquals(a: RoutePickerValue | null, b: RoutePickerValue | null) {
  if (a === b) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;
  const ap = normPlace(a.pickup);
  const ad = normPlace(a.dropoff);
  const bp = normPlace(b.pickup);
  const bd = normPlace(b.dropoff);
  const milesA = toNumber(a.miles ?? a.distanceMiles ?? null);
  const minsA = toNumber(a.minutes ?? a.durationMinutes ?? null);
  const milesB = toNumber(b.miles ?? b.distanceMiles ?? null);
  const minsB = toNumber(b.minutes ?? b.durationMinutes ?? null);
  return (
    JSON.stringify(ap) === JSON.stringify(bp) &&
    JSON.stringify(ad) === JSON.stringify(bd) &&
    milesA === milesB &&
    minsA === minsB
  );
}

function toStrategy(s: PricingStrategy): ServicePricingStrategy {
  if (s === "POINT_TO_POINT") return ServicePricingStrategy.POINT_TO_POINT;
  if (s === "HOURLY") return ServicePricingStrategy.HOURLY;
  return ServicePricingStrategy.FLAT;
}

function routeMiles(v: RoutePickerValue | null): number {
  return Math.max(0, toNumber(v?.miles ?? v?.distanceMiles ?? null) ?? 0);
}

function routeMinutes(v: RoutePickerValue | null): number {
  return Math.max(0, toNumber(v?.minutes ?? v?.durationMinutes ?? null) ?? 0);
}

export default function BookingWizard({
  serviceTypes,
  vehicles,
}: {
  serviceTypes: ServiceTypeDTO[];
  vehicles: VehicleDTO[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthed = Boolean(session?.user);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showFlightInfo, setShowFlightInfo] = useState(false);

  const services = useMemo<ServiceTypeDTO[]>(
    () => serviceTypes ?? [],
    [serviceTypes],
  );
  const vehicleOptions = useMemo<VehicleDTO[]>(
    () => vehicles ?? [],
    [vehicles],
  );
  const hasNoServices = services.length === 0;

  const pickupInputRef = useRef<HTMLInputElement | null>(null);
  const dropoffInputRef = useRef<HTMLInputElement | null>(null);

  const {
    control,
    register,
    watch,
    setValue,
    getValues,
    getFieldState,
    clearErrors,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    mode: "onTouched",
    defaultValues: {
      serviceTypeId: "",
      pickupAtDate: "",
      pickupAtTime: "",
      passengers: 1,
      luggage: 0,
      pickupAirportId: "",
      dropoffAirportId: "",
      hoursRequested: 2,
      route: null,
      vehicleId: "",
      specialRequests: "",
      flightAirline: "",
      flightNumber: "",
      flightScheduledAtDate: "",
      flightScheduledAtTime: "",
      flightTerminal: "",
      flightGate: "",
      guestName: "",
      guestEmail: "",
      guestPhone: "",
    },
  });

  const serviceTypeId = watch("serviceTypeId");
  const pickupAtDate = watch("pickupAtDate");
  const pickupAtTime = watch("pickupAtTime");
  const passengers = watch("passengers");
  const luggage = watch("luggage");
  const hoursRequested = watch("hoursRequested");
  const route = watch("route");
  const vehicleId = watch("vehicleId");
  const guestName = watch("guestName");
  const guestEmail = watch("guestEmail");
  const guestPhone = watch("guestPhone");
  const pickupAirportId = watch("pickupAirportId");
  const dropoffAirportId = watch("dropoffAirportId");
  const flightAirline = watch("flightAirline");
  const flightNumber = watch("flightNumber");
  const flightScheduledAtDate = watch("flightScheduledAtDate");
  const flightScheduledAtTime = watch("flightScheduledAtTime");
  const flightTerminal = watch("flightTerminal");
  const flightGate = watch("flightGate");

  const selectedService = useMemo(() => {
    if (!serviceTypeId) return null;
    return services.find((s) => s.id === serviceTypeId) ?? null;
  }, [services, serviceTypeId]);

  const selectedVehicle = useMemo(
    () => vehicleOptions.find((v) => v.id === vehicleId) ?? null,
    [vehicleOptions, vehicleId],
  );

  const serviceAirports = selectedService?.airports ?? [];
  const usesPickupAirport = selectedService?.airportLeg === "PICKUP";
  const usesDropoffAirport = selectedService?.airportLeg === "DROPOFF";
  const isAirportService = usesPickupAirport || usesDropoffAirport;

  useEffect(() => {
    if (isAirportService) {
      setShowFlightInfo(true);
    }
  }, [isAirportService]);

  useEffect(() => {
    register("serviceTypeId", { required: "Please select a service." });
    register("pickupAtDate", { required: "Please choose a pickup date." });
    register("pickupAtTime", { required: "Please choose a pickup time." });
    register("passengers", {
      valueAsNumber: true,
      required: "Passengers is required.",
      min: { value: 1, message: "Passengers must be at least 1." },
    });
    register("luggage", {
      valueAsNumber: true,
      required: "Luggage is required.",
      min: { value: 0, message: "Luggage cannot be negative." },
    });
    register("pickupAirportId", {
      validate: (v) =>
        usesPickupAirport
          ? v
            ? true
            : "Please choose a pickup airport."
          : true,
    });
    register("dropoffAirportId", {
      validate: (v) =>
        usesDropoffAirport
          ? v
            ? true
            : "Please choose a dropoff airport."
          : true,
    });
    register("hoursRequested", {
      valueAsNumber: true,
      validate: (v) => {
        if (selectedService?.pricingStrategy !== "HOURLY") return true;
        if (!Number.isFinite(v)) return "Please enter hours.";
        if (v < 1) return "Hours must be at least 1.";
        return true;
      },
    });
    register("vehicleId", { required: "Please choose a vehicle category." });
    register("guestName", {
      validate: (v) =>
        isAuthed ? true : v.trim() ? true : "Please enter your name.",
    });
    register("guestEmail", {
      validate: (v) => {
        if (isAuthed) return true;
        const e = v.trim().toLowerCase();
        if (!e) return "Please enter your email address.";
        if (!isValidEmail(e)) return "Please enter a valid email address.";
        return true;
      },
    });
    register("guestPhone", {
      validate: (v) =>
        isAuthed ? true : v.trim() ? true : "Please enter your phone number.",
    });
    register("flightAirline");
    register("flightNumber");
    register("flightScheduledAtDate");
    register("flightScheduledAtTime");
    register("flightTerminal");
    register("flightGate");
  }, [
    register,
    usesPickupAirport,
    usesDropoffAirport,
    selectedService?.pricingStrategy,
    isAuthed,
  ]);

  const pickupLabelRed =
    Boolean(errors.route) && !route?.pickup && !usesPickupAirport;
  const dropoffLabelRed =
    Boolean(errors.route) && !route?.dropoff && !usesDropoffAirport;
  const minHours =
    selectedService?.pricingStrategy === "HOURLY"
      ? (selectedVehicle?.minHours ?? 0)
      : 0;
  const billableHours =
    selectedService?.pricingStrategy === "HOURLY"
      ? Math.max(Math.ceil(hoursRequested || 0), Math.ceil(minHours || 0))
      : null;
  const distanceMiles = routeMiles(route);
  const durationMinutes = routeMinutes(route);

  const estimateCents = useMemo(() => {
    if (!selectedService) return 0;

    // ✅ Get stop count from route
    const stopCount = route?.stops?.length ?? 0;

    const quote = calcQuoteCents({
      pricingStrategy: toStrategy(selectedService.pricingStrategy),
      distanceMiles:
        selectedService.pricingStrategy === "POINT_TO_POINT"
          ? distanceMiles
          : null,
      durationMinutes:
        selectedService.pricingStrategy === "POINT_TO_POINT"
          ? durationMinutes
          : null,
      hoursRequested:
        selectedService.pricingStrategy === "HOURLY" ? hoursRequested : null,
      stopCount,
      vehicleMinHours: selectedVehicle?.minHours ?? 0,
      serviceMinFareCents: selectedService.minFareCents,
      serviceBaseFeeCents: selectedService.baseFeeCents,
      servicePerMileCents: selectedService.perMileCents,
      servicePerMinuteCents: selectedService.perMinuteCents,
      servicePerHourCents: selectedService.perHourCents,
      vehicleBaseFareCents: selectedVehicle?.baseFareCents ?? 0,
      vehiclePerMileCents: selectedVehicle?.perMileCents ?? 0,
      vehiclePerMinuteCents: selectedVehicle?.perMinuteCents ?? 0,
      vehiclePerHourCents: selectedVehicle?.perHourCents ?? 0,
    });
    return quote.totalCents;
  }, [
    selectedService,
    selectedVehicle,
    distanceMiles,
    durationMinutes,
    hoursRequested,
    route?.stops?.length,
  ]);

  const wizardTopRef = useRef<HTMLDivElement | null>(null);
  const didMountRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    wizardTopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [step]);

  function labelCx(hasError: boolean) {
    return `cardTitle h5${hasError ? " redBorder" : ""}`;
  }

  function firstErrorMessage(): string {
    const order: (keyof FormValues)[] = [
      "serviceTypeId",
      "pickupAtDate",
      "pickupAtTime",
      "pickupAirportId",
      "dropoffAirportId",
      "route",
      "passengers",
      "luggage",
      "hoursRequested",
      "vehicleId",
      "guestName",
      "guestEmail",
      "guestPhone",
    ];
    for (const k of order) {
      const err = (errors as any)?.[k];
      if (err?.message) return String(err.message);
    }
    return "Please fix the highlighted fields.";
  }

  function firstErrorMessageFrom(fields: (keyof FormValues)[]) {
    for (const k of fields) {
      const st = getFieldState(k as any);
      if (st.error?.message) return String(st.error.message);
    }
    return "Please complete the highlighted fields.";
  }

  function applyAirportToRoute(side: "pickup" | "dropoff", airportId: string) {
    const a = serviceAirports.find((x) => x.id === airportId) ?? null;
    if (!a) {
      const prev = getValues("route");
      const prevPickup = prev?.pickup ?? null;
      const prevDropoff = prev?.dropoff ?? null;
      const next: RoutePickerValue = {
        pickup: side === "pickup" ? null : prevPickup,
        dropoff: side === "dropoff" ? null : prevDropoff,
        stops: [],
        miles: null,
        minutes: null,
        distanceMiles: null,
        durationMinutes: null,
      };
      setValue("route", next.pickup || next.dropoff ? next : null, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }
    const lat = toNumber(a.lat);
    const lng = toNumber(a.lng);
    if (lat == null || lng == null) {
      toast.error(
        "That airport is missing coordinates. Edit the airport and choose an address suggestion so we can save its location.",
      );
      return;
    }
    const place: RoutePickerPlace = {
      address: a.address,
      placeId: a.placeId ?? a.id,
      location: { lat, lng },
    };
    const prev = getValues("route");
    const prevPickup = prev?.pickup ?? null;
    const prevDropoff = prev?.dropoff ?? null;
    const next: RoutePickerValue = {
      pickup: side === "pickup" ? place : prevPickup,
      dropoff: side === "dropoff" ? place : prevDropoff,
      stops: [],
      miles: null,
      minutes: null,
      distanceMiles: null,
      durationMinutes: null,
    };
    setValue("route", next, { shouldDirty: true, shouldValidate: true });
  }

  async function goStep2() {
    if (
      selectedService &&
      selectedService.airportLeg !== "NONE" &&
      serviceAirports.length === 0
    ) {
      toast.error(
        "This airport service isn't configured yet (no airports assigned).",
      );
      return;
    }
    const fields: (keyof FormValues)[] = [
      "serviceTypeId",
      "pickupAtDate",
      "pickupAtTime",
      "passengers",
      "luggage",
      "route",
    ];
    if (usesPickupAirport) fields.push("pickupAirportId");
    if (usesDropoffAirport) fields.push("dropoffAirportId");
    if (selectedService?.pricingStrategy === "HOURLY")
      fields.push("hoursRequested");
    const ok = await trigger(fields, { shouldFocus: false });
    if (!ok) {
      toast.error(firstErrorMessageFrom(fields));
      return;
    }
    setStep(2);
  }

  async function goStep3() {
    const ok = await trigger(["vehicleId"], { shouldFocus: false });
    if (!ok) {
      toast.error(firstErrorMessage());
      return;
    }
    setStep(3);
  }

  async function handleSubmit() {
    if (submitting || submitted) return;
    if (
      selectedService &&
      selectedService.airportLeg !== "NONE" &&
      serviceAirports.length === 0
    ) {
      toast.error("This airport service isn't configured yet.");
      return;
    }
    const fields: (keyof FormValues)[] = [
      "serviceTypeId",
      "pickupAtDate",
      "pickupAtTime",
      "passengers",
      "luggage",
      "route",
      "vehicleId",
    ];
    if (usesPickupAirport) fields.push("pickupAirportId");
    if (usesDropoffAirport) fields.push("dropoffAirportId");
    if (selectedService?.pricingStrategy === "HOURLY")
      fields.push("hoursRequested");
    if (!isAuthed) fields.push("guestName", "guestEmail", "guestPhone");
    const ok = await trigger(fields, { shouldFocus: false });
    if (!ok) {
      toast.error(firstErrorMessage());
      return;
    }
    const v = getValues();
    if (!selectedService) {
      toast.error("Please select a service.");
      return;
    }
    if (!v.route?.pickup || !v.route?.dropoff) {
      toast.error("Please select pickup and dropoff.");
      return;
    }
    if (selectedService.pricingStrategy === "POINT_TO_POINT") {
      const miles = routeMiles(v.route);
      if (!miles || miles <= 0) {
        toast.error(
          "Route estimate missing (miles). Please re-check pickup/dropoff.",
        );
        return;
      }
    }
    const pickupAtIso = new Date(
      `${v.pickupAtDate}T${v.pickupAtTime}:00`,
    ).toISOString();
    let flightScheduledAtIso: string | null = null;
    if (v.flightScheduledAtDate && v.flightScheduledAtTime) {
      flightScheduledAtIso = new Date(
        `${v.flightScheduledAtDate}T${v.flightScheduledAtTime}:00`,
      ).toISOString();
    } else if (v.flightScheduledAtDate) {
      flightScheduledAtIso = new Date(
        `${v.flightScheduledAtDate}T00:00:00`,
      ).toISOString();
    }
    setSubmitting(true);
    try {
      const pickup = v.route.pickup;
      const dropoff = v.route.dropoff;
      const res = await createBookingRequest({
        serviceTypeId: selectedService.id,
        vehicleId: v.vehicleId,
        pickupAt: pickupAtIso,
        passengers: v.passengers,
        luggage: v.luggage,
        pickupAddress: pickup.address,
        pickupPlaceId: pickup.placeId ?? null,
        pickupLat: pickup.location?.lat ?? null,
        pickupLng: pickup.location?.lng ?? null,
        dropoffAddress: dropoff.address,
        dropoffPlaceId: dropoff.placeId ?? null,
        dropoffLat: dropoff.location?.lat ?? null,
        dropoffLng: dropoff.location?.lng ?? null,
        stops: (v.route?.stops ?? []).map((s) => ({
          address: s.address,
          placeId: s.placeId ?? null,
          lat: s.location?.lat ?? null,
          lng: s.location?.lng ?? null,
        })),
        distanceMiles: toNumber(v.route.miles ?? v.route.distanceMiles ?? null),
        durationMinutes: toNumber(
          v.route.minutes ?? v.route.durationMinutes ?? null,
        ),
        hoursRequested:
          selectedService.pricingStrategy === "HOURLY"
            ? v.hoursRequested
            : null,
        specialRequests: v.specialRequests || null,
        flightAirline: v.flightAirline || null,
        flightNumber: v.flightNumber || null,
        flightScheduledAt: flightScheduledAtIso,
        flightTerminal: v.flightTerminal || null,
        flightGate: v.flightGate || null,
        guestName: isAuthed ? null : v.guestName.trim(),
        guestEmail: isAuthed ? null : v.guestEmail.trim().toLowerCase(),
        guestPhone: isAuthed ? null : v.guestPhone.trim(),
      });
      const data = res as any;
      if (data?.error) {
        toast.error(data.error);
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
      toast.success("Request submitted.");
      const bookingId = data?.bookingId ?? null;
      const claimToken = data?.claimToken ?? null;
      const href = bookingId
        ? claimToken
          ? `/book/success?id=${encodeURIComponent(String(bookingId))}&t=${encodeURIComponent(String(claimToken))}`
          : `/book/success?id=${encodeURIComponent(String(bookingId))}`
        : "/book/success";
      router.replace(href);
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const inputsKey = `${step}-${serviceTypeId || "none"}-${usesPickupAirport ? "P" : ""}${usesDropoffAirport ? "D" : ""}`;
  const hasFlightInfo =
    flightAirline ||
    flightNumber ||
    flightScheduledAtDate ||
    flightTerminal ||
    flightGate;

  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.stepperContainerii}>
          <Stepper step={step} />
        </div>
        <div className={styles.content}>
          <div className={styles.left}>
            <div className={styles.stepperContainer}>
              <Stepper step={step} />
            </div>
            <div className={styles.routePickerContainer}>
              <Controller
                name='route'
                control={control}
                rules={{
                  validate: (v) => {
                    if (!v?.pickup || !v?.dropoff)
                      return "Please select pickup and dropoff.";
                    if (selectedService?.pricingStrategy === "POINT_TO_POINT") {
                      const miles = toNumber(
                        v.miles ?? v.distanceMiles ?? null,
                      );
                      if (!miles || miles <= 0)
                        return "Route estimate missing (miles). Please re-check the route.";
                    }
                    return true;
                  },
                }}
                render={({ field }) => (
                  <RoutePicker
                    value={field.value}
                    onChange={(next) => {
                      const prev = getValues("route");
                      if (routeEquals(prev, next)) return;
                      field.onChange(next);
                      clearErrors("route");
                    }}
                    pickupInputRef={pickupInputRef}
                    dropoffInputRef={dropoffInputRef}
                    inputsKey={inputsKey}
                  />
                )}
              />
            </div>
          </div>

          <div className={styles.right}>
            <div ref={wizardTopRef} className={styles.wizardTop} />

            <div className={styles.wizard}>
              {/* STEP 1 */}
              {step === 1 ? (
                <div className={`${styles.contentBox} ${styles.stepPane}`}>
                  <h2 className='underline'>Trip details</h2>
                  <p className='subheading'>
                    Please provide the details for your trip below
                  </p>

                  {hasNoServices ? (
                    <div
                      className='miniNote'
                      style={{ color: "rgba(180,0,0,0.8)" }}
                    >
                      No services are available yet. An admin needs to create at
                      least one service before bookings can be requested.
                    </div>
                  ) : null}

                  <div style={{ display: "grid", gap: 8 }}>
                    <label
                      className={labelCx(
                        Boolean(errors.pickupAtDate) ||
                          Boolean(errors.pickupAtTime),
                      )}
                    >
                      Pickup date & time
                    </label>
                    <BookingDateTimeWithBlackouts
                      date={pickupAtDate}
                      time={pickupAtTime}
                      onChangeDate={(d) => {
                        setValue("pickupAtDate", d, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        clearErrors("pickupAtDate");
                      }}
                      onChangeTime={(t) => {
                        setValue("pickupAtTime", t, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        clearErrors("pickupAtTime");
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 8, marginTop: 50 }}>
                    <label className={labelCx(Boolean(errors.serviceTypeId))}>
                      Service
                    </label>
                    <select
                      value={serviceTypeId}
                      onChange={(e) => {
                        const next = e.target.value;
                        setValue("pickupAirportId", "", { shouldDirty: true });
                        setValue("dropoffAirportId", "", { shouldDirty: true });
                        setValue("route", null, { shouldDirty: true });
                        setValue("vehicleId", "", { shouldDirty: true });
                        setValue("flightAirline", "", { shouldDirty: true });
                        setValue("flightNumber", "", { shouldDirty: true });
                        setValue("flightScheduledAtDate", "", {
                          shouldDirty: true,
                        });
                        setValue("flightScheduledAtTime", "", {
                          shouldDirty: true,
                        });
                        setValue("flightTerminal", "", { shouldDirty: true });
                        setValue("flightGate", "", { shouldDirty: true });
                        setValue("serviceTypeId", next, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        clearErrors([
                          "serviceTypeId",
                          "pickupAirportId",
                          "dropoffAirportId",
                          "route",
                          "vehicleId",
                        ]);
                        const svc = services.find((s) => s.id === next);
                        if (svc?.pricingStrategy === "HOURLY") {
                          setValue(
                            "hoursRequested",
                            Math.max(getValues("hoursRequested") || 2, 2),
                            { shouldDirty: true, shouldValidate: true },
                          );
                        }
                        if (
                          svc?.airportLeg === "PICKUP" ||
                          svc?.airportLeg === "DROPOFF"
                        ) {
                          setShowFlightInfo(true);
                        } else {
                          setShowFlightInfo(false);
                        }
                      }}
                      className='input emptySmall'
                      disabled={hasNoServices}
                    >
                      <option value=''>Select a service...</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Grid2>
                    <div style={{ display: "grid", gap: 8 }}>
                      <label className={labelCx(Boolean(errors.passengers))}>
                        Passengers
                      </label>
                      <input
                        type='number'
                        min={1}
                        value={passengers}
                        onChange={(e) => {
                          setValue("passengers", Number(e.target.value), {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          clearErrors("passengers");
                        }}
                        className='input emptySmall'
                      />
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      <label className={labelCx(Boolean(errors.luggage))}>
                        Luggage
                      </label>
                      <input
                        type='number'
                        min={0}
                        value={luggage}
                        onChange={(e) => {
                          setValue("luggage", Number(e.target.value), {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          clearErrors("luggage");
                        }}
                        className='input emptySmall'
                      />
                    </div>
                  </Grid2>

                  <div className={styles.pickupDropoffContainer}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <label
                        className={`cardTitle h5${usesPickupAirport ? (errors.pickupAirportId ? " redBorder" : "") : pickupLabelRed ? " redBorder" : ""}`}
                      >
                        {usesPickupAirport ? "Pickup airport" : "Pickup"}
                      </label>
                      {usesPickupAirport ? (
                        <select
                          value={pickupAirportId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setValue("pickupAirportId", id, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            clearErrors("pickupAirportId");
                            applyAirportToRoute("pickup", id);
                          }}
                          className='input emptySmall'
                        >
                          <option value=''>Select an airport...</option>
                          {serviceAirports.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.iata})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          ref={pickupInputRef}
                          placeholder='Enter pickup address'
                          autoComplete='off'
                          className='input emptySmall'
                        />
                      )}
                    </div>

                    {/* ✅ STOPS SECTION - Between Pickup and Dropoff */}
                    {(route?.stops?.length ?? 0) > 0 && (
                      <div className={styles.stopsListWizard}>
                        {route?.stops?.map((stop, index) => (
                          <div key={stop.id} className={styles.stopRowWizard}>
                            <div className={styles.stopBadgeWizard}>
                              {index + 1}
                            </div>
                            <input
                              type='text'
                              placeholder={`Stop ${index + 1} address...`}
                              defaultValue={stop.address}
                              className='input emptySmall'
                              style={{ flex: 1 }}
                              ref={(el) => {
                                if (el && window.google?.maps?.places) {
                                  // Setup autocomplete for this stop
                                  const existingAC = (el as any).__stopAC;
                                  if (!existingAC) {
                                    const ac =
                                      new window.google.maps.places.Autocomplete(
                                        el,
                                        {
                                          fields: [
                                            "place_id",
                                            "formatted_address",
                                            "geometry",
                                          ],
                                          componentRestrictions: {
                                            country: "us",
                                          },
                                        },
                                      );
                                    ac.addListener("place_changed", () => {
                                      const place = ac.getPlace();
                                      const loc = place?.geometry?.location;
                                      if (
                                        !place?.place_id ||
                                        !place?.formatted_address ||
                                        !loc
                                      )
                                        return;

                                      const currentRoute = getValues("route");
                                      const currentStops = [
                                        ...(currentRoute?.stops ?? []),
                                      ];
                                      const stopIdx = currentStops.findIndex(
                                        (s) => s.id === stop.id,
                                      );

                                      if (stopIdx >= 0) {
                                        currentStops[stopIdx] = {
                                          ...currentStops[stopIdx],
                                          address: String(
                                            place.formatted_address,
                                          ),
                                          placeId: String(place.place_id),
                                          location: {
                                            lat: loc.lat(),
                                            lng: loc.lng(),
                                          },
                                        };

                                        setValue(
                                          "route",
                                          {
                                            pickup:
                                              currentRoute?.pickup ?? null,
                                            dropoff:
                                              currentRoute?.dropoff ?? null,
                                            stops: currentStops,
                                            miles: null,
                                            minutes: null,
                                            distanceMiles: null,
                                            durationMinutes: null,
                                          },
                                          {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                          },
                                        );
                                      }
                                    });
                                    (el as any).__stopAC = ac;
                                  }
                                }
                              }}
                            />
                            <button
                              type='button'
                              onClick={() => {
                                const currentRoute = getValues("route");
                                const newStops = (
                                  currentRoute?.stops ?? []
                                ).filter((s) => s.id !== stop.id);
                                setValue(
                                  "route",
                                  {
                                    pickup: currentRoute?.pickup ?? null,
                                    dropoff: currentRoute?.dropoff ?? null,
                                    stops: newStops,
                                    miles: null,
                                    minutes: null,
                                    distanceMiles: null,
                                    durationMinutes: null,
                                  },
                                  { shouldDirty: true, shouldValidate: true },
                                );
                              }}
                              className={styles.removeStopBtnWizard}
                              title='Remove stop'
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ✅ ADD STOP BUTTON */}
                    <button
                      type='button'
                      onClick={() => {
                        const currentRoute = getValues("route");
                        const newStop = {
                          id: `stop-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                          address: "",
                          placeId: "",
                          location: { lat: 0, lng: 0 },
                        };
                        setValue(
                          "route",
                          {
                            pickup: currentRoute?.pickup ?? null,
                            dropoff: currentRoute?.dropoff ?? null,
                            stops: [...(currentRoute?.stops ?? []), newStop],
                            miles: currentRoute?.miles ?? null,
                            minutes: currentRoute?.minutes ?? null,
                            distanceMiles: currentRoute?.distanceMiles ?? null,
                            durationMinutes:
                              currentRoute?.durationMinutes ?? null,
                          },
                          { shouldDirty: true, shouldValidate: true },
                        );
                      }}
                      className={styles.addStopBtnWizard}
                    >
                      <span>➕</span> Add a stop
                      <span className={styles.addStopFeeWizard}>
                        (+$15.00 per stop)
                      </span>
                    </button>

                    <div style={{ display: "grid", gap: 8 }}>
                      <label
                        className={`cardTitle h5${usesDropoffAirport ? (errors.dropoffAirportId ? " redBorder" : "") : dropoffLabelRed ? " redBorder" : ""}`}
                      >
                        {usesDropoffAirport ? "Dropoff airport" : "Dropoff"}
                      </label>
                      {usesDropoffAirport ? (
                        <select
                          value={dropoffAirportId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setValue("dropoffAirportId", id, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            clearErrors("dropoffAirportId");
                            applyAirportToRoute("dropoff", id);
                          }}
                          className='input emptySmall'
                        >
                          <option value=''>Select an airport...</option>
                          {serviceAirports.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.iata})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          ref={dropoffInputRef}
                          placeholder='Enter dropoff address'
                          autoComplete='off'
                          className='input emptySmall'
                        />
                      )}
                    </div>
                  </div>

                  {/* ✅ Show stop surcharge info */}
                  {(route?.stops?.length ?? 0) > 0 && (
                    <div className={styles.stopSurchargeInfo}>
                      <span>
                        🛑 {route?.stops?.length} extra stop
                        {(route?.stops?.length ?? 0) > 1 ? "s" : ""}
                      </span>
                      <span className={styles.stopSurchargeAmount}>
                        +$
                        {(((route?.stops?.length ?? 0) * 1500) / 100).toFixed(
                          2,
                        )}{" "}
                        surcharge
                      </span>
                    </div>
                  )}

                  {selectedService?.pricingStrategy === "HOURLY" ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <label
                        className={labelCx(Boolean(errors.hoursRequested))}
                      >
                        Hours
                      </label>
                      <input
                        type='number'
                        min={1}
                        step={1}
                        value={hoursRequested}
                        onChange={(e) => {
                          setValue("hoursRequested", Number(e.target.value), {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          clearErrors("hoursRequested");
                        }}
                        className='input emptySmall'
                      />
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        Vehicle minimum applies after you choose a vehicle
                        category.
                      </div>
                    </div>
                  ) : null}

                  {/* Flight Information Section */}
                  {isAirportService && (
                    <div className={styles.flightInfoSection}>
                      <button
                        type='button'
                        className={styles.flightInfoToggle}
                        onClick={() => setShowFlightInfo(!showFlightInfo)}
                      >
                        <span className='cardTitle h5'>
                          ✈️ Flight Information{" "}
                          <span style={{ fontWeight: 400, opacity: 0.7 }}>
                            (optional)
                          </span>
                        </span>
                        <span className={styles.flightInfoToggleIcon}>
                          {showFlightInfo ? "−" : "+"}
                        </span>
                      </button>
                      {showFlightInfo && (
                        <div className={styles.flightInfoFields}>
                          <p
                            className='miniNote'
                            style={{ marginBottom: 16, marginTop: 0 }}
                          >
                            {usesPickupAirport
                              ? "Provide your flight details so we can monitor for delays and adjust your pickup time if needed."
                              : "Provide your flight details so your driver knows which terminal to drop you off at."}
                          </p>
                          <Grid2>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label className='cardTitle h5'>Airline</label>
                              <input
                                type='text'
                                value={flightAirline}
                                onChange={(e) =>
                                  setValue("flightAirline", e.target.value, {
                                    shouldDirty: true,
                                  })
                                }
                                placeholder='e.g., American Airlines'
                                className='input emptySmall'
                              />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label className='cardTitle h5'>
                                Flight Number
                              </label>
                              <input
                                type='text'
                                value={flightNumber}
                                onChange={(e) =>
                                  setValue(
                                    "flightNumber",
                                    e.target.value.toUpperCase(),
                                    { shouldDirty: true },
                                  )
                                }
                                placeholder='e.g., AA1234'
                                className='input emptySmall'
                              />
                            </div>
                          </Grid2>
                          <div style={{ display: "grid", gap: 8 }}>
                            <label className='cardTitle h5'>
                              {usesPickupAirport
                                ? "Flight Arrival Time"
                                : "Flight Departure Time"}
                            </label>
                            <Grid2>
                              <input
                                type='date'
                                value={flightScheduledAtDate}
                                onChange={(e) =>
                                  setValue(
                                    "flightScheduledAtDate",
                                    e.target.value,
                                    { shouldDirty: true },
                                  )
                                }
                                className='input emptySmall'
                              />
                              <input
                                type='time'
                                value={flightScheduledAtTime}
                                onChange={(e) =>
                                  setValue(
                                    "flightScheduledAtTime",
                                    e.target.value,
                                    { shouldDirty: true },
                                  )
                                }
                                className='input emptySmall'
                              />
                            </Grid2>
                          </div>
                          <Grid2>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label className='cardTitle h5'>Terminal</label>
                              <input
                                type='text'
                                value={flightTerminal}
                                onChange={(e) =>
                                  setValue("flightTerminal", e.target.value, {
                                    shouldDirty: true,
                                  })
                                }
                                placeholder='e.g., Terminal 4'
                                className='input emptySmall'
                              />
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              <label className='cardTitle h5'>
                                Gate{" "}
                                <span style={{ fontWeight: 400, opacity: 0.6 }}>
                                  (if known)
                                </span>
                              </label>
                              <input
                                type='text'
                                value={flightGate}
                                onChange={(e) =>
                                  setValue(
                                    "flightGate",
                                    e.target.value.toUpperCase(),
                                    { shouldDirty: true },
                                  )
                                }
                                placeholder='e.g., B12'
                                className='input emptySmall'
                              />
                            </div>
                          </Grid2>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <div className={styles.btnContainer}>
                      <button
                        type='button'
                        onClick={goStep2}
                        className='primaryBtn'
                        disabled={hasNoServices}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* STEP 2 */}
              {step === 2 ? (
                <div
                  className={styles.stepPane}
                  style={{ display: "grid", gap: 14 }}
                >
                  <h2 className='underline'>Choose a vehicle</h2>
                  <p className='subheading'>Choose a vehicle category</p>
                  <label className={labelCx(Boolean(errors.vehicleId))}>
                    Vehicle category
                  </label>
                  <div style={{ display: "grid", gap: 10 }}>
                    {vehicleOptions.map((v) => {
                      const isSelected = v.id === vehicleId;
                      const rowQuote = selectedService
                        ? calcQuoteCents({
                            pricingStrategy: toStrategy(
                              selectedService.pricingStrategy,
                            ),
                            distanceMiles:
                              selectedService.pricingStrategy ===
                              "POINT_TO_POINT"
                                ? distanceMiles
                                : null,
                            durationMinutes:
                              selectedService.pricingStrategy ===
                              "POINT_TO_POINT"
                                ? durationMinutes
                                : null,
                            hoursRequested:
                              selectedService.pricingStrategy === "HOURLY"
                                ? hoursRequested
                                : null,
                            stopCount: route?.stops?.length ?? 0,
                            vehicleMinHours: v.minHours ?? 0,
                            serviceMinFareCents: selectedService.minFareCents,
                            serviceBaseFeeCents: selectedService.baseFeeCents,
                            servicePerMileCents: selectedService.perMileCents,
                            servicePerMinuteCents:
                              selectedService.perMinuteCents,
                            servicePerHourCents: selectedService.perHourCents,
                            vehicleBaseFareCents: v.baseFareCents ?? 0,
                            vehiclePerMileCents: v.perMileCents ?? 0,
                            vehiclePerMinuteCents: v.perMinuteCents ?? 0,
                            vehiclePerHourCents: v.perHourCents ?? 0,
                          })
                        : null;
                      const rowEstimateCents = rowQuote?.totalCents ?? 0;
                      const rowMinHours =
                        selectedService?.pricingStrategy === "HOURLY"
                          ? v.minHours
                          : null;
                      const rowBillable =
                        selectedService?.pricingStrategy === "HOURLY"
                          ? Math.max(
                              Math.ceil(hoursRequested || 0),
                              Math.ceil(v.minHours || 0),
                            )
                          : null;
                      return (
                        <button
                          key={v.id}
                          type='button'
                          onClick={() => {
                            setValue("vehicleId", v.id, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            clearErrors("vehicleId");
                            if (selectedService?.pricingStrategy === "HOURLY") {
                              setValue(
                                "hoursRequested",
                                Math.max(hoursRequested || 1, v.minHours || 0),
                                { shouldDirty: true, shouldValidate: true },
                              );
                            }
                          }}
                          style={{
                            textAlign: "left",
                            padding: 14,
                            borderRadius: 7,
                            border: isSelected
                              ? "2px solid rgba(0,0,0,0.6)"
                              : "1px solid rgba(0,0,0,0.25)",
                            background: "white",
                            cursor: "pointer",
                            display: "grid",
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                            }}
                          >
                            <div className='emptyTitle'>{v.name}</div>
                            <div className='emptyTitleSmall'>
                              ${centsToUsd(rowEstimateCents)}
                            </div>
                          </div>
                          <div className='val'>
                            Capacity: {v.capacity} • Luggage:{" "}
                            {v.luggageCapacity}
                            {rowMinHours !== null
                              ? ` • Min hours: ${rowMinHours}`
                              : ""}
                            {rowBillable !== null
                              ? ` • Billable hours: ${rowBillable}`
                              : ""}
                          </div>
                          {v.description ? (
                            <div style={{ fontSize: 12, opacity: 0.75 }}>
                              {v.description}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <button
                      type='button'
                      onClick={() => setStep(1)}
                      className='secondaryBtn'
                    >
                      Back
                    </button>
                    <button
                      type='button'
                      onClick={goStep3}
                      className='primaryBtn'
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}

              {/* STEP 3 */}
              {step === 3 ? (
                <div
                  className={styles.stepPane}
                  style={{ display: "grid", gap: 30 }}
                >
                  <h2 className='underline'>Confirm</h2>
                  <p className='subheading'>Overview</p>
                  <div className='box'>
                    <SummaryRow
                      label='Service'
                      value={selectedService?.name ?? "—"}
                    />
                    <SummaryRow
                      label='Pickup time'
                      value={
                        pickupAtDate && pickupAtTime
                          ? `${pickupAtDate} @ ${pickupAtTime}`
                          : "—"
                      }
                    />
                    <SummaryRow label='Passengers' value={String(passengers)} />
                    <SummaryRow label='Luggage' value={String(luggage)} />
                    <SummaryRow
                      label='Pickup'
                      value={route?.pickup?.address ?? "—"}
                    />
                    <SummaryRow
                      label='Dropoff'
                      value={route?.dropoff?.address ?? "—"}
                    />
                    {/* ✅ Show stops if any */}
                    {(route?.stops?.length ?? 0) > 0 && (
                      <>
                        <div
                          style={{
                            borderTop: "1px solid rgba(0,0,0,0.1)",
                            marginTop: 12,
                            paddingTop: 12,
                          }}
                        >
                          <div
                            className='cardTitle h6'
                            style={{ marginBottom: 8, opacity: 0.7 }}
                          >
                            🛑 Extra Stops ({route?.stops?.length})
                          </div>
                        </div>
                        {route?.stops?.map((stop, index) => (
                          <SummaryRow
                            key={stop.id}
                            label={`Stop ${index + 1}`}
                            value={stop.address || "—"}
                          />
                        ))}
                        <SummaryRow
                          label='Stop surcharge'
                          value={`$${(((route?.stops?.length ?? 0) * 1500) / 100).toFixed(2)}`}
                        />
                        <SummaryRow
                          label='Est. wait time'
                          value={`+${(route?.stops?.length ?? 0) * 5} min`}
                        />
                      </>
                    )}
                    {selectedService?.pricingStrategy === "HOURLY" ? (
                      <>
                        <SummaryRow
                          label='Hours requested'
                          value={String(hoursRequested)}
                        />
                        <SummaryRow
                          label='Billable hours (min applied)'
                          value={String(billableHours ?? hoursRequested)}
                        />
                      </>
                    ) : null}
                    {hasFlightInfo && (
                      <>
                        <div
                          style={{
                            borderTop: "1px solid rgba(0,0,0,0.1)",
                            marginTop: 12,
                            paddingTop: 12,
                          }}
                        >
                          <div
                            className='cardTitle h6'
                            style={{ marginBottom: 8, opacity: 0.7 }}
                          >
                            ✈️ Flight Information
                          </div>
                        </div>
                        {flightAirline && (
                          <SummaryRow label='Airline' value={flightAirline} />
                        )}
                        {flightNumber && (
                          <SummaryRow
                            label='Flight Number'
                            value={flightNumber}
                          />
                        )}
                        {flightScheduledAtDate && (
                          <SummaryRow
                            label={
                              usesPickupAirport
                                ? "Arrival Time"
                                : "Departure Time"
                            }
                            value={
                              flightScheduledAtTime
                                ? `${flightScheduledAtDate} @ ${flightScheduledAtTime}`
                                : flightScheduledAtDate
                            }
                          />
                        )}
                        {flightTerminal && (
                          <SummaryRow label='Terminal' value={flightTerminal} />
                        )}
                        {flightGate && (
                          <SummaryRow label='Gate' value={flightGate} />
                        )}
                      </>
                    )}
                    <div
                      style={{
                        borderTop: "1px solid rgba(0,0,0,0.1)",
                        marginTop: 12,
                        paddingTop: 12,
                      }}
                    />
                    <SummaryRow
                      label='Estimate'
                      value={`$${centsToUsd(estimateCents)}`}
                      strong
                    />
                    <div className='miniNote'>
                      This is an estimate. Dispatch may adjust for special
                      dates, late night, extra stops, etc.
                      {(route?.stops?.length ?? 0) > 0 && (
                        <strong>
                          {" "}
                          Includes $
                          {(((route?.stops?.length ?? 0) * 1500) / 100).toFixed(
                            2,
                          )}
                          surcharge for {route?.stops?.length ?? 0} extra stop
                          {(route?.stops?.length ?? 0) > 1 ? "s" : ""}.
                        </strong>
                      )}
                    </div>
                  </div>

                  {!isAuthed ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ display: "grid", gap: 20 }}>
                        <label className={labelCx(Boolean(errors.guestName))}>
                          Full name
                        </label>
                        <input
                          value={guestName}
                          onChange={(e) => {
                            setValue("guestName", e.target.value, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            clearErrors("guestName");
                          }}
                          className='input subheading'
                          placeholder='Your name'
                        />
                      </div>
                      <Grid2>
                        <div style={{ display: "grid", gap: 10 }}>
                          <label
                            className={labelCx(Boolean(errors.guestEmail))}
                          >
                            Email
                          </label>
                          <input
                            value={guestEmail}
                            onChange={(e) => {
                              setValue("guestEmail", e.target.value, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              clearErrors("guestEmail");
                            }}
                            className='input subheading'
                            placeholder='you@email.com'
                            inputMode='email'
                          />
                        </div>
                        <div style={{ display: "grid", gap: 6 }}>
                          <label
                            className={labelCx(Boolean(errors.guestPhone))}
                          >
                            Phone
                          </label>
                          <input
                            value={guestPhone}
                            onChange={(e) => {
                              setValue("guestPhone", e.target.value, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              clearErrors("guestPhone");
                            }}
                            className='input subheading'
                            placeholder='(602) 555-1234'
                            inputMode='tel'
                          />
                        </div>
                      </Grid2>
                    </div>
                  ) : null}

                  <div style={{ display: "grid", gap: 8 }}>
                    <div className='cardTitle h5'>
                      Special requests (optional)
                    </div>
                    <textarea
                      value={watch("specialRequests")}
                      onChange={(e) =>
                        setValue("specialRequests", e.target.value, {
                          shouldDirty: true,
                        })
                      }
                      className='input subheading'
                      style={{ minHeight: 90 }}
                      placeholder='Child seat, wheelchair needs, extra stops, meet & greet...'
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <button
                      type='button'
                      onClick={() => setStep(2)}
                      className='secondaryBtn'
                      disabled={submitting || submitted}
                    >
                      Back
                    </button>
                    <button
                      type='button'
                      onClick={handleSubmit}
                      className='primaryBtn'
                      disabled={submitting || submitted}
                    >
                      {submitted
                        ? "Submitted"
                        : submitting
                          ? "Submitting..."
                          : "Submit request"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
